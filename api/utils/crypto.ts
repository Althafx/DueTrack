import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

// Read and validate lazily (on first actual use, not at module scope) —
// see the comment in jwt.ts for why: Cloudflare's deploy-time bundling
// evaluates the module graph before secrets are available on `process.env`,
// so a top-level `const KEY = ...; if (!KEY) throw ...` fails during
// deploy even though it works fine locally under `wrangler dev`.
let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.PASSWORD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("PASSWORD_ENCRYPTION_KEY is not set in the environment");
  }

  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("PASSWORD_ENCRYPTION_KEY must be a 32-byte key encoded as 64 hex characters");
  }

  cachedKey = key;
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
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

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
