import type { Request, Response } from "express";
import { z } from "zod";
import { findUserById, findUserByUsername, updateUserPassword } from "../db/users";
import { AUTH_COOKIE_NAME, COOKIE_MAX_AGE_MS, signToken } from "../utils/jwt";
import { ApiError } from "../utils/status";
import { toUserDTO } from "../utils/mappers";
import { asyncHandler } from "../utils/asyncHandler";
import { decrypt } from "../utils/crypto";
import { comparePassword, hashAndEncryptPassword } from "../utils/password";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const changeMyPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

function setCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  // In production the frontend and API are separate Workers on different
  // origins, so the auth cookie must be sent cross-site — that requires
  // SameSite=None, which browsers only honor when Secure is also set.
  // Locally, Vite's dev proxy makes requests same-origin from the browser's
  // perspective, so the stricter/simpler Lax + non-Secure pairing still
  // works and matches plain-HTTP local dev.
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body as z.infer<typeof loginSchema>;

  const user = await findUserByUsername(username.toLowerCase(), { withPassword: true });
  if (!user) {
    throw new ApiError(401, "Invalid username or password");
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "This account has been disabled. Contact your dealer.");
  }

  const isMatch = await comparePassword(password, user.password!);
  if (!isMatch) {
    throw new ApiError(401, "Invalid username or password");
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.cookie(AUTH_COOKIE_NAME, token, setCookieOptions());
  res.json({ user: toUserDTO(user) });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // Mirror the same attributes used when setting the cookie (path, sameSite,
  // secure) — some browsers match on these when clearing, not just the name.
  res.clearCookie(AUTH_COOKIE_NAME, setCookieOptions());
  res.json({ message: "Logged out" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: toUserDTO(req.user!) });
});

export const getMyPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await findUserById(req.user!.id, { withEncryptedPassword: true });
  if (!user) throw new ApiError(404, "User not found");
  res.json({ password: decrypt(user.encrypted_password!) });
});

export const changeMyPassword = asyncHandler(async (req: Request, res: Response) => {
  const { newPassword } = req.body as z.infer<typeof changeMyPasswordSchema>;
  const user = await findUserById(req.user!.id);
  if (!user) throw new ApiError(404, "User not found");

  const { password, encryptedPassword } = await hashAndEncryptPassword(newPassword);
  await updateUserPassword(user.id, { password, encryptedPassword });

  res.json({ message: "Password updated" });
});
