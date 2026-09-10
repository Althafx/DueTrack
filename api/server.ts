import "./utils/loadEnv";

import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes";
import clientsRoutes from "./routes/clients.routes";
import employeesRoutes from "./routes/employees.routes";
import collectionsRoutes from "./routes/collections.routes";
import paymentsRoutes from "./routes/payments.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import reportsRoutes from "./routes/reports.routes";
import { errorHandler, notFoundHandler } from "./middleware/error";

export const app = express();

// A minimal stand-in for express.json(). The real body-parser package
// transitively requires iconv-lite, which crashes at import time under the
// Cloudflare Workers runtime (`require_streams(...) is not a function` — a
// known upstream workers-sdk/nodejs_compat gap, not something fixable from
// application code). This API only ever accepts JSON from its own frontend,
// so a hand-rolled parser is a safe, minimal substitute.
function jsonBodyParser(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers["content-type"];
  if (!contentType || !contentType.includes("application/json")) {
    return next();
  }

  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) {
      req.body = {};
      return next();
    }
    try {
      req.body = JSON.parse(raw);
      next();
    } catch {
      res.status(400).json({ message: "Invalid JSON body" });
    }
  });
  req.on("error", next);
}

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);
app.use(jsonBodyParser);
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);

app.use("/api", notFoundHandler);
app.use(errorHandler);
