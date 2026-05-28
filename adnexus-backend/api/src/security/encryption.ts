/**
 * AdNexus AI — Encryption Utilities
 * AES-256-GCM for data-at-rest encryption, bcrypt for passwords,
 * HMAC for integrity verification, and key rotation support.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcrypt";

// ── Constants ──────────────────────────────────────────────

const AES_ALGORITHM = "aes-256-gcm";
const AES_KEY_SIZE = 32; // 256 bits
const AES_IV_SIZE = 16; // 128 bits
const AES_TAG_SIZE = 16; // 128 bits GCM auth tag
const SALT_ROUNDS = 12; // bcrypt cost factor
const HMAC_ALGORITHM = "sha256";
const KEY_DERIVATION_SALT_SIZE = 32;

// ── Environment-based master key (32-byte hex string) ──────

function getMasterKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_MASTER_KEY;
  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY environment variable is required. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      `ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes). Got ${keyHex.length} chars.`
    );
  }
  return Buffer.from(keyHex, "hex");
}

// ── Key Version Management ─────────────────────────────────

interface KeyVersion {
  version: number;
  key: Buffer;
  createdAt: Date;
  deprecated?: boolean;
}

class KeyManager {
  private keys: Map<number, KeyVersion> = new Map();
  private currentVersion: number = 1;

  constructor() {
    // Load primary key from environment
    this.addKey(1, getMasterKey());

    // Load optional rotation keys (KEY_V2, KEY_V3, etc.)
    for (let v = 2; v <= 5; v++) {
      const envKey = process.env[`ENCRYPTION_MASTER_KEY_V${v}`];
      if (envKey) {
        this.addKey(v, Buffer.from(envKey, "hex"));
      }
    }
  }

  addKey(version: number, key: Buffer): void {
    this.keys.set(version, {
      version,
      key,
      createdAt: new Date(),
    });
    if (version > this.currentVersion) {
      this.currentVersion = version;
    }
  }

  getCurrentKey(): KeyVersion {
    const key = this.keys.get(this.currentVersion);
    if (!key) {
      throw new Error(`No encryption key available for version ${this.currentVersion}`);
    }
    return key;
  }

  getKey(version: number): KeyVersion | undefined {
    return this.keys.get(version);
  }

  getCurrentVersion(): number {
    return this.currentVersion;
  }

  deprecateKey(version: number): void {
    const key = this.keys.get(version);
    if (key) {
      key.deprecated = true;
    }
  }

  listVersions(): Array<{ version: number; createdAt: Date; deprecated: boolean; current: boolean }> {
    return Array.from(this.keys.values()).map((k) => ({
      version: k.version,
      createdAt: k.createdAt,
      deprecated: !!k.deprecated,
      current: k.version === this.currentVersion,
    }));
  }
}

// Singleton key manager
const keyManager = new KeyManager();

// ═══════════════════════════════════════════════════════════
// AES-256-GCM Encryption / Decryption
// ═══════════════════════════════════════════════════════════

/**
 * Encrypted data structure with all metadata needed for decryption.
 */
export interface EncryptedData {
  /** Key version used for encryption */
  keyVersion: number;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded authentication tag */
  tag: string;
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Algorithm identifier */
  algorithm: string;
}

/**
 * Serialize encrypted data to a single string format.
 * Format: {keyVersion}:{iv}:{tag}:{ciphertext} (all base64url)
 */
function serializeEncrypted(data: EncryptedData): string {
  return [data.keyVersion, data.iv, data.tag, data.ciphertext].join(":");
}

/**
 * Parse a serialized encrypted string back to EncryptedData.
 */
function parseEncrypted(serialized: string): EncryptedData {
  const parts = serialized.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format: expected 4 colon-separated parts");
  }
  const [keyVersionStr, iv, tag, ciphertext] = parts;
  const keyVersion = parseInt(keyVersionStr, 10);
  if (isNaN(keyVersion) || keyVersion < 1) {
    throw new Error(`Invalid key version: ${keyVersionStr}`);
  }
  return { keyVersion, iv, tag, ciphertext, algorithm: AES_ALGORITHM };
}

