export type ProgressBand = {
  barClassName: string;
  badgeVariant: "danger" | "warning" | "caution" | "secondary" | "success";
};

// 0-19% red, 20-39% orange, 40-79% yellow, 80-99% blue, 100% green.
// Single source of truth shared by the progress bar fill and the status badge.
export function getProgressBand(percent: number): ProgressBand {
  if (percent >= 100) return { barClassName: "bg-success", badgeVariant: "success" };
  if (percent >= 80) return { barClassName: "bg-secondary", badgeVariant: "secondary" };
  if (percent >= 40) return { barClassName: "bg-caution", badgeVariant: "caution" };
  if (percent >= 20) return { barClassName: "bg-warning", badgeVariant: "warning" };
  return { barClassName: "bg-danger", badgeVariant: "danger" };
}
