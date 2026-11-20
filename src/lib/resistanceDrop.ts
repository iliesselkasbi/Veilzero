const CHUNK_SIZE = 1024 * 1024;
const MAX_DROP_SOURCE_BYTES = 256 * 1024 * 1024;
const AAD_PREFIX_V2 = "VEILZERO-RESISTANCE-DROP-v2:";
const AAD_PREFIX_V3 = "VEILZERO-RESISTANCE-DROP-v3:";
const KDF = "PBKDF2-SHA-256";
const KDF_ITERATIONS = 600_000;

export type DropPreset = "standard" | "family_pulse" | "evidence";

export interface DropMetadata extends Record<string, string | undefined> {
  preset?: DropPreset;
  level?: string;
  sector?: string;
  status?: string;
  category?: string;
}

export function evidenceLabel(id: string): string {
  const labels: Record<string, string> = {
    TAINTED_WATER_PROOF: "Contaminated water",
    OUTBREAK_CLUSTER: "Lung sickness cluster",
    SURFACE_ATMOSPHERE_SAFE: "Surface air claim",
    BLACKOUT_AIR_CUT: "Air supply cutoff",
  };
  return labels[id] ?? id;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);
  try {
    const baseKey = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, [
      "deriveKey",
    ]);
    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  } finally {
    passwordBytes.fill(0);
  }
}

export async function buildResistanceDrop(opts: {
  blob: Blob;
  fileName: string;
  password: string;
  kind: "live" | "clean";
  stealth?: boolean;
  meta?: DropMetadata;
}): Promise<Blob> {
  if (opts.blob.size > MAX_DROP_SOURCE_BYTES) {
    throw new Error("Source media exceeds the 256 MB browser-memory safety limit.");
  }
  const stealth = opts.stealth ?? true;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltText = toBase64(salt);
  let key: CryptoKey;
  try {
    key = await deriveKey(opts.password, salt, KDF_ITERATIONS);
  } finally {
    salt.fill(0);
  }

  const mime = opts.blob.type || "application/octet-stream";
  const createdAt = new Date().toISOString();
  const meta: DropMetadata = {
    ...opts.meta,
    preset: opts.meta?.preset ?? "standard",
  };
  const metadata = {
    ...meta,
    kind: opts.kind,
    fileName: opts.fileName,
    mime,
    createdAt,
  };
  const visibleHeader = {
    kind: metadata.kind,
    fileName: metadata.fileName,
    mime: metadata.mime,
    createdAt: metadata.createdAt,
    meta,
  };
  const authHeader = {
    v: 3,
    kdf: KDF,
    iterations: KDF_ITERATIONS,
    salt: saltText,
    stealth,
    ...(!stealth ? visibleHeader : {}),
  };
  const ivs: string[] = [];
  const data: string[] = [];
  const fileChunkCount = Math.ceil(opts.blob.size / CHUNK_SIZE);
  const chunkCount = fileChunkCount + (stealth ? 1 : 0);

  async function encryptChunk(plain: Uint8Array<ArrayBuffer>, index: number): Promise<void> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    let cipher: Uint8Array | undefined;
    try {
      const encrypted = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: new TextEncoder().encode(
            `${AAD_PREFIX_V3}${JSON.stringify(authHeader)}:${index}:${chunkCount}`
          ),
        },
        key,
        plain
      );
      cipher = new Uint8Array(encrypted);
      ivs.push(toBase64(iv));
      data.push(toBase64(cipher));
    } finally {
      plain.fill(0);
      iv.fill(0);
      cipher?.fill(0);
    }
  }

  if (stealth) {
    await encryptChunk(new TextEncoder().encode(JSON.stringify(metadata)), 0);
  }
  if (!stealth && opts.blob.size === 0) {
    await encryptChunk(new Uint8Array(0), 0);
  }
  for (let offset = 0; offset < opts.blob.size; offset += CHUNK_SIZE) {
    const bytes = new Uint8Array(
      await opts.blob.slice(offset, Math.min(offset + CHUNK_SIZE, opts.blob.size)).arrayBuffer()
    );
    await encryptChunk(bytes, ivs.length);
  }

  const payload = {
    v: 3,
    kdf: KDF,
    iterations: KDF_ITERATIONS,
    salt: saltText,
    stealth,
    iv: ivs,
    data,
    ...(!stealth ? visibleHeader : {}),
  };
  const presetTitle =
    meta.preset === "family_pulse"
      ? "Family pulse"
      : meta.preset === "evidence"
        ? "Hollow evidence"
        : "Resistance drop";
  const familyDetails =
    !stealth && meta.preset === "family_pulse"
      ? `<p class="ok">LEVEL: ${escapeHtml(meta.level ?? "Unknown level")}</p><p class="ok">STATUS: ${escapeHtml(meta.status ?? "Status unknown")}</p>`
      : "";
  const evidenceDetails =
    !stealth && meta.preset === "evidence"
      ? `<p class="ok">EVIDENCE: ${escapeHtml(evidenceLabel(meta.category ?? "Unclassified"))}</p>`
      : "";
  const normalDetails = stealth
    ? ""
    : `<p class="ok">FILE: ${escapeHtml(opts.fileName)} · ${escapeHtml(createdAt)}</p><p class="ok">MODE: ${escapeHtml(presetTitle)}</p>${familyDetails}${evidenceDetails}<p class="ok">METADATA: ${escapeHtml(JSON.stringify(meta))}</p>`;
  const payloadJson = JSON.stringify(payload)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src blob:; media-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'"/>
