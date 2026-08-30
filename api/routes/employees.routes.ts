import { Router } from "express";
import {
  createEmployee,
  createEmployeeSchema,
  deleteEmployee,
  getEmployee,
  getEmployeePassword,
  listEmployees,
  updateEmployee,
  updateEmployeeSchema,
} from "../controllers/employees.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(requireAuth, requireRole("DEALER"));

router.get("/", listEmployees);
router.post("/", validateBody(createEmployeeSchema), createEmployee);
router.get("/:id", getEmployee);
router.get("/:id/password", getEmployeePassword);
router.patch("/:id", validateBody(updateEmployeeSchema), updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;
