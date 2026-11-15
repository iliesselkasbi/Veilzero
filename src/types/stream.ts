export type MaskId = "void" | "skull" | "static" | "glitch" | "blur";

export interface MaskConfig {
  id: MaskId;
  label: string;
  /** Path under /public, or null for procedurally drawn masks. */
  src: string | null;
}

export interface AudioPreset {
  id: string;
  label: string;
  /** Semitone pitch shift. */
  pitch: number;
  /** 0..1 */
  formant: number;
  /** 0..1 wet amount of ring-mod / noise texture. */
  texture: number;
}

export interface RecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
}
