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
  let scrambling = false, raf = 0, pending = null;
  let final = (el.textContent || '').trim();   // the one true title — never read mid-scramble junk

  function setText(s) {
    obs.disconnect();
    el.textContent = s;
    obs.observe(el, { childList: true, characterData: true, subtree: true });
  }

  let failsafe = 0;
  function scramble(text) {
    final = text;
    scrambling = true;
    el.classList.add('is-decoding');
    const dur = Math.max(16, text.length * 3);
    let f = 0, done = false;
    cancelAnimationFrame(raf);
    clearTimeout(failsafe);
    const finish = () => {                   // idempotent — ALWAYS lands on the target string
      if (done || final !== text) return;
      done = true;
      clearTimeout(failsafe);
      setText(text);
      scrambling = false;
      el.classList.remove('is-decoding');
      if (pending && pending !== final) { const p = pending; pending = null; scramble(p); }
      else pending = null;
    };
    // rAF pauses in background tabs — this guarantees the text still resolves
    failsafe = setTimeout(finish, 1200);
    (function step() {
      if (done || final !== text) return;    // superseded — the newer run owns the element
      f++;
      if (f > dur) { finish(); return; }
      const reveal = Math.floor((f / dur) * text.length);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        out += text[i] === ' ' ? ' '
             : i < reveal ? text[i]
             : CHARS[(Math.random() * CHARS.length) | 0];
      }
      setText(out);
      raf = requestAnimationFrame(step);
    })();
  }

  const obs = new MutationObserver(() => {
    const t = (el.textContent || '').trim();
    if (!t || t === final) return;
    if (scrambling) { pending = t; setText(final); return; }  // queue it; keep the current run clean
    scramble(t);
  });
  obs.observe(el, { childList: true, characterData: true, subtree: true });

  // manual re-trigger always decodes toward the STORED title, never mid-flight garbage
  window.lifeFX = { scrambleTitle: () => { if (!scrambling) scramble(final); } };
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
    panel.querySelectorAll('.exercise, .reminder').forEach((c, i) => c.style.setProperty('--i', i % 10));
    panel.classList.remove('is-entering');
    void panel.offsetWidth;                         // reflow → restart the stagger
    panel.classList.add('is-entering');
    const head = document.querySelector('.view-head');
    if (head) {
      head.classList.remove('is-swap');
      void head.offsetWidth;
      head.classList.add('is-swap');                // replay the crimson rule sweep
    }
    // hyper-text: every entry re-decodes the title + the card titles
    window.lifeFX?.scrambleTitle?.();
    panel.querySelectorAll('.card__title').forEach((el, i) => {
      if (i < 14) window.lifeFX?.scrambleEl?.(el);
    });
  }
  new MutationObserver((muts) => {
    for (const m of muts) if (m.attributeName === 'data-view') reveal(body.getAttribute('data-view'));
  }).observe(body, { attributes: true, attributeFilter: ['data-view'] });
  // when the hub finishes fading out, the tab is finally visible — replay its entrance
  window.addEventListener('nv-intro-hidden', () => reveal(body.getAttribute('data-view')));
})();

/* ---------- generic hyper-text scrambler (any element, spaces preserved) ---------- */
(() => {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%&*';
  const live = new WeakSet();
  function scrambleEl(el) {
    if (!el || live.has(el)) return;
    const final = el.textContent;
    if (!final || !final.trim()) return;
    live.add(el);
    const dur = Math.max(14, Math.min(40, final.length * 2.4));
    let f = 0, done = false;
    const finish = () => {                   // guaranteed landing, even in background tabs
      if (done) return;
      done = true;
      clearTimeout(failsafe);
      el.textContent = final;
      live.delete(el);
    };
    const failsafe = setTimeout(finish, 1100);
    (function step() {
      if (done) return;
      f++;
      if (f > dur) { finish(); return; }
      const reveal = Math.floor((f / dur) * final.length);
      let out = '';
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        out += /\s/.test(ch) || ch === ' ' ? ch
             : i < reveal ? ch
             : CHARS[(Math.random() * CHARS.length) | 0];
      }
      el.textContent = out;
      requestAnimationFrame(step);
    })();
  }
  window.lifeFX = Object.assign(window.lifeFX || {}, {scrambleEl});

  // the hub decodes its lettering every time it opens (and at boot)
  window.addEventListener('nv-hub-open', () => {
    document.querySelectorAll('.intro__w, .intro-tab__name, .intro-tab__sub').forEach(scrambleEl);
  });
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
