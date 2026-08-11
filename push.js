/* ============================================================================
   PUSH — turning this into an app that can reach you when it is closed.

   THE FLOW, once:
     1. register the service worker
     2. you tap "Turn on phone alerts" → browser asks permission
     3. the browser mints a subscription (a URL only our server can post to)
     4. we store it in Supabase against your account
     5. a Vercel Cron job posts to those subscriptions on a schedule

   WHAT YOU HAVE TO KNOW:
     · iPhone/iPad: push ONLY works once the app is added to the Home Screen
       (Share → Add to Home Screen). In Safari's normal tab it will not fire.
       This is Apple's rule, not a bug here.
     · Android/desktop Chrome: works from the browser once permitted.
     · Permission must come from a real tap — browsers ignore silent requests.
   ========================================================================== */
(() => {
  'use strict';

  const SW_URL = '/sw.js';

  /* base64url → Uint8Array, the format the Push API demands for the VAPID key */
  function urlB64ToUint8(base64) {
    const pad = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  /* iOS only allows push from an installed (home-screen) app */
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  let reg = null;

  async function register() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
      return reg;
    } catch (e) {
      console.warn('[push] service worker did not register:', e.message);
      return null;
    }
  }

  /* the server hands us its public VAPID key so it is never hardcoded here */
  async function publicKey() {
    try {
      const r = await fetch('/api/push-key');
      if (!r.ok) return null;
      const d = await r.json();
      return d && d.key ? d.key : null;
    } catch (e) { return null; }
  }

  async function subscribe() {
    if (!supported) return { ok: false, why: 'unsupported' };
    if (isIOS && !isStandalone) return { ok: false, why: 'ios-needs-install' };

    if (!reg) reg = await register();
    if (!reg) return { ok: false, why: 'no-sw' };

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, why: 'denied' };

    const key = await publicKey();
    if (!key) return { ok: false, why: 'no-server-key' };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,                        // required; we never push silently
        applicationServerKey: urlB64ToUint8(key),
      });
    }

    /* store it against the signed-in account so the cron job knows where to send */
    return save(sub);
  }

  /* THE SUBSCRIPTION MUST REACH THE SERVER. A copy in localStorage is worthless
     for push — the sending job reads Supabase, not your browser. So a failure
     to store it server-side is reported as a failure, never dressed up as
     success: otherwise the button says "on" and no notification ever arrives. */
  async function save(sub) {
    const json = sub.toJSON();
    const row = {
      endpoint: json.endpoint,
      p256dh: json.keys && json.keys.p256dh,
      auth: json.keys && json.keys.auth,
      agent: navigator.userAgent.slice(0, 180),
    };
    try { localStorage.setItem('nv.push.sub', JSON.stringify(row)); } catch (e) {}

    if (!(window.NVSync && window.NVSync.savePushSubscription)) {
      return { ok: false, why: 'no-cloud' };
    }
    try {
      await window.NVSync.savePushSubscription(row);
      return { ok: true };
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (/not signed in/i.test(msg)) return { ok: false, why: 'signed-out' };
      return { ok: false, why: 'save-failed', detail: msg };
    }
  }

  async function unsubscribe() {
    if (!reg) reg = await register();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      /* forget the device server-side FIRST — if we unsubscribed first we'd
         lose the endpoint and the row would linger, pushing into the void
         until the send job pruned it. */
      const ep = sub.endpoint;
      try {
        if (window.NVSync && window.NVSync.dropPushSubscription) await window.NVSync.dropPushSubscription(ep);
      } catch (e) { /* the send job prunes dead endpoints anyway */ }
      await sub.unsubscribe();
    }
    try { localStorage.removeItem('nv.push.sub'); } catch (e) {}
  }

  async function status() {
    if (!supported)                 return 'unsupported';
    if (isIOS && !isStandalone)     return 'ios-needs-install';
    if (Notification.permission === 'denied')  return 'denied';
    if (!reg) reg = await register();
    if (!reg)                       return 'no-sw';
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  }

  /* the service worker asks the page to change tab when a notification is tapped */
  navigator.serviceWorker?.addEventListener('message', (e) => {
    const m = e.data;
    if (m && m.source === 'nv-sw' && m.type === 'go') {
      window.dispatchEvent(new CustomEvent('nv-go-tab', { detail: m.tab }));
      /* and if the notice was about one specific day, open that day too */
      if (m.day) window.dispatchEvent(new CustomEvent('nv-go-day', { detail: m.day }));
    }
  });

  /* opened from a notification on a cold start */
  const qs   = new URLSearchParams(location.search);
  const qTab = qs.get('tab');
  const qDay = qs.get('day');
  if (qTab || qDay) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (qTab) window.dispatchEvent(new CustomEvent('nv-go-tab', { detail: qTab }));
        /* the day goes second and later — the tab has to exist before a day
           can be opened on top of it */
        if (qDay) setTimeout(() => window.dispatchEvent(new CustomEvent('nv-go-day', { detail: qDay })), 300);
      }, 400);
    });
  }

  register();   // always register: offline shell works with or without push

  window.NVPush = { subscribe, unsubscribe, status, supported, isIOS, isStandalone };
})();
