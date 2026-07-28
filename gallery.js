/* ============================================================
   NATHAN VÉLEZ — SON OF GOD  ·  Hub Gallery
   The tab cards, reborn as a circular 3D ring of images.
   Drag / swipe / scroll sideways to spin it; it slowly turns on
   its own when idle. Click a card to enter that tab (the intro's
   existing data-go handler does the navigating).

   Customize mode: every card's image, title and subtitle can be
   overridden per account. Overrides live in nv.hub.gallery, which
   syncs like everything else — set a photo on your laptop, see it
   on your phone.
   ============================================================ */
(() => {
  'use strict';

  const stage = document.getElementById('hubStage');
  const ring  = document.getElementById('hubRing');
  if (!stage || !ring) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"']/g,
    (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- the ten tabs and their default look ---------- */
  const U = (id) => `https://images.unsplash.com/${id}?w=900&auto=format&fit=crop&q=80`;
  const TABS = [
    { go:'home',      n:'00', name:'Home',      sub:'Command Center',    img:U('photo-1451187580459-43490279c0fa') },
    { go:'gym',       n:'01', name:'Gym',       sub:'Temple of the Body',img:U('photo-1534438327276-14e5300c3a48') },
    { go:'nutrition', n:'02', name:'Nutrition', sub:'Fuel & Form',       img:U('photo-1490645935967-10de6ba17061') },
    { go:'supplements', n:'02b', name:'Supplements', sub:'The Stack',    img:U('photo-1584308666744-24d5c474f2ae') },
    { go:'subscriptions', n:'03b', name:'Subscriptions', sub:'The Radar', img:U('photo-1554224155-6726b3ff858f') },
    { go:'vitals',    n:'01b', name:'Vitals',    sub:'Recovery & Sleep',  img:U('photo-1544367567-0f2fcb009e0b') },
    { go:'peak',      n:'01c', name:'Peak',      sub:'Your Energy Curve', img:U('photo-1495364141860-b0d03eccd065') },
    { go:'map',       n:'09b', name:'Map',       sub:'Where You Have To Be', img:U('photo-1524661135-423995f22d0b') },
    { go:'stocks',    n:'03c', name:'Stocks',    sub:'Is This Still Good', img:U('photo-1611974789855-9c2a0a7236a3') },
    { go:'finance',   n:'03', name:'Finance',   sub:'The Vault',         img:U('photo-1553729459-efe14ef6055d') },
    { go:'academics', n:'04', name:'Academics', sub:'College Prep',      img:U('photo-1456513080510-7bf3a84b82f8') },
    { go:'goals',     n:'05', name:'Goals',     sub:'The Oath',          img:U('photo-1519681393784-d120267933ba') },
    { go:'logs',      n:'06', name:'Logs',      sub:'The Ledger',        img:U('photo-1517842645767-c639042777db') },
    { go:'clothes',   n:'07', name:'Clothes',   sub:'The Wardrobe',      img:U('photo-1489987707025-afc232f7ea0f') },
    { go:'sports',    n:'08', name:'Sports',    sub:'The Arena',         img:U('photo-1546519638-68e109498ffc') },
    { go:'calendar',  n:'09', name:'Calendar',  sub:'The Chronicle',     img:U('photo-1506784983877-45594efa4cbe') },
  ];

  const KEY = 'nv.hub.gallery';
  const overrides = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  };
  const conf = (t) => {
    const o = overrides()[t.go] || {};
    return { go: t.go, n: t.n, name: o.name || t.name, sub: o.sub || t.sub, img: o.img || t.img };
  };

  /* ---------- geometry ---------- */
  let rotation = 0, radius = 520, cardW = 280, cardH = 373;
  const STEP = 360 / TABS.length;

  function metrics() {
    cardW = window.innerWidth < 700 ? 190 : 280;
    // The front card is magnified by the 3D perspective (2000px). Shrink
    // until its *projected* height fits the stage, so cards never spill
    // over the title above.
    const stageH = stage.clientHeight || 380;
    for (let k = 0; k < 3; k++) {
      cardH = Math.round(cardW * 4 / 3);
      radius = Math.round((cardW + 44) * TABS.length / (2 * Math.PI));
      const scale = 2000 / Math.max(2000 - radius, 500);
      const need = cardH * scale;
      const avail = stageH - 10;
      if (need > avail) cardW = Math.floor(cardW * avail / need);
    }
    cardH = Math.round(cardW * 4 / 3);
    radius = Math.round((cardW + 44) * TABS.length / (2 * Math.PI));
  }

  function build() {
    metrics();
    ring.innerHTML = '';
    TABS.forEach((t, i) => {
      const c = conf(t);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hub-card';
      b.dataset.go = c.go;
      b.setAttribute('aria-label', c.name);
      b.style.width = cardW + 'px';
      b.style.height = cardH + 'px';
      b.style.marginLeft = (-cardW / 2) + 'px';
      b.style.marginTop = (-cardH / 2) + 'px';
      b.style.transform = `rotateY(${i * STEP}deg) translateZ(${radius}px)`;
      b.style.animationDelay = (0.9 + i * 0.09).toFixed(2) + 's';   // rise as the curtain finishes parting
      b.innerHTML = `
        <img src="${esc(c.img)}" alt="" loading="lazy" draggable="false"
             onerror="this.remove()">
        <span class="hub-card__cap">
          <span class="intro-tab__n">${esc(c.n)}</span>
          <span class="intro-tab__name">${esc(c.name)}</span>
          <span class="intro-tab__sub">${esc(c.sub)}</span>
        </span>`;
      ring.appendChild(b);
    });
    paint();
  }

  function paint() {
    ring.style.transform = `rotateY(${rotation}deg)`;
    const kids = ring.children;
    for (let i = 0; i < kids.length; i++) {
      const rel = ((i * STEP + rotation) % 360 + 360) % 360;
      const norm = Math.abs(rel > 180 ? 360 - rel : rel);
      kids[i].style.opacity = Math.max(0.25, 1 - norm / 180).toFixed(3);
    }
  }

  /* ---------- spin: drag / swipe / sideways scroll + idle auto-rotate ---------- */
  let editing = false;             // customize mode (wired further down); the loop reads it
  let auto = true, autoTimer = null;
  const SPEED = 0.05;
  function pause() {
    auto = false;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => { auto = true; }, 1800);
  }

  /* Settle the ring so a card always ends up front and center. */
  let snapping = false, snapTarget = 0;
  function snapTo(idx) {
    snapTarget = idx * STEP;
    snapping = true;
    pause();
  }

  let wheelSnap = null;
  stage.addEventListener('wheel', (e) => {
    // Only sideways scrolling spins the ring — vertical scrolling passes through untouched.
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    e.preventDefault();
    snapping = false;
    rotation += e.deltaX * 0.12;
    clearTimeout(wheelSnap);
    wheelSnap = setTimeout(() => snapTo(Math.round(rotation / STEP)), 260);
    pause(); paint();
  }, { passive: false });

  /* Drag / swipe. The stage owns its touches (touch-action: none), so the
     browser can never steal a slightly-diagonal swipe for scrolling — that
     was what made the ring feel stuck on phones. The first real movement
     picks an axis: sideways spins the ring, vertical scrolls the page. */
  const introEl = stage.closest('.intro');
  let dragging = false, lastX = 0, lastY = 0, lastT = 0;
  let moved = 0, movedY = 0, axis = null, vel = 0, justDragged = false;
  const K = () => (window.innerWidth < 700 ? 0.42 : 0.25);   // finger travel → degrees

  stage.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; movedY = 0; axis = null; vel = 0;
    lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp;
    snapping = false;
    pause();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dx); movedY += Math.abs(dy);
    if (!axis && moved + movedY > 8) {
      axis = moved >= movedY ? 'spin' : 'scroll';
      // Capture only once a real spin starts — capturing on pointerdown
      // retargets the eventual click to the stage and kills card navigation.
      if (axis === 'spin') { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
    }
    if (axis === 'scroll') { if (introEl) introEl.scrollTop -= dy; return; }
    if (axis !== 'spin') return;
    const dt = Math.max(1, e.timeStamp - lastT); lastT = e.timeStamp;
    vel = 0.8 * vel + 0.2 * (dx / dt);                       // px/ms, smoothed
    rotation += dx * K();
    pause(); paint();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    if ((axis === 'spin' && moved > 8) || (axis === 'scroll' && movedY > 8)) {
      justDragged = true;
      setTimeout(() => { justDragged = false; }, 250);
    }
    if (axis === 'spin' && moved > 8) {
      // A flick jumps straight to the next card in that direction;
      // a slow release settles on whichever card is nearest.
      if (Math.abs(vel) > 0.35) {
        snapTo(vel > 0 ? Math.floor(rotation / STEP) + 1 : Math.ceil(rotation / STEP) - 1);
      } else {
        snapTo(Math.round(rotation / STEP));
      }
    }
    axis = null;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  (function loop() {
    if (snapping) {
      const d = snapTarget - rotation;
      if (Math.abs(d) < 0.06) { rotation = snapTarget; snapping = false; }
      else rotation += d * 0.14;
      paint();
    } else if (auto && !reduce && !editing) { rotation += SPEED; paint(); }
    requestAnimationFrame(loop);
  })();

  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(build, 180);
  }, { passive: true });

  /* ---------- entrance: cards rise into the ring when the hub opens ---------- */
  let riseT = null;
  function rise() {
    if (reduce) return;
    ring.classList.remove('is-rising');
    void ring.offsetWidth;                    // restart the animation
    ring.classList.add('is-rising');
    clearTimeout(riseT);
    riseT = setTimeout(() => ring.classList.remove('is-rising'), 3200);
  }
  window.addEventListener('nv-hub-open', rise);

  /* ---------- customize mode ---------- */
  let edTab = null;
  const editBtn = document.getElementById('hubCustomize');
  const ed      = document.getElementById('hubEditor');
  const edLabel = document.getElementById('gedTab');
  const edName  = document.getElementById('gedName');
  const edSub   = document.getElementById('gedSub');
  const edImg   = document.getElementById('gedImg');

  function setEditing(on) {
    editing = on;
    stage.classList.toggle('is-editing', on);
    if (editBtn) editBtn.classList.toggle('is-on', on);
    if (!on && ed) ed.hidden = true;
  }

  function openEditor(go) {
    const t = TABS.find((x) => x.go === go);
    if (!t || !ed) return;
    edTab = go;
    const c = conf(t);
    edLabel.textContent = c.n + ' · ' + t.name;
    edName.value = c.name;
    edSub.value = c.sub;
    edImg.value = c.img;
    ed.hidden = false;
    edName.focus();
  }

  function saveEditor() {
    if (!edTab) return;
    const t = TABS.find((x) => x.go === edTab);
    const o = overrides();
    const entry = {};
    const name = edName.value.trim(), sub = edSub.value.trim(), img = edImg.value.trim();
    if (name && name !== t.name) entry.name = name;
    if (sub && sub !== t.sub) entry.sub = sub;
    if (img && img !== t.img) entry.img = img;
    if (Object.keys(entry).length) o[edTab] = entry;
    else delete o[edTab];
    localStorage.setItem(KEY, JSON.stringify(o));   // synced to the account
    ed.hidden = true;
    build();
  }

  function resetEditor() {
    if (!edTab) return;
    const o = overrides();
    delete o[edTab];
    localStorage.setItem(KEY, JSON.stringify(o));
    ed.hidden = true;
    build();
  }

  if (editBtn) editBtn.addEventListener('click', () => setEditing(!editing));
  if (ed) {
    // Keep keystrokes inside the editor: the intro closes on Enter/Escape otherwise.
    ed.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); saveEditor(); }
      if (e.key === 'Escape') ed.hidden = true;
    });
    document.getElementById('gedSave').addEventListener('click', saveEditor);
    document.getElementById('gedReset').addEventListener('click', resetEditor);
    document.getElementById('gedCancel').addEventListener('click', () => { ed.hidden = true; });
  }

  // Capture-phase click: swallow post-drag clicks, and reroute clicks to the
  // editor while customizing — otherwise the intro's own handler navigates.
  stage.addEventListener('click', (e) => {
    if (justDragged) { e.preventDefault(); e.stopPropagation(); return; }
    if (editing) {
      e.preventDefault(); e.stopPropagation();
      const card = e.target.closest('.hub-card');
      if (card) openEditor(card.dataset.go);
    }
  }, true);

  /* ---------- boot ---------- */
  build();
  // After login the cloud pull may bring this account's card overrides.
  window.addEventListener('nv-data-ready', build);
})();
