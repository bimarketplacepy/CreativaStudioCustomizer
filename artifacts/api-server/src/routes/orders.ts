import { Router, type IRouter, type Request } from "express";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db, ordersTable, type Order } from "@workspace/db";
import { CreateOrderBody } from "@workspace/api-zod";
import { rateLimit } from "../middlewares/rate-limit";
import {
  parseImageDataUrl,
  storeOrderImage,
  storeOrderFile,
  loadOrderImage,
} from "../lib/order-images";
import { buildProductionSvg } from "../lib/production-svg";
import { productionPng, productionPngFileName } from "../lib/production-sticker";
import { svgToDxf } from "../lib/production-dxf";
import { orderMachine } from "../lib/machines";
import { checkInternalKey, checkOrderImageToken, orderImageToken } from "../lib/internal-key";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * Clave interna para el material de producción (archivo vectorial y panel
 * /admin). Se acepta por header `x-internal-key` o query `?key=`.
 */
function hasInternalKey(req: Request): boolean {
  const got = req.headers["x-internal-key"] ?? req.query.key;
  return checkInternalKey(got);
}

/**
 * Genera y persiste el SVG vectorial de producción (uso interno). Best-effort:
 * un fallo acá nunca voltea la creación del pedido — se loguea y el archivo
 * puede regenerarse después a mano.
 */
/** Texto de tapa/base de designState.extraEngraving ("" = sí sin texto; null = no). */
function extraText(extra: unknown, key: "lid" | "base"): string | null {
  if (!extra || typeof extra !== "object") return null;
  const v = (extra as Record<string, unknown>)[key];
  return typeof v === "string" ? v.slice(0, 60) : null;
}

async function generateProductionFile(
  order: Order,
  customImageDataUrl: string | null,
  productionImageDataUrl: string | null,
): Promise<string | null> {
  try {
    const ds = (order.designState ?? {}) as Record<string, unknown>;
    const machine = orderMachine(ds);
    // El archivo depende de la máquina (DACEN.md §4.1):
    //  - eufyMake E1 (stickers): PNG transparente a tamaño real, el formato
    //    que se carga en la app de la E1.
    //  - Dacen F5 (UV cilíndrica): PNG desenrollado (la vuelta completa × el
    //    alto imprimible) que arma la landing, para RIPrint. Sin PNG válido,
    //    queda el SVG de referencia de ubicación y textos.
    //  - Láser CO2 (Willpex): DXF, el formato que el taller exporta de Corel.
    //    El SVG se guarda al lado como referencia (trae el logo embebido).
    if (machine === "eufy" && ds.kind === "sticker") {
      const png = productionPng(customImageDataUrl, ds.productionDpi);
      if (!png) return null;
      const name = `orders/${order.orderNumber}-produccion.png`;
      await storeOrderFile(name, png, "image/png");
      return name;
    }
    if (machine === "dacen") {
      const png = productionPng(productionImageDataUrl, ds.productionDpi);
      if (png) {
        const name = `orders/${order.orderNumber}-produccion.png`;
        await storeOrderFile(name, png, "image/png");
        return name;
      }
    }
    const svg = await buildProductionSvg({
      orderNumber: order.orderNumber,
      product: order.product,
      technique: order.technique,
      createdAt: order.createdAt,
      // El texto exacto del diseño (customText puede traer "texto 1 / texto 2").
      text: typeof ds.text === "string" ? ds.text : order.customText,
      fontId: typeof ds.fontId === "string" ? ds.fontId : null,
      text2: typeof ds.text2 === "string" ? ds.text2 : null,
      text2FontId: typeof ds.text2FontId === "string" ? ds.text2FontId : null,
      text2Placement: (ds.text2Placement ?? null) as never,
      textColor: order.textColor,
      iconId: typeof ds.iconId === "string" ? ds.iconId : null,
      customImageDataUrl,
      textPlacement: (ds.textPlacement ?? null) as never,
      artPlacement: (ds.artPlacement ?? null) as never,
      extraLid: extraText(ds.extraEngraving, "lid"),
      extraBase: extraText(ds.extraEngraving, "base"),
      placementMode: typeof ds.placementMode === "string" ? ds.placementMode : null,
      keepOut: Array.isArray(ds.keepOut) ? (ds.keepOut as never) : null,
    });
    const svgName = `orders/${order.orderNumber}-produccion.svg`;
    await storeOrderFile(svgName, Buffer.from(svg, "utf8"), "image/svg+xml");
    if (machine !== "laser") return svgName;
    const dxf = svgToDxf(svg, {
      comment: `Creativa Studio - pedido ${order.orderNumber} - ${order.product} - USO INTERNO\nCapas: GRABADO (grabar) / INFO y LOGO-VECTORIZAR (no grabar). Unidades: mm.`,
    });
    const dxfName = `orders/${order.orderNumber}-produccion.dxf`;
    await storeOrderFile(dxfName, Buffer.from(dxf, "utf8"), "application/dxf");
    return dxfName;
  } catch (err) {
    logger.error({ orderNumber: order.orderNumber, err }, "orders: production file failed");
    return null;
  }
}

