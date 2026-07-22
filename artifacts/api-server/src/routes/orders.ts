import { Router, type IRouter, type Request } from "express";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db, ordersTable, type Order } from "@workspace/db";
import { CreateOrderBody } from "@workspace/api-zod";
import { rateLimit } from "../middlewares/rate-limit";
import {
  parseImageDataUrl,
  storeOrderImage,
  loadOrderImage,
} from "../lib/order-images";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** Public absolute origin, honouring the Replit proxy headers. */
function originFrom(req: Request): string {
  const proto = (String(req.headers["x-forwarded-proto"] || req.protocol || "https"))
    .split(",")[0]!
    .trim();
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

const imageUrlFor = (req: Request, order: Pick<Order, "orderNumber" | "previewImagePath">) =>
  order.previewImagePath
    ? `${originFrom(req)}/api/orders/${order.orderNumber}/image`
    : null;

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
        designState: body.designState,
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

    res.status(201).json({
      orderNumber: order.orderNumber,
      previewImageUrl: imageUrlFor(req, order),
    });
  } catch (err) {
    logger.error({ err }, "orders: create failed");
    res.status(500).json({ message: "No se pudo crear el pedido" });
  }
});

// GET /api/orders/:orderNumber — pedido completo (uso interno futuro).
router.get("/orders/:orderNumber", async (req, res) => {
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

// GET /api/orders/:orderNumber/image — imagen pública permanente del preview
// (la URL que viaja en el mensaje de WhatsApp).
router.get("/orders/:orderNumber/image", async (req, res) => {
  const orderNumber = req.params.orderNumber;
  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    res.status(404).end();
    return;
  }
  try {
    const order = await db.query.ordersTable.findFirst({
      where: eq(ordersTable.orderNumber, orderNumber),
      columns: { previewImagePath: true },
    });
    if (!order?.previewImagePath) {
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
