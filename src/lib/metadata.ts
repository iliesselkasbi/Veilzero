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

  if (
    /profile.?name|profile.?description|icc|color.?space|rendering.?intent|chromatic|whitepoint|gamma|srgb/.test(
      k
    )
  ) {
    return "other";
  }

  if (/gps|latitude|longitude|altitude|location|destination/.test(k)) return "location";
  if (
    /artist|author|by-line|byline|creator(?!tool)|owner|copyright|username|xpauthor|contact|email|writer/.test(
      k
    )
  ) {
    return "identity";
  }
  if (/make|model|lens|serial|device|camera|hostcomputer|unique.?id|body.?serial/.test(k)) {
    return "device";
  }
  if (/date|time|created|modified|subsec|offsettime/.test(k)) return "time";
  if (/software|firmware|creatortool|producer|engine|processing|history/.test(k)) return "software";
  return "other";
}

function stringify(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Uint8Array || ArrayBuffer.isView(v)) {
    return `[${(v as ArrayBufferView).byteLength} bytes]`;
  }
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
          } catch {
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
    try {
      try {
        const found = findMp4MetaBoxes(buf);
        for (const f of found.hits) {
          traces.push({ key: `${f.type} box`, value: `${f.size} bytes`, category: "other" });
        }
        for (const handler of found.metadataHandlers) {
          traces.push({
            key: `Metadata track (${handler})`,
            value: "Embedded metadata track is not removed by this container-level scrub.",
            category: "other",
          });
        }
      } catch {
        traces.push({
          key: "⚠️ PARSE FAILURE",
          value: "MP4/MOV/M4A container structure is malformed or partially unsupported.",
          category: "other",
        });
      }
    } finally {
      buf.fill(0);
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
export function stripJpeg(b: Uint8Array): Uint8Array<ArrayBuffer> {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw new Error("Not a JPEG");
  const chunks: Uint8Array[] = [new Uint8Array([0xff, 0xd8])];
  let i = 2;
  let inScan = false;
  while (i < b.length) {
    let markerStart = i;
    let marker: number;
    if (inScan) {
      const scanStart = i;
      while (i < b.length) {
        if (b[i] !== 0xff) {
          i++;
          continue;
        }
        markerStart = i;
        while (i < b.length && b[i] === 0xff) i++;
        if (i >= b.length) throw new Error("Truncated JPEG scan");
        marker = b[i];
        if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
          i++;
          continue;
        }
        chunks.push(b.subarray(scanStart, markerStart));
        inScan = false;
        break;
      }
      if (inScan) throw new Error("JPEG has no EOI marker");
      i = markerStart;
      while (i < b.length && b[i] === 0xff) i++;
      if (i >= b.length) throw new Error("Truncated JPEG marker");
      marker = b[i++];
    } else {
      if (b[i] !== 0xff) throw new Error("Corrupt JPEG marker");
      markerStart = i;
      while (i < b.length && b[i] === 0xff) i++;
      if (i >= b.length) throw new Error("Truncated JPEG marker");
      marker = b[i++];
    }

    if (marker === 0xd9) {
      chunks.push(b.subarray(markerStart, i));
      return concat(chunks);
    }
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(b.subarray(markerStart, i));
      continue;
    }
    if (marker === 0x00 || i + 2 > b.length) throw new Error("Invalid JPEG segment");
    const len = u16(b, i);
    if (len < 2 || len > b.length - i) throw new Error("JPEG segment exceeds file size");
    const end = i + len;
    const drop = (marker >= 0xe1 && marker <= 0xef && marker !== 0xee) || marker === 0xfe;
    if (!drop) chunks.push(b.subarray(markerStart, end));
    i = end;
    inScan = marker === 0xda;
  }
  throw new Error("JPEG has no EOI marker");
}

const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "acTL", "fcTL", "fdAT"]);

export function stripPng(b: Uint8Array): Uint8Array<ArrayBuffer> {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 8 || !sig.every((v, i) => b[i] === v)) throw new Error("Not a PNG");
  const chunks: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  let ended = false;
  while (i < b.length) {
    if (b.length - i < 12) throw new Error("Truncated PNG chunk");
    const len = u32(b, i);
    const type = tag(b, i + 4);
    const total = 12 + len;
    if (total > b.length - i) throw new Error("PNG chunk exceeds file size");
    if (PNG_KEEP.has(type)) chunks.push(b.subarray(i, i + total));
    i += total;
    if (type === "IEND") {
      if (len !== 0) throw new Error("Invalid PNG IEND chunk");
      ended = true;
      break;
    }
  }
  if (!ended) throw new Error("PNG has no IEND chunk");
  return concat(chunks);
}