/** Public absolute origin, honouring the Replit proxy headers. */
function originFrom(req: Request): string {
  const proto = (String(req.headers["x-forwarded-proto"] || req.protocol || "https"))
    .split(",")[0]!
    .trim();
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

/** URL pública del preview, firmada con un token no adivinable (ver
 *  orderImageToken): el número de pedido solo no alcanza para verla. */
const imageUrlFor = (req: Request, order: Pick<Order, "orderNumber" | "previewImagePath">) =>
  order.previewImagePath
    ? `${originFrom(req)}/api/orders/${order.orderNumber}/image?t=${orderImageToken(order.orderNumber)}`
    : null;

/** ¿Pedido de stickers para la eufyMake E1 con su PNG de producción? */
const isEufySticker = (designState: unknown, productionFilePath: string | null | undefined) => {
  const ds = (designState ?? {}) as Record<string, unknown>;
  return ds.kind === "sticker" && orderMachine(ds) === "eufy" && !!productionFilePath?.endsWith(".png");
};

/** Stickers: el link del mensaje es el PNG transparente a tamaño real (el que
 *  se carga tal cual en la app de la eufyMake E1), firmado con el mismo token. */
const stickerPngUrlFor = (req: Request, orderNumber: string) =>
  `${originFrom(req)}/api/orders/${orderNumber}/sticker.png?t=${orderImageToken(orderNumber)}`;

/** Marca en designState de los pedidos cuya imagen exige token. Los pedidos
 *  anteriores no la tienen y siguen abriendo sin token, para no romper los
 *  links que ya se mandaron por WhatsApp. */
const TOKEN_FLAG = "_imageTokenRequired";

const ORDER_NUMBER_RE = /^CS-\d{4,}$/;

// POST /api/orders — máx. 10 pedidos por IP por hora.
router.post("/orders", rateLimit({ max: 10, windowMs: 60 * 60 * 1000 }), async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos de pedido inválidos" });
    return;
  }
  const body = parsed.data;

  // Validate the image up front (before burning an order number on bad input).
  let image = null;
  if (body.previewImage) {
    const result = parseImageDataUrl(body.previewImage);
    if (result === "too-large") {
      res.status(413).json({ message: "La imagen supera el tamaño máximo (3MB)" });
      return;
    }
    if (!result) {
      res.status(400).json({ message: "previewImage inválida (se espera data URL PNG/JPEG)" });
      return;
    }
    image = result;
  }

  try {
    // `nextval()` es atómico: pedidos simultáneos nunca colisionan de número.
    const [order] = await db
      .insert(ordersTable)
      .values({
        orderNumber: sql`'CS-' || lpad(nextval('orders_number_seq')::text, 4, '0')`,
        product: body.product,
        material: body.material,
        color: body.color ?? null,
        technique: body.technique,
        customText: body.customText ?? null,
        font: body.font ?? null,
        textColor: body.textColor ?? null,
        iconName: body.iconName ?? null,
        hasUploadedImage: body.hasUploadedImage ?? false,
        // `machine` normalizada (o inferida si la landing no la mandó), para
        // que el panel filtre por máquina sin adivinar.
        designState: { ...body.designState, machine: orderMachine(body.designState), [TOKEN_FLAG]: true },
      })
      .returning();
    if (!order) throw new Error("insert returned no row");

    // Store the image named after the order number, then persist the path.
    if (image) {
      const path = await storeOrderImage(order.orderNumber, image);
      await db
        .update(ordersTable)
        .set({ previewImagePath: path })
        .where(eq(ordersTable.id, order.id));
      order.previewImagePath = path;
    }

    // Archivo de producción. El vectorial (termos) es de uso interno y nunca
    // viaja al cliente; el PNG del sticker sí: es su propio diseño recortado,
    // y así el taller lo baja del mismo link de WhatsApp en el formato de la E1.
    const productionPath = await generateProductionFile(order, body.customImage ?? null, body.productionImage ?? null);
    if (productionPath) {
      await db
        .update(ordersTable)
        .set({ productionFilePath: productionPath })
        .where(eq(ordersTable.id, order.id));
    }

    res.status(201).json({
      orderNumber: order.orderNumber,
      previewImageUrl: isEufySticker(order.designState, productionPath)
        ? stickerPngUrlFor(req, order.orderNumber)
        : imageUrlFor(req, order),
    });
  } catch (err) {
    logger.error({ err }, "orders: create failed");
    res.status(500).json({ message: "No se pudo crear el pedido" });
  }
});

// GET /api/orders/:orderNumber — pedido completo. USO INTERNO: contiene datos
// del cliente (texto grabado, diseño), así que exige la clave. Sin clave
// responde 401 sin revelar si el pedido existe.
router.get("/orders/:orderNumber", async (req, res) => {
  if (!hasInternalKey(req)) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const orderNumber = req.params.orderNumber;
  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    res.status(404).json({ message: "Pedido no encontrado" });
    return;
  }
  try {
    const order = await db.query.ordersTable.findFirst({
      where: eq(ordersTable.orderNumber, orderNumber),
    });
    if (!order) {
      res.status(404).json({ message: "Pedido no encontrado" });
      return;
    }
    res.json({
      ...order,
      createdAt: order.createdAt.toISOString(),
      previewImageUrl: imageUrlFor(req, order),
    });
  } catch (err) {
    logger.error({ err }, "orders: get failed");
    res.status(500).json({ message: "No se pudo obtener el pedido" });
  }
});

