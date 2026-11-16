/* VEILZERO — offline shell for Hollow blackouts
   Strategy:
   - Precache app shell + MediaPipe (offline record/clean)
   - Network-first for Next bundles (avoid poisoned chunks)
   - Cache-first only for /mediapipe/*
   - Never fail install if one URL 404s
*/
const CACHE_VERSION = "veilzero-hollow-v3";
const SHELL = ["/", "/live", "/clean", "/about", "/manifest.json", "/favicon.svg"];

// MediaPipe core loader; models cached on first use
const MEDIAPIPE_CORE = ["/mediapipe/face_mesh.js"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // addAll aborts ALL on one failure — add one-by-one
      for (const url of [...SHELL, ...MEDIAPIPE_CORE]) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn("[VEILZERO SW] precache skip", url, e);
        }
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
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

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response("Offline — asset unavailable", { status: 503 });
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const res = await fetch(req);
    // Only cache successful same-origin GETs (not error pages)
    if (res.ok) {
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    // Last resort: app shell
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
      box { max-width:36rem; border:1px solid #00FF41; padding:1.5rem; }
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
      <p>4. Avoid hitting the Red Burn Buttons or refreshing the page until network is online to stay operational.
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