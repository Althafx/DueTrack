import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Trash2, Wallet, X } from "lucide-react";
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

  const activeEmployees = employees?.filter((e) => e.status === "ACTIVE") ?? [];

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
    <div className="animate-page space-y-6">
      <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-background px-4 pb-3 pt-4 md:-mx-8 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-semibold">Collections</h1>
              <p className="text-sm text-muted-foreground">Assign and track payment collections</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full min-w-[160px] flex-1 sm:max-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Client, employee, phone..."
                  className="h-9 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={amountField} onValueChange={(v) => setAmountField(v as typeof amountField)}>
                <SelectTrigger className="h-9 w-24 shrink-0">
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
                placeholder="e.g. 5000"
                className="h-9 w-24 shrink-0"
                value={amountQuery}
                onChange={(e) => setAmountQuery(e.target.value)}
              />
              {amountQuery.trim() && (
                <span className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-md border border-border bg-muted px-3 text-sm font-semibold text-foreground">
                  Results: {visibleCollections?.length ?? 0}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            {summary && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:text-base sm:justify-end">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Pending {summary.pendingCount}
                </span>
                <span className="flex items-center gap-2 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-success" /> Completed {summary.completedCount}
                </span>
                <span className="font-semibold text-success">Collected {formatCurrency(summary.received)}</span>
                <span className="font-semibold text-warning">Balance {formatCurrency(summary.remaining)}</span>
              </div>
            )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Collection
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
                    {activeEmployees.map((e) => (
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
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CollectionStatus | "ALL")}>
            <SelectTrigger className="h-8 flex-1 text-xs sm:min-w-[140px]">
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
            <SelectTrigger className="h-8 flex-1 text-xs sm:min-w-[140px]">
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
            <SelectTrigger className="h-8 flex-1 text-xs sm:min-w-[140px]">
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

          <DateRangePicker value={dateRange} onChange={setDateRange} className="h-8 flex-1 text-xs sm:min-w-[160px]" />

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3" /> Clear filters
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingState />
          ) : !visibleCollections || visibleCollections.length === 0 ? (
            <EmptyState icon={Wallet} title="No collections found" description="Try adjusting your filters or create a new collection." />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {visibleCollections.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link to={`/collections/${c.id}`} className="font-medium hover:text-secondary">
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
                {visibleCollections.map((c) => (
                  <MobileCard key={c.id}>
                    <MobileCardHeader>
                      <Link to={`/collections/${c.id}`} className="min-w-0">
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
                    <Link to={`/collections/${c.id}`}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
