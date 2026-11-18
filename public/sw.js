const CACHE_NAME = "veilzero-app-v2";
const MEDIA_PATH = "/mediapipe/";
const APP_ROUTES = ["/", "/live", "/clean", "/about"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const manifestUrl = new URL(`${MEDIA_PATH}manifest.json`, self.location.origin);
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Could not load MediaPipe asset manifest (${response.status}).`);
      }

      const manifest = await response.json();
      if (!manifest || !Array.isArray(manifest.files)) {
        throw new Error("MediaPipe asset manifest has an invalid format.");
      }

      const assets = manifest.files.map((file) => {
        if (typeof file !== "string" || file.includes("/") || file.includes("\\")) {
          throw new Error("MediaPipe asset manifest contains an invalid filename.");
        }
        return new URL(`${MEDIA_PATH}${encodeURIComponent(file)}`, self.location.origin);
      });

      await cache.put(manifestUrl, response);
      await cache.addAll(assets);
      await Promise.all(APP_ROUTES.map((route) => cache.add(route)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) =>
            (name.startsWith("veilzero-app-") || name.startsWith("veilzero-mediapipe-")) &&
            name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })()
  );
});