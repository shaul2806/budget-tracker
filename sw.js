// ============================================================
// Budget Tracker Service Worker v3
// Strategy:
//   - index.html → pre-cached on install + network-first on fetch
//   - fonts/manifest → cache-first
//   - API/proxy calls → never intercepted
// ============================================================

const CACHE_NAME = 'budget-shell-v3';
const START_URL  = '/budget-tracker/';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([START_URL, 'manifest.json'])
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    ])
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept external requests
  if (url.hostname !== location.hostname) return;

  // index.html — network-first, fall back to pre-cached copy
  const isHtmlPage =
    url.pathname === '/budget-tracker/' ||
    url.pathname === '/budget-tracker/index.html' ||
    url.pathname.endsWith('/');

  if (isHtmlPage) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(START_URL))
    );
    return;
  }

  // Everything else: cache-first
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
