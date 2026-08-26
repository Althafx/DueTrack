import { api } from "./api";
import type { DashboardSummaryDTO, PeriodReportDTO, ReportPeriod } from "@shared/types";

export async function fetchDashboard(period: ReportPeriod): Promise<DashboardSummaryDTO> {
  const { data } = await api.get<DashboardSummaryDTO>("/dashboard", { params: { period } });
  return data;
}

export async function fetchReport(period: ReportPeriod): Promise<PeriodReportDTO> {
  const { data } = await api.get<PeriodReportDTO>("/reports/daily", { params: { period } });
  return data;
}
