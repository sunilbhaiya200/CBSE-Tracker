/**
 * CBSE Class 9 & 10 Study Tracker - Service Worker
 * Precaches app shell (HTML/CSS/JS/icons) ONLY.
 * NEVER precaches PDFs to protect device storage quota.
 */

const CACHE_NAME = "sunil-bhaiya-tracker-v2";

const APP_SHELL_ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/data/stages.js",
  "./js/data/chapters-class9.js",
  "./js/data/chapters-class10.js",
  "./js/storage.js",
  "./js/planner.js",
  "./js/insights.js",
  "./js/app.js",
  "./assets/icons/logo.svg",
  "./assets/icons/logo-maskable.svg",
  "./assets/icons/apple-touch-icon.png",
  "./manifest.json"
];

// Install Event - Precache App Shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve App Shell from Cache, ignore PDFs
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // NEVER cache PDFs in Service Worker
  if (url.pathname.endsWith(".pdf") || url.pathname.includes("/assets/pdfs/")) {
    return;
  }

  // Only handle same-origin GET requests (skip non-GET and cross-origin fetches)
  if (event.request.method !== "GET" || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline fallback: navigations get the cached app shell, other uncached
        // requests get a clear 503 instead of an unhandled network error.
        if (event.request.mode === "navigate") {
          return caches.match("./index.html").then(r => r || new Response("Offline", { status: 503, statusText: "Service Unavailable" }));
        }
        return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
      });
    })
  );
});
