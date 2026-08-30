import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Client } from "../models/Client";
import { Collection } from "../models/Collection";
import { Payment } from "../models/Payment";
import { ApiError, computeStatus } from "../utils/status";
import { isValidDateString } from "../utils/dates";
import { toPaymentDTO } from "../utils/mappers";
import { asyncHandler } from "../utils/asyncHandler";

function isNotFutureDay(value: string): boolean {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(value).getTime() <= endOfToday.getTime();
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

const POPULATE = ["client", "employee"];

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const { collection } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {};
  if (collection) filter.collection = collection;
  if (req.user!.role === "EMPLOYEE") filter.employee = req.user!.id;

  const payments = await Payment.find(filter).populate(POPULATE).sort({ createdAt: -1 });
  res.json({ payments: payments.map((p) => toPaymentDTO(p as any)) });
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findById(req.params.id).populate(POPULATE);
  if (!payment) throw new ApiError(404, "Payment not found");

  if (req.user!.role === "EMPLOYEE" && String((payment.employee as any).id) !== String(req.user!.id)) {
    throw new ApiError(403, "You can only view your own payments");
  }

  res.json({ payment: toPaymentDTO(payment as any) });
});

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const { collection: collectionId, amount, paymentMethod, paymentDate, remarks } = req.body as z.infer<
    typeof createPaymentSchema
  >;

  const session = await mongoose.startSession();

  try {
    let paymentId: string | null = null;

    await session.withTransaction(async () => {
      const collection = await Collection.findById(collectionId).session(session);
      if (!collection) throw new ApiError(404, "Collection not found");

      if (!collection.assignedEmployee.equals(req.user!.id)) {
        throw new ApiError(403, "You can only add payments to your own assigned collections");
      }

      if (collection.status === "COMPLETED") {
        throw new ApiError(400, "This collection has already been fully collected");
      }

      if (amount > collection.remainingAmount) {
        throw new ApiError(
          400,
          `Amount cannot exceed the remaining balance of ${collection.remainingAmount}`
        );
      }

      const client = await Client.findById(collection.client).session(session);
      if (!client) throw new ApiError(404, "Client not found");

      const [payment] = await Payment.create(
        [
          {
            collection: collection.id,
            client: collection.client,
            employee: req.user!.id,
            clientName: client.name,
            clientPhone: client.phone,
            employeeName: req.user!.name,
            amount,
            paymentMethod,
            remarks,
            paymentDate: new Date(paymentDate),
          },
        ],
        { session }
      );

      collection.receivedAmount += amount;
      collection.remainingAmount -= amount;
      collection.status = computeStatus(collection.totalAmount, collection.receivedAmount);
      await collection.save({ session });

      paymentId = payment.id;
    });

    const populated = await Payment.findById(paymentId).populate(POPULATE);
    res.status(201).json({ payment: toPaymentDTO(populated as any) });
  } finally {
    await session.endSession();
  }
});

export const updatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount, paymentMethod, remarks } = req.body as z.infer<typeof updatePaymentSchema>;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(req.params.id).session(session);
      if (!payment) throw new ApiError(404, "Payment not found");

      const collection = await Collection.findById(payment.collection).session(session);
      if (!collection) throw new ApiError(404, "Collection not found");

      const delta = amount - payment.amount;
      const nextReceived = collection.receivedAmount + delta;

      if (nextReceived < 0) {
        throw new ApiError(400, "Amount cannot make the collected total negative");
      }
      if (nextReceived > collection.totalAmount) {
        throw new ApiError(
          400,
          `Amount cannot exceed the collection's total of ${collection.totalAmount}`
        );
      }

      payment.amount = amount;
      if (paymentMethod) payment.paymentMethod = paymentMethod;
      if (remarks !== undefined) payment.remarks = remarks;
      await payment.save({ session });

      collection.receivedAmount = nextReceived;
      collection.remainingAmount = collection.totalAmount - nextReceived;
      collection.status = computeStatus(collection.totalAmount, nextReceived);
      await collection.save({ session });
    });

    const populated = await Payment.findById(req.params.id).populate(POPULATE);
    res.json({ payment: toPaymentDTO(populated as any) });
  } finally {
    await session.endSession();
  }
});
