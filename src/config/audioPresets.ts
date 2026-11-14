import type { AudioPreset } from "@/types/stream";

export const AUDIO_PRESETS: AudioPreset[] = [
  { id: "low", label: "Low", pitch: -6, formant: 0.3, texture: 0.1 },
  { id: "high", label: "High", pitch: 5, formant: 0.6, texture: 0.1 },
  { id: "robot", label: "Robot", pitch: -2, formant: 0.5, texture: 0.7 },
  { id: "deep", label: "Deep", pitch: -10, formant: 0.2, texture: 0.2 },
];

export const DEFAULT_AUDIO_PRESET = AUDIO_PRESETS[0];
