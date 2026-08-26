import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/status";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message, errors: err.errors });
  }

  if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
    return res.status(409).json({ message: "A record with this value already exists" });
  }

  if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "ValidationError") {
    return res.status(400).json({ message: (err as Error).message });
  }

  console.error(err);
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({ message: isProd ? "Internal server error" : (err as Error)?.message ?? "Internal server error" });
}
