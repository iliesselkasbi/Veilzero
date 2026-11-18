// Copies MediaPipe FaceMesh runtime + model files into /public/mediapipe so the
// app never fetches them from a CDN. Runs automatically after `npm install`.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "@mediapipe", "face_mesh");
const dest = path.join(__dirname, "..", "public", "mediapipe");
const manifestPath = path.join(dest, "manifest.json");

fs.mkdirSync(dest, { recursive: true });
if (!fs.existsSync(src)) {
  console.warn("[veilzero] @mediapipe/face_mesh not installed yet; skipping copy.");
  fs.writeFileSync(manifestPath, JSON.stringify({ files: [] }, null, 2) + "\n");
  process.exit(0);
}

const files = [];
for (const f of fs.readdirSync(src)) {
  if (/\.(wasm|data|binarypb|tflite|js)$/.test(f) && !f.endsWith(".d.ts")) {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
    files.push(f);
  }
}
files.sort();
fs.writeFileSync(manifestPath, JSON.stringify({ files }, null, 2) + "\n");
console.log(`[veilzero] Copied ${files.length} MediaPipe assets and wrote their manifest`);
