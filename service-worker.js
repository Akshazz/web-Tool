/**
 * A-Code Playground service worker — intentionally minimal.
 *
 * A service worker with a fetch handler is required for Chrome/Edge/Android
 * to consider the site installable (the `beforeinstallprompt` event never
 * fires without one). That is the ONLY job this file does right now.
 *
 * It deliberately does NOT cache app.css / app.js / i18n.js / pwa.js. An
 * earlier version did cache them, cache-first, and that turned into a real
 * bug: once a browser installed it, that browser kept serving day-one
 * copies of those files forever — every later edit was silently ignored,
 * even with cache-busting `?v=` query strings, because a service worker
 * matches requests by URL path, not by query string. A network-first
 * version fixed the symptom but the safest fix while this app is still
 * under active development is to just not cache these files at all: every
 * request goes straight to the network, so what you edit is what you get.
 *
 * If/when this app is stable and you want real offline support, reintroduce
 * a cache with a version bump on every deploy — just don't cache-first
 * anything that changes during development.
 */
const OLD_CACHE_NAMES = ['a-devtools-v1', 'a-devtools-v2'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => OLD_CACHE_NAMES.includes(key)).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Pure pass-through for sub-resources (css/js/icons/etc).
//
// Navigation requests (the actual page load, e.g. ?page=landing) are
// deliberately left alone entirely — we never call event.respondWith() for
// them. Re-fetching a navigate-mode Request object from inside a service
// worker is fragile (it can throw "TypeError: Failed to fetch" / "network
// error response" depending on redirects, sessions, and the exact browser),
// and there is no upside to intercepting it here since we don't cache
// anything anyway. Letting the browser handle navigation itself is strictly
// safer and behaves exactly like there was no service worker at all for
// that request.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') return;
  // .catch() below is required: a plain pass-through fetch() rejects
  // (TypeError: Failed to fetch) whenever the request is interrupted —
  // e.g. the user navigates/switches tabs mid-request, the device goes
  // offline, or a CDN request is blocked. Without a .catch(), respondWith()
  // is handed a rejected promise and it surfaces as an uncaught rejection
  // in the console (service-worker.js:51) even though nothing is actually
  // broken. Falling back to Response.error() lets the browser treat it as
  // an ordinary failed network request instead of an unhandled exception.
  event.respondWith(fetch(event.request).catch(() => Response.error()));
});
