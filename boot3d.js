/* ============================================================================
   THE STAGE — a 3D boot screen that sits in front of the hub.

   Scope, decided deliberately and kept small: one object on a black stage, a
   three-light rig, forge sparks, a slow turn, a tilt that follows the pointer,
   and a way in. No scroll choreography, no text slides, no full-screen shader.
   Those belong to a landing page; this is a door you look at for four seconds.

   THE ORDER IS: stage → Enter → the existing hub → tabs. Nothing the hub does
   is lost; this arrives in front of it.

   DESKTOP ONLY, on purpose. A WebGL scene with shadow maps and 450 additive
   particles is the wrong thing to hand a phone, and the phone already has a
   perfectly good hub to boot into.

   THE CROSS IS BUILT IN CODE, not downloaded. An Orthodox cross is four beams
   and a bevel — geometry I can write — and writing it means no licence to
   verify, nothing to download, and a REAL gold material rather than a
   photograph of one. The figure is a different matter: that has to be a model.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const HOST   = document.getElementById('stage');
const CANVAS = document.getElementById('stageCanvas');

/* ── THE GATE, DECIDED UP FRONT ───────────────────────────────────────────
   Phones, reduced-motion, no WebGL, or already seen this session → the stage
   never runs at all. Nothing is built and then thrown away.

   The answer is published on window immediately, because intro.js has to know
   whether to open the hub itself or wait for the stage to hand over. Two
   things both opening on sign-in is the one failure this must not have. */
/* Three names, because browsers disagree, and one option that matters:
   failIfMajorPerformanceCaveat defaults to false but some setups still refuse
   a context without it stated. If ALL of these come back null the machine
   genuinely has no WebGL — almost always because hardware acceleration is
   switched off in the browser, not because the hardware cannot do it. */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const opts = { failIfMajorPerformanceCaveat: false };
    return !!(c.getContext('webgl2', opts)
           || c.getContext('webgl', opts)
           || c.getContext('experimental-webgl', opts));
  } catch (e) { return false; }
}

/* Each check reports WHY it said no. A boot screen that silently declines to
   appear is impossible to debug from the outside — and "I don't see it" was
   exactly the report this had to answer. Run nvStage() in the console. */
const FORCE = new URLSearchParams(location.search).get('stage');
const checks = {
  markup:  !!(HOST && CANVAS),
  webgl:   hasWebGL(),
  motion:  !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  /* WIDTH ONLY, plus genuinely hover-less devices. The first version also
     rejected `pointer: coarse`, which is true on any touchscreen laptop — so a
     desktop with a touch monitor was quietly refused. */
  desktop: !window.matchMedia('(max-width: 900px)').matches
           && !window.matchMedia('(hover: none)').matches,
  unseen:  sessionStorage.getItem('nv.stage.seen') !== '1',
};

const ARMED = FORCE === '1'
  ? (checks.markup && checks.webgl)
  : FORCE === '0' ? false
  : Object.values(checks).every(Boolean);

window.lifeStage = {
  armed: ARMED,
  checks,
  why() {
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    let msg;
    if (ARMED) msg = 'Stage is armed — it opens on sign-in.';
    else if (!checks.webgl) {
      /* WebGL is the one failure no flag can override, so it gets the fix
         rather than a shrug. It is nearly always the browser setting, not the
         machine. */
      msg = 'Stage skipped: this browser reports NO WEBGL, so the 3D scene cannot run.\n\n'
          + 'Check chrome://gpu — if WebGL says Disabled or Software only, that is it.\n'
          + 'Fix: Chrome ⋮ → Settings → System → "Use graphics acceleration when '
          + 'available" → Relaunch.\n\n'
          + '?stage=1 cannot help here — forcing it would only throw.';
    } else {
      msg = 'Stage skipped. Failed: ' + (failed.join(', ') || 'forced off')
          + '\nAdd ?stage=1 to the URL to force it on.';
    }
    console.log(msg, checks);
    return msg;
  },
};
window.nvStage = () => window.lifeStage.why();

/* The stage arrives AFTER sign-in, in the same beat the hub used to. */
if (ARMED) window.addEventListener('nv-data-ready', () => boot(), { once: true });

function boot() {
  /* Anything that throws in here must not take the app with it — the stage is
     a nicety in front of a working hub, and it has to fail toward the hub. */
  try { build(); }
  catch (err) {
    console.error('[stage] failed to build, handing over to the hub:', err);
    HOST.hidden = true;
    document.body.classList.remove('stage-locked');
    if (window.lifeHub && window.lifeHub.open) window.lifeHub.open();
  }
}

