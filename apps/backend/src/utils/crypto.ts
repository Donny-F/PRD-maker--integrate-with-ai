import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM

function getMasterKey(): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error("ENCRYPTION_MASTER_KEY is not defined in environment variables");
  }

  // If 64 hex characters, convert to 32 bytes Buffer
  if (/^[0-9a-fA-F]{64}$/.test(masterKey)) {
    return Buffer.from(masterKey, "hex");
  }

  // Fallback: SHA-256 hash of the master key string to guarantee exactly 32 bytes
  return crypto.createHash("sha256").update(masterKey).digest();
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns formatted string: iv:authTag:encryptedData (in hex)
 */
export function encryptApiKey(plainText: string): string {
  if (!plainText) return "";
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string formatted as iv:authTag:encryptedData
 */
export function decryptApiKey(encryptedPayload: string): string {
  if (!encryptedPayload) return "";
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format. Expected iv:authTag:data");
  }

  const [ivHex, authTagHex, encryptedDataHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedDataHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Masks an API key for safe display in UI, e.g. "sk-...1234"
 */
export function maskApiKey(plainText?: string | null): string {
  if (!plainText) return "";
  if (plainText.length <= 8) return "********";
  return `${plainText.slice(0, 4)}...${plainText.slice(-4)}`;
}
