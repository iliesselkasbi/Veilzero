import type { MetadataTrace, FileKind } from "@/types/common";
import { detectKind, cleanName } from "./fileUtils";
import type { CleanResult } from "@/types/pool";
import { isThreatTrace } from "./traceClass";

const u16 = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u32 = (b: Uint8Array, o: number) =>
  ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const tag = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

function categorize(key: string): MetadataTrace["category"] {
  const k = key.toLowerCase();
  if (/gps|latitude|longitude|altitude|location/.test(k)) return "location";
  if (/make|model|lens|serial|device|camera|software|firmware/.test(k)) return "device";
  if (/date|time|created|modified/.test(k)) return "time";
  if (/artist|author|creator|owner|copyright|name|creatortool|producer/.test(k)) return "identity";
  if (/software|producer/.test(k)) return "software";
  return "other";
}

function stringify(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Uint8Array || ArrayBuffer.isView(v)) return `[${(v as any).byteLength} bytes]`;
  if (Array.isArray(v)) return v.map(stringify).join(", ");
  if (typeof v === "object") return JSON.stringify(v).slice(0, 120);
  return String(v).slice(0, 160);
}

export async function scanMetadata(file: File): Promise<MetadataTrace[]> {
  const kind = detectKind(file);
  const traces: MetadataTrace[] = [];

  if (kind === "image") {
    try {
      const exifr = (await import("exifr")).default;
      const data = await exifr.parse(file, {
        tiff: true,
        xmp: true,
        icc: false,
        iptc: true,
        gps: true,
        exif: true,
        jfif: true,
        mergeOutput: true,
        translateValues: true,
        reviveValues: true,
      });
      if (data) {
        for (const [key, val] of Object.entries(data)) {
          const s = stringify(val);
          if (!s) continue;
          traces.push({ key, value: s, category: categorize(key) });
        }
      }
          } catch (err) {
      // THE FIX: Do not swallow errors. A failed scan is a compromised file.
      traces.push({
        key: "⚠️ PARSE FAILURE",
        value: "Image structure unreadable. Hidden data may survive. TREAT AS COMPROMISED.",
        category: "other"
      });
    }

  }

  if (kind === "video" || kind === "audio") {
    const buf = new Uint8Array(await file.arrayBuffer());
    const found = findMp4MetaBoxes(buf);
    for (const f of found) {
      traces.push({ key: `${f.type} box`, value: `${f.size} bytes`, category: "other" });
    }
  }

  if (kind === "pdf") {
    const text = await file.slice(0, Math.min(file.size, 2_000_000)).text();
    for (const key of ["Author", "Creator", "Producer", "CreationDate", "ModDate", "Title", "Subject", "Keywords"]) {
      const m = new RegExp(`/${key}\\s*\\(([^)]*)\\)`).exec(text);
      if (m && m[1]) traces.push({ key, value: m[1].slice(0, 120), category: categorize(key) });
    }
    if (/<x:xmpmeta/i.test(text)) traces.push({ key: "XMP packet", value: "present", category: "other" });
  }

  return traces;
}

// ---------------------------------------------------------------------------
// Stripping
// ---------------------------------------------------------------------------

/** JPEG: drop APP1 (EXIF/XMP), APP2 (ICC / FlashPix), APP3-APP15, APP13 (IPTC/Photoshop) and COM. Keep JFIF (APP0) and APP14 (Adobe colour transform). */
function stripJpeg(b: Uint8Array): Uint8Array {
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error("Not a JPEG");
  const out: number[] = [0xff, 0xd8];
  const chunks: Uint8Array[] = [new Uint8Array([0xff, 0xd8])];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error("Corrupt JPEG");
    const marker = b[i + 1];
    if (marker === 0xd9) {
      chunks.push(b.subarray(i, i + 2));
      break;
    }
    if (marker === 0xda) {
      // Start of scan: everything after is entropy-coded data to EOF.
      chunks.push(b.subarray(i));
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const len = u16(b, i + 2);
    const drop = (marker >= 0xe1 && marker <= 0xef && marker !== 0xee) || marker === 0xfe;
    if (!drop) chunks.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  void out;
  return concat(chunks);
}

const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

function stripPng(b: Uint8Array): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((v, i) => b[i] === v)) throw new Error("Not a PNG");
  const chunks: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i < b.length) {
    const len = u32(b, i);
    const type = tag(b, i + 4);
    const total = 12 + len;
    const drop = PNG_DROP.has(type);
    if (!drop) chunks.push(b.subarray(i, i + total));
    i += total;
    if (type === "IEND") break;
  }
  return concat(chunks);
}

function stripWebp(b: Uint8Array): Uint8Array {
  if (tag(b, 0) !== "RIFF" || tag(b, 8) !== "WEBP") throw new Error("Not a WebP");
  const chunks: Uint8Array[] = [];
  let i = 12;
  let vp8xIndex = -1;
  while (i + 8 <= b.length) {
    const type = tag(b, i);
    const len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
    const padded = len + (len & 1);
    const total = 8 + padded;
    if (type === "EXIF" || type === "XMP " || type === "ICCP") {
      i += total;
      continue;
    }
    const slice = b.slice(i, i + total);
    if (type === "VP8X") {
      slice[8] &= ~(0x20 | 0x08 | 0x04); // clear ICC, EXIF, XMP flags
      vp8xIndex = chunks.length;
    }
    chunks.push(slice);
    i += total;
  }
  void vp8xIndex;
  const body = concat(chunks);
  const out = new Uint8Array(12 + body.length);
  out.set(b.subarray(0, 4), 0);
  const size = 4 + body.length;
  out[4] = size & 0xff;
  out[5] = (size >> 8) & 0xff;
  out[6] = (size >> 16) & 0xff;
  out[7] = (size >> 24) & 0xff;
  out.set(b.subarray(8, 12), 8);
  out.set(body, 12);
  return out;
}

