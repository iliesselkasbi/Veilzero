function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Copy into a plain ArrayBuffer-backed view (fixes TS BufferSource errors)
  const saltBuf = new Uint8Array(salt.byteLength);
  saltBuf.set(salt);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: 250_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export type DropPreset = "standard" | "family_pulse" | "evidence";

export interface DropMetadata {
  preset: DropPreset;
  level?: string;
  sector?: string;
  status?: string;
  category?: string; // human label, not SNAKE_CASE
}

export function evidenceLabel(id: string): string {
  const map: Record<string, string> = {
    TAINTED_WATER_PROOF: "Contaminated water",
    OUTBREAK_CLUSTER: "Lung sickness cluster",
    SURFACE_ATMOSPHERE_SAFE: "Surface air sample claim",
    BLACKOUT_AIR_CUT: "Air supply cutoff",
  };
  return map[id] ?? id;
}

export async function buildResistanceDrop(opts: {
  blob: Blob;
  fileName: string;
  password: string;
  kind: "live" | "clean";
  meta?: DropMetadata;
}): Promise<Blob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(opts.password, salt);
  const plain = new Uint8Array(await opts.blob.arrayBuffer());
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const cipher = new Uint8Array(cipherBuf);

  const mime = opts.blob.type || "application/octet-stream";
  const meta = opts.meta ?? { preset: "standard" as DropPreset };

  const presetTitle =
    meta.preset === "family_pulse"
      ? "Family pulse"
      : meta.preset === "evidence"
      ? "Hollow evidence"
      : "Resistance drop";

  const headerTitle =
    meta.preset === "family_pulse"
      ? "VEILZERO · Family pulse"
      : meta.preset === "evidence"
      ? "VEILZERO · Hollow evidence"
      : "VEILZERO · Resistance drop";

  const sealedAt = new Date().toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const payload = {
    v: 1,
    kind: opts.kind,
    fileName: opts.fileName,
    mime,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(cipher),
    createdAt: new Date().toISOString(),
    meta,
    note: "VEILZERO dead-drop · opens offline · assume hostile network",
  };

  const safeName = opts.fileName.replace(/[<>&"]/g, "");
  const level = (meta.level || "Unknown level").replace(/[<>&"]/g, "");
  const status = (meta.status || "Status unknown").replace(/[<>&"]/g, "");
  const categoryHuman = evidenceLabel(meta.category || "Unclassified").replace(/[<>&"]/g, "");

  const familyBox =
    meta.preset === "family_pulse"
      ? `<div class="tag-box">
          <div><span class="k">Level</span> ${level}</div>
          <div><span class="k">Status</span> ${status}</div>
        </div>`
      : "";

  const evidenceBox =
    meta.preset === "evidence"
      ? `<div class="tag-box">
          <div><span class="k">Evidence</span> ${categoryHuman}</div>
          <div><span class="k">Sealed on device</span> ${sealedAt}</div>
          <div class="sub">Unverified intel · treat as contested until corroborated</div>
        </div>`
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${headerTitle}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: #050505; color: #e5e5e5;
  }
  .card {
    width: min(480px, 92vw); border: 1px solid #1f2937; background: #0a0a0a;
    border-radius: 12px; padding: 24px; box-shadow: 0 0 40px rgba(0,255,65,.08);
  }
  h1 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #00FF41; margin: 0 0 8px; }
  p { font-size: 12px; color: #737373; line-height: 1.5; margin: 4px 0; }
  .tag-box {
    background: #111; border: 1px solid #2a2a2a; padding: 12px; border-radius: 8px;
    margin: 12px 0; font-size: 12px; color: #d1d5db;
  }
  .tag-box .k { color: #00FF41; margin-right: 8px; text-transform: uppercase; font-size: 10px; letter-spacing: .08em; }
  .tag-box .sub { margin-top: 8px; color: #737373; font-size: 11px; }
  .file { color: #00FF41; font-size: 12px; word-break: break-all; }
  input, button {
    width: 100%; margin-top: 10px; border-radius: 8px; border: 1px solid #2a2a2a;
    background: #111; color: #e5e5e5; padding: 12px; font: inherit;
  }
  button.unlock { background: #00FF41; color: #000; font-weight: 700; border: none; cursor: pointer; }
  button.burn { background: #ff003c; color: #fff; border: none; cursor: pointer; margin-top: 16px; font-weight: 700; }
  .err { color: #ff003c; font-size: 12px; min-height: 16px; margin-top: 8px; }
  video, img, audio { width: 100%; margin-top: 12px; border-radius: 8px; background: #000; }
</style>
</head>
<body>
  <div class="card" id="main-card">
    <h1>${headerTitle}</h1>
    <p>${presetTitle} · encrypted client-side dead-drop · unlocks in local RAM only</p>
    ${familyBox}
    ${evidenceBox}
    <p class="file">File: ${safeName}</p>
    <div id="auth-section">
      <input id="pw" type="password" placeholder="Passphrase" autofocus />
      <button class="unlock" id="go">Unlock drop</button>
      <p class="err" id="err"></p>
    </div>
    <div id="out"></div>
  </div>
<script>
const PAYLOAD = ${JSON.stringify(payload)};
const b64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
let objectUrl = null;

async function derive(password, saltBytes) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 250000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

document.getElementById("go").onclick = async () => {
  const err = document.getElementById("err");
  const out = document.getElementById("out");
  const authSection = document.getElementById("auth-section");
  err.textContent = "";
  out.innerHTML = "";
  try {
    const pw = document.getElementById("pw").value;
    const key = await derive(pw, b64(PAYLOAD.salt));
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64(PAYLOAD.iv) },
      key,
      b64(PAYLOAD.data)
    );
    const blob = new Blob([plain], { type: PAYLOAD.mime });
    objectUrl = URL.createObjectURL(blob);
    authSection.style.display = "none";

    let mediaHtml = "";
    if (PAYLOAD.mime.startsWith("video/")) mediaHtml = '<video controls autoplay src="'+objectUrl+'"></video>';
    else if (PAYLOAD.mime.startsWith("image/")) mediaHtml = '<img alt="drop" src="'+objectUrl+'"/>';
    else if (PAYLOAD.mime.startsWith("audio/")) mediaHtml = '<audio controls autoplay src="'+objectUrl+'"></audio>';
    else mediaHtml = '<p class="file"><a style="color:#00FF41" href="'+objectUrl+'" download="'+PAYLOAD.fileName+'">Download file</a></p>';

    out.innerHTML = mediaHtml + '<button class="burn" id="burn-btn">Burn view · destroy from RAM</button>';
    document.getElementById("burn-btn").onclick = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      document.body.innerHTML = '<div style="color:#ff003c;font-weight:700;font-size:22px;text-align:center;margin-top:22vh;font-family:ui-monospace,monospace">DATA PURGED<br><span style="font-size:12px;color:#737373">Close this tab.</span></div>';
    };
  } catch (e) {
    err.textContent = "Unlock failed. Wrong passphrase or tampered drop.";
  }
};
</script>
</body>
</html>`;

  return new Blob([html], { type: "text/html" });
}