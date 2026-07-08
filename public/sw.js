/* =============================================================
   FitJo — service worker (offline support + installability)
   Strategy:
     • Precache the app shell on install (best-effort).
     • Navigations: network-first, fall back to cached index.html
       so the app opens even with no connection.
     • Same-origin GETs: stale-while-revalidate (instant from cache,
       refreshed in the background) — keeps assets fresh without
       needing manual cache-version bumps.
     • Cross-origin (Leaflet CDN, OpenStreetMap tiles) is left to the
       network; offline the map degrades to its built-in fallback.
   ============================================================= */
const CACHE = "fitjo-cache-v6";

const APP_SHELL = [
  "index.html", "manifest.json",
  "css/styles.css",
  "js/data.js", "js/app.js", "js/auth.js", "js/support.js", "js/plan.js", "js/nutrition.js",
  "js/membership.js", "js/workouts.js", "js/rank.js", "js/inbody.js", "js/supplements.js",
  "js/staff.js", "js/map.js", "js/pwa.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // allSettled: one missing/renamed file must not break the whole install
    await Promise.allSettled(APP_SHELL.map((u) => cache.add(new Request(u, { cache: "reload" }))));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // CDN / map tiles → straight to network

  // Never cache dynamic data — cloud APIs & functions must always be fresh (live updates).
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.netlify/")) return;

  // App navigations: try the network, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
        return net;
      } catch (e) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) || (await cache.match("index.html")) || Response.error();
      }
    })());
    return;
  }

  // Everything else same-origin: stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
