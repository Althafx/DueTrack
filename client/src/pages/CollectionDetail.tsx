import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Edit2, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CollectionProgress } from "@/components/shared/CollectionProgress";
import { MobileCard, MobileCardHeader, MobileCardList, MobileCardRow } from "@/components/shared/MobileCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useCollection, useUpdateCollection } from "@/hooks/useCollections";
import { useEmployees } from "@/hooks/useEmployees";
import { usePayments, useUpdatePayment } from "@/hooks/usePayments";
import { getErrorMessage } from "@/services/api";
import { formatCurrency, formatDate, formatDateTime, toDateInputValue } from "@/lib/formatters";
import type { PaymentDTO, PaymentMethod } from "@shared/types";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  OTHER: "Other",
};

interface CollectionNavState {
  collectionIds?: string[];
}

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentDTO | null>(null);

  const { data: collection, isLoading } = useCollection(id);
  const { data: payments, isLoading: paymentsLoading } = usePayments(id);
  const { data: employees } = useEmployees();
  const updateMutation = useUpdateCollection(id ?? "");
  const updatePaymentMutation = useUpdatePayment();

  // The ordered list of collection IDs the user was browsing when they
  // opened this one — passed through Link state from the Collections page.
  // Lets prev/next step through the exact same filtered/sorted list rather
  // than some arbitrary global order. Absent on a direct visit/refresh, in
  // which case prev/next simply doesn't render.
  const collectionIds = (location.state as CollectionNavState | null)?.collectionIds;

  const { currentIndex, prevId, nextId } = useMemo(() => {
    if (!collectionIds || !id) return { currentIndex: -1, prevId: undefined, nextId: undefined };
    const index = collectionIds.indexOf(id);
    if (index === -1) return { currentIndex: -1, prevId: undefined, nextId: undefined };
    return {
      currentIndex: index,
      prevId: index > 0 ? collectionIds[index - 1] : undefined,
      nextId: index < collectionIds.length - 1 ? collectionIds[index + 1] : undefined,
    };
  }, [collectionIds, id]);

  function goTo(targetId: string | undefined) {
    if (!targetId) return;
    navigate(`/collections/${targetId}`, { state: { collectionIds } });
  }

  if (isLoading || !collection) {
    return <LoadingState label="Loading collection..." />;
  }

  const activeEmployees = employees?.filter((e) => e.status === "ACTIVE" || e.id === collection.assignedEmployee.id) ?? [];

  return (
    <div className="animate-page space-y-4 md:space-y-6">
      <div className="sticky top-0 z-10 -mx-4 space-y-3 border-b border-border bg-background px-4 pb-3 pt-3 md:-mx-8 md:border-0 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <div className="flex items-center justify-between gap-2">
          <Link to="/collections" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          {currentIndex !== -1 && collectionIds && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {currentIndex + 1} of {collectionIds.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={!prevId}
                onClick={() => goTo(prevId)}
                aria-label="Previous collection"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={!nextId}
                onClick={() => goTo(nextId)}
                aria-label="Next collection"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Compact client identity, merged into the sticky header instead of
            its own full-width card — keeps the collection summary/payments
            above the fold. */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{collection.client.name}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" /> {collection.client.phone}
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{collection.client.address}</span>
              </span>
            </div>
          </div>
          <StatusBadge status={collection.status} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Collection Summary</CardTitle>
          <EditCollectionDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            employees={activeEmployees}
            collection={collection}
            onSubmit={async (payload) => {
              try {
                await updateMutation.mutateAsync(payload);
                toast.success("Collection updated");
                setEditOpen(false);
              } catch (error) {
                toast.error(getErrorMessage(error));
              }
            }}
            isPending={updateMutation.isPending}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <CollectionProgress received={collection.receivedAmount} total={collection.totalAmount} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
              <p className="mt-1 font-medium">{formatCurrency(collection.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
              <p className="mt-1 font-medium">{collection.assignedEmployee.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Collection Date</p>
              <p className="mt-1 font-medium">{formatDate(collection.collectionDate)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Due Date</p>
              <p className="mt-1 font-medium">{formatDate(collection.dueDate)}</p>
            </div>
          </div>
          {collection.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm">{collection.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <LoadingState />
          ) : !payments || payments.length === 0 ? (
            <EmptyState title="No payments recorded yet" />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">{formatDateTime(p.paymentDate)}</TableCell>
                        <TableCell>{p.employee.name}</TableCell>
                        <TableCell className="font-medium text-success">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{PAYMENT_METHOD_LABEL[p.paymentMethod]}</TableCell>
                        <TableCell className="text-muted-foreground">{p.remarks || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setEditingPayment(p)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <MobileCardList>
                {payments.map((p) => (
                  <MobileCard key={p.id}>
                    <MobileCardHeader>
                      <span className="text-lg font-semibold text-success">{formatCurrency(p.amount)}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {PAYMENT_METHOD_LABEL[p.paymentMethod]}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPayment(p)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </MobileCardHeader>
                    <div className="divide-y divide-border">
                      <MobileCardRow label="Date" value={formatDateTime(p.paymentDate)} />
                      <MobileCardRow label="Employee" value={p.employee.name} />
                      <MobileCardRow label="Remarks" value={p.remarks || "—"} />
                    </div>
                  </MobileCard>
                ))}
              </MobileCardList>
            </>
          )}
        </CardContent>
      </Card>

      <EditPaymentDialog
        payment={editingPayment}
        onOpenChange={(open) => !open && setEditingPayment(null)}
        onSubmit={async (payload) => {
          if (!editingPayment) return;
          try {
            await updatePaymentMutation.mutateAsync({ id: editingPayment.id, payload });
            toast.success("Payment updated");
            setEditingPayment(null);
          } catch (error) {
            toast.error(getErrorMessage(error));
          }
        }}
        isPending={updatePaymentMutation.isPending}
      />
    </div>
  );
}

function EditCollectionDialog({
  open,
  onOpenChange,
  employees,
  collection,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Array<{ id: string; name: string }>;
  collection: {
    assignedEmployee: { id: string };
    totalAmount: number;
    collectionDate: string;
    dueDate: string;
    notes?: string;
  };
  onSubmit: (payload: { assignedEmployee: string; totalAmount: number; dueDate: string; notes?: string }) => void;
  isPending: boolean;
}) {
  const [assignedEmployee, setAssignedEmployee] = useState(collection.assignedEmployee.id);
  const [totalAmount, setTotalAmount] = useState(String(collection.totalAmount));
  const [dueDate, setDueDate] = useState(toDateInputValue(collection.dueDate));
  const [notes, setNotes] = useState(collection.notes ?? "");
  const collectionDate = toDateInputValue(collection.collectionDate);
  const isDueDateInvalid = dueDate <= collectionDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => onOpenChange(true)}>
        <Edit2 className="h-3.5 w-3.5" /> Edit
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Collection</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (isDueDateInvalid) {
              toast.error("Due date must be after the collection date");
              return;
            }
            onSubmit({ assignedEmployee, totalAmount: Number(totalAmount), dueDate, notes });
          }}
        >
          <div className="space-y-2">
            <Label>Assigned Employee</Label>
            <Select value={assignedEmployee} onValueChange={setAssignedEmployee}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="editTotalAmount">Total Amount (₹)</Label>
            <Input id="editTotalAmount" type="number" min={1} value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editDueDate">Due Date</Label>
            <Input
              id="editDueDate"
              type="date"
              min={toDateInputValue(new Date(new Date(collectionDate).getTime() + 24 * 60 * 60 * 1000))}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            {isDueDateInvalid && <p className="text-xs font-medium text-danger">Must be after the collection date</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="editNotes">Notes</Label>
            <Input id="editNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPaymentDialog({
  payment,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  payment: PaymentDTO | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { amount: number; paymentMethod: PaymentMethod; remarks?: string }) => void;
  isPending: boolean;
}) {
  if (!payment) return null;

  return <EditPaymentForm key={payment.id} payment={payment} onOpenChange={onOpenChange} onSubmit={onSubmit} isPending={isPending} />;
}

function EditPaymentForm({
  payment,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  payment: PaymentDTO;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { amount: number; paymentMethod: PaymentMethod; remarks?: string }) => void;
  isPending: boolean;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(payment.paymentMethod);
  const [remarks, setRemarks] = useState(payment.remarks ?? "");

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const numericAmount = Number(amount);
            if (!numericAmount || numericAmount <= 0) {
              toast.error("Enter a valid amount");
              return;
            }
            onSubmit({ amount: numericAmount, paymentMethod, remarks: remarks || undefined });
          }}
        >
          <p className="text-sm text-muted-foreground">
            Correcting this payment updates the collection totals immediately, including in {payment.employee.name}'s own
            collection list.
          </p>
          <div className="space-y-2">
            <Label htmlFor="editPaymentAmount">Amount (₹)</Label>
            <Input
              id="editPaymentAmount"
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="editPaymentRemarks">Remarks</Label>
            <Textarea id="editPaymentRemarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
