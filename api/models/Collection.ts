import { Schema, model, models, type Document, type Types } from "mongoose";
import type { CollectionStatus } from "@shared/types";

export interface ICollection extends Document {
  client: Types.ObjectId;
  assignedEmployee: Types.ObjectId;
  totalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  status: CollectionStatus;
  collectionDate: Date;
  dueDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    assignedEmployee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalAmount: { type: Number, required: true, min: 1 },
    receivedAmount: { type: Number, required: true, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PENDING", "PARTIALLY_COLLECTED", "COMPLETED"],
      default: "PENDING",
    },
    collectionDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

collectionSchema.index({ status: 1 });
collectionSchema.index({ assignedEmployee: 1 });
collectionSchema.index({ client: 1 });

export const Collection = models.Collection || model<ICollection>("Collection", collectionSchema);
