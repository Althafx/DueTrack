import type { Request, Response } from "express";
import { z } from "zod";
import { findClientById } from "../db/clients";
import { findCollectionById } from "../db/collections";
import {
  createPaymentAndUpdateCollection,
  deletePaymentAndUpdateCollection,
  deletePaymentOnly,
  findPaymentById,
  findPaymentWithRefs,
  listPaymentsWithRefs,
  setPaymentVerified,
  updatePaymentAndCollection,
  type PaymentListFilter,
} from "../db/payments";
import { ApiError, computeStatus } from "../utils/status";
import { isValidDateString } from "../utils/dates";
import { toPaymentDTO } from "../utils/mappers";
import { asyncHandler } from "../utils/asyncHandler";

function isNotFutureDay(value: string): boolean {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(value).getTime() <= endOfToday.getTime();
}

// The payment date picker only lets an employee choose which calendar day a
// payment happened on (for backdating) — there's no time-of-day input. The
// time should always be "now", like a message timestamp, never midnight.
// Parsing a "YYYY-MM-DD" string alone would default to UTC midnight, which
// renders as 5:30am for an IST viewer — so take the picked day but stamp it
// with the real current time.
function resolvePaymentTimestamp(dateOnlyValue: string): Date {
  const now = new Date();
  const [year, month, day] = dateOnlyValue.split("-").map(Number);
  const result = new Date(now);
  result.setFullYear(year, month - 1, day);
  return result;
}

export const createPaymentSchema = z.object({
  collection: z.string().min(1),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "UPI", "OTHER"]),
  paymentDate: z
    .string()
    .min(1)
    .refine(isValidDateString, "Invalid date")
    .refine(isNotFutureDay, "Payment date cannot be in the future"),
  remarks: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "UPI", "OTHER"]).optional(),
  remarks: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  verified: z.boolean(),
});

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const { collection } = req.query as Record<string, string | undefined>;

  const filter: PaymentListFilter = {};
  if (collection) filter.collectionId = collection;
  if (req.user!.role === "EMPLOYEE") filter.employeeId = req.user!.id;

  const payments = await listPaymentsWithRefs(filter);
  res.json({ payments: payments.map(toPaymentDTO) });
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await findPaymentWithRefs(req.params.id);
  if (!payment) throw new ApiError(404, "Payment not found");

  if (req.user!.role === "EMPLOYEE" && String(payment.employee_id) !== String(req.user!.id)) {
    throw new ApiError(403, "You can only view your own payments");
  }

  res.json({ payment: toPaymentDTO(payment) });
});

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const { collection: collectionId, amount, paymentMethod, paymentDate, remarks } = req.body as z.infer<
    typeof createPaymentSchema
  >;

  const collection = await findCollectionById(collectionId);
  if (!collection) throw new ApiError(404, "Collection not found");

  if (String(collection.assigned_employee_id) !== String(req.user!.id)) {
    throw new ApiError(403, "You can only add payments to your own assigned collections");
  }

  if (collection.status === "COMPLETED") {
    throw new ApiError(400, "This collection has already been fully collected");
  }

  if (amount > collection.remaining_amount) {
    throw new ApiError(400, `Amount cannot exceed the remaining balance of ${collection.remaining_amount}`);
  }

  const client = collection.client_id ? await findClientById(collection.client_id) : null;
  if (!client) throw new ApiError(404, "Client not found");

  const nextReceivedAmount = collection.received_amount + amount;
  const nextRemainingAmount = collection.remaining_amount - amount;
  const nextStatus = computeStatus(collection.total_amount, nextReceivedAmount);

  const paymentId = await createPaymentAndUpdateCollection({
    collectionId: collection.id,
    clientId: collection.client_id,
    employeeId: req.user!.id,
    clientName: client.name,
    clientPhone: client.phone,
    employeeName: req.user!.name,
    amount,
    paymentMethod,
    remarks,
    paymentDate: resolvePaymentTimestamp(paymentDate).toISOString(),
    nextReceivedAmount,
    nextRemainingAmount,
    nextStatus,
  });

  const populated = await findPaymentWithRefs(paymentId);
  res.status(201).json({ payment: toPaymentDTO(populated!) });
});

export const updatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount, paymentMethod, remarks } = req.body as z.infer<typeof updatePaymentSchema>;

  const payment = await findPaymentById(req.params.id);
  if (!payment) throw new ApiError(404, "Payment not found");

  if (!payment.collection_id) throw new ApiError(404, "Collection not found");
  const collection = await findCollectionById(payment.collection_id);
  if (!collection) throw new ApiError(404, "Collection not found");

  const delta = amount - payment.amount;
  const nextReceived = collection.received_amount + delta;

  if (nextReceived < 0) {
    throw new ApiError(400, "Amount cannot make the collected total negative");
  }
  if (nextReceived > collection.total_amount) {
    throw new ApiError(400, `Amount cannot exceed the collection's total of ${collection.total_amount}`);
  }

  const nextRemaining = collection.total_amount - nextReceived;
  const nextStatus = computeStatus(collection.total_amount, nextReceived);

  await updatePaymentAndCollection({
    paymentId: payment.id,
    amount,
    paymentMethod,
    remarks,
    collectionId: collection.id,
    nextReceivedAmount: nextReceived,
    nextRemainingAmount: nextRemaining,
    nextStatus,
  });

  const populated = await findPaymentWithRefs(req.params.id);
  res.json({ payment: toPaymentDTO(populated!) });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { verified } = req.body as z.infer<typeof verifyPaymentSchema>;

  const payment = await findPaymentById(req.params.id);
  if (!payment) throw new ApiError(404, "Payment not found");

  await setPaymentVerified(payment.id, verified);

  const populated = await findPaymentWithRefs(req.params.id);
  res.json({ payment: toPaymentDTO(populated!) });
});

export const deletePayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await findPaymentById(req.params.id);
  if (!payment) throw new ApiError(404, "Payment not found");

  // A payment can outlive its collection (dangling-reference pattern used
  // throughout this app) — if the collection is already gone, just remove
  // the payment record with no totals to roll back.
  const collection = payment.collection_id ? await findCollectionById(payment.collection_id) : null;

  if (collection) {
    const nextReceived = collection.received_amount - payment.amount;
    const nextRemaining = collection.remaining_amount + payment.amount;
    const nextStatus = computeStatus(collection.total_amount, nextReceived);

    await deletePaymentAndUpdateCollection({
      paymentId: payment.id,
      collectionId: collection.id,
      nextReceivedAmount: nextReceived,
      nextRemainingAmount: nextRemaining,
      nextStatus,
    });
  } else {
    await deletePaymentOnly(payment.id);
  }

  res.json({ message: "Payment deleted" });
});
