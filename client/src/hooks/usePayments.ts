import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPayment, fetchPayments } from "@/services/payments";
import type { CreatePaymentRequest } from "@shared/types";

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
