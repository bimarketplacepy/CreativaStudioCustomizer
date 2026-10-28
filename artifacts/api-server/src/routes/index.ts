import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import catalogRouter from "./catalog";
import aiRouter from "./ai";
import checkoutRouter from "./checkout";
import odooWebhookRouter from "./odoo-webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(catalogRouter);
router.use(aiRouter);
router.use(checkoutRouter);
router.use(odooWebhookRouter);

export default router;
