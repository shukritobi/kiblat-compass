/* QiblaVector offline: only cache our own same-origin build files, never store location or headings. */
const CACHE = 'qiblavector-v1';
const ROOT = self.registration.scope;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([ROOT, ROOT+'manifest.webmanifest', ROOT+'favicon.svg'])));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))), self.clients.claim()]));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(ROOT).pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { if (response.ok) caches.open(CACHE).then(cache=>cache.put(ROOT, response.clone())); return response; }).catch(()=>caches.match(ROOT)));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => { if (response.ok) caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())); return response; })));
});
