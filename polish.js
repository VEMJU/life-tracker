/* ============================================================
   NATHAN VÉLEZ — SON OF GOD  ·  Polish (upgrade wave 1)
   Small, self-contained delights layered over the app without
   touching its core logic:

     · Spotlight — cards glow where the pointer is
     · Rolling numbers — stats count up when a tab opens
     · Decode titles — tab headers blur into focus on switch
     · Cascade — cards rise in one after another
     · Victory bursts — confetti when a goal completes
     · Clock — live time + date in every tab's header

   Everything hooks in via observers and event delegation, so
   app.js re-renders can never break it. Honors reduced-motion.
   ============================================================ */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const replayClass = (el, cls) => {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;                       // restart the animation
    el.classList.add(cls);
  };

  /* ── 1 · Spotlight: cards glow under the pointer, border ring ignites ── */
  let litCard = null;
  function unlight() {
    if (litCard) { litCard.classList.remove('nv-lit'); litCard = null; }
  }
  document.addEventListener('pointermove', (e) => {
    if (!e.target.closest) return;
    const card = e.target.closest('.card, .goal-card, .hub-card');
    if (!card) { unlight(); return; }
    const r = card.getBoundingClientRect();
    if (!r.width || !r.height) return;
    card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(2) + '%');
    card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(2) + '%');
    // The glowing border ring. Injected on demand so app re-renders
    // (which wipe card contents) heal themselves on the next move.
    if (!card.querySelector(':scope > .nv-spot')) {
      const s = document.createElement('i');
      s.className = 'nv-spot';
      s.setAttribute('aria-hidden', 'true');
      card.appendChild(s);
    }
    if (litCard !== card) { unlight(); litCard = card; card.classList.add('nv-lit'); }
  }, { passive: true });
  document.addEventListener('pointerdown', (e) => {
    // touch: light the card under the finger (no hover on phones)
    if (e.pointerType !== 'mouse' && e.target.closest) {
      const card = e.target.closest('.card, .goal-card, .hub-card');
      if (card && litCard !== card) { unlight(); litCard = card; card.classList.add('nv-lit'); }
    }
  }, { passive: true });
  document.addEventListener('pointercancel', unlight, { passive: true });
  document.addEventListener('pointerleave', unlight, { passive: true });

  /* ── 2 · Rolling numbers ── */
  const NUM_RE = /^\s*([$€]?)([\d][\d,]*)(?:\.(\d+))?\s*(%|kg|lb|lbs|oz)?\s*$/;
  function countUp(el) {
    if (reduce || el.children.length || el.__nvRolling) return;
    const m = NUM_RE.exec(el.textContent);
    if (!m) return;
    const target = parseFloat((m[2] + (m[3] ? '.' + m[3] : '')).replace(/,/g, ''));
    if (!isFinite(target) || target === 0) return;
    const dec = m[3] ? m[3].length : 0;
    const grouped = m[2].indexOf(',') !== -1;
    const pre = m[1] || '', suf = m[4] || '';
    const t0 = performance.now(), dur = 700;
    const fmt = (n) => {
      let v = n.toFixed(dec);
      if (grouped) v = Number(v).toLocaleString('en-US', { minimumFractionDigits: dec });
      return pre + v + suf;
    };
    el.__nvRolling = true;
    let done = false;
    const finish = () => {                       // always land on the true value,
      if (done) return;                          // even if animation frames stall
      done = true;
      el.textContent = fmt(target);
      el.__nvRolling = false;
    };
    requestAnimationFrame(function tick(now) {
      if (done) return;
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else finish();
    });
    setTimeout(finish, dur + 250);
  }
  const ROLL_SEL = '.card__count, [data-countup], [class*="__num"], [class*="total"]';
  function rollNumbers(scope) {
    if (!scope) return;
    scope.querySelectorAll(ROLL_SEL).forEach(countUp);
  }

  /* ── 3+4 · On tab switch: decode the header, cascade the cards ── */
  function cascade(panel) {
    if (reduce || !panel) return;
    const cards = panel.querySelectorAll('.card, .goal-card');
    let i = 0;
    cards.forEach((c) => {
      if (i > 14) return;                      // beyond that, appear instantly
      c.style.animationDelay = (i * 0.05).toFixed(2) + 's';
      replayClass(c, 'nv-rise');
      i++;
    });
    setTimeout(() => cards.forEach((c) => {
      c.classList.remove('nv-rise');
      c.style.animationDelay = '';
    }), 1500);
  }

  function onViewChange() {
    const view = document.body.dataset.view;
    replayClass(document.querySelector('.view-head__title'), 'nv-decode');
    replayClass(document.querySelector('.view-head__eyebrow'), 'nv-decode-sub');
    const panel = document.querySelector('[data-tab-panel="' + view + '"]');
    cascade(panel);
    setTimeout(() => rollNumbers(panel), 140);  // after the module renders
  }
  new MutationObserver(onViewChange)
    .observe(document.body, { attributes: true, attributeFilter: ['data-view'] });

  /* ── 5 · Victory burst: confetti when a goal turns complete ── */
  function burst(x, y) {
    if (reduce) return;
    const colors = ['#d21c3a', '#e8b04b', '#f2ede6', '#801a28'];
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      p.className = 'nv-confetti';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160;
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 120;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + (dy + 220).toFixed(0) + 'px)) rotate(' + ((Math.random() * 720 - 360) | 0) + 'deg)', opacity: 0 }
      ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.3,1)' })
        .onfinish = () => p.remove();
    }
  }
  let doneGoals = null;
  function watchGoals() {
    const panel = document.querySelector('[data-tab-panel="goals"]');
    if (!panel) return;
    new MutationObserver(() => {
      const now = new Set();
      panel.querySelectorAll('.goal-card.is-complete').forEach((g) => now.add(g.dataset.goal));
      if (doneGoals) {
        now.forEach((id) => {
          if (doneGoals.has(id)) return;
          const card = panel.querySelector('.goal-card[data-goal="' + id + '"]');
          if (card) {
            const r = card.getBoundingClientRect();
            burst(r.left + r.width / 2, r.top + r.height / 3);
          }
        });
      }
      doneGoals = now;
    }).observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  /* ── 6 · The clock: live time + date in every tab header ── */
  function initClock() {
    const head = document.querySelector('.view-head');
    if (!head || document.getElementById('nvClock')) return;
    const c = document.createElement('div');
    c.className = 'nv-clock';
    c.id = 'nvClock';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<span class="nv-clock__t"></span><span class="nv-clock__d"></span>';
    head.appendChild(c);
    const t = c.firstChild, d = c.lastChild;
    function paint() {
      const n = new Date();
      let h = n.getHours();
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const str = h + ':' + String(n.getMinutes()).padStart(2, '0') + ' ' + ap;
      if (t.textContent !== str) {
        t.textContent = str;
        if (!reduce) replayClass(t, 'nv-tick');
      }
      d.textContent = n.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    paint();
    setInterval(paint, 5000);
  }

  /* ── boot ── */
  initClock();
  watchGoals();
  // First entry into the app (the intro fading out) plays the works too.
  window.addEventListener('nv-intro-hidden', onViewChange);
})();
