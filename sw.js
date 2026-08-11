/* ============================================================================
   SERVICE WORKER — the part that can wake up when the app is closed.

   This is what makes a real notification possible. A normal page only runs
   while its tab is open; a service worker is registered with the browser
   itself, so the operating system can start it to deliver a push even when
   every tab is shut — which is exactly what you asked for.

   It does three jobs:
     1. push        — receive a message from our server and show a notification
     2. click       — open the app on the right tab when you tap that
     3. offline     — serve the shell from cache when there is no network

   IMPORTANT: this file must live at the ROOT (/sw.js). A service worker can
   only control pages at or below its own path, so one in /js/ would control
   nothing.
   ========================================================================== */

const CACHE = 'nv-shell-v2';   // bumped so the new notificationclick handler takes over

/* The shell only. Tab data lives in localStorage/Supabase and must never be
   served stale from here. */
const SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => {}))   // a miss must not block install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network first, cache as the fallback. The opposite order would serve you
   yesterday's app, which is precisely the trap we already fell into once. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // never cache third parties
  if (url.pathname.startsWith('/api/')) return;      // never cache live data

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('/index.html')))
  );
});

/* ── THE PUSH ─────────────────────────────────────────────────────────────
   Our server sends { title, body, tab, tag }. Everything is defensive: a
   malformed push must still produce a notification rather than nothing. */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {
    try { d = { body: e.data.text() }; } catch (e2) { d = {}; }
  }

  const title = d.title || 'Life Tracker';
  const opts = {
    body: d.body || 'You have something waiting.',
    icon: '/vendor/icon-192.png',
    badge: '/vendor/icon-192.png',
    tag: d.tag || 'nv-alert',
    renotify: true,
    requireInteraction: !!d.urgent,
    /* `day` must survive this hop. It is set on the payload by the server and
       read back in notificationclick — drop it here and the tap silently
       falls back to "open the calendar", with nothing to show it broke. */
    data: { tab: d.tab || 'home', url: d.url || '/', day: d.day || '' },
    vibrate: [90, 50, 90],
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

/* Tapping a notification focuses an open tab if there is one, rather than
   piling up duplicates, and tells the app which tab to show. */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  const tab = data.tab || 'home';
  /* A due-task notice carries the day it was about, so the tap can open that
     day rather than dropping you on the calendar to go hunting for it. */
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(data.day || '')) ? data.day : '';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) {
          c.postMessage({ source: 'nv-sw', type: 'go', tab, day });
          return c.focus();
        }
      }
      /* cold start — the app is not open, so the day rides in the URL */
      return self.clients.openWindow(
        '/?tab=' + encodeURIComponent(tab) + (day ? '&day=' + encodeURIComponent(day) : '')
      );
    })
  );
});
