// Panel interno de pedidos (/admin) — USO DEL TALLER, nunca enlazado desde la
// landing. La página en sí es un shell sin datos; todo dato sale de
// /api/admin/orders, que exige la clave interna (401 sin ella). La clave que
// tipea el operario queda en sessionStorage y viaja por header en cada fetch.

import { Router, type IRouter, type Request } from "express";
import { desc } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { checkInternalKey } from "../lib/internal-key";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function hasKey(req: Request): boolean {
  return checkInternalKey(req.headers["x-internal-key"] ?? req.query.key);
}

// GET /api/admin/orders — listado para el panel (interno).
router.get("/api/admin/orders", async (req, res) => {
  if (!hasKey(req)) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  try {
    const rows = await db.query.ordersTable.findMany({
      orderBy: desc(ordersTable.createdAt),
      limit: 200,
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
        createdAt: true,
      },
    });
    res.json(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        hasPreview: !!r.previewImagePath,
        hasProduction: !!r.productionFilePath,
        previewImagePath: undefined,
        productionFilePath: undefined,
      })),
    );
  } catch (err) {
    logger.error({ err }, "admin: list failed");
    res.status(500).json({ message: "No se pudo listar los pedidos" });
  }
});

// GET /admin — shell HTML autocontenido (sin datos hasta autenticar).
router.get("/admin", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(ADMIN_HTML);
});

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Pedidos · Creativa Studio</title>
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
  .meta { color:var(--muted); font-size:13px; margin-top:2px; }
  .text { font-size:13px; margin-top:4px; }
  .actions { display:flex; flex-direction:column; gap:8px; }
  .empty-state { text-align:center; color:var(--muted); padding:48px 0; }
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
    <p>Acceso interno del taller.</p>
    <form id="loginForm">
      <input id="pw" type="password" placeholder="Contraseña" autocomplete="current-password" autofocus>
      <button class="btn primary" type="submit">Entrar</button>
      <div id="loginError">Contraseña incorrecta.</div>
    </form>
  </div>

  <div id="panel">
    <header class="bar">
      <div>
        <h1>Pedidos</h1>
        <div class="sub" id="count"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" id="refresh">Actualizar</button>
        <button class="btn" id="logout">Salir</button>
      </div>
    </header>
    <div class="tools">
      <input id="search" type="search" placeholder="Buscar por número, producto, texto…">
    </div>
    <div id="list"></div>
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

  function render(filter) {
    var q = (filter || "").toLowerCase();
    var rows = orders.filter(function (o) {
      if (!q) return true;
      return [o.orderNumber, o.product, o.material, o.technique, o.customText, o.font, o.iconName]
        .join(" ").toLowerCase().indexOf(q) >= 0;
    });
    document.getElementById("count").textContent =
      rows.length + " de " + orders.length + " pedidos (últimos 200)";
    if (!rows.length) {
      list.innerHTML = '<div class="empty-state">Sin pedidos que coincidan.</div>';
      return;
    }
    list.innerHTML = rows.map(function (o) {
      var img = o.hasPreview
        ? '<img class="thumb" loading="lazy" alt="" src="/api/orders/' + esc(o.orderNumber) + '/image">'
        : '<div class="thumb empty">sin preview</div>';
      var detalles = [o.material, o.color, o.technique].filter(Boolean).map(esc).join(" · ");
      var extra = [];
      if (o.customText) extra.push('Texto: “' + esc(o.customText) + '”' + (o.font ? " (" + esc(o.font) + ")" : ""));
      if (o.iconName) extra.push("Ícono: " + esc(o.iconName));
      if (o.hasUploadedImage) extra.push("Logo/foto adjunta");
      var svgBtn = o.hasProduction
        ? '<a class="btn primary" href="/api/orders/' + esc(o.orderNumber) + '/production-file?key=' +
          encodeURIComponent(key()) + '" download>SVG producción</a>'
        : '<span class="btn" aria-disabled="true">SVG no generado</span>';
      var imgBtn = o.hasPreview
        ? '<a class="btn" href="/api/orders/' + esc(o.orderNumber) + '/image" download="' +
          esc(o.orderNumber) + '-preview.jpg">Imagen preview</a>'
        : "";
      return '<div class="card">' + img +
        '<div><span class="num">' + esc(o.orderNumber) + '</span>' +
        '<span class="badge ' + esc(o.status) + '">' + esc(o.status).replace("_", " ") + "</span>" +
        '<div class="meta">' + esc(o.product) + " — " + detalles + "</div>" +
        '<div class="meta">' + fmtDate(o.createdAt) + "</div>" +
        (extra.length ? '<div class="text">' + extra.join(" · ") + "</div>" : "") +
        "</div>" +
        '<div class="actions">' + svgBtn + imgBtn + "</div>" +
        "</div>";
    }).join("");
  }

  function load() {
    return fetch("/api/admin/orders", { headers: { "x-internal-key": key() } }).then(function (r) {
      if (r.status === 401) throw new Error("unauthorized");
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (data) {
      orders = data;
      login.style.display = "none";
      panel.style.display = "block";
      render(document.getElementById("search").value);
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
  document.getElementById("refresh").addEventListener("click", function () { load().catch(function () {}); });
  document.getElementById("logout").addEventListener("click", function () {
    sessionStorage.removeItem(KEY);
    panel.style.display = "none";
    login.style.display = "block";
    document.getElementById("pw").value = "";
    document.getElementById("loginError").style.display = "none";
  });

  // Sesión previa en esta pestaña: entrar directo.
  if (key()) load().catch(function () { sessionStorage.removeItem(KEY); });
})();
</script>
</body>
</html>
`;

export default router;
