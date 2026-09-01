import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarRange, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, toDateInputValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface DateRangeValue {
  from?: string;
  to?: string;
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => (value.from ? new Date(value.from) : new Date()));

  const selected: DateRange | undefined = value.from
    ? { from: new Date(value.from), to: value.to ? new Date(value.to) : undefined }
    : undefined;

  function handleSelect(range: DateRange | undefined) {
    onChange({
      from: range?.from ? toDateInputValue(range.from) : undefined,
      to: range?.to ? toDateInputValue(range.to) : undefined,
    });
  }

  function handleClear() {
    onChange({ from: undefined, to: undefined });
    setOpen(false);
  }

  const label = value.from
    ? value.to
      ? `${formatDate(value.from)} – ${formatDate(value.to)}`
      : formatDate(value.from)
    : "Pick a date range";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          // Jump to the selected range's month (or today) every time the
          // popover opens, so it never gets stuck showing a stale month.
          setMonth(value.from ? new Date(value.from) : new Date());
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("gap-2 font-normal", !value.from && "text-muted-foreground", className)}>
          <CalendarRange className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          numberOfMonths={1}
        />
        {value.from && (
          <div className="flex justify-end border-t border-border p-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleClear}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
