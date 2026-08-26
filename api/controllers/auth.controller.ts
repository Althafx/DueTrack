import type { Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { AUTH_COOKIE_NAME, COOKIE_MAX_AGE_MS, signToken } from "../utils/jwt";
import { ApiError } from "../utils/status";
import { toUserDTO } from "../utils/mappers";
import { asyncHandler } from "../utils/asyncHandler";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

function setCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "This account has been disabled. Contact your dealer.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.cookie(AUTH_COOKIE_NAME, token, setCookieOptions());
  res.json({ user: toUserDTO(user) });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.json({ message: "Logged out" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: toUserDTO(req.user!) });
});
