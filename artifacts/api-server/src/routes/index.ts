import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import jobsRouter from "./jobs.js";
import resumesRouter from "./resumes.js";
import screeningRouter from "./screening.js";
import reportsRouter from "./reports.js";
import jdUpload from "./jdUpload";
import billingRouter from "./billing.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(resumesRouter);
router.use(screeningRouter);
router.use(reportsRouter);
router.use(jdUpload);
router.use(billingRouter);

export default router;
