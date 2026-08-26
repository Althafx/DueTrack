import { useState } from "react";
import { CheckCircle2, Clock, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CollectionProgress } from "@/components/shared/CollectionProgress";
import { MobileCard, MobileCardHeader, MobileCardList, MobileCardRow } from "@/components/shared/MobileCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useDashboard, useReport } from "@/hooks/useDashboard";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Link } from "react-router-dom";
import type { ReportPeriod } from "@shared/types";

const AMOUNT_CARDS = [
  { key: "totalAmount", label: "Total Collection Amount", icon: Wallet, tone: "text-primary", bg: "bg-primary-light" },
  { key: "totalReceived", label: "Total Received", icon: TrendingUp, tone: "text-success", bg: "bg-success-light" },
  { key: "totalRemaining", label: "Total Remaining", icon: TrendingDown, tone: "text-warning", bg: "bg-warning-light" },
] as const;

const STATUS_CARDS = [
  { key: "pendingCount", label: "Pending", icon: Clock, tone: "text-warning", bg: "bg-warning-light" },
  { key: "partiallyCollectedCount", label: "Partial", icon: Wallet, tone: "text-secondary", bg: "bg-secondary-light" },
  { key: "completedCount", label: "Completed", icon: CheckCircle2, tone: "text-success", bg: "bg-success-light" },
] as const;

const PERIOD_TABS: Array<{ label: string; value: ReportPeriod }> = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All Time", value: "all" },
];

export default function DealerDashboard() {
  const [period, setPeriod] = useState<ReportPeriod>("all");
  const { data, isLoading } = useDashboard(period);
  const { data: report, isLoading: reportLoading } = useReport(period);
  // Pending/Partial/Completed describe current, overall state — they stay
  // fixed regardless of the period selector, so they're always fetched
  // scoped to "all" independent of the user's period choice.
  const { data: overallStatus } = useDashboard("all");

  return (
    <div className="animate-page space-y-6">
      <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-background px-4 pb-3 pt-4 md:-mx-8 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of all collections across your business</p>
        </div>

        {overallStatus && (
          <div className="flex items-center gap-4 text-sm">
            {STATUS_CARDS.map(({ key, label, icon: Icon, tone }) => (
              <span key={key} className="flex items-center gap-1.5 font-medium">
                <Icon className={`h-3.5 w-3.5 ${tone}`} />
                {label} <span className="text-foreground">{overallStatus[key]}</span>
              </span>
            ))}
          </div>
        )}

        <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
          <TabsList>
            {PERIOD_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading || !data ? (
        <LoadingState label="Loading dashboard..." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {AMOUNT_CARDS.map(({ key, label, icon: Icon, tone, bg }) => (
              <Card key={key} className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-md">
                <CardContent className="flex items-center justify-between gap-2 p-4 sm:gap-3 sm:pt-6">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="mt-1 truncate text-lg font-semibold sm:text-xl">{formatCurrency(data[key])}</p>
                  </div>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${bg}`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${tone}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Collection Reports</h2>

            {reportLoading || !report ? (
              <LoadingState label="Loading report..." />
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Employee-wise Collection</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {report.employeeBreakdown.length === 0 ? (
                    <EmptyState title="No payments recorded in this period" />
                  ) : (
                    <>
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Payments</TableHead>
                              <TableHead>Total Collected</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.employeeBreakdown.map((row) => (
                              <TableRow key={row.employeeId}>
                                <TableCell className="font-medium">{row.employeeName}</TableCell>
                                <TableCell>{row.paymentCount}</TableCell>
                                <TableCell className="text-success">{formatCurrency(row.totalCollected)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="divide-y divide-border md:hidden">
                        {report.employeeBreakdown.map((row) => (
                          <div key={row.employeeId} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{row.employeeName}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.paymentCount} payment{row.paymentCount === 1 ? "" : "s"}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-success">
                              {formatCurrency(row.totalCollected)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Collections</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentCollections.length === 0 ? (
                <EmptyState title="No collections yet" description="Create your first collection to get started." />
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recentCollections.map((c) => (
                          <TableRow key={c.id} className="cursor-pointer">
                            <TableCell>
                              <Link to={`/collections/${c.id}`} className="font-medium hover:text-secondary">
                                {c.client.name}
                              </Link>
                            </TableCell>
                            <TableCell>{c.assignedEmployee.name}</TableCell>
                            <TableCell className="min-w-[200px]">
                              <CollectionProgress received={c.receivedAmount} total={c.totalAmount} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={c.status} receivedAmount={c.receivedAmount} totalAmount={c.totalAmount} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(c.dueDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <MobileCardList>
                    {data.recentCollections.map((c) => (
                      <Link key={c.id} to={`/collections/${c.id}`}>
                        <MobileCard interactive>
                          <MobileCardHeader>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{c.client.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{c.assignedEmployee.name}</p>
                            </div>
                            <StatusBadge status={c.status} receivedAmount={c.receivedAmount} totalAmount={c.totalAmount} />
                          </MobileCardHeader>
                          <CollectionProgress received={c.receivedAmount} total={c.totalAmount} className="mb-3" />
                          <MobileCardRow label="Due Date" value={formatDate(c.dueDate)} />
                        </MobileCard>
                      </Link>
                    ))}
                  </MobileCardList>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