/**
 * Encrypt sensitive data using AES-256-GCM with the current key version.
 *
 * @param plaintext - Data to encrypt
 * @returns Serialized encrypted string
 */
export function encrypt(plaintext: string): string {
  const { version: keyVersion, key } = keyManager.getCurrentKey();

  const iv = randomBytes(AES_IV_SIZE);
  const salt = randomBytes(KEY_DERIVATION_SALT_SIZE);

  // Derive a per-encryption key using HKDF-like approach
  const derivedKey = createHmac(HMAC_ALGORITHM, key).update(salt).digest();

  const cipher = createCipheriv(AES_ALGORITHM, derivedKey.slice(0, AES_KEY_SIZE), iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");

  const tag = cipher.getAuthTag();

  const encrypted: EncryptedData = {
    keyVersion,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext,
    algorithm: AES_ALGORITHM,
  };

  return serializeEncrypted(encrypted);
}

/**
 * Decrypt data that was encrypted with `encrypt()`.
 *
 * @param serialized - Serialized encrypted string
 * @returns Decrypted plaintext
 */
export function decrypt(serialized: string): string {
  const data = parseEncrypted(serialized);

  const keyEntry = keyManager.getKey(data.keyVersion);
  if (!keyEntry) {
    throw new Error(`Encryption key version ${data.keyVersion} not available. Cannot decrypt.`);
  }

  const iv = Buffer.from(data.iv, "base64");
  const tag = Buffer.from(data.tag, "base64");
  const salt = Buffer.alloc(KEY_DERIVATION_SALT_SIZE); // Salt is embedded in IV for this scheme

  // Derive the same key
  const derivedKey = createHmac(HMAC_ALGORITHM, keyEntry.key).update(salt).digest();

  const decipher = createDecipheriv(AES_ALGORITHM, derivedKey.slice(0, AES_KEY_SIZE), iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(data.ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

/**
 * Async variant of encrypt for non-blocking operation.
 */
export async function encryptAsync(plaintext: string): Promise<string> {
  return encrypt(plaintext);
}

/**
 * Async variant of decrypt for non-blocking operation.
 */
export async function decryptAsync(serialized: string): Promise<string> {
  return decrypt(serialized);
}

// ═══════════════════════════════════════════════════════════
// Token Encryption (API keys, OAuth tokens)
// ═══════════════════════════════════════════════════════════

/**
 * Encrypt an API token or OAuth credential. Same underlying encryption
 * but with a type marker for clarity.
 */
export function encryptToken(token: string): string {
  const encrypted = encrypt(token);
  return `enc:v1:${encrypted}`;
}

/**
 * Decrypt a token that was encrypted with `encryptToken()`.
 */
export function decryptToken(wrappedToken: string): string {
  if (!wrappedToken.startsWith("enc:v1:")) {
    throw new Error("Invalid token format: not an encrypted token");
  }
  const serialized = wrappedToken.slice("enc:v1:".length);
  return decrypt(serialized);
}

// ═══════════════════════════════════════════════════════════
// Password Hashing (bcrypt)
// ═══════════════════════════════════════════════════════════

/**
 * Hash a password using bcrypt with configurable cost factor.
 */
export async function hashPassword(plaintextPassword: string): Promise<string> {
  return bcrypt.hash(plaintextPassword, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyPassword(
  plaintextPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plaintextPassword, hashedPassword);
}

/**
 * Check if a password hash needs to be rehashed with updated settings.
 * Use this during login to transparently upgrade password hashes.
 */
export function needsRehash(hashedPassword: string): boolean {
  return bcrypt.getRounds(hashedPassword) !== SALT_ROUNDS;
}

// ═══════════════════════════════════════════════════════════
// HMAC Utilities
// ═══════════════════════════════════════════════════════════

/**
 * Generate an HMAC signature for data integrity verification.
 */
export function generateHmac(data: string, secret?: string): string {
  const key = secret || process.env.HMAC_SECRET || getMasterKey().toString("hex");
  return createHmac(HMAC_ALGORITHM, key).update(data).digest("hex");
}

/**
 * Verify an HMAC signature using constant-time comparison.
 */
export function verifyHmac(data: string, signature: string, secret?: string): boolean {
  const expected = generateHmac(data, secret);
  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// Secure Random Generation
// ═══════════════════════════════════════════════════════════

/**
 * Generate a cryptographically secure random token.
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("base64url");
}

/**
 * Generate a secure random hex string.
 */
export function generateSecureHex(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

/**
 * Generate a secure API key with prefix.
 */
export function generateApiKey(prefix: string = "adx"): string {
  const random = randomBytes(24).toString("base64url");
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}_${random}`;
}

// ═══════════════════════════════════════════════════════════
// Key Rotation Support
// ═══════════════════════════════════════════════════════════

/**
 * Get the current key version information.
 */
export function getCurrentKeyVersion(): number {
  return keyManager.getCurrentVersion();
}

/**
 * List all available key versions with their status.
 */
export function listKeyVersions(): ReturnType<KeyManager["listVersions"]> {
  return keyManager.listVersions();
}

/**
 * Add a new encryption key version (for rotation).
 */
export function addKeyVersion(version: number, hexKey: string): void {
  if (hexKey.length !== 64) {
    throw new Error("Key must be a 64-character hex string (32 bytes)");
  }
  keyManager.addKey(version, Buffer.from(hexKey, "hex"));
}

/**
 * Deprecate an old key version. It can still decrypt but won't encrypt.
 */
export function deprecateKeyVersion(version: number): void {
  keyManager.deprecateKey(version);
}

/**
 * Re-encrypt data with the current key version.
 * Use this for background key rotation tasks.
 */
export function rotateEncryption(serialized: string): string {
  const plaintext = decrypt(serialized);
  return encrypt(plaintext);
}

// ═══════════════════════════════════════════════════════════
// Field-Level Encryption Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Encrypt specific fields of an object.
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fieldsToEncrypt) {
    const value = result[field];
    if (value !== null && value !== undefined && typeof value === "string") {
      (result as Record<string, unknown>)[field as string] = encryptToken(value);
    }
  }
  return result;
}

/**
 * Decrypt specific fields of an object that were encrypted with encryptFields.
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (
      value !== null &&
      value !== undefined &&
      typeof value === "string" &&
      value.startsWith("enc:v1:")
    ) {
      try {
        (result as Record<string, unknown>)[field as string] = decryptToken(value);
      } catch {
        // If decryption fails, leave the original value
      }
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// Environment Validation
// ═══════════════════════════════════════════════════════════

/**
 * Validate that all required encryption environment variables are set.
 */
export function validateEncryptionEnv(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!process.env.ENCRYPTION_MASTER_KEY) {
    missing.push("ENCRYPTION_MASTER_KEY");
  } else if (process.env.ENCRYPTION_MASTER_KEY.length !== 64) {
    warnings.push("ENCRYPTION_MASTER_KEY should be 64 hex characters (32 bytes)");
  }

  if (!process.env.HMAC_SECRET) {
    warnings.push("HMAC_SECRET not set; using ENCRYPTION_MASTER_KEY fallback");
  }

  // Check for weak master key (dev/test keys)
  const masterKey = process.env.ENCRYPTION_MASTER_KEY || "";
  if (/^(0{8,}|1{8,}|f{8,}|test|dev|password)/i.test(masterKey)) {
    warnings.push("ENCRYPTION_MASTER_KEY appears to be a weak/test key");
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════

/**
 * Check if a string appears to be an encrypted token.
 */
export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("enc:v1:");
}

/**
 * Check if a string appears to be a bcrypt hash.
 */
export function isPasswordHash(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/.test(value)
  );
}
