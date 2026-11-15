// Extremely simple offline caching for Hackathon proof-of-concept
const CACHE_NAME = 'veilzero-hollow-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We cache the base routes so the app loads offline
      return cache.addAll(['/', '/live', '/clean', '/about', '/manifest.json']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network (and cache it for next time)
      return response || fetch(event.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET' && event.request.url.startsWith('http')) {
            cache.put(event.request, fetchRes.clone());
          }
          return fetchRes;
        });
      });
    })
  );
});