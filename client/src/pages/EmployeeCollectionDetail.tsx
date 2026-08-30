import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CollectionProgress } from "@/components/shared/CollectionProgress";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useCollection } from "@/hooks/useCollections";
import { useCreatePayment, usePayments } from "@/hooks/usePayments";
import { getErrorMessage } from "@/services/api";
import { formatCurrency, formatDateTime, toDateInputValue } from "@/lib/formatters";
import type { PaymentMethod } from "@shared/types";

const PAYMENT_METHODS: Array<{ label: string; value: PaymentMethod }> = [
  { label: "Cash", value: "CASH" },
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
  { label: "UPI", value: "UPI" },
  { label: "Other", value: "OTHER" },
];

export default function EmployeeCollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: collection, isLoading } = useCollection(id);
  const { data: payments, isLoading: paymentsLoading } = usePayments(id);
  const createPaymentMutation = useCreatePayment();

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(toDateInputValue(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [remarks, setRemarks] = useState("");

  if (isLoading || !collection) {
    return <LoadingState label="Loading collection..." />;
  }

  const isCompleted = collection.status === "COMPLETED";
  const numericAmount = Number(amount);
  const exceedsRemaining = numericAmount > collection.remainingAmount;
  const today = toDateInputValue(new Date());
  const isFutureDated = paymentDate > today;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    if (!numericAmount || numericAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (exceedsRemaining) {
      toast.error("Amount cannot exceed the remaining balance");
      return;
    }
    if (isFutureDated) {
      toast.error("Payment date cannot be in the future");
      return;
    }

    try {
      await createPaymentMutation.mutateAsync({
        collection: id,
        amount: numericAmount,
        paymentMethod,
        paymentDate,
        remarks: remarks || undefined,
      });
      toast.success("Payment recorded");
      setAmount("");
      setRemarks("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-2 pt-4">
        <Link to="/employee/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <Card>
        <CardContent className="space-y-2 pt-5">
          <div className="flex items-start justify-between">
            <p className="text-lg font-semibold">{collection.client.name}</p>
            <StatusBadge status={collection.status} />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> {collection.client.phone}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {collection.client.address}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CollectionProgress received={collection.receivedAmount} total={collection.totalAmount} />
        </CardContent>
      </Card>

      {isCompleted ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-center text-sm font-medium text-success">This collection has been fully paid.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount Received (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={collection.remainingAmount}
                  required
                  className="h-12 text-lg"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Max ${formatCurrency(collection.remainingAmount)}`}
                />
                {exceedsRemaining && (
                  <p className="text-xs font-medium text-danger">
                    Cannot exceed remaining balance of {formatCurrency(collection.remainingAmount)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  required
                  max={today}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
                {isFutureDated && <p className="text-xs font-medium text-danger">Cannot be in the future</p>}
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={createPaymentMutation.isPending || exceedsRemaining || isFutureDated}
              >
                {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <LoadingState />
          ) : !payments || payments.length === 0 ? (
            <EmptyState title="No payments recorded yet" />
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="font-medium text-success">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(p.paymentDate)}</p>
                    {p.remarks && <p className="text-xs text-muted-foreground">{p.remarks}</p>}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{p.paymentMethod.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
