import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import catalogRouter from "./catalog";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(catalogRouter);

export default router;
