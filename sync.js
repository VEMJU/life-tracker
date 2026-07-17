/* ============================================================
   NATHAN VÉLEZ — SON OF GOD  ·  Cloud Auth + Sync
   ------------------------------------------------------------
   A real login (email + password, checked by Supabase's server)
   and cross-device sync. Every "nv.*" localStorage key is
   mirrored to one row in public.app_state, scoped to your
   account by Row Level Security.

   How it slots in without touching app.js:
     • We patch localStorage.setItem/removeItem, so any write the
       app makes is queued and pushed to the cloud.
     • On login we PULL every row into localStorage (using the
       original setItem, so pulls don't echo back as pushes),
       THEN fire "nv-data-ready" — app.js waits for that before
       it boots, so it always starts with your real data.
     • Realtime tells other devices to refresh when data changes.
   ============================================================ */
(() => {
  'use strict';

  const URL = window.NV_SUPABASE_URL;
  const KEY = window.NV_SUPABASE_KEY;
  const root = document.documentElement;

  const gate    = document.getElementById('lockScreen');
  const form    = document.getElementById('lockForm');
  const emailEl = document.getElementById('lockEmail');
  const passEl  = document.getElementById('lockPass');
  const title   = document.getElementById('lockTitle');
  const hint    = document.getElementById('lockHint');
  const err     = document.getElementById('lockError');
  const submit  = document.getElementById('lockSubmit');
  const toggle  = document.getElementById('lockToggle');
  const toggleQ = document.getElementById('lockToggleQ');

  const PREFIX = 'nv.';
  const TABLE  = 'app_state';

  /* Keep the real localStorage methods so cloud→local writes don't loop. */
  const rawSet    = localStorage.setItem.bind(localStorage);
  const rawRemove = localStorage.removeItem.bind(localStorage);

  let dirty = new Set();      // nv.* keys changed locally, awaiting push
  let deletions = new Set();  // nv.* keys removed locally, awaiting delete
  let pushTimer = null;
  let lastLocalPush = 0;      // timestamp of our last successful push (to ignore self-echoes)
  let sb = null;
  let userId = null;
  let mode = 'signin';        // 'signin' | 'signup'

  const finishDataReady = () => {
    window.__nvDataReady = true;
    if (window.NVSync) window.NVSync.ready = true;
    window.dispatchEvent(new Event('nv-data-ready'));
  };

  /* ---------- patch storage so the app's own writes sync ---------- */
  localStorage.setItem = function (k, v) {
    rawSet(k, v);
    if (typeof k === 'string' && k.indexOf(PREFIX) === 0) {
      deletions.delete(k);
      dirty.add(k);
      schedulePush();
    }
  };
  localStorage.removeItem = function (k) {
    rawRemove(k);
    if (typeof k === 'string' && k.indexOf(PREFIX) === 0) {
      dirty.delete(k);
      deletions.add(k);
      schedulePush();
    }
  };

  /* ---------- graceful fallback: no cloud → local-only ---------- */
  function localOnly(message) {
    if (message) console.info('[sync] local-only mode:', message);
    // Restore plain storage behavior (nothing to push to).
    localStorage.setItem = rawSet;
    localStorage.removeItem = rawRemove;
    root.classList.remove('nv-locked', 'nv-auth');
    if (gate) gate.style.display = 'none';
    finishDataReady();
  }

  if (!URL || !KEY) return localOnly('no Supabase config');
  if (!window.supabase || !window.supabase.createClient) return localOnly('supabase library not loaded');
  if (!gate || !form) return localOnly('auth UI missing');

  sb = window.supabase.createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  /* ---------------------------  PUSH  --------------------------- */
  function schedulePush() {
    if (!userId) return;                 // not signed in yet
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 600);
  }

  async function pushNow() {
    if (!userId) return;
    const upserts = [];
    for (const k of dirty) {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(k)); } catch { data = localStorage.getItem(k); }
      upserts.push({ user_id: userId, key: k, data, updated_at: new Date().toISOString() });
    }
    const dels = [...deletions];
    dirty.clear();
    deletions.clear();

    try {
      if (upserts.length) {
        const { error } = await sb.from(TABLE).upsert(upserts, { onConflict: 'user_id,key' });
        if (error) throw error;
      }
      if (dels.length) {
        const { error } = await sb.from(TABLE).delete().eq('user_id', userId).in('key', dels);
        if (error) throw error;
      }
      lastLocalPush = Date.now();   // mark so realtime ignores our own echo
    } catch (e) {
      // Re-queue on failure so nothing is silently dropped.
      upserts.forEach((u) => dirty.add(u.key));
      dels.forEach((k) => deletions.add(k));
      console.warn('[sync] push failed, will retry:', e.message || e);
    }
  }

  // Last-ditch flush if the tab closes mid-edit.
  window.addEventListener('beforeunload', () => {
    if (!userId || (!dirty.size && !deletions.size)) return;
    try {
      const rows = [...dirty].map((k) => {
        let data = null;
        try { data = JSON.parse(localStorage.getItem(k)); } catch { data = localStorage.getItem(k); }
        return { user_id: userId, key: k, data, updated_at: new Date().toISOString() };
      });
      if (rows.length) {
        fetch(URL + '/rest/v1/' + TABLE + '?on_conflict=user_id,key', {
          method: 'POST',
          headers: {
            apikey: KEY,
            Authorization: 'Bearer ' + (sb.auth.__accessToken || KEY),
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(rows),
          keepalive: true,
        });
      }
    } catch (e) {}
  });

  /* ---------------------------  PULL  --------------------------- */
  async function pullAll() {
    const { data, error } = await sb.from(TABLE).select('key,data').eq('user_id', userId);
    if (error) throw error;
    // Remote is source of truth on login: mirror it into localStorage.
    (data || []).forEach((row) => {
      try { rawSet(row.key, JSON.stringify(row.data)); }
      catch (e) {}
    });
  }

  /* -------------------------  REALTIME  ------------------------- */
  let reloadTimer = null;
  function subscribeRealtime() {
    try {
      sb.channel('app_state_' + userId)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: TABLE, filter: 'user_id=eq.' + userId },
          () => {
            // Ignore the echo of our own writes (we just pushed these).
            if (Date.now() - lastLocalPush < 6000) return;
            // Another device changed something. Refresh gently, once things settle.
            clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => {
              if (Date.now() - lastLocalPush < 6000) return;
              // Don't yank the page out from under active typing.
              if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
              location.reload();
            }, 1500);
          })
        .subscribe();
    } catch (e) { console.warn('[sync] realtime unavailable:', e.message || e); }
  }

  /* ----------------------  ENTER THE APP  ---------------------- */
  async function enterApp(session) {
    userId = session.user.id;
    sb.auth.__accessToken = session.access_token;
    hint.textContent = 'Syncing…';
    err.classList.remove('is-show');
    try {
      await pullAll();
    } catch (e) {
      console.warn('[sync] pull failed, starting from local cache:', e.message || e);
    }
    subscribeRealtime();

    root.classList.remove('nv-locked', 'nv-auth');
    gate.classList.add('is-leaving');
    setTimeout(() => {
      gate.style.display = 'none';
      window.dispatchEvent(new Event('resize'));
      if (window.lifeHub && typeof window.lifeHub.open === 'function') window.lifeHub.open();
    }, 620);

    finishDataReady();
    // Any writes that happened before sign-in are still queued; flush them.
    if (dirty.size || deletions.size) schedulePush();
  }

  /* --------------------------  AUTH UI  ------------------------- */
  function setMode(next) {
    mode = next;
    err.classList.remove('is-show');
    if (mode === 'signup') {
      title.textContent = 'Create your account';
      hint.textContent = 'Your email + a password. This unlocks your data on every device.';
      submit.textContent = 'Create account';
      toggleQ.textContent = 'Already have an account?';
      toggle.textContent = 'Sign in';
      passEl.autocomplete = 'new-password';
    } else {
      title.textContent = 'Sign in';
      hint.textContent = 'Your data, on this and every device.';
      submit.textContent = 'Sign in';
      toggleQ.textContent = 'No account yet?';
      toggle.textContent = 'Create one';
      passEl.autocomplete = 'current-password';
    }
  }

  function fail(msg) {
    err.textContent = msg;
    err.classList.add('is-show');
    gate.classList.remove('is-shake');
    void gate.offsetWidth;
    gate.classList.add('is-shake');
  }

  function busy(on) {
    submit.disabled = on;
    submit.textContent = on ? 'Working…' : (mode === 'signup' ? 'Create account' : 'Sign in');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.remove('is-show');
    const email = (emailEl.value || '').trim();
    const password = passEl.value || '';
    if (!email || !email.includes('@')) return fail('Enter a valid email.');
    if (password.length < 6) return fail('Password must be at least 6 characters.');

    busy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          // Email confirmation is on: no session yet.
          busy(false);
          title.textContent = 'Check your email';
          hint.textContent = 'Confirm your address, then come back and sign in.';
          form.hidden = true;
          return;
        }
        await enterApp(data.session);
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await enterApp(data.session);
      }
    } catch (e2) {
      busy(false);
      fail(e2.message || 'Something went wrong.');
    }
  });

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    setMode(mode === 'signup' ? 'signin' : 'signup');
  });

  /* ---------------------------  BOOT  --------------------------- */
  window.NVSync = {
    ready: false,
    signOut: async () => {
      try { await sb.auth.signOut(); } catch (e) {}
      location.reload();
    },
    isConfigured: true,
  };

  (async function boot() {
    const { data } = await sb.auth.getSession();
    if (data && data.session) {
      // Returning, already-signed-in device: straight in.
      await enterApp(data.session);
    } else {
      // Show the auth gate. Decide sign-in vs create based on prior use.
      let seen = false;
      try { seen = localStorage.getItem('nv.cloud.seen') === '1'; } catch (e) {}
      setMode(seen ? 'signin' : 'signup');
      root.classList.add('nv-auth');
      setTimeout(() => emailEl.focus(), 260);
    }
    try { rawSet('nv.cloud.seen', '1'); } catch (e) {}
  })();
})();
