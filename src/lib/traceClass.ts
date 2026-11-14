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
  ].map((s) => s.toLowerCase())
);

const STRUCTURAL_RE =
  /^(imagewidth|imageheight|pixel|bitdepth|colortype|compression|filter|interlace|jfif|resolution|orientation|mimetype|filetype|exifbyteorder|encodingprocess|component|ycbcr|thumbnail|megapixel|samplesperpixel|photometric|predictor|profile)/i;

export function isStructuralKey(key: string): boolean {
  if (STRUCTURAL_KEYS.has(key.toLowerCase())) return true;
  if (STRUCTURAL_RE.test(key)) return true;
  return false;
}

export function isThreatTrace(t: MetadataTrace): boolean {
  if (t.key.startsWith("⚠️")) return true;
  if (isStructuralKey(t.key)) return false;
  // identifying categories always count when not structural
  if (["location", "identity", "device", "time"].includes(t.category)) return true;
  // software can fingerprint toolchain — treat as threat
  if (t.category === "software") return true;
  // unknown "other" — only threat if it doesn't look structural
  return !isStructuralKey(t.key);
}

export function partitionTraces(traces: MetadataTrace[]) {
  const threats = traces.filter(isThreatTrace);
  const structural = traces.filter((t) => !isThreatTrace(t));
  const compromised = traces.some((t) => t.key.startsWith("⚠️"));
  return { threats, structural, compromised };
}