// Panel interno de pedidos y productos (/admin) — USO DEL TALLER, nunca enlazado desde la
// landing. La página en sí es un shell sin datos; todo dato sale de
// /api/admin/orders, que exige la clave interna (401 sin ella). La clave que
// tipea el operario queda en sessionStorage y viaja por header en cada fetch.

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { checkInternalKey, orderImageToken } from "../lib/internal-key";
import { logger } from "../lib/logger";
import { getCatalog } from "../lib/catalog";
import { getDisabledProducts, setProductEnabled } from "../lib/product-settings";
import { MACHINE_LABELS, isMachineId, orderMachine } from "@workspace/print-specs";
import { OdooClient, odooConfig } from "../lib/odoo";
import { readOrder, readSignature, sendQuotation, cancelQuotation, stampApprovedVersion, attachProof, readServices } from "../lib/odoo-checkout";
import { designHash } from "../lib/design-hash";
import { linesFor } from "../lib/checkout-verdict";
import { designArtistFee, getArtistDesignById, getArtist } from "@workspace/print-specs";
import { applyOdooPayment, paymentStateOf } from "./odoo-webhook";

const router: IRouter = Router();

function hasKey(req: Request): boolean {
  return checkInternalKey(req.headers["x-internal-key"] ?? req.query.key);
}

/**
 * Diseño de artista del pedido para el panel: título, artista y «provisorio»
 * salen del catálogo (por id), no de lo que mandó el navegador. Así el aviso
 * «no producir hasta tener el archivo» no depende del cliente y se apaga solo
 * cuando el artista entrega el archivo final. Un id desconocido se muestra tal cual.
 */
function artistDesignView(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const ref = raw as Record<string, unknown>;
  const design = getArtistDesignById(typeof ref.id === "string" ? ref.id : null);
  if (!design) return ref;
  return {
    ...ref,
    id: design.id,
    title: design.title,
    artistId: design.artistId,
    artistName: getArtist(design.artistId)?.name ?? design.artistId,
    provisional: design.provisional === true,
  };
}

// GET /api/admin/orders — listado para el panel (interno).
// `?machine=laser|dacen|eufy` filtra la cola de trabajo de una máquina.
router.get("/api/admin/orders", async (req, res) => {
  if (!hasKey(req)) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const machineFilter = isMachineId(req.query.machine) ? req.query.machine : null;
  try {
    const rows = await db.query.ordersTable.findMany({
      orderBy: desc(ordersTable.createdAt),
      // La máquina vive en el JSON de designState: con filtro se miran más
      // pedidos para que la cola de una máquina no quede corta.
      limit: machineFilter ? 1000 : 200,
      columns: {
        orderNumber: true,
        status: true,
        product: true,
        material: true,
        color: true,
        technique: true,
        customText: true,
        font: true,
        iconName: true,
        hasUploadedImage: true,
        previewImagePath: true,
        productionFilePath: true,
        designState: true,
        createdAt: true,
        odooOrderId: true,
        odooOrderName: true,
        odooTotal: true,
        odooPaymentState: true,
        odooPaymentAt: true,
        verdict: true,
        verdictReasons: true,
        reviewState: true,
        reviewNote: true,
        approvedHash: true,
        approvedAt: true,
        approvedBy: true,
      },
    });
    const list = rows
      .map(r => ({ r, machine: orderMachine(r.designState) }))
      .filter(x => !machineFilter || x.machine === machineFilter)
      .slice(0, 200);
    res.json(
      list.map(({ r: { designState, ...r }, machine }) => {
        // Datos legibles que el personalizador guarda dentro del snapshot.
        const ds = (designState ?? {}) as Record<string, unknown>;
        const str = (v: unknown) => (typeof v === "string" && v ? v : null);
        return {
          ...r,
          machine,
          machineLabel: MACHINE_LABELS[machine],
          createdAt: r.createdAt.toISOString(),
          odooPaymentAt: r.odooPaymentAt ? r.odooPaymentAt.toISOString() : null,
          approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
          // La versión actual coincide con la aprobada (si cambió, es una versión nueva sin aprobar).
          approvedCurrent: r.approvedHash ? r.approvedHash === designHash(designState) : null,
          artistDesign: artistDesignView(ds.artistDesign),
          // Servicios que el taller puede tener que cotizar al aprobar.
          serviceCodes: (() => { const l = linesFor(ds); return [l.colorCode, l.artistCode].filter(Boolean); })(),
          size: str(ds.sizeLabel) ?? str(ds.sizeId),
          ownProduct: ds.ownProduct === true,
          estimate: str(ds.engravingEstimate),
          imageToken: r.previewImagePath ? orderImageToken(r.orderNumber) : null,
          hasPreview: !!r.previewImagePath,
          hasProduction: !!r.productionFilePath,
          productionKind: r.productionFilePath?.endsWith("-vector.svg") ? "vector"
            : r.productionFilePath?.endsWith(".png") ? "png"
            : r.productionFilePath?.endsWith(".jpg") ? "jpg"
            : r.productionFilePath?.endsWith(".dxf") ? "dxf" : "svg",
          previewImagePath: undefined,
          productionFilePath: undefined,
        };
      }),
    );
  } catch (err) {
    logger.error({ err }, "admin: list failed");
    res.status(500).json({ message: "No se pudo listar los pedidos" });
  }
});

const STATUSES = ["nueva", "en_proceso", "completada", "cancelada"] as const;
type Status = (typeof STATUSES)[number];

// PATCH /api/admin/orders/:orderNumber — cambia el estado del pedido (interno).
router.patch("/api/admin/orders/:orderNumber", async (req, res) => {
  if (!hasKey(req)) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const status = (req.body as { status?: unknown } | undefined)?.status;
  if (typeof status !== "string" || !STATUSES.includes(status as Status)) {
    res.status(400).json({ message: "Estado inválido" });
    return;
  }
  try {
    const [row] = await db
      .update(ordersTable)
      .set({ status: status as Status })
      .where(eq(ordersTable.orderNumber, req.params.orderNumber))
      .returning({ orderNumber: ordersTable.orderNumber, status: ordersTable.status });
    if (!row) {
      res.status(404).json({ message: "Pedido no encontrado" });
      return;
    }
    res.json(row);
  } catch (err) {
    logger.error({ err }, "admin: status update failed");
    res.status(500).json({ message: "No se pudo actualizar el estado" });
  }
});

