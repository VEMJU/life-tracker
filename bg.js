/* ============================================================
   NATHAN VÉLEZ — SON OF GOD  ·  Living Backdrop
   Canvas: drifting cross-sigils (grey + surgical crimson) +
   faint dust particles, plus a crimson glow that trails the
   cursor. Pure vanilla, GPU-light, mobile-safe.
   ============================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('bgCanvas');
  const glow   = document.getElementById('cursorGlow');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  let W = 0, H = 0, DPR = 1;

  /* ---- colours ----------------------------------------------------------
     Both the plain crosses and the accented ones read from CSS, because the
     backdrop has to survive a theme that inverts the page. The neutral used to
     be a hardcoded white, which is invisible the moment the page IS white — so
     it comes from --x-grey now, and Daylight sets that to a soft slate.

     ALPHA MATTERS TOO, in the opposite direction: a pale mark on black needs
     more opacity to be seen, a dark mark on white needs less. --x-alpha scales
     every cross and speck in one number. */
  const css = (n, fb) => ((getComputedStyle(document.documentElement)
    .getPropertyValue(n) || '').trim() || fb);
  let GREY = '255,255,255', CRIMSON = '196,22,59', AMUL = 1;
  function readTheme() {
    GREY    = css('--x-grey', '255,255,255');
    CRIMSON = css('--accent-rgb', '196,22,59');
    AMUL    = parseFloat(css('--x-alpha', '1')) || 1;
  }
  readTheme();

  /* ---- the drifting crosses ---- */
  const COUNT = window.innerWidth < 700 ? 18 : 32;
  let crosses = [];

  function seedCrosses() {
    crosses = [];
    for (let i = 0; i < COUNT; i++) {
      const depth = Math.random();            // 0 = far/faint, 1 = near
      const crimson = Math.random() < 0.42;   // ~40% are surgical red
      crosses.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: 18 + depth * 78,
        rot: (Math.random() - 0.5) * 0.6,
        spin: (Math.random() - 0.5) * 0.0006,
        vy: -(0.06 + depth * 0.22),           // slow upward drift
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.002 + Math.random() * 0.004,
        swayAmp: 6 + depth * 16,
        baseX: 0,
        alpha: (crimson ? (0.07 + depth * 0.13) : (0.025 + depth * 0.07)) * AMUL,
        color: crimson ? CRIMSON : GREY,
      });
      crosses[i].baseX = crosses[i].x;
    }
  }

  /* ---- faint dust ---- */
  const DUST = window.innerWidth < 700 ? 22 : 44;
  let dust = [];
  function seedDust() {
    dust = [];
    for (let i = 0; i < DUST; i++) {
      dust.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.5 + Math.random() * 1.3,
        vy: -(0.05 + Math.random() * 0.18),
        a: (0.06 + Math.random() * 0.18) * AMUL,
      });
    }
  }

  function drawCross(c) {
    const s = c.size;
    const bw = s * 0.13;          // bar thickness
    const cw = s * 0.46;          // crossbar width
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = `rgba(${c.color},1)`;
    // vertical bar
    rr(-bw / 2, -s / 2, bw, s, bw * 0.4);
    // upper crossbar
    rr(-cw / 2, -s / 2 + s * 0.26, cw, bw, bw * 0.4);
    ctx.restore();
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seedCrosses();
    seedDust();
  }

  /* The theme can change while the app is open. Watch the attribute the
     switcher writes, re-read the colours, and re-seed — otherwise the
     backdrop keeps the palette it booted with until a reload. */
  new MutationObserver(() => {
    readTheme();
    if (W && H) { seedCrosses(); seedDust(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* THIRTY FRAMES, NOT SIXTY. Nothing here moves faster than a slow drift —
     a cross climbs a fifth of a pixel per frame — so half the frames are
     literally identical work. Halving the rate halves the cost of the one
     thing that runs the entire time the app is open, and you cannot see the
     difference. */
  let t = 0, lastPaint = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (now - lastPaint < 32) return;
    lastPaint = now;
    t += 1;
    ctx.clearRect(0, 0, W, H);

    // dust
    for (const d of dust) {
      d.y += d.vy;
      if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; }
      ctx.globalAlpha = d.a;
      ctx.fillStyle = `rgba(${GREY},1)`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // crosses
    for (const c of crosses) {
      c.y += c.vy;
      c.sway += c.swaySpeed;
      c.x = c.baseX + Math.sin(c.sway) * c.swayAmp;
      c.rot += c.spin;
      if (c.y + c.size < -10) {
        c.y = H + c.size;
        c.baseX = Math.random() * W;
      }
      drawCross(c);
    }
    ctx.globalAlpha = 1;
  }

  /* ---- cursor-trailing crimson glow ---- */
  if (glow && !reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let gx = tx, gy = ty, on = false;
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; glow.classList.add('is-on'); }
    }, { passive: true });
    /* The glow used to chase the cursor forever, at sixty frames a second,
       whether or not the pointer had moved in the last ten minutes. It now
       runs only while it still has ground to cover and parks itself once it
       has caught up — a loop that costs nothing when nothing is happening. */
    let glowRaf = null;
    function glowLoop() {
      const dx = tx - gx, dy = ty - gy;
      gx += dx * 0.12;
      gy += dy * 0.12;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) { glowRaf = null; return; }
      glowRaf = requestAnimationFrame(glowLoop);
    }
    const kickGlow = () => { if (!glowRaf) glowRaf = requestAnimationFrame(glowLoop); };
    window.addEventListener('pointermove', kickGlow, { passive: true });
    kickGlow();
  }

  let raf;
  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (reduceMotion) {
    // single static paint, no animation
    ctx.clearRect(0, 0, W, H);
    for (const c of crosses) drawCross(c);
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
