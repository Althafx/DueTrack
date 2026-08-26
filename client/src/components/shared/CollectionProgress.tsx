import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/formatters";
import { getProgressBand } from "@/lib/progress";
import { cn } from "@/lib/utils";

export function CollectionProgress({
  received,
  total,
  className,
}: {
  received: number;
  total: number;
  className?: string;
}) {
  const percent = total > 0 ? Math.round((received / total) * 100) : 0;
  const { barClassName } = getProgressBand(percent);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">
          {formatCurrency(received)} <span className="text-muted-foreground">/ {formatCurrency(total)}</span>
        </span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <Progress value={percent} indicatorClassName={barClassName} />
    </div>
  );
}
