import jwt from "jsonwebtoken";
import type { Role } from "@shared/types";

// Read lazily (inside functions, not at module scope) rather than eagerly at
// import time. Under Cloudflare Workers, secrets/vars are only guaranteed to
// be present on `process.env` once the runtime has actually started serving
// a request — reading them during module evaluation (e.g. via a top-level
// `const X = process.env.X; if (!X) throw ...`) fails during Cloudflare's
// deploy-time bundling/module-graph evaluation, even though the exact same
// code works fine locally under `wrangler dev` (which pre-populates
// `.dev.vars` into `process.env` before any module import).
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in the environment");
  }
  return secret;
}

function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || "7d";
}

export interface JwtPayload {
  sub: string;
  role: Role;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export const AUTH_COOKIE_NAME = "token";

export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
