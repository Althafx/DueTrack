import { cn } from "@/lib/utils";

export function MobileCard({
  className,
  children,
  onClick,
  interactive = false,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  /** Set true when the card sits inside a Link/button wrapper, to apply hover/press styles without needing its own onClick. */
  interactive?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-soft-sm transition-all duration-150",
        (onClick || interactive) && "cursor-pointer active:scale-[0.98] hover:shadow-soft-md hover:border-secondary/30",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MobileCardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-3 flex items-start justify-between gap-3", className)}>{children}</div>;
}

export function MobileCardRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium">{value}</span>
    </div>
  );
}

export function MobileCardList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 md:hidden", className)}>{children}</div>;
}
