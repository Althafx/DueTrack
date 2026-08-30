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
import { loginRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/login", loginRateLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.get("/me/password", requireAuth, getMyPassword);
router.patch("/me/password", requireAuth, validateBody(changeMyPasswordSchema), changeMyPassword);

export default router;