const WEBP_KEEP = new Set(["VP8X", "VP8 ", "VP8L", "ALPH", "ANIM", "ANMF"]);

export function stripWebp(b: Uint8Array): Uint8Array<ArrayBuffer> {
  if (tag(b, 0) !== "RIFF" || tag(b, 8) !== "WEBP") throw new Error("Not a WebP");
  const riffSize = (b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24)) >>> 0;
  if (riffSize !== b.length - 8) throw new Error("Invalid WebP size");

  const chunks: Uint8Array[] = [];
  let i = 12;
  while (i < b.length) {
    if (b.length - i < 8) throw new Error("Truncated WebP chunk");

    const type = tag(b, i);
    const len = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const padded = len + (len % 2);
    if (padded > b.length - i - 8) throw new Error("WebP chunk exceeds file size");
    const total = 8 + padded;
    if (!WEBP_KEEP.has(type)) {
      i += total;
      continue;
    }
    const slice = b.slice(i, i + total);
    if (type === "VP8X") {
      if (len < 10) throw new Error("Invalid VP8X chunk");
      slice[8] &= ~(0x20 | 0x08 | 0x04); // clear ICC, EXIF, XMP flags
    }
    chunks.push(slice);
    i += total;
  }
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
  header: number;
}

interface Mp4Scan {
  hits: BoxHit[];
  metadataHandlers: string[];
}

/** Walks an ISO-BMFF tree and returns user-data / metadata boxes (udta, meta, ©xyz handled by parent udta). */
function findMp4MetaBoxes(b: Uint8Array): Mp4Scan {
  const hits: BoxHit[] = [];
  const metadataHandlers = new Set<string>();
  const containers = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts"]);
  const timestampBoxes = new Set(["mvhd", "tkhd", "mdhd"]);
  const metadataHandlerTypes = new Set(["gpmd", "meta", "mdta", "mett", "metx"]);
  let malformed = false;
  const walk = (start: number, end: number) => {
    if (start > end) {
      malformed = true;
      return;
    }
    let i = start;
    while (i + 8 <= end) {
      let size = u32(b, i);
      const type = tag(b, i + 4);
      let header = 8;
      if (size === 1) {
        // 64-bit size; high word must be 0 for files < 4 GB
        if (i + 16 > end || u32(b, i + 8) !== 0) {
          malformed = true;
          return;
        }
        size = u32(b, i + 12);
        header = 16;
      } else if (size === 0) {
        size = end - i;
      }
      if (size < header || i + size > end) {
        malformed = true;
        return;
      }
      if (type === "udta" || type === "meta" || type === "XMP_" || type === "uuid") {
        hits.push({ type, offset: i, size, header });
      } else if (timestampBoxes.has(type)) {
        hits.push({ type, offset: i, size, header });
      } else if (type === "hdlr") {
        const handlerOffset = i + header + 8;
        if (handlerOffset + 4 > i + size) {
          malformed = true;
          return;
        }
        const handler = tag(b, handlerOffset);
        if (metadataHandlerTypes.has(handler)) metadataHandlers.add(handler);
      } else if (containers.has(type)) {
        walk(i + header, i + size);
      }
      i += size;
    }
    if (i !== end) malformed = true;
  };
  walk(0, b.length);
  if (malformed) throw new Error("Malformed ISO-BMFF container");
  return { hits, metadataHandlers: [...metadataHandlers] };
}

/**
 * MP4/MOV/M4A: neutralise metadata boxes by renaming their type to "free",
 * and zero-filling their payload. Box sizes are unchanged so no offset in
 * stco/co64 needs patching and playback is unaffected.
 */
