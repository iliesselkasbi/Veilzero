function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: Uint8Array.from(salt),
      iterations: 250_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function buildResistanceDrop(opts: {
  blob: Blob;
  fileName: string;
  password: string;
  kind: "live" | "clean";
}): Promise<Blob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(opts.password, salt);
  const plain = new Uint8Array(await opts.blob.arrayBuffer());
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const cipher = new Uint8Array(cipherBuf);

  const mime = opts.blob.type || "application/octet-stream";
  const payload = {
    v: 1,
    kind: opts.kind,
    fileName: opts.fileName,
    mime,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(cipher),
    createdAt: new Date().toISOString(),
    note: "VEILZERO Resistance Drop — assume hostile network. Verify passphrase out-of-band.",
  };

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
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
    <p class="ok">FILE: ${opts.fileName.replace(/[<>&]/g, "")}</p>
    <input id="pw" type="password" placeholder="Passphrase" autofocus />
    <button id="go">UNLOCK</button>
    <p class="err" id="err"></p>
    <div id="out"></div>
  </div>
<script>
const PAYLOAD = ${JSON.stringify(payload)};
const b64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function derive(password, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name:"PBKDF2", salt, iterations:250000, hash:"SHA-256" },
    base,
    { name:"AES-GCM", length:256 },
    false,
    ["decrypt"]
  );
}
document.getElementById("go").onclick = async () => {
  const err = document.getElementById("err");
  const out = document.getElementById("out");
  err.textContent = ""; out.innerHTML = "";
  try {
    const pw = document.getElementById("pw").value;
    const key = await derive(pw, b64(PAYLOAD.salt));
    const plain = await crypto.subtle.decrypt(
      { name:"AES-GCM", iv: b64(PAYLOAD.iv) },
      key,
      b64(PAYLOAD.data)
    );
    const blob = new Blob([plain], { type: PAYLOAD.mime });
    const url = URL.createObjectURL(blob);
    if (PAYLOAD.mime.startsWith("video/")) {
      out.innerHTML = '<video controls autoplay src="'+url+'"></video>';
    } else if (PAYLOAD.mime.startsWith("image/")) {
      out.innerHTML = '<img alt="drop" src="'+url+'"/>';
    } else if (PAYLOAD.mime.startsWith("audio/")) {
      out.innerHTML = '<audio controls autoplay src="'+url+'"></audio>';
    } else {
      out.innerHTML = '<p class="ok">Decrypted. <a style="color:#00FF41" href="'+url+'" download="'+PAYLOAD.fileName+'">Download file</a></p>';
    }
  } catch (e) {
    err.textContent = "Unlock failed. Wrong passphrase or tampered drop.";
  }
};
</script>
</body>
</html>`;

  return new Blob([html], { type: "text/html" });
}