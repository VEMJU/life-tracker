/* ============================================================
   NATHAN VÉLEZ — SON OF GOD  ·  Passcode Lock
   A local privacy gate. The passcode is never stored, never
   sent anywhere, and never committed: only a random salt and a
   PBKDF2-SHA256 hash live in localStorage on this device.

   Scope, honestly: this runs in the browser, so it deters a
   casual look at this machine. It is NOT protection against
   anyone with devtools. Real security needs a server.
   ============================================================ */
(() => {
  'use strict';

  const KEY     = 'nv.lock';
  const SESSION = 'nv.lock.session';
  const ITER    = 210000;
  const MIN     = 4;

  const root   = document.documentElement;
  const screen = document.getElementById('lockScreen');
  if (!screen) return;

  const form    = document.getElementById('lockForm');
  const pass    = document.getElementById('lockPass');
  const confirm = document.getElementById('lockConfirm');
  const confRow = document.getElementById('lockConfirmRow');
  const title   = document.getElementById('lockTitle');
  const hint    = document.getElementById('lockHint');
  const err     = document.getElementById('lockError');
  const submit  = document.getElementById('lockSubmit');

  const subtle = window.crypto && window.crypto.subtle;

  /* ─────────────────  STORE  ───────────────── */
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch { return null; }
  };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };

  /* ─────────────────  CRYPTO  ───────────────── */
  const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function derive(passphrase, salt, iter) {
    const km = await subtle.importKey(
      'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveBits'],
    );
    const bits = await subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, km, 256,
    );
    return new Uint8Array(bits);
  }

  // Compare every byte regardless of mismatch, so timing says nothing.
  function same(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  /* ─────────────────  UI  ───────────────── */
  const isSetup = () => !read();

  function fail(msg) {
    err.textContent = msg;
    err.classList.add('is-show');
    screen.classList.remove('is-shake');
    void screen.offsetWidth;              // force reflow so the shake replays
    screen.classList.add('is-shake');
    pass.value = '';
    if (confirm) confirm.value = '';
    pass.focus();
  }

  function busy(on) {
    submit.disabled = on;
    submit.textContent = on ? 'Working…' : (isSetup() ? 'Set passcode' : 'Unlock');
  }

  function unlock() {
    try { sessionStorage.setItem(SESSION, '1'); } catch (e) {}
    root.classList.remove('nv-locked', 'nv-lock-setup');
    screen.classList.add('is-leaving');
    setTimeout(() => {
      screen.style.display = 'none';
      // Canvases measured 0×0 while hidden — let them re-measure, then replay the intro.
      window.dispatchEvent(new Event('resize'));
      if (window.lifeHub && typeof window.lifeHub.open === 'function') window.lifeHub.open();
    }, 620);
  }

  /* ─────────────────  FLOW  ───────────────── */
  if (!subtle) {
    // Non-secure context (file://). Hashing is unavailable; don't fake a lock.
    title.textContent = 'Lock unavailable';
    hint.textContent = 'Open this over http://localhost or https:// to use the passcode.';
    form.hidden = true;
    setTimeout(unlock, 1800);
    return;
  }

  if (isSetup()) {
    root.classList.add('nv-lock-setup');
    title.textContent = 'Set your passcode';
    hint.textContent = `Chosen once, stored only on this device. Minimum ${MIN} characters — there is no recovery.`;
    confRow.hidden = false;
    submit.textContent = 'Set passcode';
  } else {
    title.textContent = 'Enter passcode';
    hint.textContent = 'This device only.';
    confRow.hidden = true;
    submit.textContent = 'Unlock';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.remove('is-show');
    const value = pass.value;

    if (isSetup()) {
      if (value.length < MIN) return fail(`At least ${MIN} characters.`);
      if (value !== confirm.value) return fail('The two passcodes do not match.');
      busy(true);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await derive(value, salt, ITER);
      write({ v: 1, iter: ITER, salt: b64(salt), hash: b64(hash) });
      busy(false);
      unlock();
      return;
    }

    const rec = read();
    if (!value) return fail('Enter your passcode.');
    busy(true);
    const hash = await derive(value, unb64(rec.salt), rec.iter || ITER);
    busy(false);
    if (same(hash, unb64(rec.hash))) unlock();
    else fail('Wrong passcode.');
  });

  pass.addEventListener('input', () => err.classList.remove('is-show'));
  setTimeout(() => pass.focus(), 260);

  /* Re-lock on demand: window.lifeLock.lock() */
  window.lifeLock = {
    lock() {
      try { sessionStorage.removeItem(SESSION); } catch (e) {}
      location.reload();
    },
    isSet: () => !!read(),
  };
})();
