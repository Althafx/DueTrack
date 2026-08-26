import { Router } from "express";
import {
  createCollection,
  createCollectionSchema,
  deleteCollection,
  getCollection,
  listCollections,
  updateCollection,
  updateCollectionSchema,
} from "../controllers/collections.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

router.get("/", listCollections);
router.post("/", requireRole("DEALER"), validateBody(createCollectionSchema), createCollection);
router.get("/:id", getCollection);
router.patch("/:id", requireRole("DEALER"), validateBody(updateCollectionSchema), updateCollection);
router.delete("/:id", requireRole("DEALER"), deleteCollection);

export default router;