<title>VEILZERO · ${escapeHtml(presetTitle)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background:#050505; color:#e5e5e5; min-height:100vh; display:flex; align-items:center; justify-content:center; }
  .card { width:min(440px,92vw); border:1px solid #1f2937; background:#0a0a0a; border-radius:12px; padding:24px;
    box-shadow:0 0 40px rgba(0,255,65,.05); }
  h1 { font-size:14px; letter-spacing:.14em; color:#00FF41; margin:0 0 8px; }
  p { font-size:12px; color:#737373; line-height:1.5; }
  input, button { width:100%; margin-top:10px; border-radius:8px; border:1px solid #2a2a2a; background:#111; color:#e5e5e5;
    padding:12px; font:inherit; }
  button { background:#00FF41; color:#000; font-weight:700; cursor:pointer; border:none; }
  button:disabled { opacity:.5; cursor:not-allowed; }
  #burn { background:#ff003c; margin-top:12px; }
  .err { color:#ff003c; font-size:12px; min-height:16px; }
  video, img, audio { width:100%; margin-top:12px; border-radius:8px; background:#000; }
  .ok { color:#00FF41; font-size:12px; }
</style>
</head>
<body>
  <div class="card">
    <h1>VEILZERO // ${escapeHtml(presetTitle)}</h1>
    <p>Encrypted client-side dead-drop. No servers contacted when you unlock this file.</p>
    ${normalDetails}
    <input id="pw" type="password" placeholder="Passphrase" autofocus />
    <button id="go">UNLOCK</button>
    <button id="burn" type="button" hidden>BURN VIEW</button>
    <p class="err" id="err"></p>
    <div id="out"></div>
  </div>
<script>
const PAYLOAD = ${payloadJson};
const AAD_PREFIX_V2 = "${AAD_PREFIX_V2}";
const AAD_PREFIX_V3 = "${AAD_PREFIX_V3}";
const KDF = "${KDF}";
const b64 = (value) => Uint8Array.from(atob(value), character => character.charCodeAt(0));
async function derive(password, salt, iterations) {
  const passwordBytes = new TextEncoder().encode(password);
  try {
    const base = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveKey"]);
    return await crypto.subtle.deriveKey(
      { name:"PBKDF2", salt, iterations, hash:"SHA-256" },
      base,
      { name:"AES-GCM", length:256 },
      false,
      ["decrypt"]
    );
  } finally {
    passwordBytes.fill(0);
  }
}
let objectUrl = null;
const burnButton = document.getElementById("burn");
function burnView() {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  document.getElementById("out").replaceChildren();
  document.getElementById("pw").value = "";
  document.getElementById("err").textContent = "";
  burnButton.hidden = true;
}
burnButton.onclick = burnView;
window.addEventListener("pagehide", () => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
});
document.getElementById("go").onclick = async () => {
  const err = document.getElementById("err");
  const out = document.getElementById("out");
  const password = document.getElementById("pw");
  err.textContent = "";
  out.replaceChildren();
  const clearChunks = [];
  const blobParts = [];
  let metadataBytes;
  let saltBytes;
  try {
    if (PAYLOAD.v !== 2 && PAYLOAD.v !== 3) throw new Error("Unsupported drop version");
    if (!Array.isArray(PAYLOAD.data) || !Array.isArray(PAYLOAD.iv) ||
        (PAYLOAD.v === 3 && PAYLOAD.data.length === 0) || PAYLOAD.data.length !== PAYLOAD.iv.length) {
      throw new Error("Invalid encrypted chunks");
    }
    const iterations = PAYLOAD.v === 2 ? 600000 : PAYLOAD.iterations;
    if (PAYLOAD.v === 3 &&
        (PAYLOAD.kdf !== KDF || !Number.isInteger(iterations) || iterations < 100000 || iterations > 2000000 ||
         typeof PAYLOAD.stealth !== "boolean")) {
      throw new Error("Unsupported key derivation parameters");
    }
    const authHeader = PAYLOAD.v === 3 ? {
      v:3,
      kdf:PAYLOAD.kdf,
      iterations:PAYLOAD.iterations,
      salt:PAYLOAD.salt,
      stealth:PAYLOAD.stealth,
      ...(!PAYLOAD.stealth ? {
        kind:PAYLOAD.kind,
        fileName:PAYLOAD.fileName,
        mime:PAYLOAD.mime,
        createdAt:PAYLOAD.createdAt,
        meta:PAYLOAD.meta
      } : {})
    } : null;
    saltBytes = b64(PAYLOAD.salt);
    const key = await derive(password.value, saltBytes, iterations);
    saltBytes.fill(0);
    saltBytes = null;
    for (let index = 0; index < PAYLOAD.data.length; index++) {
      const iv = b64(PAYLOAD.iv[index]);
      const cipher = b64(PAYLOAD.data[index]);
      try {
        const prefix = PAYLOAD.v === 2
          ? AAD_PREFIX_V2
          : AAD_PREFIX_V3 + JSON.stringify(authHeader) + ":";
        const plain = await crypto.subtle.decrypt(
          {
            name:"AES-GCM",
            iv,
            additionalData:new TextEncoder().encode(prefix + index + ":" + PAYLOAD.data.length)
          },
          key,
          cipher
        );
        if ((PAYLOAD.v === 3 && PAYLOAD.stealth && index === 0) ||
            (PAYLOAD.v === 2 && !PAYLOAD.meta && index === 0)) {
          clearChunks.push(new Uint8Array(plain));
        } else {
          const plainBytes = new Uint8Array(plain);
          blobParts.push(new Blob([plainBytes]));
          plainBytes.fill(0);
        }
      } finally {
        iv.fill(0);
        cipher.fill(0);
      }
    }

    let header = PAYLOAD;
    if (PAYLOAD.stealth || (PAYLOAD.v === 2 && !PAYLOAD.meta)) {
      metadataBytes = clearChunks.shift();
      header = JSON.parse(new TextDecoder().decode(metadataBytes));
      metadataBytes.fill(0);
      metadataBytes = null;
    }
    const mime = typeof header.mime === "string" ? header.mime : "application/octet-stream";
    const blob = new Blob(blobParts, { type:mime });
    blobParts.length = 0;
    clearChunks.forEach(chunk => chunk.fill(0));
    clearChunks.length = 0;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);

    if (mime.startsWith("video/")) {
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.src = objectUrl;
      out.append(video);
    } else if (mime.startsWith("image/")) {
      const image = document.createElement("img");
      image.alt = "drop";
      image.src = objectUrl;
      out.append(image);
    } else if (mime.startsWith("audio/")) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.autoplay = true;
      audio.src = objectUrl;
      out.append(audio);
    } else {
      const link = document.createElement("a");
      link.className = "ok";
      link.href = objectUrl;
      link.download = header.fileName || "resistance-drop";
      link.textContent = "Decrypted. Download file";
      out.append(link);
    }
    burnButton.hidden = false;
  } catch {
    clearChunks.forEach(chunk => chunk.fill(0));
    blobParts.length = 0;
    err.textContent = "Unlock failed. Wrong passphrase or tampered drop.";
  } finally {
    metadataBytes?.fill(0);
    saltBytes?.fill(0);
    password.value = "";
  }
};
</script>
</body>
</html>`;

  return new Blob([html], { type: "text/html" });
}
