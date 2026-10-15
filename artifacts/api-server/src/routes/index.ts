import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import catalogRouter from "./catalog";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(catalogRouter);
router.use(aiRouter);

export default router;
