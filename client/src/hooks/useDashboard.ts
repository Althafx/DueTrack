import { useQuery } from "@tanstack/react-query";
import { fetchDashboard, fetchReport } from "@/services/dashboard";
import type { ReportPeriod } from "@shared/types";

export function useDashboard(period: ReportPeriod) {
  return useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => fetchDashboard(period),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useReport(period: ReportPeriod) {
  return useQuery({
    queryKey: ["reports", period],
    queryFn: () => fetchReport(period),
    refetchInterval: 60_000,
  });
}
