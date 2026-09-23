/**
 * Server-only credential encryption using AES-256-GCM.
 *
 * Format: iv_hex:authTag_hex:ciphertext_hex
 *
 * SECURITY RULES:
 * - Never log inputs or outputs of these functions.
 * - Never return decrypted values to the browser.
 * - The key comes from NEXUS_CREDENTIAL_ENCRYPTION_KEY (32 bytes hex-encoded = 64 hex chars).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const hex = process.env.NEXUS_CREDENTIAL_ENCRYPTION_KEY;
  if (!hex || hex.length !== KEY_BYTES * 2) {
    throw new Error(
      "NEXUS_CREDENTIAL_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string.
 * Returns a colon-separated string: iv_hex:authTag_hex:ciphertext_hex
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypts a ciphertext string produced by `encrypt`.
 * Returns the original plaintext.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted credential format.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  if (iv.length !== IV_BYTES || authTag.length !== TAG_BYTES) {
    throw new Error("Malformed encrypted credential.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Returns a masked representation for display — e.g. sk-••••••••2A3F
 * Never use this for any comparison or validation logic.
 */
export function maskCredential(plaintext: string): string {
  if (plaintext.length <= 8) return "••••••••";
  const visible = plaintext.slice(-4);
  return `••••••••${visible}`;
}
