import type { CollectionStatus } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { getProgressBand } from "@/lib/progress";

const STATUS_LABEL: Record<CollectionStatus, string> = {
  PENDING: "Pending",
  PARTIALLY_COLLECTED: "Partially Collected",
  COMPLETED: "Completed",
};

export function StatusBadge({
  status,
  receivedAmount,
  totalAmount,
}: {
  status: CollectionStatus;
  receivedAmount: number;
  totalAmount: number;
}) {
  const percent = totalAmount > 0 ? Math.round((receivedAmount / totalAmount) * 100) : 0;
  const { badgeVariant } = getProgressBand(percent);
  return <Badge variant={badgeVariant}>{STATUS_LABEL[status]}</Badge>;
}
