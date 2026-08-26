import { Router } from "express";
import { createPayment, createPaymentSchema, getPayment, listPayments } from "../controllers/payments.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

router.get("/", listPayments);
router.post("/", requireRole("EMPLOYEE"), validateBody(createPaymentSchema), createPayment);
router.get("/:id", getPayment);

export default router;
