/* VEILZERO — offline shell for Hollow blackouts
   Strategy:
   - Precache app shell + MediaPipe (offline record/clean)
   - Network-first for Next bundles (avoid poisoned chunks)
   - Cache-first only for /mediapipe/*
   - Never fail install if one URL 404s
*/
const CACHE_VERSION = "veilzero-hollow-v4";
const SHELL = ["/", "/live", "/clean", "/about", "/manifest.json", "/favicon.svg"];
const MEDIA_MANIFEST = "/mediapipe/manifest.json";
const MEDIAPIPE_CORE = ["/mediapipe/face_mesh.js", MEDIA_MANIFEST];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      for (const url of [...SHELL, ...MEDIAPIPE_CORE]) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn("[VEILZERO SW] precache skip", url, e);
        }
      }

      try {
        const response = await fetch(MEDIA_MANIFEST);
        if (!response.ok) throw new Error(`MediaPipe manifest request failed (${response.status})`);
        const manifest = await response.json();
        if (!manifest || !Array.isArray(manifest.files)) {
          throw new Error("MediaPipe manifest has an invalid format");
        }
        for (const file of manifest.files) {
          if (typeof file !== "string" || file.includes("/") || file.includes("\\")) {
            throw new Error("MediaPipe manifest contains an invalid filename");
          }
          try {
            await cache.add(`/mediapipe/${encodeURIComponent(file)}`);
          } catch (e) {
            console.warn("[VEILZERO SW] asset precache skip", file, e);
          }
        }
      } catch (e) {
        console.warn("[VEILZERO SW] MediaPipe manifest unavailable", e);
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("veilzero-") && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // App-own origin only
  if (url.origin !== self.location.origin) return;
  if (!isCacheableRequest(req, url)) return;

  // MediaPipe models/wasm: cache-first (blackout-safe, stable bytes)
  if (url.pathname.startsWith("/mediapipe/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Next build artifacts + HMR: ALWAYS network-first (prevents ChunkLoadError hell)
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Navigations + static pages: network-first, shell fallback
  event.respondWith(networkFirst(req));
});

function isCacheableRequest(req, url) {
  if (req.method !== "GET" || url.search) return false;
  return (
    SHELL.includes(url.pathname) ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/mediapipe/")
  );
}

function isCacheableResponse(req, response) {
  const url = new URL(req.url);
  if (!response.ok || response.type === "opaque" || response.headers.has("set-cookie")) {
    return false;
  }
  if (SHELL.includes(url.pathname)) return true;
  const cacheControl = response.headers.get("cache-control") || "";
  const vary = response.headers.get("vary") || "";
  return (
    !/\b(private|no-store|no-cache)\b/i.test(cacheControl) &&
    vary.trim() !== "*"
  );
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (isCacheableResponse(req, res)) await cache.put(req, res.clone());
    return res;
  } catch {
    return new Response("Offline — asset unavailable", { status: 503 });
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const res = await fetch(req);
    if (isCacheableResponse(req, res)) await cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    if (req.mode !== "navigate") {
      return new Response("Offline — resource unavailable", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const shell = await cache.match("/");
    if (shell) return shell;
    return new Response(
  `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>VEILZERO — Offline</title>
    <style>
      body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
             background:#050505; color:#00FF41; font:14px/1.5 ui-monospace,monospace; padding:24px; }
      .box { max-width:36rem; border:1px solid #00FF41; padding:1.5rem; }
      h1 { margin:0 0 .75rem; font-size:1rem; letter-spacing:.12em; }
      p { color:#9ca3af; margin:.5rem 0; }
      code { color:#00FF41; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>VEILZERO // BLACKOUT</h1>
      <p>This device has no cached shell yet (or cache was cleared).</p>
      <p><strong>What to do</strong></p>
      <p>1. Go online and start the app once:</p>
      <p><code>npm run demo</code></p>
      <p>2. Open Witness Cam (turn on the camera once), Evidence Scrub, About Page once.</p>
      <p>3. You can then disconnect from the network. Media still never uploads — it never left the machine.</p>
      <p>4. Avoid wiping offline data or refreshing the page until network is online to stay operational.</p>
      <p style="margin-top:1rem;color:#666">Dev mode (<code>npm run dev</code>) does not keep an offline shell on purpose.</p>
    </div>
  </body>
  </html>`,
  {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  }
);
  }
}