// POST /api/admin/orders/:orderNumber/odoo-refresh — «Actualizar pago»:
// respaldo del webhook. Lee el pedido en Odoo (solo lectura) y aplica el
// estado en la base de la landing. Nunca escribe en Odoo.
router.post("/api/admin/orders/:orderNumber/odoo-refresh", async (req, res) => {
  if (!hasKey(req)) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const cfg = odooConfig();
  if (!cfg) {
    res.status(503).json({ message: "Odoo no está configurado" });
    return;
  }
  try {
    const row = await db.query.ordersTable.findFirst({
      where: eq(ordersTable.orderNumber, req.params.orderNumber),
      columns: { odooOrderId: true },
    });
    if (!row) {
      res.status(404).json({ message: "Pedido no encontrado" });
      return;
    }
    if (!row.odooOrderId) {
      res.status(409).json({ message: "Este pedido no tiene pedido de venta en Odoo (fue por WhatsApp)" });
      return;
    }
    const info = await readOrder(new OdooClient(cfg), row.odooOrderId);
    if (!info) {
      res.status(404).json({ message: "El pedido ya no existe en Odoo" });
      return;
    }
    const client = new OdooClient(cfg);
    const signed = info.paid ? (await readSignature(client, info.id)).signed : false;
    const result = await applyOdooPayment(info, signed);
    res.json({ orderNumber: req.params.orderNumber, odooOrderName: info.name, odooTotal: info.amountTotal, odooPaymentState: paymentStateOf(info, signed), changed: result.changed });
  } catch (err) {
    logger.error({ err }, "admin: odoo refresh failed");
    res.status(502).json({ message: "No se pudo consultar Odoo" });
  }
});

// ── Revisión del taller (PROMPT-ODOO-TIENDA §3) ─────────────────────────────

/** Servicios cuyo precio puede completar el taller al aprobar (nunca la pieza). */
const SERVICE_CODE_RE = /^(GRAB-[A-Z]+|IMP-COLOR-[A-Z0-9]+|DISENO-ARTISTA-[A-Z0-9-]+)$/;

const ApproveBody = z.object({
  /** Quién aprueba (queda registrado). */
  approvedBy: z.string().trim().min(2).max(120),
  /** Precios faltantes, solo de servicios: [{ code: "IMP-COLOR-360", price: 45000 }]. */
  servicePrices: z.array(z.object({ code: z.string().regex(SERVICE_CODE_RE), price: z.number().positive().max(100_000_000) })).max(10).optional(),
  /** Prueba que armó el taller (data URL JPEG/PNG); sin ella queda la automática. */
  proofImage: z.string().max(8_000_000).optional(),
});

async function reviewTarget(orderNumber: string) {
  return db.query.ordersTable.findFirst({
    where: eq(ordersTable.orderNumber, orderNumber),
    columns: { id: true, orderNumber: true, odooOrderId: true, reviewState: true, odooPaymentState: true, designState: true },
  });
}

// POST /api/admin/orders/:cs/approve — «Aprobar y enviar presupuesto».
router.post("/api/admin/orders/:orderNumber/approve", async (req, res) => {
  if (!hasKey(req)) { res.status(401).json({ message: "No autorizado" }); return; }
  const parsed = ApproveBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Datos inválidos: falta quién aprueba o un precio no es de un servicio" }); return; }
  const cfg = odooConfig();
  if (!cfg) { res.status(503).json({ message: "Odoo no está configurado" }); return; }
  try {
    const row = await reviewTarget(req.params.orderNumber);
    if (!row) { res.status(404).json({ message: "Pedido no encontrado" }); return; }
    if (!row.odooOrderId) { res.status(409).json({ message: "Este pedido no tiene presupuesto en Odoo" }); return; }
    if (row.reviewState !== "en_revision") { res.status(409).json({ message: `El pedido no está en revisión (${row.reviewState ?? "sin revisión"})` }); return; }
    const client = new OdooClient(cfg);
    const info = await readOrder(client, row.odooOrderId);
    if (!info || info.state === "cancel") { res.status(409).json({ message: "El presupuesto ya no está activo en Odoo" }); return; }

    // Precios faltantes: se agregan como líneas del servicio con su precio y
    // se borra la nota «a cotizar» de ese concepto.
    const prices = parsed.data.servicePrices ?? [];
    if (prices.length) {
      const services = await readServices(client, prices.map(p => p.code));
      const missing = prices.filter(p => !services[p.code]).map(p => p.code);
      if (missing.length) { res.status(409).json({ message: `Faltan en Odoo los servicios ${missing.join(", ")} (correr scripts/odoo-setup.mjs)` }); return; }
      for (const p of prices) {
        await client.call("sale.order.line", "create", [{ order_id: info.id, product_id: services[p.code].id, product_uom_qty: 1, price_unit: p.price }]);
      }
      const notes = await client.call<Array<{ id: number; name: string }>>("sale.order.line", "search_read",
        [[["order_id", "=", info.id], ["display_type", "=", "line_note"], ["name", "ilike", "a cotizar"]]], { fields: ["name"] });
      if (notes.length) await client.call("sale.order.line", "unlink", [notes.map(n => n.id)]);
    }
    const unpriced = await client.call<number>("sale.order.line", "search_count",
      [[["order_id", "=", info.id], ["display_type", "=", "line_note"], ["name", "ilike", "a cotizar"]]]);
    if (unpriced > 0) { res.status(409).json({ message: "Quedan líneas «a cotizar»: completá su precio antes de aprobar" }); return; }

    if (parsed.data.proofImage) {
      const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(parsed.data.proofImage);
      if (!m) { res.status(400).json({ message: "La prueba tiene que ser una imagen JPEG o PNG" }); return; }
      await attachProof(client, info.id, { name: `Prueba aprobada ${row.orderNumber}.${m[1] === "image/png" ? "png" : "jpg"}`, mimetype: m[1], base64: m[2] });
    }

    const hash = designHash(row.designState);
    await stampApprovedVersion(client, info.id, hash, parsed.data.approvedBy);
    await sendQuotation(client, info.id);
    const fresh = await readOrder(client, info.id);
    await db.update(ordersTable).set({
      reviewState: "aprobado", approvedHash: hash, approvedAt: new Date(), approvedBy: parsed.data.approvedBy,
      ...(fresh ? { odooTotal: String(fresh.amountTotal) } : {}),
    }).where(eq(ordersTable.id, row.id));
    logger.info({ orderNumber: row.orderNumber, odoo: info.name, by: parsed.data.approvedBy }, "admin: diseño aprobado y presupuesto enviado");
    res.json({ orderNumber: row.orderNumber, reviewState: "aprobado", approvedHash: hash, odooTotal: fresh?.amountTotal ?? info.amountTotal });
  } catch (err) {
    logger.error({ err }, "admin: approve failed");
    res.status(502).json({ message: err instanceof Error ? err.message : "No se pudo aprobar en Odoo" });
  }
});

