import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, SlidersHorizontal, Trash2, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MobileCard, MobileCardHeader, MobileCardList, MobileCardRow } from "@/components/shared/MobileCard";
import { DateRangePicker, type DateRangeValue } from "@/components/shared/DateRangePicker";
import { useConfirm } from "@/components/shared/ConfirmDialogProvider";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useClients } from "@/hooks/useClients";
import { useEmployees } from "@/hooks/useEmployees";
import { useCollections, useCreateCollection, useDeleteCollection } from "@/hooks/useCollections";
import { getErrorMessage } from "@/services/api";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/formatters";
import type { CollectionFilters, CollectionStatus, CreateCollectionRequest } from "@shared/types";

const STATUS_FILTERS: Array<{ label: string; value: CollectionStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Partially Collected", value: "PARTIALLY_COLLECTED" },
  { label: "Completed", value: "COMPLETED" },
];

const AMOUNT_FIELDS: Array<{ label: string; value: "receivedAmount" | "remainingAmount" | "totalAmount" }> = [
  { label: "Collected", value: "receivedAmount" },
  { label: "Balance", value: "remainingAmount" },
  { label: "Total", value: "totalAmount" },
];

const EMPTY_FORM = {
  client: "",
  assignedEmployee: "",
  totalAmount: "",
  collectionDate: toDateInputValue(new Date()),
  dueDate: toDateInputValue(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
  notes: "",
};

export default function Collections() {
  const [statusFilter, setStatusFilter] = useState<CollectionStatus | "ALL">("ALL");
  const [employeeFilter, setEmployeeFilter] = useState<string>("ALL");
  const [clientFilter, setClientFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [search, setSearch] = useState("");
  const [amountField, setAmountField] = useState<"receivedAmount" | "remainingAmount" | "totalAmount">("totalAmount");
  const [amountQuery, setAmountQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filters: CollectionFilters = {
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(employeeFilter !== "ALL" ? { employee: employeeFilter } : {}),
    ...(clientFilter !== "ALL" ? { client: clientFilter } : {}),
    ...(dateRange.from ? { dateFrom: dateRange.from } : {}),
    ...(dateRange.to ? { dateTo: dateRange.to } : {}),
  };

  const { data: collections, isLoading } = useCollections(filters);
  const { data: clients } = useClients();
  const { data: employees } = useEmployees();
  const createMutation = useCreateCollection();
  const deleteMutation = useDeleteCollection();
  const confirm = useConfirm();

  const employeeOptions = employees ?? [];

  const activeFilterCount =
    (statusFilter !== "ALL" ? 1 : 0) +
    (employeeFilter !== "ALL" ? 1 : 0) +
    (clientFilter !== "ALL" ? 1 : 0) +
    (dateRange.from ? 1 : 0) +
    (amountQuery.trim() ? 1 : 0);

  const visibleCollections = useMemo(() => {
    if (!collections) return collections;
    let result = collections;

    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (c) =>
          c.client.name.toLowerCase().includes(query) ||
          c.assignedEmployee.name.toLowerCase().includes(query) ||
          c.client.phone.toLowerCase().includes(query)
      );
    }

    const amountValue = amountQuery.trim() ? Number(amountQuery) : null;
    if (amountValue !== null && !Number.isNaN(amountValue)) {
      result = result.filter((c) => c[amountField] === amountValue);
    }

    return result;
  }, [collections, search, amountQuery, amountField]);

  // Each active filter becomes a removable chip. This is how the selected
  // employee/client name stays readable on narrow screens — the <Select>
  // trigger itself truncates long names, the chip row doesn't.
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (statusFilter !== "ALL") {
      chips.push({
        key: "status",
        label: STATUS_FILTERS.find((s) => s.value === statusFilter)?.label ?? statusFilter,
        onClear: () => setStatusFilter("ALL"),
      });
    }
    if (employeeFilter !== "ALL") {
      chips.push({
        key: "employee",
        label: employees?.find((e) => e.id === employeeFilter)?.name ?? "Employee",
        onClear: () => setEmployeeFilter("ALL"),
      });
    }
    if (clientFilter !== "ALL") {
      chips.push({
        key: "client",
        label: clients?.find((c) => c.id === clientFilter)?.name ?? "Client",
        onClear: () => setClientFilter("ALL"),
      });
    }
    if (dateRange.from) {
      chips.push({
        key: "date",
        label: dateRange.to
          ? `${formatDate(dateRange.from)} – ${formatDate(dateRange.to)}`
          : formatDate(dateRange.from),
        onClear: () => setDateRange({}),
      });
    }
    if (amountQuery.trim()) {
      const field = AMOUNT_FIELDS.find((f) => f.value === amountField)?.label ?? "Amount";
      chips.push({
        key: "amount",
        label: `${field} ${amountQuery.trim()}`,
        onClear: () => setAmountQuery(""),
      });
    }

    return chips;
  }, [statusFilter, employeeFilter, clientFilter, dateRange, amountQuery, amountField, employees, clients]);

  const summary = useMemo(() => {
    if (!collections) return null;
    return collections.reduce(
      (acc, c) => {
        acc.received += c.receivedAmount;
        acc.remaining += c.remainingAmount;
        if (c.status === "PENDING") acc.pendingCount += 1;
        else if (c.status === "COMPLETED") acc.completedCount += 1;
        return acc;
      },
      { received: 0, remaining: 0, pendingCount: 0, completedCount: 0 }
    );
  }, [collections]);

  function clearFilters() {
    setStatusFilter("ALL");
    setEmployeeFilter("ALL");
    setClientFilter("ALL");
    setDateRange({});
    setAmountQuery("");
  }

  function handleCollectionDateChange(value: string) {
    setForm((prev) => ({
      ...prev,
      collectionDate: value,
      // Keep due date valid automatically instead of letting the user hit a submit-time error.
      dueDate: prev.dueDate <= value ? toDateInputValue(new Date(new Date(value).getTime() + 14 * 24 * 60 * 60 * 1000)) : prev.dueDate,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (form.dueDate <= form.collectionDate) {
      toast.error("Due date must be after the collection date");
      return;
    }
    try {
      const payload: CreateCollectionRequest = {
        ...form,
        totalAmount: Number(form.totalAmount),
      };
      await createMutation.mutateAsync(payload);
      toast.success("Collection created");
      setForm(EMPTY_FORM);
      setDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDelete(id: string, clientName: string) {
    const confirmed = await confirm({
      title: "Delete collection",
      description: `Delete the collection for ${clientName}? Its payment history will be kept in History.`,
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Collection deleted");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="animate-page space-y-3 md:space-y-6">
      <div className="sticky top-0 z-10 -mx-4 space-y-2 border-b border-border bg-background px-4 pb-2 pt-3 md:-mx-8 md:space-y-3 md:border-0 md:px-8 md:pb-3 md:pt-8 lg:-mx-10 lg:px-10">
        {/* Toolbar: search + filter toggle + new, all on one line on mobile. */}
        <div className="flex items-center gap-2">
          <h1 className="hidden text-2xl font-semibold md:block">Collections</h1>

          <div className="relative min-w-0 flex-1 md:ml-auto md:max-w-[240px] md:flex-none">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="h-9 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className="relative h-9 w-9 shrink-0"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-secondary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="h-9 w-9 shrink-0 md:w-auto md:gap-2 md:px-4">
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline">New Collection</span>
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select required value={form.client} onValueChange={(v) => setForm({ ...form, client: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Employee</Label>
                <Select required value={form.assignedEmployee} onValueChange={(v) => setForm({ ...form, assignedEmployee: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeOptions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  min={1}
                  required
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collectionDate">Collection Date</Label>
                  <Input
                    id="collectionDate"
                    type="date"
                    required
                    value={form.collectionDate}
                    onChange={(e) => handleCollectionDateChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    required
                    min={toDateInputValue(new Date(new Date(form.collectionDate).getTime() + 24 * 60 * 60 * 1000))}
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                  {form.dueDate <= form.collectionDate && (
                    <p className="text-xs font-medium text-danger">Must be after the collection date</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Collection"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>

        {/* Compact stat strip — scrolls horizontally rather than wrapping. */}
        {summary && (
          <div className="-mx-4 flex items-center gap-3 overflow-x-auto px-4 text-xs md:mx-0 md:gap-4 md:px-0 md:text-sm">
            <span className="flex shrink-0 items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-warning" /> {summary.pendingCount} Pending
            </span>
            <span className="flex shrink-0 items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-success" /> {summary.completedCount} Done
            </span>
            <span className="shrink-0 font-semibold text-success">{formatCurrency(summary.received)}</span>
            <span className="shrink-0 font-semibold text-warning">{formatCurrency(summary.remaining)}</span>
            {amountQuery.trim() && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-semibold">
                {visibleCollections?.length ?? 0} results
              </span>
            )}
          </div>
        )}

        {/* Active filters as chips — keeps long employee/client names readable. */}
        {activeFilterChips.length > 0 && (
          <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClear}
                className="flex shrink-0 items-center gap-1 rounded-full bg-secondary-light px-2.5 py-1 text-xs font-medium text-secondary"
              >
                <span className="max-w-[140px] truncate">{chip.label}</span>
                <X className="h-3 w-3 shrink-0" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 px-1.5 py-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Filter panel — collapsed by default so cards stay above the fold. */}
        {filtersOpen && (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-5">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CollectionStatus | "ALL")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Employees</SelectItem>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Clients</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DateRangePicker value={dateRange} onChange={setDateRange} className="h-8 w-full text-xs" />

            <div className="col-span-2 flex gap-2 md:col-span-1">
              <Select value={amountField} onValueChange={(v) => setAmountField(v as typeof amountField)}>
                <SelectTrigger className="h-8 w-24 shrink-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AMOUNT_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Amount"
                className="h-8 min-w-0 flex-1 text-xs"
                value={amountQuery}
                onChange={(e) => setAmountQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <Card className="border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-soft-sm">
        <CardContent className="p-0 md:p-6 md:pt-6">
          {isLoading ? (
            <LoadingState />
          ) : !visibleCollections || visibleCollections.length === 0 ? (
            <EmptyState icon={Wallet} title="No collections found" description="Try adjusting your filters or create a new collection." />
          ) : (
            <>
              {/* Passed via Link state so the detail page can offer
                  prev/next navigation through this exact filtered/ordered
                  list, and show "N of total". */}
              {(() => {
                const collectionIds = visibleCollections.map((c) => c.id);
                return (
                  <>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Collected</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleCollections.map((c, index) => (
                            <TableRow key={c.id}>
                              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                              <TableCell>
                                <Link
                                  to={`/collections/${c.id}`}
                                  state={{ collectionIds }}
                                  className="font-medium hover:text-secondary"
                                >
                                  {c.client.name}
                                </Link>
                              </TableCell>
                              <TableCell>{c.assignedEmployee.name}</TableCell>
                              <TableCell className="text-success">{formatCurrency(c.receivedAmount)}</TableCell>
                              <TableCell className="text-warning">{formatCurrency(c.remainingAmount)}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(c.totalAmount)}</TableCell>
                              <TableCell>
                                <StatusBadge status={c.status} />
                              </TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(c.dueDate)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.client.name)}>
                                  <Trash2 className="h-4 w-4 text-danger" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <MobileCardList>
                      {visibleCollections.map((c, index) => (
                        <MobileCard key={c.id}>
                          <MobileCardHeader>
                            <Link to={`/collections/${c.id}`} state={{ collectionIds }} className="min-w-0">
                              <p className="truncate text-xs font-medium text-muted-foreground">#{index + 1}</p>
                              <p className="truncate font-semibold text-foreground hover:text-secondary">{c.client.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{c.assignedEmployee.name}</p>
                            </Link>
                            <div className="flex shrink-0 items-center gap-1">
                              <StatusBadge status={c.status} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDelete(c.id, c.client.name)}
                              >
                                <Trash2 className="h-4 w-4 text-danger" />
                              </Button>
                            </div>
                          </MobileCardHeader>
                          <Link to={`/collections/${c.id}`} state={{ collectionIds }}>
                            <div className="divide-y divide-border">
                              <MobileCardRow label="Collected" value={<span className="text-success">{formatCurrency(c.receivedAmount)}</span>} />
                              <MobileCardRow label="Balance" value={<span className="text-warning">{formatCurrency(c.remainingAmount)}</span>} />
                              <MobileCardRow label="Total" value={formatCurrency(c.totalAmount)} />
                              <MobileCardRow label="Due Date" value={formatDate(c.dueDate)} />
                            </div>
                          </Link>
                        </MobileCard>
                      ))}
                    </MobileCardList>
                  </>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
