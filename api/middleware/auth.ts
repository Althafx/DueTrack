import type { NextFunction, Request, Response } from "express";
import { User, type IUser } from "../models/User";
import { AUTH_COOKIE_NAME, verifyToken } from "../utils/jwt";
import { ApiError } from "../utils/status";
import { asyncHandler } from "../utils/asyncHandler";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired session");
  }

  const user = await User.findById(payload.sub);
  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(401, "Account not found or inactive");
  }

  req.user = user;
  next();
});
