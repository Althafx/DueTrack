import { app } from "./server";

// Vercel serverless entry point — the same Express app is used locally
// (via dev-server.ts) and here, so there is exactly one place route
// wiring lives.
export default app;
