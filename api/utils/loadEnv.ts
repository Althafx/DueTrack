// Must be the very first import in any entry point (server.ts, seed.ts).
// Loads the root .env before any other module reads process.env at
// import-time (e.g. jwt.ts throwing if JWT_SECRET is missing).
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
