import { Router } from "express";
import {
  createClient,
  createClientSchema,
  deleteClient,
  getClient,
  listClients,
  updateClient,
  updateClientSchema,
} from "../controllers/clients.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

router.get("/", listClients);
router.post("/", requireRole("DEALER"), validateBody(createClientSchema), createClient);
router.get("/:id", getClient);
router.patch("/:id", requireRole("DEALER"), validateBody(updateClientSchema), updateClient);
router.delete("/:id", requireRole("DEALER"), deleteClient);

export default router;
