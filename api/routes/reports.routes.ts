import { Router } from "express";
import { getReport } from "../controllers/dashboard.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/daily", requireAuth, getReport);

export default router;
