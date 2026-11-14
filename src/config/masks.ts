import type { MaskConfig } from "@/types/stream";

export const MASKS: MaskConfig[] = [
  { id: "void", label: "Void", src: "/masks/void.svg" },
  { id: "skull", label: "Skull", src: "/masks/skull.svg" },
  { id: "static", label: "Static", src: "/masks/static.svg" },
  { id: "glitch", label: "Glitch", src: "/masks/glitch.svg" },
  { id: "blur", label: "Blur", src: null },
];

export const DEFAULT_MASK = MASKS[0];
