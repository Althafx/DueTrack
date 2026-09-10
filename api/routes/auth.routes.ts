import { Router } from "express";
import {
  changeMyPassword,
  changeMyPasswordSchema,
  getMyPassword,
  login,
  loginSchema,
  logout,
  me,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

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
router.get("/me/password", requireAuth, getMyPassword);
router.patch("/me/password", requireAuth, validateBody(changeMyPasswordSchema), changeMyPassword);

export default router;
