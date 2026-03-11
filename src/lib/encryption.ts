/**
 * AES-256-GCM encryption for API keys at rest.
 * Uses WALLET_ENCRYPTION_KEY from env (base64 encoded 32-byte key).
 */

const ALGO = "AES-GCM";
const KEY_ENV = process.env.WALLET_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "";

function base64ToBuffer(b64: string): Uint8Array {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function getKey(): Promise<CryptoKey> {
  const raw = base64ToBuffer(KEY_ENV).slice(0, 32);
  return crypto.subtle.importKey("raw", raw, { name: ALGO }, false, ["encrypt", "decrypt"]);
}

/** Encrypt a plaintext string → "iv:ciphertext" base64 string */
export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!KEY_ENV) return plaintext; // fallback if no key configured
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const cipher = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
    return `enc:${bufferToBase64(iv.buffer)}:${bufferToBase64(cipher)}`;
  } catch {
    return plaintext; // fallback
  }
}

/** Decrypt an "enc:iv:ciphertext" string → plaintext */
export async function decryptApiKey(stored: string): Promise<string> {
  if (!stored || !stored.startsWith("enc:")) return stored; // not encrypted, return as-is
  try {
    const [, ivB64, cipherB64] = stored.split(":");
    const key = await getKey();
    const iv = base64ToBuffer(ivB64);
    const cipher = base64ToBuffer(cipherB64);
    const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch {
    return stored; // fallback
  }
}

/** Check if a stored value is encrypted */
export function isEncrypted(stored: string): boolean {
  return stored?.startsWith("enc:");
}
