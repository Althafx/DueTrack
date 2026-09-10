import bcrypt from "bcryptjs";
import { encrypt } from "./crypto";

export async function hashAndEncryptPassword(plaintext: string): Promise<{ password: string; encryptedPassword: string }> {
  const password = await bcrypt.hash(plaintext, 10);
  const encryptedPassword = encrypt(plaintext);
  return { password, encryptedPassword };
}

export async function comparePassword(candidate: string, hash: string): Promise<boolean> {
  return bcrypt.compare(candidate, hash);
}
