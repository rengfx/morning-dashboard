// Offline: app shell cache-first; /api/today network-first with the last good copy as fallback.
const V = 'morning-v4';
const SHELL = ['/', '/index.html', '/sky.html', '/css/app.css', '/js/today.js', '/js/charts.js', '/js/sky.js', '/js/astro.js', '/js/time.js', '/js/skyevents.js', '/js/skynotes.js', '/js/pier.js', '/js/pier3d.js', '/js/sky-extra.js', '/manifest.webmanifest', '/icons/icon-180.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  if (u.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((cc) => cc.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((cc) => cc.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
});
