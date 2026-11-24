// Local, browser-only SHA-256 fingerprinting via the Web Crypto API.
// Files are read into memory, hashed and discarded: never uploaded, stored or logged.

export const BYTES32_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export function toHex(buffer: ArrayBuffer): string {
  return (
    "0x" +
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await window.crypto.subtle.digest("SHA-256", data as BufferSource);
  return toHex(digest);
}

/** SHA-256 of a file's exact bytes, computed locally. */
export async function hashFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  return sha256Hex(buffer);
}

/** Accepts "0x…" or bare 64-hex; returns lower-case 0x-prefixed or null. */
export function normalizeBytes32(input: string): string | null {
  const v = input.trim();
  const withPrefix = v.startsWith("0x") || v.startsWith("0X") ? "0x" + v.slice(2) : "0x" + v;
  return BYTES32_PATTERN.test(withPrefix) ? withPrefix.toLowerCase() : null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
