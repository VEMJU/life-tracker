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

  stage.addEventListener('wheel', (e) => {
    // Only sideways scrolling spins the ring — vertical scrolling passes through untouched.
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    e.preventDefault();
    rotation += e.deltaX * 0.12;
    pause(); paint();
  }, { passive: false });

  let dragging = false, lastX = 0, moved = 0, justDragged = false;
  stage.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; lastX = e.clientX;
    pause();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    // Capture only after a real drag starts — capturing on pointerdown
    // retargets the eventual click to the stage and kills card navigation.
    if (moved > 6) { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
    rotation += dx * 0.25;
    pause(); paint();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    if (moved > 8) {
      justDragged = true;
      setTimeout(() => { justDragged = false; }, 250);
    }
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  (function loop() {
    if (auto && !reduce && !editing) { rotation += SPEED; paint(); }
    requestAnimationFrame(loop);
  })();

  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(build, 180);
  }, { passive: true });

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
