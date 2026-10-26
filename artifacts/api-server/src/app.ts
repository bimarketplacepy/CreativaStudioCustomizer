import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import adminRouter from "./routes/admin";
import { logger } from "./lib/logger";
import { isSameOrigin } from "./middlewares/rate-limit";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// CORS solo para el mismo host: la landing y el panel viven en el mismo origen,
// y abierto a "*" dejaba que cualquier sitio usara la API (y la IA) desde los
// navegadores de sus visitantes.
app.use(cors((req, cb) => cb(null, { origin: isSameOrigin(req as express.Request) })));
// El preview del pedido viaja como data URL base64 (~3MB de imagen ≈ ~4.1MB
// de JSON), así que el límite por defecto de 100kb no alcanza.
// 32 MB: vista previa + logo original + archivo de la Dacen (PNG hasta 12 MB:
// un fondo "Todo el vaso (360°)" a 300 dpi) + sus textos y logos en vector.
app.use(express.json({ limit: "32mb" }));
app.use(express.urlencoded({ extended: true }));

// Panel interno del taller: /admin y /api/admin (página) + /api/admin/orders
// (datos). /api/admin es la ruta canónica: en el deployment de Replit el edge
// solo entrega /api/* a la app (el resto lo sirve estático con fallback SPA).
app.use(adminRouter);
app.use("/api", router);

export default app;