export function stripMp4(b: Uint8Array): {
  data: Uint8Array<ArrayBuffer>;
  removed: number;
  metadataHandlers: string[];
} {
  const copy = new Uint8Array(b);
  const { hits, metadataHandlers } = findMp4MetaBoxes(copy);
  for (const h of hits) {
    if (h.type === "mvhd" || h.type === "tkhd" || h.type === "mdhd") {
      const version = copy[h.offset + h.header];
      const timestampWidth = version === 0 ? 4 : version === 1 ? 8 : 0;
      const timestampStart = h.offset + h.header + 4;
      const timestampEnd = timestampStart + timestampWidth * 2;
      if (timestampWidth && timestampEnd <= h.offset + h.size) {
        copy.fill(0, timestampStart, timestampEnd);
      }
      continue;
    }
    copy.set([0x66, 0x72, 0x65, 0x65], h.offset + 4); // "free"
    copy.fill(0, h.offset + h.header, h.offset + h.size);
  }
  return { data: copy, removed: hits.length, metadataHandlers };
}

/** Decode and re-encode through canvas, which drops metadata while retaining alpha when supported. */
async function reencodeImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(bmp, 0, 0);
    const type =
      file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp"
        ? file.type
        : "image/png";
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Image re-encoding failed"))),
        type,
        type === "image/png" ? undefined : 0.95
      )
    );
  } finally {
    bmp.close();
  }
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
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
  if (kind === "image") {
    const lower = file.name.toLowerCase();
    const supported =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp" ||
      /\.jpe?g$/.test(lower) ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp");
    return supported
      ? { ok: true }
      : { ok: false, reason: "Only JPEG, PNG, and WebP images are supported." };
  }
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
  const warnings: string[] = [];
  try {
    let blob: Blob;
    const lower = file.name.toLowerCase();

    if (kind === "image") {
      let usedFallback = false;
      try {
        if (file.type === "image/jpeg" || /\.jpe?g$/.test(lower)) {
          const stripped = stripJpeg(buf);
          try {
            blob = new Blob([stripped], { type: "image/jpeg" });
          } finally {
            stripped.fill(0);
          }
        } else if (file.type === "image/png" || lower.endsWith(".png")) {
          const stripped = stripPng(buf);
          try {
            blob = new Blob([stripped], { type: "image/png" });
          } finally {
            stripped.fill(0);
          }
        } else if (file.type === "image/webp" || lower.endsWith(".webp")) {
          const stripped = stripWebp(buf);
          try {
            blob = new Blob([stripped], { type: "image/webp" });
          } finally {
            stripped.fill(0);
          }
        } else {
          throw new Error("Unsupported image format");
        }
      } catch {
        blob = await reencodeImage(file);
        usedFallback = true;
      }

      const needsOrientationFix =
        (file.type === "image/jpeg" || /\.jpe?g$/.test(lower)) &&
        traces.some((trace) => trace.key.toLowerCase().includes("orientation"));
      if (needsOrientationFix && !usedFallback) {
        blob = await reencodeImage(file);
        warnings.push("The image was re-encoded to apply its EXIF orientation before stripping metadata.");
      }
      if (usedFallback && file.type === "image/webp" && blob.type !== "image/webp") {
        warnings.push(
          "WebP could not be losslessly stripped, so it was re-encoded as PNG to preserve transparency."
        );
      } else if (usedFallback) {
        warnings.push("The image required canvas re-encoding; some image quality may change.");
      }
      warnings.push("Color-profile metadata is removed where present; displayed colors may shift.");

      // If lossless strip left identifying tags, force canvas re-encode (guarantees EXIF/XMP death)
      const probe = new File([blob], file.name, { type: blob.type || file.type });
      const left = (await scanMetadata(probe)).filter((t) => {
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
      const { data, metadataHandlers } = stripMp4(buf);
      for (const handler of metadataHandlers) {
        warnings.push(
          `Embedded ${handler} metadata track may contain location or other identifying data and was not removed.`
        );
      }
      try {
        blob = new Blob([data], { type: file.type });
      } finally {
        data.fill(0);
      }
    } else {
      throw new Error("Unsupported file type");
    }

    return {
      blob,
      fileName: cleanName(file.name, blob.type),
      originalSize: file.size,
      cleanSize: blob.size,
      tracesRemoved: traces.length,
      warnings,
    };
  } finally {
    buf.fill(0);
  }
}
/** Re-scan cleaned output. Only identifying leftovers count as failures. */

export async function verifyClean(result: CleanResult, original: File): Promise<number> {
  const f = new File([result.blob], result.fileName, {
    type: result.blob.type || original.type,
  });
  const left = await scanMetadata(f);
  return left.filter(isThreatTrace).length;
}