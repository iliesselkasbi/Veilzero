// Copies MediaPipe FaceMesh runtime + model files into /public/mediapipe so the
// app never fetches them from a CDN. Runs automatically after `npm install`.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "@mediapipe", "face_mesh");
const dest = path.join(__dirname, "..", "public", "mediapipe");

if (!fs.existsSync(src)) {
  console.warn("[veilzero] @mediapipe/face_mesh not installed yet; skipping copy.");
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(src)) {
  if (/\.(wasm|data|binarypb|tflite|js)$/.test(f) && !f.endsWith(".d.ts")) {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
  }
}
console.log("[veilzero] MediaPipe assets copied to public/mediapipe");