// GET /api/orders/:orderNumber/production-file — archivo de producción: DXF
// (láser CO2), PNG desenrollado (Dacen F5 / RIPrint), PNG del sticker
// (eufyMake E1) o SVG. `?formato=svg` en un pedido láser baja el SVG de
// referencia que se guardó junto al DXF (trae el logo raster embebido).
// USO INTERNO: requiere la clave (header x-internal-key o ?key=). El cliente
// jamás recibe esta URL; sin clave responde 401 sin revelar si el pedido existe.
router.get("/orders/:orderNumber/production-file", async (req, res) => {
  if (!hasInternalKey(req)) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const orderNumber = req.params.orderNumber;
  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    res.status(404).json({ message: "Pedido no encontrado" });
    return;
  }
  try {
    const order = await db.query.ordersTable.findFirst({
      where: eq(ordersTable.orderNumber, orderNumber),
      columns: { productionFilePath: true, designState: true },
    });
    if (!order?.productionFilePath) {
      res.status(404).json({ message: "Archivo de producción no disponible" });
      return;
    }
    let path = order.productionFilePath;
    if (req.query.formato === "svg" && path.endsWith(".dxf")) path = path.replace(/\.dxf$/, ".svg");
    const entry = await loadOrderImage(path);
    if (!entry) {
      res.status(404).json({ message: "Archivo de producción no disponible" });
      return;
    }
    const ds = (order.designState ?? {}) as Record<string, unknown>;
    const ext = path.slice(path.lastIndexOf(".") + 1);
    const fileName = ext === "png"
      ? productionPngFileName(orderNumber, orderMachine(ds), ds)
      : ext === "dxf" ? `${orderNumber}-laser.dxf` : `${orderNumber}-produccion.svg`;
    const type = ext === "png" ? "image/png" : ext === "dxf" ? "application/dxf" : "image/svg+xml";
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.end(entry.buf);
  } catch (err) {
    logger.error({ err }, "orders: production file download failed");
    res.status(500).json({ message: "No se pudo obtener el archivo" });
  }
});

// GET /api/orders/:orderNumber/sticker.png?t=<token> — el sticker en PNG
// transparente a tamaño real (con sus dpi), listo para la app de la eufyMake
// E1. Es el link del mensaje de WhatsApp de los pedidos de stickers.
router.get("/orders/:orderNumber/sticker.png", async (req, res) => {
  const orderNumber = req.params.orderNumber;
  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    res.status(404).end();
    return;
  }
  if (!checkOrderImageToken(orderNumber, req.query.t) && !hasInternalKey(req)) {
    res.status(404).end();
    return;
  }
  try {
    const order = await db.query.ordersTable.findFirst({
      where: eq(ordersTable.orderNumber, orderNumber),
      columns: { productionFilePath: true, designState: true },
    });
    if (!order || !isEufySticker(order.designState, order.productionFilePath)) {
      res.status(404).end();
      return;
    }
    const entry = await loadOrderImage(order.productionFilePath!);
    if (!entry) {
      res.status(404).end();
      return;
    }
    const ds = (order.designState ?? {}) as Record<string, unknown>;
    res.setHeader("Content-Type", "image/png");
    // inline: se ve en el navegador; "Guardar imagen" usa este nombre.
    res.setHeader("Content-Disposition", `inline; filename="${productionPngFileName(orderNumber, "eufy", ds)}"`);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.end(entry.buf);
  } catch (err) {
    logger.error({ err }, "orders: sticker png failed");
    res.status(500).end();
  }
});

// GET /api/orders/:orderNumber/image?t=<token> — imagen permanente del preview
// (la URL que viaja en el mensaje de WhatsApp). Exige el token del pedido (o la
// clave interna, para el panel); los pedidos previos al token abren sin él.
router.get("/orders/:orderNumber/image", async (req, res) => {
  const orderNumber = req.params.orderNumber;
  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    res.status(404).end();
    return;
  }
  try {
    const order = await db.query.ordersTable.findFirst({
      where: eq(ordersTable.orderNumber, orderNumber),
      columns: { previewImagePath: true, designState: true },
    });
    if (!order?.previewImagePath) {
      res.status(404).end();
      return;
    }
    const needsToken = (order.designState as Record<string, unknown> | null)?.[TOKEN_FLAG] === true;
    if (needsToken && !checkOrderImageToken(orderNumber, req.query.t) && !hasInternalKey(req)) {
      // 404 (no 401): no confirma que el pedido exista.
      res.status(404).end();
      return;
    }
    const entry = await loadOrderImage(order.previewImagePath);
    if (!entry) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", entry.type);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.end(entry.buf);
  } catch (err) {
    logger.error({ err }, "orders: image failed");
    res.status(500).end();
  }
});

export default router;
