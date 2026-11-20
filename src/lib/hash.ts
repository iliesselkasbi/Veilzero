export async function sha256Hex(input: Blob | ArrayBuffer | Uint8Array): Promise<string> {
  let buf: ArrayBuffer;
  if (input instanceof ArrayBuffer) {
    buf = input;
  } else if (input instanceof Uint8Array) {
    buf = input.slice().buffer;
  } else {
    buf = await input.arrayBuffer();
  }
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function shortHash(hex: string, n = 10): string {
  if (hex.length <= n * 2) return hex;
  return `${hex.slice(0, n)}…${hex.slice(-n)}`;
}