// POST /api/admin/orders/:cs/reject — «Pedir cambios»: cancela el presupuesto con el motivo.
router.post("/api/admin/orders/:orderNumber/reject", async (req, res) => {
  if (!hasKey(req)) { res.status(401).json({ message: "No autorizado" }); return; }
  const reason = z.object({ reason: z.string().trim().min(3).max(1000) }).safeParse(req.body);
  if (!reason.success) { res.status(400).json({ message: "Escribí el motivo (qué tiene que cambiar el cliente)" }); return; }
  const cfg = odooConfig();
  if (!cfg) { res.status(503).json({ message: "Odoo no está configurado" }); return; }
  try {
    const row = await reviewTarget(req.params.orderNumber);
    if (!row) { res.status(404).json({ message: "Pedido no encontrado" }); return; }
    if (row.odooPaymentState === "pagado") { res.status(409).json({ message: "El pedido ya está pagado: no se puede rechazar desde acá" }); return; }
    if (row.odooOrderId) await cancelQuotation(new OdooClient(cfg), row.odooOrderId, reason.data.reason);
    await db.update(ordersTable).set({ reviewState: "requiere_cambios", reviewNote: reason.data.reason }).where(eq(ordersTable.id, row.id));
    res.json({ orderNumber: row.orderNumber, reviewState: "requiere_cambios" });
  } catch (err) {
    logger.error({ err }, "admin: reject failed");
    res.status(502).json({ message: err instanceof Error ? err.message : "No se pudo cancelar en Odoo" });
  }
});

