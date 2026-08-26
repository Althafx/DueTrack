import rateLimit from "express-rate-limit";

// In-memory limiter — acceptable for a single-instance basic-plan demo.
// A multi-instance production deployment would need a shared store
// (e.g. Redis) since Vercel functions don't share memory across instances.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});
