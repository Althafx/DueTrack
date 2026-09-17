import { useEffect, useMemo, useState } from "react";
import { History as HistoryIcon, Search, ShieldCheck, Undo2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker, type DateRangeValue } from "@/components/shared/DateRangePicker";
import { ConfettiBurst } from "@/components/shared/ConfettiBurst";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { usePayments, useVerifyPayment } from "@/hooks/usePayments";
import { useCurrentUser } from "@/hooks/useAuth";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { PaymentDTO } from "@shared/types";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  OTHER: "Other",
};

const PAGE_SIZE = 30;

type VerifyFilter = "ALL" | "VERIFIED" | "UNVERIFIED";

export default function History() {
  const { data: payments, isLoading } = usePayments();
  const { data: currentUser } = useCurrentUser();
  const verifyMutation = useVerifyPayment();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [verifyFilter, setVerifyFilter] = useState<VerifyFilter>("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);

  const isDealer = currentUser?.role === "DEALER";

  const filteredPayments = useMemo(() => {
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

      const matchesVerify =
        verifyFilter === "ALL" ||
        (verifyFilter === "VERIFIED" && p.verified) ||
        (verifyFilter === "UNVERIFIED" && !p.verified);

      return matchesQuery && matchesFrom && matchesTo && matchesVerify;
    });
  }, [payments, search, dateRange, verifyFilter]);

  const unverifiedCount = useMemo(() => payments?.filter((p) => !p.verified).length ?? 0, [payments]);

  // A filter change can make the previous "loaded so far" count irrelevant —
  // reset back to the first page whenever the visible set changes shape.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, dateRange, verifyFilter]);

  const pagedPayments = filteredPayments?.slice(0, visibleCount);
  const hasMore = !!filteredPayments && filteredPayments.length > visibleCount;

  function handleVerify(payment: PaymentDTO) {
    verifyMutation.mutate(
      { id: payment.id, verified: true },
      {
        onSuccess: () => {
          setCelebratingId(payment.id);
          setTimeout(() => setCelebratingId((current) => (current === payment.id ? null : current)), 900);
        },
      }
    );
  }

  function handleUnverify(payment: PaymentDTO) {
    verifyMutation.mutate({ id: payment.id, verified: false });
  }

  return (
    <div className="animate-page space-y-4">
      <div className="sticky top-0 z-10 -mx-4 space-y-2 border-b border-border bg-background px-4 pb-2 pt-3 md:-mx-8 md:space-y-3 md:border-0 md:px-8 md:pb-3 md:pt-8 lg:-mx-10 lg:px-10">
        <div className="flex items-center gap-2">
          <h1 className="hidden text-2xl font-semibold md:block">History</h1>

          <div className="relative min-w-0 flex-1 md:ml-auto md:max-w-[240px] md:flex-none">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="h-9 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        <Tabs value={verifyFilter} onValueChange={(v) => setVerifyFilter(v as VerifyFilter)}>
          <TabsList className="h-9 w-full justify-start md:w-auto">
            <TabsTrigger value="ALL" className="flex-1 md:flex-none">
              All
            </TabsTrigger>
            <TabsTrigger value="VERIFIED" className="flex-1 md:flex-none">
              Verified
            </TabsTrigger>
            <TabsTrigger value="UNVERIFIED" className="flex-1 gap-1.5 md:flex-none">
              Not Verified
              {unverifiedCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground">
                  {unverifiedCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <LoadingState label="Loading history..." />
      ) : !pagedPayments || pagedPayments.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No payment activity found"
          description="Payments recorded by employees will appear here."
        />
      ) : (
        <>
          <div className="space-y-3">
            {pagedPayments.map((p) => (
              <Card
                key={p.id}
                className={cn("relative overflow-hidden transition-colors", celebratingId === p.id && "animate-verify-flash")}
              >
                {celebratingId === p.id && <ConfettiBurst />}
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

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="muted" className="w-fit shrink-0">
                      {PAYMENT_METHOD_LABEL[p.paymentMethod]}
                    </Badge>

                    {p.verified ? (
                      <Badge variant="success" className="w-fit shrink-0 gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : null}

                    {isDealer && !p.verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-success/40 text-success hover:bg-success-light hover:text-success"
                        disabled={verifyMutation.isPending}
                        onClick={() => handleVerify(p)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verify
                      </Button>
                    )}

                    {isDealer && p.verified && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 text-muted-foreground"
                        disabled={verifyMutation.isPending}
                        onClick={() => handleUnverify(p)}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Unverify
                      </Button>
                    )}
                  </div>
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
