import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "../utils/status";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path.join(".") || "body"] = issue.message;
      }
      throw new ApiError(400, "Validation failed", errors);
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path.join(".") || "query"] = issue.message;
      }
      throw new ApiError(400, "Invalid query parameters", errors);
    }
    // Store parsed/validated query separately — req.query is a getter-only
    // property on some Express versions and cannot be reassigned directly.
    (req as Request & { validatedQuery?: unknown }).validatedQuery = result.data;
    next();
  };
}
