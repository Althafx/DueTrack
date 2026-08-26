import { useEffect, useMemo, useState } from "react";
import { History as HistoryIcon, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker, type DateRangeValue } from "@/components/shared/DateRangePicker";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { usePayments } from "@/hooks/usePayments";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  OTHER: "Other",
};

const PAGE_SIZE = 30;

export default function History() {
  const { data: payments, isLoading } = usePayments();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visiblePayments = useMemo(() => {
    if (!payments) return payments;
    const query = search.trim().toLowerCase();

    return payments.filter((p) => {
      const matchesQuery =
        !query ||
        p.client.name.toLowerCase().includes(query) ||
        p.employee.name.toLowerCase().includes(query) ||
        p.client.phone.toLowerCase().includes(query);

      const paymentTime = new Date(p.paymentDate).getTime();
      const matchesFrom = !dateRange.from || paymentTime >= new Date(dateRange.from).getTime();
      const matchesTo = !dateRange.to || paymentTime <= new Date(dateRange.to).getTime() + 24 * 60 * 60 * 1000 - 1;

      return matchesQuery && matchesFrom && matchesTo;
    });
  }, [payments, search, dateRange]);

  // A filter change can make the previous "loaded so far" count irrelevant —
  // reset back to the first page whenever the visible set changes shape.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, dateRange]);

  const pagedPayments = visiblePayments?.slice(0, visibleCount);
  const hasMore = !!visiblePayments && visiblePayments.length > visibleCount;

  return (
    <div className="animate-page space-y-6">
      <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-background px-4 pb-3 pt-4 md:-mx-8 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <h1 className="text-2xl font-semibold">History</h1>

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1 sm:flex-none">
            <Label htmlFor="historySearch" className="mb-2 block">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="historySearch"
                placeholder="Search client, employee, phone..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading history..." />
      ) : !pagedPayments || pagedPayments.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No payment activity found" description="Payments recorded by employees will appear here." />
      ) : (
        <>
          <div className="space-y-3">
            {pagedPayments.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm">
                      <span className="font-semibold text-foreground">{p.employee.name}</span>{" "}
                      <span className="text-muted-foreground">collected</span>{" "}
                      <span className="font-semibold text-success">{formatCurrency(p.amount)}</span>{" "}
                      <span className="text-muted-foreground">via {PAYMENT_METHOD_LABEL[p.paymentMethod]} from</span>{" "}
                      <span className="font-medium text-secondary">{p.client.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(p.paymentDate)}</p>
                    {p.remarks && <p className="text-xs text-muted-foreground">"{p.remarks}"</p>}
                  </div>
                  <Badge variant="muted" className="w-fit shrink-0">
                    {PAYMENT_METHOD_LABEL[p.paymentMethod]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
