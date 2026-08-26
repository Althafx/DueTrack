import type { NextFunction, Request, Response } from "express";
import type { Role } from "@shared/types";
import { ApiError } from "../utils/status";

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    next();
  };
}
