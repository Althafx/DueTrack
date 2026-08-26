import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IClient extends Document {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const clientSchema = new Schema<IClient>({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

clientSchema.index({ name: "text", phone: "text" });

export const Client = models.Client || model<IClient>("Client", clientSchema);
