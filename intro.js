/* ============================================================
   NATHAN VÉLEZ — SON OF GOD  ·  Cinematic Boot Intro
   Glowing wine-red cloud/portal field (canvas) → gothic title
   reveal → glass tab-cards rise. Click a tab (or ENTER) to
   pass through into the app. Pure vanilla, mobile-safe.
   ============================================================ */
(() => {
  'use strict';
  const intro = document.getElementById('intro');
  if (!intro) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = document.getElementById('introSky');
  const ctx = sky ? sky.getContext('2d') : null;
  let raf = null, running = true;

  /* ---------- soft glow sprite (pre-rendered for speed) ---------- */
  function sprite(rgb) {
    const s = 256, c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0,   `rgba(${rgb},0.9)`);
    grd.addColorStop(0.4, `rgba(${rgb},0.35)`);
    grd.addColorStop(1,   `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    return c;
  }
  const WINE = sprite('128,26,40');     // deep wine red — the body of the clouds
  const CRIM = sprite('210,28,58');     // surgical crimson — the portal core
  const ASH  = sprite('150,150,160');   // cool grey — highlight wisps

  /* ---------- drifting cloud puffs ---------- */
  let W = 0, H = 0, DPR = 1, puffs = [];
  function seed() {
    const n = window.innerWidth < 700 ? 22 : 34;
    puffs = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      const kind = r < 0.66 ? WINE : (r < 0.86 ? ASH : CRIM);
      puffs.push({
        x: Math.random() * W,
        y: H * 0.25 + Math.random() * H * 0.8,
        s: 220 + Math.random() * 520,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -(0.04 + Math.random() * 0.16),
        a: kind === ASH ? 0.05 + Math.random() * 0.06
                        : 0.07 + Math.random() * 0.16,
        img: kind,
      });
    }
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth || document.documentElement.clientWidth || 360;
    H = window.innerHeight || document.documentElement.clientHeight || 640;
    sky.width = Math.round(W * DPR);
    sky.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  let t = 0;
  function frame() {
    if (!running) return;
    if (!W || !H) resize();
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // the portal: a breathing crimson core low-center
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);
    drawImg(CRIM, W / 2, H * 0.52, 760 + pulse * 120, 0.18 + pulse * 0.10);
    drawImg(CRIM, W / 2, H * 0.52, 380 + pulse * 60, 0.16 + pulse * 0.10);

    for (const p of puffs) {
      p.x += p.vx; p.y += p.vy;
      if (p.y + p.s < 0) { p.y = H + p.s * 0.5; p.x = Math.random() * W; }
      if (p.x < -p.s) p.x = W + p.s; else if (p.x > W + p.s) p.x = -p.s;
      drawImg(p.img, p.x, p.y, p.s, p.a);
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }
  function drawImg(img, x, y, s, a) {
    ctx.globalAlpha = a;
    ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
    ctx.globalAlpha = 1;
  }

  /* ---------- enter a tab / re-open the hub ---------- */
  let dismissed = false;
  function stopCanvas() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
  function startCanvas() { if (reduce || !ctx) return; running = true; resize(); raf = requestAnimationFrame(frame); }

  function hide(targetTab) {
    if (dismissed) return;
    dismissed = true;
    if (targetTab) {
      const nav = document.querySelector(`[data-tab="${targetTab}"]`);
      if (nav) nav.click();
    }
    intro.classList.add('is-leaving');
    document.body.classList.remove('intro-locked');
    setTimeout(() => { intro.style.display = 'none'; stopCanvas(); }, 900);
  }

  function replay() {                              // restart the reveal animations
    const els = intro.querySelectorAll('.intro__eyebrow,.intro__w,.intro__sep,.intro__verse,.intro-tab,.intro__enter,.intro__tools');
    els.forEach((el) => { el.style.animation = 'none'; });
    void intro.offsetWidth;                        // force reflow
    els.forEach((el) => { el.style.animation = ''; });
  }

  function open() {                                // re-enter the hub (the "Hub" button)
    dismissed = false;
    intro.style.display = '';
    intro.classList.remove('is-leaving');
    document.body.classList.add('intro-locked');
    startCanvas();
    replay();
  }
  window.lifeHub = { open };

  /* ---------- wiring ---------- */
  intro.addEventListener('click', (e) => {
    const card = e.target.closest('[data-go]');
    if (card) { hide(card.getAttribute('data-go')); return; }
    if (e.target.closest('#introEnter')) hide(null);
  });
  const back = document.getElementById('hubBack');
  if (back) back.addEventListener('click', open);
  window.addEventListener('keydown', (e) => {
    if (dismissed) return;
    if (e.key === 'Enter' || e.key === 'Escape') hide(null);
  });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('load', resize, { passive: true });

  /* ---------- boot ---------- */
  document.body.classList.add('intro-locked');     // the hub is the home base + navigation
  if (reduce || !ctx) return;                      // static hub (no canvas), still navigable
  startCanvas();
  requestAnimationFrame(resize);                   // re-measure after first layout
})();
