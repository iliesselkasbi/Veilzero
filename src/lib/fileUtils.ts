import type { FileKind } from "@/types/common";
import { createTrackedObjectUrl, revokeTrackedObjectUrl } from "./burn";

export function detectKind(file: File): FileKind {
  const t = file.type;
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  if (t === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "other";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function cleanName(name: string, type?: string): string {
  const i = name.lastIndexOf(".");
  const base = i <= 0 ? name : name.slice(0, i);
  const knownExtension =
    type === "image/jpeg" ? ".jpg" :
    type === "image/png" ? ".png" :
    type === "image/webp" ? ".webp" :
    i <= 0 ? "" : name.slice(i);
  return `${base}_clean${knownExtension}`;
}

export function download(blob: Blob, fileName: string) {
  const url = createTrackedObjectUrl(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => revokeTrackedObjectUrl(url), 1000);
}

export function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

/** Clear selected WebM identification fields without changing media timestamps. */
export async function normalizeRecordingBlob(blob: Blob): Promise<Blob> {
  if (!blob.type.includes("webm")) return blob;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let changed = false;

  function readVint(
    start: number,
    isId = false
  ): { value: number; length: number; unknown: boolean } | null {
    if (start >= bytes.length) return null;
    const first = bytes[start];
    let width = 1;
    while (width <= 8 && (first & (0x80 >> (width - 1))) === 0) width++;
    if (width > 8 || start + width > bytes.length) return null;
    let value = isId ? first : first & (0xff >> width);
    for (let i = 1; i < width; i++) {
      value = value * 256 + bytes[start + i];
      if (!Number.isSafeInteger(value)) return null;
    }
    const unknown = !isId && value === 2 ** (7 * width) - 1;
    return { value, length: width, unknown };
  }

  function readElement(
    start: number,
    parentEnd: number
  ): { id: number; payloadStart: number; end: number; unknown: boolean } | null {
    const idVint = readVint(start, true);
    if (!idVint) return null;
    let id = 0;
    for (let i = 0; i < idVint.length; i++) {
      id = id * 256 + bytes[start + i];
      if (!Number.isSafeInteger(id)) return null;
    }
    const sizeStart = start + idVint.length;
    const sizeVint = readVint(sizeStart);
    if (!sizeVint) return null;
    const payloadStart = sizeStart + sizeVint.length;
    const end = sizeVint.unknown ? parentEnd : payloadStart + sizeVint.value;
    if (end < payloadStart || end > parentEnd) return null;
    return { id, payloadStart, end, unknown: sizeVint.unknown };
  }

  function scrubInfo(start: number, end: number): boolean {
    let offset = start;
    while (offset < end) {
      const element = readElement(offset, end);
      if (!element || element.unknown) return false;
      // EBML IDs: MuxingApp 0x4D80, WritingApp 0x5741, DateUTC 0x4461, Title 0x7BA9.
      if ([0x4d80, 0x5741, 0x4461, 0x7ba9].includes(element.id)) {
        bytes.fill(0, element.payloadStart, element.end);
        changed = true;
      }
      offset = element.end;
    }
    return offset === end;
  }

  const EBML = 0x1a45dfa3;
  const SEGMENT = 0x18538067;
  const INFO = 0x1549a966;
  let offset = 0;
  while (offset < bytes.length) {
    const element = readElement(offset, bytes.length);
    if (!element) return blob;
    if (element.id === EBML) {
      offset = element.end;
      continue;
    }
    if (element.id !== SEGMENT) {
      offset = element.end;
      continue;
    }

    let childOffset = element.payloadStart;
    while (childOffset < element.end) {
      const child = readElement(childOffset, element.end);
      if (!child) return blob;
      if (child.id === INFO) {
        if (child.unknown || !scrubInfo(child.payloadStart, child.end)) return blob;
      }
      childOffset = child.end;
      if (child.unknown) break;
    }
    offset = element.end;
  }
  return changed ? new Blob([bytes], { type: blob.type }) : blob;
}