interface BoxHit {
  type: string;
  offset: number;
  size: number;
}

/** Walks an ISO-BMFF tree and returns user-data / metadata boxes (udta, meta, ©xyz handled by parent udta). */
function findMp4MetaBoxes(b: Uint8Array): BoxHit[] {
  const hits: BoxHit[] = [];
  const containers = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts"]);
  const walk = (start: number, end: number) => {
    let i = start;
    while (i + 8 <= end) {
      let size = u32(b, i);
      const type = tag(b, i + 4);
      let header = 8;
      if (size === 1) {
        // 64-bit size; high word must be 0 for files < 4 GB
        if (u32(b, i + 8) !== 0) return;
        size = u32(b, i + 12);
        header = 16;
      } else if (size === 0) {
        size = end - i;
      }
      if (size < header || i + size > end) return;
      if (type === "udta" || type === "meta" || type === "XMP_" || type === "uuid") {
        hits.push({ type, offset: i, size });
      } else if (containers.has(type)) {
        walk(i + header, i + size);
      }
      i += size;
    }
  };
  walk(0, b.length);
  return hits;
}

/**
 * MP4/MOV/M4A: neutralise metadata boxes by renaming their type to "free",
 * and zero-filling their payload. Box sizes are unchanged so no offset in
 * stco/co64 needs patching and playback is unaffected.
 */
function stripMp4(b: Uint8Array): { data: Uint8Array; removed: number } {
  const copy = b.slice();
  const hits = findMp4MetaBoxes(copy);
  for (const h of hits) {
    const headerLen = u32(copy, h.offset) === 1 ? 16 : 8;
    copy.set([0x66, 0x72, 0x65, 0x65], h.offset + 4); // "free"
    copy.fill(0, h.offset + headerLen, h.offset + h.size);
  }
  return { data: copy, removed: hits.length };
}

/** Any other raster image: decode and re-encode through canvas, which drops all embedded metadata. */
async function reencodeImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), type, 0.95)
  );
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function supportsStrip(file: File): { ok: boolean; reason?: string } {
  const kind: FileKind = detectKind(file);
  if (kind === "image") return { ok: true };
  if (kind === "video" || kind === "audio") {
    return /mp4|quicktime|m4a|m4v|mov/i.test(file.type + file.name)
      ? { ok: true }
      : { ok: false, reason: "Only MP4 / MOV / M4A containers are supported for audio and video." };
  }
  return {
    ok: false,
    reason:
      kind === "pdf"
        ? "PDF metadata cannot be safely removed in the browser yet. Print to a new PDF instead."
        : "This file type is not supported yet.",
  };
}

export async function stripMetadata(file: File, traces: MetadataTrace[]): Promise<CleanResult> {
  const kind = detectKind(file);
  const buf = new Uint8Array(await file.arrayBuffer());
  let blob: Blob;
  const lower = file.name.toLowerCase();

  if (kind === "image") {
    try {
      if (file.type === "image/jpeg" || /\.jpe?g$/.test(lower)) {
        blob = new Blob([Uint8Array.from(stripJpeg(buf))], { type: "image/jpeg" });
      } else if (file.type === "image/png" || lower.endsWith(".png")) {
        blob = new Blob([Uint8Array.from(stripPng(buf))], { type: "image/png" });
      } else if (file.type === "image/webp" || lower.endsWith(".webp")) {
        blob = new Blob([Uint8Array.from(stripWebp(buf))], { type: "image/webp" });
      } else {
        blob = await reencodeImage(file);
      }
    } catch {
      blob = await reencodeImage(file);
    }

    // If lossless strip left identifying tags, force canvas re-encode (guarantees EXIF/XMP death)
    const probe = new File([blob], file.name, { type: blob.type || file.type });
    const left = (await scanMetadata(probe)).filter((t) => {
      // inline check to avoid circular import issues if any
      const k = t.key.toLowerCase();
      if (t.key.startsWith("⚠️")) return true;
      if (/width|height|bitdepth|colortype|compression|jfif|resolution|orientation|mimetype|filetype|exifbyteorder|thumbnail|megapixel|encoding|component|ycbcr|photometric|samplesperpixel|filter|interlace|predictor|profile/i.test(k)) {
        return false;
      }
      return true;
    });
    if (left.length > 0) {
      blob = await reencodeImage(file);
    }
  } else if (kind === "video" || kind === "audio") {
    const { data } = stripMp4(buf);
    blob = new Blob([Uint8Array.from(data)], { type: file.type });
  } else {
    throw new Error("Unsupported file type");
  }

  return {
    blob,
    fileName: cleanName(file.name),
    originalSize: file.size,
    cleanSize: blob.size,
    tracesRemoved: traces.length,
  };
}
/** Re-scan cleaned output. Only identifying leftovers count as failures. */

export async function verifyClean(result: CleanResult, original: File): Promise<number> {
  const f = new File([result.blob], result.fileName, {
    type: result.blob.type || original.type,
  });
  const left = await scanMetadata(f);
  return left.filter(isThreatTrace).length;
}