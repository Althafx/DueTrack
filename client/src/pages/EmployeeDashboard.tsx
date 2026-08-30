import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CollectionProgress } from "@/components/shared/CollectionProgress";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useCollections } from "@/hooks/useCollections";
import { useDashboard } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/formatters";
import type { CollectionStatus } from "@shared/types";

const STATUS_FILTERS: Array<{ label: string; value: CollectionStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Partially Collected", value: "PARTIALLY_COLLECTED" },
  { label: "Completed", value: "COMPLETED" },
];

export default function EmployeeDashboard() {
  const [statusFilter, setStatusFilter] = useState<CollectionStatus | "ALL">("ALL");
  const { data: dashboard } = useDashboard("all");
  const { data: collections, isLoading } = useCollections(
    statusFilter !== "ALL" ? { status: statusFilter } : {}
  );

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 space-y-4 bg-background px-4 pb-3 pt-4">
        <div>
          <h1 className="text-xl font-semibold">My Collections</h1>
          <p className="text-sm text-muted-foreground">Collections assigned to you</p>
        </div>

        {dashboard && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
                <p className="mt-1 text-lg font-semibold text-success">{formatCurrency(dashboard.totalReceived)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground">Remaining</p>
                <p className="mt-1 text-lg font-semibold text-warning">{formatCurrency(dashboard.totalRemaining)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CollectionStatus | "ALL")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !collections || collections.length === 0 ? (
        <EmptyState title="No collections assigned" description="Check back once your dealer assigns you a collection." />
      ) : (
        <div className="space-y-3">
          {collections.map((c) => (
            <Link key={c.id} to={`/employee/collections/${c.id}`}>
              <Card className="transition-shadow hover:shadow-md active:scale-[0.99]">
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{c.client.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {c.client.phone}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <CollectionProgress received={c.receivedAmount} total={c.totalAmount} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