function build() {
  HOST.hidden = false;
  document.body.classList.add('stage-locked');

  /* ── state ──────────────────────────────────────────────────────────── */
  const sizes = { w: window.innerWidth, h: window.innerHeight };
  let scene, camera, renderer, pivot, sparks, raf;
  let mouseX = 0, mouseY = 0, tMouseX = 0, tMouseY = 0;
  const clock = new THREE.Clock();
  const sparkData = [];
  let SPARKS = 260;              // trimmed once already; the monitor can halve it again

  let cross = null, figure = null;
  let which = 'cross';
  try { which = JSON.parse(localStorage.getItem('nv.stage.model')) || 'cross'; } catch (e) {}

  /* ── scene, camera, renderer ────────────────────────────────────────── */
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  scene.fog = new THREE.FogExp2('#000000', 0.055);

  camera = new THREE.PerspectiveCamera(42, sizes.w / sizes.h, 0.1, 60);
  camera.position.set(0, 0.25, 5.2);

  renderer = new THREE.WebGLRenderer({ canvas: CANVAS, antialias: true, alpha: false });
  renderer.setSize(sizes.w, sizes.h);
  /* PIXEL RATIO IS THE MOST EXPENSIVE NUMBER HERE. At 2 on a high-DPI screen
     the GPU shades FOUR times as many pixels as at 1 — and on a boot screen
     with one object on black, almost none of that is visible. 1.5 is the
     honest ceiling; the quality monitor below can take it lower. */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;

  /* ── THE THING THAT MAKES METAL LOOK LIKE METAL ──────────────────────
     Gold is not a colour, it is a reflection. A metallic surface with nothing
     around it to reflect renders as flat grey plastic no matter how the
     roughness is tuned — which is why coded metal usually looks cheap.

     So the scene is given something to see: a small gradient sky, cooked into
     a cube map once at boot. It costs one frame, needs no HDRI download, and
     is the single biggest reason the cross below reads as gold. */
  function makeEnvironment() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0.00, '#0b1220');   // cold sky above
    grd.addColorStop(0.42, '#6f6252');   // warm horizon — the light gold catches
    grd.addColorStop(0.52, '#c9a978');
    grd.addColorStop(0.70, '#241b13');
    grd.addColorStop(1.00, '#000000');   // dark floor below
    g.fillStyle = grd; g.fillRect(0, 0, 64, 256);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose(); pmrem.dispose();
    return env;
  }
  scene.environment = makeEnvironment();

  /* ── the light rig ──────────────────────────────────────────────────
     Chiaroscuro: one hard key from high right, a cold rim from behind left to
     cut the silhouette out of the black, and a whisper of warm fill from below
     so the shadow side is not a hole. */
  scene.add(new THREE.AmbientLight('#ffffff', 0.08));

  const key = new THREE.SpotLight('#fff6ea', 26, 0, Math.PI / 4, 0.9, 1.2);
  key.position.set(4, 6, 3.4);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);        // one object in a black room does not need more
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 18;
  key.shadow.bias = -0.0015;
  scene.add(key);

  const rim = new THREE.DirectionalLight('#cfe6ff', 5.5);
  rim.position.set(-5, 2.5, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight('#ffdcb0', 0.7);
  fill.position.set(-2.4, -3.2, 2.5);
  scene.add(fill);

  pivot = new THREE.Group();
  scene.add(pivot);

  /* ══════════════════════════════════════════════════════════════════════
     THE RUSSIAN ORTHODOX CROSS, IN CODE

     Eight points: the vertical beam, the short title board at the top, the
     main crossbar, and the slanted footrest. Every beam is an extruded
     rounded rectangle with a BEVEL — and the bevel is the whole trick. A flat
     box has one flat face per side and reads as cardboard; a bevelled edge
     gives the light a narrow rim to run along as the object turns, which is
     what the eye reads as "solid metal".

     Each beam also carries an inset panel a hair proud of the face, so it
     reads as worked metal rather than a slab.
     ═══════════════════════════════════════════════════════════════════════ */
  const GOLD = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#caa14a'),
    metalness: 1.0,
    roughness: 0.26,              // polished, but not a mirror — a mirror reads as chrome
    envMapIntensity: 1.35,
  });

  /* the recessed panels sit duller and darker, which is what makes the eye
     read them as recessed rather than as a differently coloured sticker */
  const GOLD_DEEP = GOLD.clone();
  GOLD_DEEP.color = new THREE.Color('#8a6a2c');
  GOLD_DEEP.roughness = 0.42;

  function roundedBar(w, h, d, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);         s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);     s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);         s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);             s.quadraticCurveTo(x, y, x + r, y);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: d, bevelEnabled: true,
      bevelThickness: d * 0.16, bevelSize: d * 0.14, bevelSegments: 3, curveSegments: 6,
    });
    geo.center();
    return geo;
  }

  function beam(w, h, d, r, panel) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(roundedBar(w, h, d, r), GOLD);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    if (panel) {
      /* the inset: a smaller, duller bar standing a whisker proud of each face */
      const pw = w - d * 1.5, ph = h - d * 1.5;
      if (pw > 0.01 && ph > 0.01) {
        [-1, 1].forEach(side => {
          const p = new THREE.Mesh(roundedBar(pw, ph, d * 0.22, r * 0.6), GOLD_DEEP);
          p.position.z = side * (d * 0.5);
          p.castShadow = true;
          g.add(p);
        });
      }
    }
    return g;
  }

  function buildCross() {
    const g = new THREE.Group();
    const D = 0.17;                       // beam depth, shared so joints read as one object

    const stem = beam(0.30, 3.30, D, 0.05, true);          g.add(stem);
    const title = beam(0.92, 0.24, D, 0.05, false);         title.position.y =  1.16;  g.add(title);
    const main  = beam(1.86, 0.34, D, 0.06, true);          main.position.y  =  0.44;  g.add(main);

    const foot = beam(1.06, 0.22, D, 0.05, false);
    foot.position.y = -0.92;
    foot.rotation.z = THREE.MathUtils.degToRad(18);         // the slant, raised to Christ's right
    g.add(foot);

    return g;
  }

  cross = buildCross();
  pivot.add(cross);

  /* ── the figure, if the file is there ──────────────────────────────────
     Loaded lazily and silently: if the model is missing the stage simply keeps
     the cross, and the toggle hides itself. A boot screen must never be able
     to fail closed. */
  /* LOADED ON DEMAND, NOT AT BOOT. 5.5MB in the critical path of a screen you
     look at for four seconds is the wrong trade — especially when the cross is
     the default and most sessions never ask for the figure at all. The toggle
     is shown immediately; the file is fetched the first time it is pressed. */
  const FIGURE_URL = 'models/christ.glb';
  let figureRequested = false;
  function loadFigure() {
    if (figureRequested) return;
    figureRequested = true;
    HOST.classList.add('is-loading');
    new GLTFLoader().load(FIGURE_URL, (gltf) => {
      HOST.classList.remove('is-loading');
      figure = gltf.scene;
      figure.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        if (o.material) { o.material.envMapIntensity = 0.9; o.material.needsUpdate = true; }
      });
      /* scale so the tallest dimension is 3.4 units, then recentre on the pivot */
      const box = new THREE.Box3().setFromObject(figure);
      const size = box.getSize(new THREE.Vector3());
      const max = Math.max(size.x, size.y, size.z) || 1;
      figure.scale.setScalar(3.4 / max);
      figure.updateMatrixWorld(true);
      const c = new THREE.Box3().setFromObject(figure).getCenter(new THREE.Vector3());
      figure.position.sub(c);
      figure.visible = false;
      pivot.add(figure);
      applyWhich();
    }, undefined, (err) => {
      /* SAY SO. An earlier version swallowed this, so a model that downloaded
         fine and then failed to DECODE looked identical to no model at all. */
      HOST.classList.remove('is-loading');
      figureRequested = false;            // allow a retry
      which = 'cross'; applyWhich();
      console.warn('[stage] figure did not load — showing the cross alone.', err);
    });
  }

  /* The toggle is live from the first frame; the 5.5MB is not fetched until it
     is actually pressed. Most sessions never leave the cross. */
  { const t = document.querySelector('[data-stage-toggle]'); if (t) t.hidden = false; }
  if (which === 'figure') loadFigure();

  function applyWhich() {
    if (cross)  cross.visible  = which !== 'figure';
    if (figure) figure.visible = which === 'figure';
    document.querySelectorAll('[data-stage-pick]').forEach(b =>
      b.classList.toggle('is-on', b.getAttribute('data-stage-pick') === which));
    /* the credit belongs to the model, so it comes and goes with it */
    const credit = document.querySelector('[data-stage-credit]');
    if (credit) credit.hidden = !(figure && which === 'figure');
  }
  applyWhich();

  /* ── forge sparks ───────────────────────────────────────────────────── */
  function sparkTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    grd.addColorStop(0,    'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.85)');
    grd.addColorStop(0.6,  'rgba(255,255,255,.3)');
    grd.addColorStop(1,    'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(c);
  }

  (function makeSparks() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(SPARKS * 3);
    const col = new Float32Array(SPARKS * 3);
    for (let i = 0; i < SPARKS; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 6.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.0 - 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
      if (Math.random() < 0.62) {                 // embers
        col[i * 3] = 1.0;
        col[i * 3 + 1] = 0.42 + Math.random() * 0.16;
        col[i * 3 + 2] = 0.06 + Math.random() * 0.1;
      } else {                                    // cold motes, matching the rim light
        col[i * 3] = 0.56 + Math.random() * 0.15;
        col[i * 3 + 1] = 0.82 + Math.random() * 0.12;
        col[i * 3 + 2] = 1.0;
      }
      sparkData.push({
        vx: (Math.random() - 0.5) * 0.34,
        vy: 0.13 + Math.random() * 0.26,
        vz: (Math.random() - 0.5) * 0.34,
        sway: 0.5 + Math.random() * 1.5,
        amp: 0.05 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
      });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    sparks = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.026, vertexColors: true, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, map: sparkTexture(),
    }));
    scene.add(sparks);
  })();

  /* ── input ──────────────────────────────────────────────────────────── */
  window.addEventListener('pointermove', (e) => {
    tMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    tMouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ── TAKE HOLD OF IT ─────────────────────────────────────────────────
     Grab and turn. Not OrbitControls — that brings zoom and pan, which would
     fight the Enter button and let you lose the object off the side of a
     screen you are only meant to glance at.

     Release carries momentum, and the momentum decays back into the constant
     slow turn rather than stopping dead. Something with weight does not halt
     the instant you let go of it. */
  let dragging = false, lastX = 0, lastY = 0;
  let spinV = 0, tiltV = 0;
  const AUTO = 0.18;                  // radians/sec, the idle turn
  let autoBlend = 1;                  // 1 = idle turn, 0 = wholly yours

  CANVAS.addEventListener('pointerdown', (e) => {
    dragging = true;
    autoBlend = 0;
    lastX = e.clientX; lastY = e.clientY;
    spinV = tiltV = 0;
    CANVAS.setPointerCapture(e.pointerId);
    HOST.classList.add('is-grabbing');
  });

  CANVAS.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    spinV = dx * 0.006;
    tiltV = dy * 0.004;
    pivot.rotation.y += spinV;
    /* clamped: past a right angle you are looking at the top of its head, and
       there is nothing there */
    pivot.rotation.x = THREE.MathUtils.clamp(pivot.rotation.x + tiltV, -0.75, 0.75);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try { CANVAS.releasePointerCapture(e.pointerId); } catch (err) {}
    HOST.classList.remove('is-grabbing');
  };
  CANVAS.addEventListener('pointerup', endDrag);
  CANVAS.addEventListener('pointercancel', endDrag);
  CANVAS.addEventListener('pointerleave', endDrag);

  window.addEventListener('resize', () => {
    sizes.w = window.innerWidth; sizes.h = window.innerHeight;
    camera.aspect = sizes.w / sizes.h;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.w, sizes.h);
  }, { passive: true });

  /* ── the loop ───────────────────────────────────────────────────────── */
  /* ── THE QUALITY MONITOR ─────────────────────────────────────────────
     I cannot see your graphics card, and guessing at it produces a scene that
     is either ugly on good hardware or unusable on modest hardware. So the
     scene measures itself: sixty frames of honest timing, and if it is not
     holding up it sheds the expensive things in the order they cost the most —
     resolution first, then shadows, then half the sparks.

     It steps DOWN only. A scene that oscillates between settings is worse than
     one that is simply a little plainer. */
  let samples = [], tuned = false;
  function judge(dt) {
    if (tuned) return;
    samples.push(dt);
    if (samples.length < 60) return;
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    tuned = true;
    if (avg < 0.024) return;                 // ~42fps or better: leave it alone

    renderer.setPixelRatio(1);
    if (avg > 0.034) {                       // under ~30fps: shed the rest
      renderer.shadowMap.enabled = false;
      key.castShadow = false;
      if (sparks) sparks.material.size = 0.02;
      const attr = sparks && sparks.geometry.attributes.position;
      if (attr) { SPARKS = Math.floor(SPARKS / 2); sparks.geometry.setDrawRange(0, SPARKS); }
    }
    console.info('[stage] tuned for this machine — avg frame ' +
      (avg * 1000).toFixed(1) + 'ms', { pixelRatio: renderer.getPixelRatio(),
      shadows: renderer.shadowMap.enabled, sparks: SPARKS });
  }

  let last = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (now - last < 16) return;               // desktop only, so 60 is affordable
    const dt = Math.min(clock.getDelta(), 0.05);
    last = now;

    mouseX += (tMouseX - mouseX) * 0.05;
    mouseY += (tMouseY - mouseY) * 0.05;

    /* While you are holding it, it is yours and nothing else touches it.
       On release your throw carries, decaying, and the idle turn creeps back
       underneath — something with weight does not stop the instant you let go. */
    if (!dragging) {
      pivot.rotation.y += spinV;
      spinV *= 0.94;
      autoBlend = Math.min(1, autoBlend + dt * 0.35);
      pivot.rotation.y += AUTO * dt * autoBlend;
      /* the tilt only eases home once you have stopped throwing it */
      if (Math.abs(spinV) < 0.002) {
        pivot.rotation.x += (mouseY * 0.14 - pivot.rotation.x) * 0.02;
      }
    }
    pivot.position.x = mouseX * 0.12;

    if (sparks) {
      const p = sparks.geometry.attributes.position.array;
      const t = clock.getElapsedTime();
      for (let i = 0; i < SPARKS; i++) {
        const k = i * 3, d = sparkData[i];
        p[k]     += d.vx * dt;
        p[k + 1] += d.vy * dt;
        p[k + 2] += d.vz * dt;
        p[k]     += Math.sin(t * d.sway + d.phase) * d.amp * dt;
        p[k + 2] += Math.cos(t * d.sway + d.phase) * d.amp * dt;
        if (p[k + 1] > 3.0 || Math.abs(p[k]) > 3.5 || Math.abs(p[k + 2]) > 3.5) {
          p[k + 1] = -2.5;
          p[k]     = (Math.random() - 0.5) * 3.0;
          p[k + 2] = (Math.random() - 0.5) * 3.0;
        }
      }
      sparks.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  /* ── the way in ─────────────────────────────────────────────────────── */
  HOST.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-stage-pick]');
    if (pick) {
      which = pick.getAttribute('data-stage-pick');
      /* JSON, because sync.js mirrors every nv.* key to the cloud and parses
         it as JSON on the way. A bare string threw on every single sync. */
      localStorage.setItem('nv.stage.model', JSON.stringify(which));
      if (which === 'figure' && !figure) loadFigure();
      applyWhich();
      return;
    }
    if (e.target.closest('[data-stage-enter]')) enter();
  });
  window.addEventListener('keydown', (e) => {
    if (HOST.hidden) return;
    if (e.key === 'Enter' || e.key === 'Escape') enter();
  });

  function enter() {
    if (HOST.classList.contains('is-leaving')) return;
    HOST.classList.add('is-leaving');
    sessionStorage.setItem('nv.stage.seen', '1');   // once per session, not once per navigation
    setTimeout(() => {
      HOST.hidden = true;
      document.body.classList.remove('stage-locked');
      /* hand over to the hub exactly as it was — nothing here replaces it */
      if (window.lifeHub && window.lifeHub.open) window.lifeHub.open();
      teardown();
    }, 900);
  }

  /* WebGL contexts are not garbage: they hold GPU memory until told otherwise.
     Once the stage is gone it gives everything back. */
  function teardown() {
    cancelAnimationFrame(raf);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { Object.values(m).forEach(v => v && v.isTexture && v.dispose()); m.dispose(); });
      }
    });
    if (scene.environment) scene.environment.dispose();
    renderer.dispose();
    /* dispose() frees the OBJECTS. The CONTEXT itself lives on until it is
       told to die — and a live WebGL context behind a hidden canvas still
       holds GPU memory and still counts against the browser's context limit.
       This is the difference between "the stage is hidden" and "the stage is
       gone", and it is the thing most likely to slow the app down afterwards. */
    if (renderer.forceContextLoss) renderer.forceContextLoss();
    CANVAS.width = CANVAS.height = 1;
  }
}
