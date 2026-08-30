import crypto from "node:crypto";

const RAW_KEY = process.env.PASSWORD_ENCRYPTION_KEY;

if (!RAW_KEY) {
  throw new Error("PASSWORD_ENCRYPTION_KEY is not set in the environment");
}

const KEY = Buffer.from(RAW_KEY, "hex");

if (KEY.length !== 32) {
  throw new Error("PASSWORD_ENCRYPTION_KEY must be a 32-byte key encoded as 64 hex characters");
}

const ALGORITHM = "aes-256-gcm";

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted payload");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
