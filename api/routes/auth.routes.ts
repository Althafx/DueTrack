import { Router } from "express";
import {
  changeMyPassword,
  changeMyPasswordSchema,
  createDealer,
  createDealerSchema,
  deleteDealer,
  getDealers,
  getMyPassword,
  login,
  loginSchema,
  logout,
  me,
  updateMe,
  updateMeSchema,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();

// NOTE: the previous in-memory login rate limiter (express-rate-limit) was
// removed during the Cloudflare Workers migration — its store calls
// setInterval() at module load time, which Workers disallows outside a
// request handler, and in-memory state wouldn't be meaningful across
// Workers isolates anyway. A real replacement (Cloudflare's Rate Limiting
// API binding, or a D1/KV-backed limiter) is a follow-up, not part of this
// database migration.
router.post("/login", validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, validateBody(updateMeSchema), updateMe);
router.get("/me/password", requireAuth, getMyPassword);
router.patch("/me/password", requireAuth, validateBody(changeMyPasswordSchema), changeMyPassword);
router.get("/dealers", requireAuth, requireRole("DEALER"), getDealers);
router.post("/dealers", requireAuth, requireRole("DEALER"), validateBody(createDealerSchema), createDealer);
router.delete("/dealers/:id", requireAuth, requireRole("DEALER"), deleteDealer);

export default router;
