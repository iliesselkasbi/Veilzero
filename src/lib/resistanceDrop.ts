const CHUNK_SIZE = 1024 * 1024;
const AAD_PREFIX = "VEILZERO-RESISTANCE-DROP-v2:";

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
  salt: Uint8Array<ArrayBuffer>
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
        iterations: 600_000,
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
  meta?: Record<string, string>;
}): Promise<Blob> {
  const stealth = opts.stealth ?? true;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltText = toBase64(salt);
  let key: CryptoKey;
  try {
    key = await deriveKey(opts.password, salt);
  } finally {
    salt.fill(0);
  }

  const mime = opts.blob.type || "application/octet-stream";
  const createdAt = new Date().toISOString();
  const metadata = {
    ...(opts.meta ?? {}),
    kind: opts.kind,
    fileName: opts.fileName,
    mime,
    createdAt,
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
          additionalData: new TextEncoder().encode(`${AAD_PREFIX}${index}:${chunkCount}`),
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
  for (let offset = 0; offset < opts.blob.size; offset += CHUNK_SIZE) {
    const bytes = new Uint8Array(
      await opts.blob.slice(offset, Math.min(offset + CHUNK_SIZE, opts.blob.size)).arrayBuffer()
    );
    await encryptChunk(bytes, ivs.length);
  }

  const payload = {
    v: 2,
    salt: saltText,
    iv: ivs,
    data,
    ...(stealth
      ? {}
      : {
          kind: metadata.kind,
          fileName: metadata.fileName,
          mime: metadata.mime,
          createdAt: metadata.createdAt,
          meta: opts.meta ?? {},
        }),
  };
  const normalDetails = stealth
    ? ""
    : `<p class="ok">FILE: ${escapeHtml(opts.fileName)} · ${escapeHtml(createdAt)}</p><p class="ok">METADATA: ${escapeHtml(JSON.stringify(opts.meta ?? {}))}</p>`;
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
<title>VEILZERO · Resistance Drop</title>
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
  .err { color:#ff003c; font-size:12px; min-height:16px; }
  video, img, audio { width:100%; margin-top:12px; border-radius:8px; background:#000; }
  .ok { color:#00FF41; font-size:12px; }
</style>
</head>
<body>
  <div class="card">
    <h1>VEILZERO // RESISTANCE DROP</h1>
    <p>Encrypted client-side dead-drop. No servers contacted when you unlock this file.</p>
    ${normalDetails}
    <input id="pw" type="password" placeholder="Passphrase" autofocus />
    <button id="go">UNLOCK</button>
    <p class="err" id="err"></p>
    <div id="out"></div>
  </div>
<script>
const PAYLOAD = ${payloadJson};
const AAD_PREFIX = "${AAD_PREFIX}";
const b64 = (value) => Uint8Array.from(atob(value), character => character.charCodeAt(0));
async function derive(password, salt) {
  const passwordBytes = new TextEncoder().encode(password);
  try {
    const base = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveKey"]);
    return await crypto.subtle.deriveKey(
      { name:"PBKDF2", salt, iterations:600000, hash:"SHA-256" },
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
window.addEventListener("pagehide", () => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
document.getElementById("go").onclick = async () => {
  const err = document.getElementById("err");
  const out = document.getElementById("out");
  const password = document.getElementById("pw");
  err.textContent = "";
  out.replaceChildren();
  const clearChunks = [];
  let metadataBytes;
  let saltBytes;
  try {
    saltBytes = b64(PAYLOAD.salt);
    const key = await derive(password.value, saltBytes);
    saltBytes.fill(0);
    saltBytes = null;
    for (let index = 0; index < PAYLOAD.data.length; index++) {
      const iv = b64(PAYLOAD.iv[index]);
      const cipher = b64(PAYLOAD.data[index]);
      try {
        const plain = await crypto.subtle.decrypt(
          {
            name:"AES-GCM",
            iv,
            additionalData:new TextEncoder().encode(AAD_PREFIX + index + ":" + PAYLOAD.data.length)
          },
          key,
          cipher
        );
        clearChunks.push(new Uint8Array(plain));
      } finally {
        iv.fill(0);
        cipher.fill(0);
      }
    }

    let header = PAYLOAD;
    if (!PAYLOAD.meta) {
      metadataBytes = clearChunks.shift();
      header = JSON.parse(new TextDecoder().decode(metadataBytes));
      metadataBytes.fill(0);
      metadataBytes = null;
    }
    const blob = new Blob(clearChunks, { type:header.mime || "application/octet-stream" });
    clearChunks.forEach(chunk => chunk.fill(0));
    clearChunks.length = 0;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);

    if (header.mime.startsWith("video/")) {
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.src = objectUrl;
      out.append(video);
    } else if (header.mime.startsWith("image/")) {
      const image = document.createElement("img");
      image.alt = "drop";
      image.src = objectUrl;
      out.append(image);
    } else if (header.mime.startsWith("audio/")) {
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
  } catch {
    clearChunks.forEach(chunk => chunk.fill(0));
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
