import type { MetadataTrace } from "@/types/common";

/** Required for decoding OR pure format bookkeeping — not identifying. */
export const STRUCTURAL_KEYS = new Set(
  [
    // dimensions / pixels
    "ImageWidth",
    "ImageHeight",
    "ImageLength",
    "PixelXDimension",
    "PixelYDimension",
    "ImageSize",
    "Megapixels",
    "ThumbnailOffset",
    "ThumbnailLength",
    "ThumbnailWidth",
    "ThumbnailHeight",
    "Xthumbnail",
    "Ythumbnail",
    // color / encoding
    "ColorSpace",
    "ColorType",
    "BitDepth",
    "BitsPerSample",
    "Compression",
    "Filter",
    "Interlace",
    "Predictor",
    "PhotometricInterpretation",
    "SamplesPerPixel",
    "ComponentsConfiguration",
    "EncodingProcess",
    "YCbCrSubSampling",
    "YCbCrPositioning",
    "ReferenceBlackWhite",
    // resolution
    "JFIFVersion",
    "ResolutionUnit",
    "XResolution",
    "YResolution",
    "Xdensity",
    "Ydensity",
    "Orientation",
    // container bookkeeping from exifr (NOT identity)
    "ExifByteOrder",
    "FileType",
    "FileTypeExtension",
    "MIMEType",
    "ExifVersion",
    "FlashPixVersion",
    "InteropIndex",
    "InteropVersion",
    "ProfileVersion",
    "ProfileClass",
    "ColorPrimaries",
    "TransferCharacteristics",
    "MatrixCoefficients",
    // extras
    "profilename",
    "profiledescription",
    "iccprofile",
    "icc_profile",
    "srgbrendering",
    "renderingintent",
    "profilecopyright",
  ].map((s) => s.toLowerCase())
);
const THREAT_KEY_RE =
  /gps|latitude|longitude|altitude|maker|model|serial|author|artist|copyright|software|datetime|offset|host|owner|device|lens|unique|document.?name|icc.?profile.?name|xp(author|comment|keywords|subject)|usercomment|location|create.?date|modify.?date|originating|profile.?copyright/i;

export function normalizeKey(key: string): string {
  return key.replace(/^.*?:/, "").trim(); // strip "exif:", "png:" prefixes
}

export function isParseFailure(t: MetadataTrace): boolean {
  return t.key === "⚠️ PARSE FAILURE" || t.key.includes("PARSE FAILURE");
}

export function isStructuralKey(key: string): boolean {
  const n = normalizeKey(key);
  return STRUCTURAL_KEYS.has(n.toLowerCase()) || STRUCTURAL_KEYS.has(key.toLowerCase());
}

export function isThreatTrace(t: MetadataTrace): boolean {
  if (isParseFailure(t)) return true;
  if (isStructuralKey(t.key)) return false;

  // Category wins when scanner already classified
  if (t.category === "location" || t.category === "identity") return true;
  if (t.category === "device" || t.category === "time" || t.category === "software") {
    return true;
  }

  // Fallback on key name for uncategorized leftovers
  if (t.category === "other" && THREAT_KEY_RE.test(normalizeKey(t.key))) return true;

  // Unknown non-structural "other" → treat as threat (safe default for purge UI)
  if (t.category === "other") return true;

  return false;
}

export function partitionTraces(traces: MetadataTrace[]) {
  const threats: MetadataTrace[] = [];
  const structural: MetadataTrace[] = [];

  for (const t of traces) {
    if (isThreatTrace(t)) threats.push(t);
    else structural.push(t);
  }

  const compromised = traces.some(isParseFailure);
  return { threats, structural, compromised };
}