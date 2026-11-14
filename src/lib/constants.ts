export const COPY = {
  ready: "Ready",
  cameraStarting: "Starting camera...",
  cameraActive: "Camera active",
  faceCloaked: "Face: Cloaked",
  voiceDistorted: "Voice: Distorted",
  recording: "Recording...",
  recordingDone: "Done. Ready to export.",
  export: "Export",
  fileReceived: "File received",
  scanning: "Scanning...",
  purgeComplete: "Clean. 0 traces remaining.",
  error: "Something went wrong. Try again.",
  noCamera: "Camera access required.",
} as const;

export const tracesFound = (n: number) => `${n} trace${n === 1 ? "" : "s"} found`;

export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const RECORD_FPS = 30;
