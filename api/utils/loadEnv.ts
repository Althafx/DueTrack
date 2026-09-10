// Must be the very first import in any entry point (server.ts, seed-d1.ts).
// Loads the root .env before any other module reads process.env at
// import-time (e.g. jwt.ts throwing if JWT_SECRET is missing).
//
// This only applies to plain-Node execution (seed-d1.ts via tsx). Under the
// Cloudflare Workers runtime (production, and `wrangler dev` locally),
// `__dirname` doesn't exist and there is no .env file to read — secrets
// arrive via Worker bindings/vars instead (see api/.dev.vars, wrangler
// secrets), so this is a deliberate no-op there rather than a crash.
if (typeof __dirname !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("node:path");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}
