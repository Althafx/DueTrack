import type { CollectionStatus } from "@shared/types";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<CollectionStatus, { label: string; variant: "danger" | "secondary" | "success" }> = {
  PENDING: { label: "Pending", variant: "danger" },
  PARTIALLY_COLLECTED: { label: "Partial", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "success" },
};

export function StatusBadge({ status }: { status: CollectionStatus }) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
