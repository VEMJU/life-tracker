/* ============================================================
   NATHAN VÉLEZ — SON OF GOD  ·  Motion FX
   Scramble / decode animation on the active tab title.
   Watches the view title; whenever the app swaps it, the new
   name "decodes" in. Pure vanilla.
   ============================================================ */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.querySelector('[data-view-title]');
  if (!el || reduce) return;

  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%&*';
  let scrambling = false, raf = 0, final = (el.textContent || '').trim();

  function setText(s) {
    obs.disconnect();
    el.textContent = s;
    obs.observe(el, { childList: true, characterData: true, subtree: true });
  }

  function scramble(text) {
    final = text;
    scrambling = true;
    el.classList.add('is-decoding');
    const dur = Math.max(16, text.length * 3);
    let f = 0;
    cancelAnimationFrame(raf);
    (function step() {
      f++;
      const reveal = Math.floor((f / dur) * text.length);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        out += text[i] === ' ' ? ' '
             : i < reveal ? text[i]
             : CHARS[(Math.random() * CHARS.length) | 0];
      }
      setText(out);
      if (f <= dur) { raf = requestAnimationFrame(step); }
      else { setText(text); scrambling = false; el.classList.remove('is-decoding'); }
    })();
  }

  const obs = new MutationObserver(() => {
    if (scrambling) return;
    const t = (el.textContent || '').trim();
    if (t && t !== final) scramble(t);
  });
  obs.observe(el, { childList: true, characterData: true, subtree: true });

  // expose for manual triggers (e.g. on hub → tab entry)
  window.lifeFX = { scrambleTitle: () => scramble((el.textContent || '').trim()) };
})();
