import { Schema, model, models, type Document, type Model } from "mongoose";
import bcrypt from "bcryptjs";
import type { Role, UserStatus } from "@shared/types";
import { encrypt } from "../utils/crypto";

export interface IUser extends Document {
  name: string;
  username: string;
  phone: string;
  password: string;
  encryptedPassword: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: false, minlength: 6 },
  encryptedPassword: { type: String, required: true, select: false },
  role: { type: String, enum: ["DEALER", "EMPLOYEE"], required: true },
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("validate", async function (next) {
  if (!this.isModified("password")) return next();
  const plaintext = this.password;
  this.password = await bcrypt.hash(plaintext, 10);
  this.encryptedPassword = encrypt(plaintext);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = (models.User as IUserModel) || model<IUser, IUserModel>("User", userSchema);
