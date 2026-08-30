import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPayment, fetchPayments, updatePayment } from "@/services/payments";
import type { CreatePaymentRequest, UpdatePaymentRequest } from "@shared/types";

export function usePayments(collectionId?: string) {
  return useQuery({
    queryKey: ["payments", collectionId ?? "all"],
    queryFn: () => fetchPayments(collectionId),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaymentRequest) => createPayment(payload),
    onSuccess: (payment) => {
      // Invalidate everything the new payment could have changed so both the
      // employee's own view and the dealer's dashboard reflect it without a
      // manual refresh.
      queryClient.invalidateQueries({ queryKey: ["payments", payment.collection] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePaymentRequest }) => updatePayment(id, payload),
    onSuccess: (payment) => {
      // A corrected payment changes the parent collection's totals too, so
      // invalidate everywhere that reflects it — including the employee's
      // own collection list, since a dealer can fix an employee's mistake.
      queryClient.invalidateQueries({ queryKey: ["payments", payment.collection] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
