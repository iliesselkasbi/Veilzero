export interface Threat {
  title: string;
  body: string;
}

export const THREATS: Threat[] = [
  {
    title: "Your face",
    body: "Facial recognition can match a face in a video to a profile from a single frame. VEILZERO covers the face before the video is ever saved or sent.",
  },
  {
    title: "Your voice",
    body: "Voiceprints are as distinctive as fingerprints. VEILZERO shifts pitch and timbre so the recording no longer matches your natural voice.",
  },
  {
    title: "Your files",
    body: "Photos and documents quietly carry GPS coordinates, device models, timestamps, author names and software versions. VEILZERO removes them.",
  },
];

export const LIMITS: string[] = [
  "VEILZERO reduces identifying signals. It does not guarantee anonymity.",
  "Background details, clothing, gait, speech patterns and what you say can still identify you.",
  "Pixel content of images and audio content is never altered in Clean mode. Only embedded metadata is removed.",
  "Voice distortion can be partially reversed by determined analysis. Treat it as one layer, not the only one.",
];
