import { api } from "./api";
import type { CreatePaymentRequest, PaymentDTO, UpdatePaymentRequest } from "@shared/types";

export async function fetchPayments(collectionId?: string): Promise<PaymentDTO[]> {
  const { data } = await api.get<{ payments: PaymentDTO[] }>("/payments", {
    params: collectionId ? { collection: collectionId } : undefined,
  });
  return data.payments;
}

export async function createPayment(payload: CreatePaymentRequest): Promise<PaymentDTO> {
  const { data } = await api.post<{ payment: PaymentDTO }>("/payments", payload);
  return data.payment;
}

export async function updatePayment(id: string, payload: UpdatePaymentRequest): Promise<PaymentDTO> {
  const { data } = await api.patch<{ payment: PaymentDTO }>(`/payments/${id}`, payload);
  return data.payment;
}
