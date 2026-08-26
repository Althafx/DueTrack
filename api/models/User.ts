import { Schema, model, models, type Document, type Model } from "mongoose";
import bcrypt from "bcryptjs";
import type { Role, UserStatus } from "@shared/types";

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: false, minlength: 6 },
  role: { type: String, enum: ["DEALER", "EMPLOYEE"], required: true },
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = (models.User as IUserModel) || model<IUser, IUserModel>("User", userSchema);