// GET /api/admin/artists/settlement?month=YYYY-MM[&format=csv] — «Liquidación
// de artistas»: pedidos PAGADOS (con firma) del mes con diseño de artista,
// agrupados por artista. El honorario sale del catálogo (no del navegador).
router.get("/api/admin/artists/settlement", async (req, res) => {
  if (!hasKey(req)) { res.status(401).json({ message: "No autorizado" }); return; }
  const month = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
    ? req.query.month : new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  try {
    const rows = await db.query.ordersTable.findMany({
      where: and(eq(ordersTable.odooPaymentState, "pagado"), gte(ordersTable.odooPaymentAt, from), lt(ordersTable.odooPaymentAt, to)),
      columns: { orderNumber: true, designState: true, odooPaymentAt: true, odooOrderName: true },
    });
    const byArtist = new Map<string, { artistId: string; artistName: string; copies: number; fee: number; orders: string[] }>();
    for (const r of rows) {
      const ref = (r.designState as Record<string, unknown> | null)?.artistDesign as Record<string, unknown> | undefined;
      if (!ref || typeof ref.id !== "string") continue;
      const design = getArtistDesignById(ref.id);
      const artistId = design?.artistId ?? (typeof ref.artistId === "string" ? ref.artistId : "desconocido");
      const fee = design ? designArtistFee(design) : typeof ref.artistFee === "number" ? ref.artistFee : 0;
      const e = byArtist.get(artistId) ?? { artistId, artistName: getArtist(artistId)?.name ?? artistId, copies: 0, fee: 0, orders: [] };
      e.copies += 1; e.fee += fee; e.orders.push(r.orderNumber);
      byArtist.set(artistId, e);
    }
    const list = [...byArtist.values()].sort((a, b) => b.fee - a.fee);
    if (req.query.format === "csv") {
      const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = ["mes,artista,copias,honorario_gs,pedidos", ...list.map(e => [month, e.artistName, e.copies, e.fee, e.orders.join(" ")].map(q).join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="liquidacion-artistas-${month}.csv"`);
      res.send(`\ufeff${csv}\n`);
      return;
    }
    res.json({ month, artists: list, total: list.reduce((t, e) => t + e.fee, 0) });
  } catch (err) {
    logger.error({ err }, "admin: settlement failed");
    res.status(500).json({ message: "No se pudo armar la liquidación" });
  }
});

// GET /api/admin/products — catálogo completo (con los deshabilitados) para el
// panel (interno). Los deshabilitados que ya no vienen de Odoo también se
// listan, para poder volver a habilitarlos.
router.get("/api/admin/products", async (req, res) => {
  if (!hasKey(req)) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  try {
    const [catalog, disabled] = await Promise.all([getCatalog(), getDisabledProducts()]);
    const products = catalog.products.map(p => ({
      name: p.name,
      brand: p.brand,
      productType: p.productType,
      imageUrl: p.imageUrl,
      variants: p.variants.length,
      inCatalog: true,
      enabled: !disabled.has(p.name),
    }));
    const listed = new Set(products.map(p => p.name));
    for (const name of disabled) {
      if (!listed.has(name)) {
        products.push({ name, brand: "", productType: "", imageUrl: null, variants: 0, inCatalog: false, enabled: false });
      }
    }
    res.json({ source: catalog.source, stale: catalog.stale, updatedAt: catalog.updatedAt, products });
  } catch (err) {
    logger.error({ err }, "admin: products list failed");
    res.status(500).json({ message: "No se pudo listar los productos" });
  }
});

// PATCH /api/admin/products — habilita o deshabilita un producto en la tienda (interno).
router.patch("/api/admin/products", async (req, res) => {
  if (!hasKey(req)) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const body = (req.body ?? {}) as { name?: unknown; enabled?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200 || typeof body.enabled !== "boolean") {
    res.status(400).json({ message: "Datos inválidos" });
    return;
  }
  try {
    await setProductEnabled(name, body.enabled);
    res.json({ name, enabled: body.enabled });
  } catch (err) {
    logger.error({ err }, "admin: product toggle failed");
    res.status(500).json({ message: "No se pudo actualizar el producto" });
  }
});

// GET /api/admin (y /admin) — shell HTML autocontenido (sin datos hasta
// autenticar). La ruta canónica es /api/admin: en el deployment de Replit el
// edge sirve estáticamente todo lo que no empieza con /api/* (con fallback
// SPA), así que /admin a secas nunca llega a este server en producción;
// se conserva igual para desarrollo y para un hosting propio.
const servePage = (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(ADMIN_HTML);
};
router.get("/api/admin", servePage);
router.get("/admin", servePage);

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Panel · Creativa Studio</title>
<style>
  :root { --brand:#8B1A2F; --ink:#1A1614; --muted:#69707c; --line:#e7e2d9; --bg:#faf7f2; }
  * { box-sizing:border-box; margin:0; }
  body { font:15px/1.5 system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--ink); }
  .wrap { max-width:1100px; margin:0 auto; padding:24px 16px 64px; }
  h1 { font-size:22px; font-weight:600; }
  .sub { color:var(--muted); font-size:13px; margin-top:2px; }
  header.bar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
  button, input { font:inherit; }
  .btn { display:inline-flex; align-items:center; gap:6px; min-height:40px; padding:8px 14px; border-radius:10px;
         border:1px solid var(--line); background:#fff; color:var(--ink); cursor:pointer; text-decoration:none; font-size:13px; }
  .btn:hover { border-color:var(--brand); color:var(--brand); }
  .btn.primary { background:var(--brand); border-color:var(--brand); color:#fff; }
  .btn.primary:hover { filter:brightness(0.92); color:#fff; }
  .btn[aria-disabled="true"] { opacity:.4; pointer-events:none; }
  /* Login */
  #login { max-width:360px; margin:12vh auto 0; background:#fff; border:1px solid var(--line); border-radius:16px; padding:28px; }
  #login h1 { margin-bottom:4px; }
  #login p { color:var(--muted); font-size:13px; margin-bottom:18px; }
  #login input { width:100%; min-height:44px; padding:10px 12px; border:1px solid var(--line); border-radius:10px; margin-bottom:12px; font-size:16px; }
  #login .btn { width:100%; justify-content:center; }
  #loginError { color:var(--brand); font-size:13px; margin-top:10px; display:none; }
  /* Lista */
  #panel { display:none; }
  .tools { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
  .tools input { flex:1; min-width:200px; min-height:44px; padding:10px 12px; border:1px solid var(--line); border-radius:10px; font-size:16px; background:#fff; }
  .card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:14px 16px; margin-bottom:12px;
          display:grid; grid-template-columns:72px 1fr auto; gap:14px; align-items:center; }
  .thumb { width:72px; height:72px; border-radius:10px; object-fit:cover; background:var(--bg); border:1px solid var(--line); }
  .thumb.empty { display:grid; place-items:center; color:var(--muted); font-size:11px; text-align:center; }
  .num { font-weight:700; }
  .badge { display:inline-block; font-size:11px; text-transform:uppercase; letter-spacing:.06em; padding:2px 8px;
           border-radius:999px; border:1px solid var(--line); color:var(--muted); margin-left:8px; vertical-align:2px; }
  .badge.nueva { border-color:var(--brand); color:var(--brand); }
  .status { min-height:40px; padding:6px 10px; border:1px solid var(--line); border-radius:10px; background:#fff; font-size:13px; }
  .chips { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
  .chip { min-height:36px; padding:6px 12px; border:1px solid var(--line); border-radius:999px; background:#fff; font:inherit; font-size:13px; cursor:pointer; }
  .chip[aria-pressed="true"] { background:var(--ink); color:#fff; border-color:var(--ink); }
  .tag.machine { background:#eef1f5; color:#33404f; }
  .tag.pago { background:#fff4e5; color:#8a4b00; }
  .tag.pago.pagado { background:#e6f4ea; color:#1e6b3a; }
  .tag.pago.sinfirma, .tag.alerta { background:#fde8e8; color:#9b1c1c; }
  .tag.revision { background:#fff4e5; color:#8a4b00; }
  .review { margin-top:8px; padding:8px 10px; border:1px solid #f1d9b5; background:#fffaf2; border-radius:10px; font-size:13px; }
  .review ul { margin:4px 0 0 18px; padding:0; }
  .warn { margin-top:6px; font-size:13px; color:#9b1c1c; }
  table.liq { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); border-radius:12px; overflow:hidden; font-size:14px; }
  table.liq th, table.liq td { padding:10px 12px; border-bottom:1px solid var(--line); text-align:left; }
  table.liq td.n { text-align:right; font-variant-numeric:tabular-nums; }
  .tag { display:inline-block; font-size:11px; padding:1px 7px; border-radius:6px; background:#f5eaec; color:var(--brand); margin-left:6px; }
  .meta { color:var(--muted); font-size:13px; margin-top:2px; }
  .text { font-size:13px; margin-top:4px; }
  .actions { display:flex; flex-direction:column; gap:8px; }
  .empty-state { text-align:center; color:var(--muted); padding:48px 0; }
  /* Pestañas */
  .tabs { display:flex; gap:6px; margin-bottom:18px; border-bottom:1px solid var(--line); }
  .tab { min-height:40px; padding:8px 14px; border:0; border-bottom:2px solid transparent; background:none;
         color:var(--muted); cursor:pointer; font-size:14px; margin-bottom:-1px; }
  .tab[aria-selected="true"] { color:var(--brand); border-bottom-color:var(--brand); font-weight:600; }
  /* Productos */
  .card.product { grid-template-columns:56px 1fr auto; }
  .card.product .thumb { width:56px; height:56px; object-fit:contain; }
  .card.off { opacity:.6; }
  .badge.off { border-color:var(--brand); color:var(--brand); }
  .switch { display:inline-flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; min-height:40px; user-select:none; }
  .switch input { position:absolute; opacity:0; width:1px; height:1px; }
  .switch .track { width:40px; height:22px; border-radius:999px; background:#d9d4cb; position:relative; transition:background .15s; flex:none; }
  .switch .track::after { content:""; position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition:transform .15s; }
  .switch input:checked + .track { background:#2e7d4f; }
  .switch input:checked + .track::after { transform:translateX(18px); }
  .switch input:focus-visible + .track { outline:2px solid var(--brand); outline-offset:2px; }
  .switch input:disabled + .track { opacity:.5; }
  .note { color:var(--muted); font-size:13px; margin-bottom:14px; }
  @media (max-width:640px) {
    .card.product { grid-template-columns:48px 1fr; }
    .card.product .thumb { width:48px; height:48px; }
  }
  @media (max-width:640px) {
    .card { grid-template-columns:56px 1fr; }
    .thumb { width:56px; height:56px; }
    .actions { grid-column:1 / -1; flex-direction:row; flex-wrap:wrap; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div id="login">
    <h1>Panel de pedidos</h1>
    <p>Acceso interno</p>
    <form id="loginForm">
      <input id="pw" type="password" placeholder="Contraseña" autocomplete="current-password" autofocus>
      <button class="btn primary" type="submit">Entrar</button>
      <div id="loginError">Contraseña incorrecta.</div>
    </form>
  </div>

  <div id="panel">
    <header class="bar">
      <div>
        <h1 id="title">Pedidos</h1>
        <div class="sub" id="count"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" id="refresh">Actualizar</button>
        <button class="btn" id="logout">Salir</button>
      </div>
    </header>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" id="tabOrders" aria-selected="true">Pedidos</button>
      <button class="tab" role="tab" id="tabProducts" aria-selected="false">Productos</button>
      <button class="tab" role="tab" id="tabArtists" aria-selected="false">Liquidación de artistas</button>
    </div>
    <div id="ordersView">
      <div class="tools">
        <input id="search" type="search" placeholder="Buscar por número, producto, texto…">
      </div>
      <div class="chips" id="machineFilter" role="group" aria-label="Filtrar por máquina">
        <button class="chip" type="button" data-machine="">Todas</button>
        <button class="chip" type="button" data-machine="laser">Láser CO2</button>
        <button class="chip" type="button" data-machine="dacen">Dacen F5</button>
        <button class="chip" type="button" data-machine="eufy">eufyMake E1</button>
      </div>
      <div id="list"></div>
    </div>
    <div id="artistsView" style="display:none">
      <p class="note">Pedidos <b>pagados</b> (con la prueba firmada) del mes con diseño de artista. Gs. 10.000 por copia, salvo que el diseño diga otro honorario.</p>
      <div class="chips">
        <input id="liqMonth" type="month" style="min-height:40px;padding:6px 10px;border:1px solid var(--line);border-radius:10px">
        <a class="btn" id="liqCsv" href="#">Descargar CSV</a>
      </div>
      <div id="liqList"></div>
    </div>
    <div id="productsView" style="display:none">
      <p class="note">Los productos deshabilitados no aparecen en el personalizador de la tienda. El cambio puede tardar hasta 2 minutos en verse.</p>
      <div class="tools">
        <input id="productSearch" type="search" placeholder="Buscar producto…">
      </div>
      <div id="productList"></div>
    </div>
  </div>
</div>
<script>
(function () {
  var KEY = "cs-admin-key";
  var login = document.getElementById("login");
  var panel = document.getElementById("panel");
  var list = document.getElementById("list");
  var orders = [];

  function key() { return sessionStorage.getItem(KEY) || ""; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString("es-PY", { day:"2-digit", month:"2-digit", year:"numeric" }) +
        " " + d.toLocaleTimeString("es-PY", { hour:"2-digit", minute:"2-digit" });
    } catch (e) { return iso; }
  }

  var MACHINE_NAMES = { laser: "Láser CO2", dacen: "Dacen F5", eufy: "eufyMake E1" };
  // Filtro por máquina: vive en la URL (?machine=dacen) para poder dejar
  // abierta la cola de una máquina y recargarla.
  var machine = new URLSearchParams(location.search).get("machine") || "";
  if (!MACHINE_NAMES[machine]) machine = "";
  // Link del mensaje de WhatsApp (/admin?pedido=CS-0016): abre el panel
  // filtrado en ese pedido, con su archivo de producción (DXF, PNG, SVG).
  var pedido = (new URLSearchParams(location.search).get("pedido") || "").toUpperCase();
  if (!/^CS-[0-9]{1,8}$/.test(pedido)) pedido = "";

  function fileLabel(o) {
    if (o.productionKind === "png") return o.machine === "dacen" ? "PNG 360° para RIPrint (Dacen)" : "PNG para eufyMake";
    if (o.productionKind === "vector") return "SVG vectorial 360° (Dacen)";
    if (o.productionKind === "jpg") return "JPG 360° para RIPrint (Dacen)";
    if (o.productionKind === "dxf") return "DXF láser";
    return o.machine === "dacen" ? "SVG referencia (Dacen)" : "SVG láser";
  }

  function paintChips() {
    var chips = document.querySelectorAll("#machineFilter .chip");
    for (var i = 0; i < chips.length; i++) {
      chips[i].setAttribute("aria-pressed", chips[i].getAttribute("data-machine") === machine ? "true" : "false");
    }
  }

  function render(filter) {
    var q = (filter || "").toLowerCase();
    var rows = orders.slice().sort(function (a, b) {
      // Arriba lo que espera al taller: en revisión y pagos sin firma.
      var w = function (o) { return o.reviewState === "en_revision" || o.odooPaymentState === "pago_sin_firma" || o.odooPaymentState === "confirmado_sin_pago" ? 0 : 1; };
      return w(a) - w(b);
    }).filter(function (o) {
      if (!q) return true;
      return [o.orderNumber, o.status, o.product, o.size, o.material, o.technique, o.customText, o.font, o.iconName]
        .join(" ").toLowerCase().indexOf(q) >= 0;
    });
    document.getElementById("count").textContent =
      rows.length + " de " + orders.length + " pedidos" +
      (machine ? " · " + MACHINE_NAMES[machine] : "") + " (últimos 200)";
    if (!rows.length) {
      list.innerHTML = '<div class="empty-state">Sin pedidos que coincidan.</div>';
      return;
    }
    list.innerHTML = rows.map(function (o) {
      var imgUrl = "/api/orders/" + esc(o.orderNumber) + "/image?t=" + esc(o.imageToken);
      var img = o.hasPreview
        ? '<img class="thumb" loading="lazy" alt="" src="' + imgUrl + '">'
        : '<div class="thumb empty">sin preview</div>';
      var detalles = [o.size, o.material, o.color, o.technique].filter(Boolean).map(esc).join(" · ");
      var extra = [];
      if (o.customText) extra.push('Texto: “' + esc(o.customText) + '”' + (o.font ? " (" + esc(o.font) + ")" : ""));
      if (o.iconName) extra.push("Ícono: " + esc(o.iconName));
      if (o.hasUploadedImage) extra.push("Logo/foto adjunta");
      if (o.estimate) extra.push("Precio estimado: " + esc(o.estimate));
      var PAY = { pagado: ["pagado", "Pagado"], pago_sin_firma: ["sinfirma", "Pago sin aceptación: revisar"], confirmado_sin_pago: ["sinfirma", "Confirmado sin pago: revisar"] };
      var pay = PAY[o.odooPaymentState] || ["", "Pendiente de pago"];
      var odooTag = o.odooOrderName
        ? '<span class="tag pago ' + pay[0] + '">Odoo ' + esc(o.odooOrderName) +
          " · " + pay[1] +
          (o.odooTotal ? " · Gs. " + Number(o.odooTotal).toLocaleString("es-PY") : "") + "</span>"
        : "";
      var refreshBtn = o.odooOrderName
        ? '<button type="button" class="btn refresh" data-order="' + esc(o.orderNumber) + '">Actualizar pago</button>'
        : "";
      var svgBtn = o.hasProduction
        ? '<a class="btn primary" href="/api/orders/' + esc(o.orderNumber) + '/production-file?key=' +
          encodeURIComponent(key()) + '" download>' +
          fileLabel(o) + '</a>'
        : '<span class="btn" aria-disabled="true">Archivo no generado</span>';
      // Láser: junto al DXF queda el SVG de referencia (con el logo embebido).
      if (o.hasProduction && o.productionKind === "dxf") {
        svgBtn += '<a class="btn" href="/api/orders/' + esc(o.orderNumber) + '/production-file?formato=svg&key=' +
          encodeURIComponent(key()) + '" download>SVG referencia</a>';
      }
      // Dacen: el SVG trae la imagen + textos y logos en curvas; el PNG va aparte.
      if (o.hasProduction && o.productionKind === "vector") {
        svgBtn += '<a class="btn" href="/api/orders/' + esc(o.orderNumber) + '/production-file?formato=png&key=' +
          encodeURIComponent(key()) + '" download>PNG imagen (Dacen)</a>';
      }
      var imgBtn = o.hasPreview
        ? '<a class="btn" href="' + imgUrl + '" download="' +
          esc(o.orderNumber) + '-preview.jpg">Imagen preview</a>'
        : "";
      var REVIEW = { en_revision: "En revisión", aprobado: "Aprobado", requiere_cambios: "Requiere cambios" };
      var reviewTag = o.reviewState ? '<span class="tag revision">' + REVIEW[o.reviewState] + "</span>" : "";
      var reasons = (o.verdictReasons || []).map(function (r) { return "<li>" + esc(r.message) + "</li>"; }).join("");
      var review = "";
      if (o.verdict) {
        review = '<div class="review"><b>Veredicto: ' + esc(o.verdict) + "</b>" + (reasons ? "<ul>" + reasons + "</ul>" : "") +
          (o.reviewNote ? '<div class="meta">Cambios pedidos: ' + esc(o.reviewNote) + "</div>" : "") +
          (o.approvedHash ? '<div class="meta">Versión aprobada (' + esc(o.approvedBy || "") + (o.approvedAt ? ", " + fmtDate(o.approvedAt) : "") + "): " + esc(o.approvedHash.slice(0, 12)) + "…</div>" : "") +
          "</div>";
      }
      if (o.approvedCurrent === false) review += '<div class="warn">El diseño cambió después de aprobarse: es una versión nueva sin aprobar. Producí la versión aprobada.</div>';
      if (o.odooPaymentState === "pago_sin_firma") review += '<div class="warn">Pagó sin firmar la prueba: no producir hasta confirmar con el cliente.</div>';
      if (o.odooPaymentState === "confirmado_sin_pago") review += '<div class="warn">Odoo lo confirmó pero no hay un pago capturado que cubra el total: no producir hasta cobrarlo.</div>';
      var ad = o.artistDesign;
      if (ad) {
        review += '<div class="meta">Diseño de artista: ' + esc(ad.title || ad.id) + " · " + esc(ad.artistName || ad.artistId || "") + "</div>" +
          (ad.provisional ? '<div class="warn">Falta el archivo plano del artista: no producir hasta tenerlo.</div>' : "");
      }
      var reviewBtns = o.reviewState === "en_revision"
        ? '<button type="button" class="btn primary approve" data-order="' + esc(o.orderNumber) + '">Aprobar y enviar presupuesto</button>' +
          '<button type="button" class="btn reject" data-order="' + esc(o.orderNumber) + '">Pedir cambios</button>'
        : "";
      return '<div class="card">' + img +
        '<div><span class="num">' + esc(o.orderNumber) + '</span>' +
        '<span class="badge ' + esc(o.status) + '">' + esc(o.status).replace("_", " ") + "</span>" +
        '<span class="tag machine">' + esc(o.machineLabel || "") + "</span>" +
        (o.ownProduct ? '<span class="tag">Trae su producto</span>' : "") + odooTag + reviewTag +
        '<div class="meta">' + esc(o.product) + " — " + detalles + "</div>" +
        '<div class="meta">' + fmtDate(o.createdAt) + "</div>" +
        (extra.length ? '<div class="text">' + extra.join(" · ") + "</div>" : "") + review +
        "</div>" +
        '<div class="actions">' + reviewBtns + statusSelect(o) + svgBtn + imgBtn + refreshBtn + "</div>" +
        "</div>";
    }).join("");
  }

  var STATUS_LABELS = { nueva: "Nueva", en_proceso: "En proceso", completada: "Completada", cancelada: "Cancelada" };
  function statusSelect(o) {
    return '<select class="status" data-order="' + esc(o.orderNumber) + '" aria-label="Estado del pedido">' +
      Object.keys(STATUS_LABELS).map(function (s) {
        return '<option value="' + s + '"' + (s === o.status ? " selected" : "") + ">" + STATUS_LABELS[s] + "</option>";
      }).join("") + "</select>";
  }

  // «Actualizar pago»: consulta Odoo para ese pedido (respaldo del webhook).
  list.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("button.refresh") : null;
    if (!btn) return;
    var num = btn.getAttribute("data-order");
    btn.disabled = true; btn.textContent = "Consultando…";
    fetch("/api/admin/orders/" + encodeURIComponent(num) + "/odoo-refresh", {
      method: "POST", headers: { "x-internal-key": key() },
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || ("http " + r.status)); return j; }); })
      .then(function (j) {
        var order = orders.filter(function (o) { return o.orderNumber === num; })[0];
        if (order) { order.odooOrderName = j.odooOrderName; order.odooTotal = j.odooTotal; order.odooPaymentState = j.odooPaymentState; }
        render(document.getElementById("search").value);
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = "Actualizar pago";
        alert("No se pudo actualizar: " + err.message);
      });
  });

  // «Aprobar y enviar presupuesto» / «Pedir cambios» (revisión del taller).
  function post(url, body) {
    return fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-internal-key": key() }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || ("http " + r.status)); return j; }); });
  }
  list.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("button.approve, button.reject") : null;
    if (!btn) return;
    var num = btn.getAttribute("data-order");
    var order = orders.filter(function (o) { return o.orderNumber === num; })[0];
    if (!order) return;
    var base = "/api/admin/orders/" + encodeURIComponent(num);
    var done = function () { load().catch(function () {}); };
    var fail = function (err) { btn.disabled = false; alert("No se pudo: " + err.message); };
    if (btn.classList.contains("reject")) {
      var reason = prompt("¿Qué tiene que cambiar el cliente? (se cancela el presupuesto)");
      if (!reason) return;
      btn.disabled = true;
      post(base + "/reject", { reason: reason }).then(done, fail);
      return;
    }
    var who = prompt("¿Quién aprueba? (queda registrado)");
    if (!who) return;
    var unpriced = (order.verdictReasons || []).some(function (r) { return r.code.indexOf("unpriced:") === 0; });
    var prices = [];
    if (unpriced) {
      for (var i = 0; i < (order.serviceCodes || []).length; i++) {
        var code = order.serviceCodes[i];
        var v = prompt("Precio de " + code + " en Gs. (vacío si ya lo cargaste en Odoo)");
        if (v === null) return;
        var n = Number(String(v).replace(/[^0-9]/g, ""));
        if (n > 0) prices.push({ code: code, price: n });
      }
    }
    if (!confirm("Se envía el presupuesto al cliente para firmar y pagar. ¿Seguir?")) return;
    btn.disabled = true; btn.textContent = "Enviando…";
    post(base + "/approve", { approvedBy: who, servicePrices: prices }).then(done, fail);
  });

  // Cambio de estado: PATCH y, si falla, vuelve el select a su valor previo.
  list.addEventListener("change", function (e) {
    var sel = e.target;
    if (!sel.classList || !sel.classList.contains("status")) return;
    var num = sel.getAttribute("data-order");
    var order = orders.filter(function (o) { return o.orderNumber === num; })[0];
    var prev = order ? order.status : sel.value;
    sel.disabled = true;
    fetch("/api/admin/orders/" + encodeURIComponent(num), {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-internal-key": key() },
      body: JSON.stringify({ status: sel.value }),
    }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      if (order) order.status = sel.value;
      render(document.getElementById("search").value);
    }).catch(function () {
      sel.value = prev;
      sel.disabled = false;
      alert("No se pudo cambiar el estado. Probá de nuevo.");
    });
  });

  function load() {
    paintChips();
    var url = "/api/admin/orders" + (machine ? "?machine=" + encodeURIComponent(machine) : "");
    return fetch(url, { headers: { "x-internal-key": key() } }).then(function (r) {
      if (r.status === 401) throw new Error("unauthorized");
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (data) {
      orders = data;
      login.style.display = "none";
      panel.style.display = "block";
      if (pedido) { document.getElementById("search").value = pedido; pedido = ""; }
      if (view === "orders") render(document.getElementById("search").value);
    });
  }

  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    sessionStorage.setItem(KEY, document.getElementById("pw").value);
    load().catch(function () {
      sessionStorage.removeItem(KEY);
      document.getElementById("loginError").style.display = "block";
    });
  });
  document.getElementById("search").addEventListener("input", function (e) { render(e.target.value); });
  document.getElementById("machineFilter").addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".chip") : null;
    if (!btn) return;
    machine = btn.getAttribute("data-machine") || "";
    var u = new URL(location.href);
    if (machine) u.searchParams.set("machine", machine); else u.searchParams.delete("machine");
    history.replaceState(null, "", u.toString());
    load().catch(function () {});
  });
  document.getElementById("refresh").addEventListener("click", function () {
    if (view === "products") loadProducts();
    else load().catch(function () {});
  });
  document.getElementById("logout").addEventListener("click", function () {
    sessionStorage.removeItem(KEY);
    panel.style.display = "none";
    login.style.display = "block";
    document.getElementById("pw").value = "";
    document.getElementById("loginError").style.display = "none";
  });

  // ── Productos: habilitar / deshabilitar ────────────────────────────────────
  var productList = document.getElementById("productList");
  var products = [];
  var productsInfo = null;
  var view = "orders";

  function renderProducts(filter) {
    var q = (filter || "").toLowerCase();
    var rows = products.filter(function (p) {
      return !q || [p.name, p.brand, p.productType].join(" ").toLowerCase().indexOf(q) >= 0;
    });
    var off = products.filter(function (p) { return !p.enabled; }).length;
    document.getElementById("count").textContent =
      products.length + " productos · " + off + " deshabilitado" + (off === 1 ? "" : "s") +
      (productsInfo && productsInfo.stale ? " · catálogo desactualizado (Odoo no respondió)" : "");
    if (!rows.length) {
      productList.innerHTML = '<div class="empty-state">' +
        (products.length ? "Sin productos que coincidan." : "No hay productos en el catálogo.") + "</div>";
      return;
    }
    productList.innerHTML = rows.map(function (p) {
      var img = p.imageUrl
        ? '<img class="thumb" loading="lazy" alt="" src="' + esc(p.imageUrl) + '">'
        : '<div class="thumb empty">sin foto</div>';
      var meta = [p.brand, p.productType, p.variants ? p.variants + " variante" + (p.variants === 1 ? "" : "s") : ""]
        .filter(Boolean).map(esc).join(" · ");
      return '<div class="card product' + (p.enabled ? "" : " off") + '">' + img +
        '<div><span class="num">' + esc(p.name) + "</span>" +
        (p.enabled ? "" : '<span class="badge off">Deshabilitado</span>') +
        (p.inCatalog ? "" : '<span class="tag">Ya no está en Odoo</span>') +
        (meta ? '<div class="meta">' + meta + "</div>" : "") + "</div>" +
        '<div class="actions"><label class="switch"><input type="checkbox" class="toggle" data-name="' + esc(p.name) + '"' +
        (p.enabled ? " checked" : "") + '><span class="track"></span><span>' +
        (p.enabled ? "Habilitado" : "Deshabilitado") + "</span></label></div>" +
        "</div>";
    }).join("");
  }

  function loadProducts() {
    productList.innerHTML = '<div class="empty-state">Cargando productos…</div>';
    return fetch("/api/admin/products", { headers: { "x-internal-key": key() } }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (data) {
      productsInfo = data;
      products = data.products;
      renderProducts(document.getElementById("productSearch").value);
    }).catch(function () {
      productList.innerHTML = '<div class="empty-state">No se pudo cargar el catálogo. Probá con Actualizar.</div>';
    });
  }

  productList.addEventListener("change", function (e) {
    var box = e.target;
    if (!box.classList || !box.classList.contains("toggle")) return;
    var name = box.getAttribute("data-name");
    var p = products.filter(function (x) { return x.name === name; })[0];
    var enabled = box.checked;
    box.disabled = true;
    fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-internal-key": key() },
      body: JSON.stringify({ name: name, enabled: enabled }),
    }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      if (p) p.enabled = enabled;
      renderProducts(document.getElementById("productSearch").value);
    }).catch(function () {
      box.checked = !enabled;
      box.disabled = false;
      alert("No se pudo cambiar el producto. Probá de nuevo.");
    });
  });

  // ── Liquidación de artistas ────────────────────────────────────────────────
  var liqMonth = document.getElementById("liqMonth");
  liqMonth.value = new Date().toISOString().slice(0, 7);
  function loadArtists() {
    var m = liqMonth.value;
    document.getElementById("liqCsv").href = "/api/admin/artists/settlement?format=csv&month=" + encodeURIComponent(m) + "&key=" + encodeURIComponent(key());
    var box = document.getElementById("liqList");
    box.innerHTML = '<div class="empty-state">Cargando…</div>';
    fetch("/api/admin/artists/settlement?month=" + encodeURIComponent(m), { headers: { "x-internal-key": key() } })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (j) {
        if (!j.artists.length) { box.innerHTML = '<div class="empty-state">Sin copias pagadas en ' + esc(j.month) + ".</div>"; return; }
        var gs = function (n) { return "Gs. " + Number(n).toLocaleString("es-PY"); };
        box.innerHTML = '<table class="liq"><thead><tr><th>Artista</th><th>Copias</th><th>Honorario</th><th>Pedidos</th></tr></thead><tbody>' +
          j.artists.map(function (a) {
            return "<tr><td>" + esc(a.artistName) + '</td><td class="n">' + a.copies + '</td><td class="n">' + gs(a.fee) + "</td><td>" + esc(a.orders.join(", ")) + "</td></tr>";
          }).join("") +
          '<tr><td><b>Total</b></td><td></td><td class="n"><b>' + gs(j.total) + "</b></td><td></td></tr></tbody></table>";
      }).catch(function () { box.innerHTML = '<div class="empty-state">No se pudo cargar la liquidación.</div>'; });
  }
  liqMonth.addEventListener("change", loadArtists);

  function showView(v) {
    view = v;
    var TITLES = { orders: "Pedidos", products: "Productos", artists: "Liquidación de artistas" };
    document.getElementById("tabOrders").setAttribute("aria-selected", String(v === "orders"));
    document.getElementById("tabProducts").setAttribute("aria-selected", String(v === "products"));
    document.getElementById("tabArtists").setAttribute("aria-selected", String(v === "artists"));
    document.getElementById("ordersView").style.display = v === "orders" ? "block" : "none";
    document.getElementById("productsView").style.display = v === "products" ? "block" : "none";
    document.getElementById("artistsView").style.display = v === "artists" ? "block" : "none";
    document.getElementById("title").textContent = TITLES[v];
    if (v === "orders") render(document.getElementById("search").value);
    else if (v === "artists") loadArtists();
    else if (productsInfo) renderProducts(document.getElementById("productSearch").value);
    else loadProducts();
  }
  document.getElementById("tabOrders").addEventListener("click", function () { showView("orders"); });
  document.getElementById("tabProducts").addEventListener("click", function () { showView("products"); });
  document.getElementById("tabArtists").addEventListener("click", function () { showView("artists"); });
  document.getElementById("productSearch").addEventListener("input", function (e) { renderProducts(e.target.value); });

  // Sesión previa en esta pestaña: entrar directo.
  if (key()) load().catch(function () { sessionStorage.removeItem(KEY); });
})();
</script>
</body>
</html>
`;

export default router;
