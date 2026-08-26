import "./utils/loadEnv";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";

import authRoutes from "./routes/auth.routes";
import clientsRoutes from "./routes/clients.routes";
import employeesRoutes from "./routes/employees.routes";
import collectionsRoutes from "./routes/collections.routes";
import paymentsRoutes from "./routes/payments.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import reportsRoutes from "./routes/reports.routes";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { connectDB } from "./utils/db";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(mongoSanitize());

// Ensure the DB connection is established (and reused on warm serverless
// invocations) before any route handler runs.
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

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
