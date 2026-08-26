import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PaymentMethod } from "@shared/types";

// `collection` is a reserved property name on Mongoose's Document (the
// underlying driver collection handle) — Omit it before re-declaring our
// own `collection` reference field with the same name, per the spec.
export interface IPayment extends Omit<Document, "collection"> {
  collection: Types.ObjectId;
  client: Types.ObjectId;
  employee: Types.ObjectId;
  // Snapshots of the client/employee's identity at the moment of payment —
  // Payment is a permanent audit record, so it must stay fully readable
  // even after the referenced Client or Employee is later deleted.
  clientName: string;
  clientPhone: string;
  employeeName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  remarks?: string;
  paymentDate: Date;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    collection: { type: Schema.Types.ObjectId, ref: "Collection", required: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientName: { type: String, required: true },
    clientPhone: { type: String, required: true },
    employeeName: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK_TRANSFER", "UPI", "OTHER"],
      required: true,
    },
    remarks: { type: String, trim: true },
    paymentDate: { type: Date, required: true, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { suppressReservedKeysWarning: true }
);

paymentSchema.index({ collection: 1, createdAt: -1 });
paymentSchema.index({ employee: 1 });
paymentSchema.index({ paymentDate: 1 });

export const Payment = models.Payment || model<IPayment>("Payment", paymentSchema);
