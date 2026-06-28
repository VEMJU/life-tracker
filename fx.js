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

/* ---------- staggered blur-in of cards each time a tab opens ---------- */
(() => {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const body = document.body;
  function reveal(view) {
    const panel = document.querySelector(`[data-tab-panel="${view}"]`);
    if (!panel) return;
    panel.querySelectorAll('.card, .goal-card').forEach((c, i) => c.style.setProperty('--i', i % 12));
    panel.classList.remove('is-entering');
    void panel.offsetWidth;                         // reflow → restart the stagger
    panel.classList.add('is-entering');
  }
  new MutationObserver((muts) => {
    for (const m of muts) if (m.attributeName === 'data-view') reveal(body.getAttribute('data-view'));
  }).observe(body, { attributes: true, attributeFilter: ['data-view'] });
})();

/* ---------- crimson celebration burst when you complete something ---------- */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function burst(x, y) {
    if (reduce) return;
    const b = document.createElement('div');
    b.className = 'fx-burst';
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 640);
  }
  window.lifeFX = Object.assign(window.lifeFX || {}, { burst });
  // fires on any checkbox the user ticks on (workout sets, goal tasks, reminders…)
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('input[type="checkbox"]') && t.checked) {
      const r = t.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
    }
  }, true);
})();
