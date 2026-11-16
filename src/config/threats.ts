export interface Threat {
  title: string;
  body: string;
}
export const THREATS = [
  {
    title: "Your face",
    body: "A single clear frame can be matched to another photo or ID. VEILZERO covers faces in the live feed on your device before you save or export a clip.",
  },
  {
    title: "Your voice",
    body: "Voices can be matched like fingerprints. VEILZERO distorts pitch and timbre in the browser so a recording is less useful as a voiceprint.",
  },
  {
    title: "Your files",
    body: "Photos often hide GPS, phone/camera model, software name, and times. VEILZERO strips those identifying tags locally. Basic size/color tags are marked structural (safe).",
  },
];

export const LIMITS = [
  "VEILZERO lowers risk. It does not make you anonymous in every situation.",
  "Clothes, background landmarks, how you walk, and the words you say can still identify you.",
  "Clean mode focuses on embedded metadata (and safe re-encoding). It is not a full guarantee against every hidden watermark.",
  "Voice distortion is one layer. A lab with time may still try to reverse parts of it.",
  "Encrypted Drops are only as safe as your passphrase. Use Burn View when you are done reading.",
];