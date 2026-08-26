import type { Request, Response } from "express";
import { Collection } from "../models/Collection";
import { Payment } from "../models/Payment";
import { toCollectionDTO } from "../utils/mappers";
import { asyncHandler } from "../utils/asyncHandler";

const REPORT_PERIODS = ["today", "week", "month", "year", "all"] as const;
type ReportPeriod = (typeof REPORT_PERIODS)[number];

function parsePeriod(raw: unknown): ReportPeriod {
  return typeof raw === "string" && (REPORT_PERIODS as readonly string[]).includes(raw) ? (raw as ReportPeriod) : "week";
}

function startDateForPeriod(period: ReportPeriod): Date | null {
  if (period === "all") return null;

  const start = new Date();
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const days = period === "week" ? 7 : period === "month" ? 30 : 365;
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const period = parsePeriod(req.query.period);
  const startDate = startDateForPeriod(period);

  const roleFilter = req.user!.role === "EMPLOYEE" ? { assignedEmployee: req.user!.id } : {};
  const collectionScopeFilter: Record<string, unknown> = { ...roleFilter };
  if (startDate) {
    collectionScopeFilter.collectionDate = { $gte: startDate };
  }

  const collections = await Collection.find(collectionScopeFilter);

  const summary = collections.reduce(
    (acc, c) => {
      acc.totalAmount += c.totalAmount;
      acc.totalRemaining += c.remainingAmount;
      if (c.status === "PENDING") acc.pendingCount += 1;
      else if (c.status === "PARTIALLY_COLLECTED") acc.partiallyCollectedCount += 1;
      else acc.completedCount += 1;
      return acc;
    },
    {
      totalAmount: 0,
      totalRemaining: 0,
      pendingCount: 0,
      partiallyCollectedCount: 0,
      completedCount: 0,
    }
  );

  // "Total Received" describes money collected during the period, so it's
  // summed from Payments by paymentDate — not Collection.receivedAmount,
  // which is an all-time-cumulative field on the collection.
  const paymentScopeFilter: Record<string, unknown> =
    req.user!.role === "EMPLOYEE" ? { employee: req.user!.id } : {};
  if (startDate) {
    paymentScopeFilter.paymentDate = { $gte: startDate };
  }
  const periodPayments = await Payment.find(paymentScopeFilter);
  const totalReceived = periodPayments.reduce((sum, p) => sum + p.amount, 0);

  const recentCollections = await Collection.find(collectionScopeFilter)
    .populate(["client", "assignedEmployee"])
    .sort({ updatedAt: -1 })
    .limit(7);

  res.json({
    ...summary,
    totalReceived,
    recentCollections: recentCollections.map((c) => toCollectionDTO(c as any)),
  });
});

export const getReport = asyncHandler(async (req: Request, res: Response) => {
  const period = parsePeriod(req.query.period);
  const startDate = startDateForPeriod(period);

  const scopeFilter: Record<string, unknown> = req.user!.role === "EMPLOYEE" ? { employee: req.user!.id } : {};
  if (startDate) {
    scopeFilter.paymentDate = { $gte: startDate };
  }

  const periodPayments = await Payment.find(scopeFilter);

  const totalCollected = periodPayments.reduce((sum, p) => sum + p.amount, 0);

  // Group by the employee snapshot captured on each Payment (employeeName),
  // not a live populate — an employee deleted after collecting payments must
  // still show up correctly in past reports.
  const employeeMap = new Map<string, { employeeId: string; employeeName: string; totalCollected: number; paymentCount: number }>();
  for (const payment of periodPayments) {
    const key = payment.employee.toString();
    const entry = employeeMap.get(key) ?? {
      employeeId: key,
      employeeName: payment.employeeName,
      totalCollected: 0,
      paymentCount: 0,
    };
    entry.totalCollected += payment.amount;
    entry.paymentCount += 1;
    employeeMap.set(key, entry);
  }

  const collectionScopeFilter = req.user!.role === "EMPLOYEE" ? { assignedEmployee: req.user!.id } : {};
  const collections = await Collection.find(collectionScopeFilter);
  const statusBreakdown = collections.reduce(
    (acc, c) => {
      if (c.status === "PENDING") acc.pending += 1;
      else if (c.status === "PARTIALLY_COLLECTED") acc.partiallyCollected += 1;
      else acc.completed += 1;
      return acc;
    },
    { pending: 0, partiallyCollected: 0, completed: 0 }
  );

  res.json({
    period,
    totalCollected,
    paymentCount: periodPayments.length,
    employeeBreakdown: Array.from(employeeMap.values())
      .sort((a, b) => b.totalCollected - a.totalCollected)
      .map((entry) => ({
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        totalCollected: entry.totalCollected,
        paymentCount: entry.paymentCount,
      })),
    statusBreakdown,
  });
});
