/* ============================================================
   NATHAN VÉLEZ — SON OF GOD · Personal Life Tracker
   Application controller (vanilla JS, no dependencies)
   Modules: Store · Countdown · Pomodoro · Goals · Reminders ·
            Workout · BodyWeight · Gym · GymTimer · ProgressLog · Tabs
   ============================================================ */
(() => {
  'use strict';

  /* ─────────────────  HELPERS  ───────────────── */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad   = (n)      => String(n).padStart(2, '0');
  const clamp = (n,lo,hi) => Math.min(hi, Math.max(lo, n));
  const uid   = ()       => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const num   = (v)      => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

  const localDateKey = (d = new Date()) =>
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const toLocalInputValue = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,16);
  };

  const esc = (str) =>
    String(str).replace(/[&<>"']/g,
      (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function emptyHTML(title, hint) {
    return `<div class="empty">
      <span class="empty__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.3">
          <path d="M4 7l8-4 8 4v10l-8 4-8-4Z" stroke-linejoin="round"/>
          <path d="M4 7l8 4 8-4M12 11v10" stroke-linejoin="round"/>
        </svg>
      </span>
      <p class="empty__title">${esc(title)}</p>
      <p class="empty__hint">${esc(hint)}</p>
    </div>`;
  }

  /* ─────────────────  STORE  ───────────────── */
  const KEYS = {
    countdown:   'nv.countdown',
    pomodoro:    'nv.pomodoro',
    goals:       'nv.goals',
    reminders:   'nv.reminders',
    gymLogs:     'nv.gym.logs',
    gymTimer:    'nv.gym.timer',
    gymSplit:    'nv.gym.split',
    bodyWeight:  'nv.bodyweight',
    gymLogPanel: 'nv.gym.logpanel',
    widgetState: 'nv.widget.state',
    nutrition:   'nv.nutrition',
    supplements: 'nv.supplements',
    electrolyte: 'nv.electrolyte',
    finance:     'nv.finance',
    workout:     (d) => `nv.workout.${d}`,
    ideas:       'nv.app.ideas',
  };

  const Store = {
    get(key, fallback) {
      try { const r = localStorage.getItem(key); return r == null ? fallback : JSON.parse(r); }
      catch { return fallback; }
    },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} },
    remove(key)   { try { localStorage.removeItem(key); } catch(e){} },
  };

  /* ─────────────────  TOAST  ───────────────── */
  let _toastT = null;
  function toast(msg) {
    const el = $('[data-toast]'); if (!el) return;
    el.textContent = msg; el.classList.add('is-show');
    clearTimeout(_toastT);
    _toastT = setTimeout(() => el.classList.remove('is-show'), 1600);
  }

  /* ─────────────────  DEFAULT SPLIT  ───────────────── */
  const DEFAULT_SPLIT = [
    { dow:'Sun', label:'Rest',    type:'rest',  title:'Sabbath',  note:'Recovery & Reflection' },
    { dow:'Mon', label:'Lower A', type:'train', key:'lowerA', title:'Lower A', focus:'Quad-Dominant',
      exercises:[
        {id:'squat',     name:'Back Squat',           bodyPart:'Quads',      sets:4,lo:6, hi:8, rest:180},
        {id:'rdl',       name:'Romanian Deadlift',    bodyPart:'Hamstrings', sets:3,lo:8, hi:10,rest:120},
        {id:'legpress',  name:'Leg Press',            bodyPart:'Quads',      sets:3,lo:10,hi:12,rest:90 },
        {id:'legext',    name:'Leg Extension',        bodyPart:'Quads',      sets:3,lo:12,hi:15,rest:60 },
        {id:'calfstand', name:'Standing Calf Raise',  bodyPart:'Calves',     sets:4,lo:12,hi:15,rest:60 },
      ]},
    { dow:'Tue', label:'Upper',   type:'train', key:'upper', title:'Upper', focus:'Strength · Symmetry',
      exercises:[
        {id:'bench',     name:'Barbell Bench Press',  bodyPart:'Chest',      sets:4,lo:6, hi:8, rest:150},
        {id:'pullup',    name:'Weighted Pull-Up',     bodyPart:'Back',       sets:3,lo:8, hi:10,rest:120},
        {id:'ohp',       name:'Overhead Press',       bodyPart:'Shoulders',  sets:3,lo:8, hi:10,rest:120},
        {id:'inclinedb', name:'Incline DB Press',     bodyPart:'Chest',      sets:3,lo:10,hi:12,rest:90 },
        {id:'cablerow',  name:'Seated Cable Row',     bodyPart:'Back',       sets:3,lo:10,hi:12,rest:90 },
        {id:'latraise',  name:'Lateral Raise',        bodyPart:'Shoulders',  sets:3,lo:12,hi:15,rest:60 },
      ]},
    { dow:'Wed', label:'Rest',    type:'rest',  title:'Recovery', note:'Mobility & Long Walk' },
    { dow:'Thu', label:'Lower B', type:'train', key:'lowerB', title:'Lower B', focus:'Hinge-Dominant',
      exercises:[
        {id:'deadlift',  name:'Deadlift',             bodyPart:'Back/Hams',  sets:4,lo:4, hi:6, rest:180},
        {id:'hacksquat', name:'Hack Squat',           bodyPart:'Quads',      sets:3,lo:8, hi:10,rest:120},
        {id:'hipthrust', name:'Hip Thrust',           bodyPart:'Glutes',     sets:3,lo:8, hi:10,rest:120},
        {id:'legcurl',   name:'Lying Leg Curl',       bodyPart:'Hamstrings', sets:3,lo:10,hi:12,rest:90 },
        {id:'calfseat',  name:'Seated Calf Raise',    bodyPart:'Calves',     sets:4,lo:15,hi:20,rest:45 },
      ]},
    { dow:'Fri', label:'Push',    type:'train', key:'push', title:'Push', focus:'Chest · Shoulders · Triceps',
      exercises:[
        {id:'inclinebb', name:'Incline Barbell Press',bodyPart:'Chest',      sets:4,lo:6, hi:8, rest:150},
        {id:'ohp2',      name:'Overhead Press',       bodyPart:'Shoulders',  sets:3,lo:8, hi:10,rest:120},
        {id:'dip',       name:'Weighted Dip',         bodyPart:'Chest/Tris', sets:3,lo:8, hi:10,rest:120},
        {id:'cablefly',  name:'Cable Fly',            bodyPart:'Chest',      sets:3,lo:12,hi:15,rest:60 },
        {id:'latraise2', name:'Lateral Raise',        bodyPart:'Shoulders',  sets:4,lo:12,hi:15,rest:60 },
        {id:'pushdown',  name:'Triceps Pushdown',     bodyPart:'Triceps',    sets:3,lo:12,hi:15,rest:60 },
      ]},
    { dow:'Sat', label:'Pull',    type:'train', key:'pull', title:'Pull', focus:'Back · Biceps',
      exercises:[
        {id:'wpullup',   name:'Weighted Pull-Up',     bodyPart:'Back',       sets:4,lo:6, hi:8, rest:150},
        {id:'bbrow',     name:'Barbell Row',          bodyPart:'Back',       sets:3,lo:8, hi:10,rest:120},
        {id:'latpull',   name:'Lat Pulldown',         bodyPart:'Back',       sets:3,lo:10,hi:12,rest:90 },
        {id:'facepull',  name:'Face Pull',            bodyPart:'Rear Delts', sets:3,lo:15,hi:20,rest:45 },
        {id:'bbcurl',    name:'Barbell Curl',         bodyPart:'Biceps',     sets:3,lo:10,hi:12,rest:60 },
        {id:'hammer',    name:'Hammer Curl',          bodyPart:'Biceps',     sets:3,lo:12,hi:15,rest:60 },
      ]},
  ];

  // Mutable SPLIT — loaded from store, defaults deep-cloned if absent
  let SPLIT = Store.get(KEYS.gymSplit, null) || JSON.parse(JSON.stringify(DEFAULT_SPLIT));
  const persistSplit = () => Store.set(KEYS.gymSplit, SPLIT);

  /* ─────────────────  TAB META  ───────────────── */
  const TAB_META = {
    home:      {eyebrow:'Dashboard',          title:'Home'},
    gym:       {eyebrow:'Temple of the Body', title:'Gym'},
    goals:     {eyebrow:'Ambition',           title:'Goals'},
    reminders: {eyebrow:'Cadence',            title:'Reminders'},
    skincare:  {eyebrow:'The Ritual',title:'Skincare', desc:'Actives, rotation, and whether you actually did it. Not built yet — the slot is yours.'},
    nutrition: {eyebrow:'Fuel & Form', title:'Nutrition'},
    supplements:{eyebrow:'The Stack · Every Pill', title:'Supplements'},
    subscriptions:{eyebrow:'The Radar · Every Dollar', title:'Subscriptions'},
    vitals:    {eyebrow:'Recovery · How You Slept', title:'Vitals'},
    peak:      {eyebrow:'Your Peak Today · Energy', title:'Peak'},
    map:       {eyebrow:'The Map · Where You Have To Be', title:'Map'},
    stocks:    {eyebrow:'Holdings · Is This Still Good', title:'Stocks'},
    finance:   {eyebrow:'Capital & Acquisition', title:'Finance'},
    photos:    {eyebrow:'Visual Archive',           title:'Photos'},
    academics: {eyebrow:'College Prep · Class of 2027', title:'Academics'},
    vision:    {eyebrow:'The North Star',title:'Vision', desc:'The outcomes worth dating, and the milestones between here and them.'},
    logs:      {eyebrow:'Daily Vitals · The Ledger', title:'Logs'},
    clothes:   {eyebrow:'The Wardrobe · Fits & Freight', title:'Clothes & Accessories'},
    sports:    {eyebrow:'The Arena · Iron Sharpens Iron', title:'Sports'},
    calendar:  {eyebrow:'The Chronicle · Ordered Days', title:'Calendar'},
    stats:     {eyebrow:'The Ledger · Everything At Once', title:'Stats'},
  };
  const REAL_PANELS = ['home','gym','supplements','subscriptions','vitals','peak','map','stocks','goals','reminders','nutrition','finance','photos','academics','logs','clothes','sports','calendar','stats'];

  /* ═══════════════════  COUNTDOWN  ═══════════════════ */
  const Countdown = (() => {
    const DEFAULT = {targetISO:'2026-09-01T00:00:00', label:'Protocols Begin In'};
    let state = Object.assign({}, DEFAULT, Store.get(KEYS.countdown, {}));
    let interval = null;
    const els = {};

    function cache() {
      els.root   = $('[data-countdown]');
      els.label  = $('[data-countdown-label]');
      els.target = $('[data-countdown-target]');
      if (!els.root) return false;
      els.d = els.root.querySelector('[data-d]');
      els.h = els.root.querySelector('[data-h]');
      els.m = els.root.querySelector('[data-m]');
      els.s = els.root.querySelector('[data-s]');
      return true;
    }

    function paintStatic() { els.d.textContent = els.h.textContent = els.m.textContent = els.s.textContent = '00'; }

    function tick() {
      const target = new Date(state.targetISO);
      if (isNaN(target)) return paintStatic();
      const diff = target - Date.now();
      if (diff <= 0) { paintStatic(); if (els.target) els.target.textContent = 'Target reached'; return; }
      const total = Math.floor(diff / 1000);
      els.d.textContent = pad(Math.floor(total / 86400));
      els.h.textContent = pad(Math.floor((total % 86400) / 3600));
      els.m.textContent = pad(Math.floor((total % 3600) / 60));
      els.s.textContent = pad(total % 60);
    }

    function render() {
      if (els.label) els.label.textContent = state.label || 'Countdown';
      if (els.target) {
        const t = new Date(state.targetISO);
        els.target.textContent = isNaN(t)
          ? 'Set a target'
          : 'Target · ' + t.toLocaleString(undefined, {month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
      }
      tick();
    }

    function save(next) { state = Object.assign({}, state, next); Store.set(KEYS.countdown, state); render(); }

    function init() { if (!cache()) return; render(); interval = setInterval(tick, 1000); }

    return { init, save, get state() { return state; } };
  })();

  /* ═══════════════════  POMODORO  ═══════════════════ */
  const Pomodoro = (() => {
    const DEFAULT = {minutes:25, phase:'Focus'};
    let state = Object.assign({}, DEFAULT, Store.get(KEYS.pomodoro, {}));
    let total = state.minutes * 60, remaining = total;
    let running = false, raf = null, lastTs = null, session = 1;
    const circ = 2 * Math.PI * 52;
    const els = {};

    function cache() {
      els.bar   = $('[data-pomo-bar]');
      els.time  = $('[data-pomo-time]');
      els.phase = $('.pomo__phase');
      els.count = $('[data-pomo-count]');
      return !!(els.bar && els.time);
    }

    function paint() {
      const m = Math.floor(remaining/60), s = Math.floor(remaining%60);
      els.time.textContent = `${pad(m)}:${pad(s)}`;
      const pct = clamp(remaining/total, 0, 1);
      els.bar.setAttribute('stroke-dashoffset', (circ*(1-pct)).toFixed(3));
    }

    function loop(ts) {
      if (!running) return;
      if (lastTs == null) lastTs = ts;
      remaining = Math.max(0, remaining - (ts-lastTs)/1000); lastTs = ts; paint();
      if (remaining > 0) raf = requestAnimationFrame(loop);
      else { running=false; session+=1; if(els.count) els.count.textContent='#'+session; toast('Session complete'); }
    }

    function start() { if (!running) { running=true; lastTs=null; raf=requestAnimationFrame(loop); } }
    function pause() { running=false; if(raf) cancelAnimationFrame(raf); }
    function reset() { pause(); remaining=total; paint(); }

    function applyConfig() {
      total = state.minutes * 60; remaining = total;
      if (els.phase) els.phase.textContent = state.phase || 'Focus';
      paint();
    }

    function save(next) {
      state = Object.assign({}, state, next);
      state.minutes = clamp(parseInt(state.minutes,10)||25, 1, 180);
      Store.set(KEYS.pomodoro, state); pause(); applyConfig();
    }

    function init() {
      if (!cache()) return;
      els.bar.setAttribute('stroke-dasharray', circ.toFixed(3)); applyConfig();
      $$('[data-pomo]').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.pomo;
        if (a==='start') start(); else if (a==='pause') pause(); else if (a==='reset') reset();
      }));
    }

    return { init, save, get state() { return state; } };
  })();

  /* ═══════════════════  MODALS  ═══════════════════ */
  const Modals = (() => {
    let lastFocus = null;

    function open(id) {
      const modal = document.getElementById(id); if (!modal) return;
      lastFocus = document.activeElement;
      modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false');
      const first = modal.querySelector('input, button.btn--primary, button');
      if (first) setTimeout(() => first.focus(), 60);
    }
    function close(modal) {
      modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function closeAll() { $$('.modal.is-open').forEach(close); }

    function init() {
      $$('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
        const which = btn.dataset.edit;
        if (which === 'countdown') {
          $('#cd-label').value  = Countdown.state.label || '';
          $('#cd-target').value = toLocalInputValue(Countdown.state.targetISO);
          open('modal-countdown');
        } else if (which === 'pomodoro') {
          $('#pomo-min').value   = Pomodoro.state.minutes;
          $('#pomo-phase').value = Pomodoro.state.phase || '';
          open('modal-pomodoro');
        }
      }));

      $$('.modal').forEach(modal => {
        modal.querySelectorAll('[data-close]').forEach(c =>
          c.addEventListener('click', () => close(modal)));
      });
      document.addEventListener('keydown', (e) => { if (e.key==='Escape') closeAll(); });

      const cdForm = $('[data-countdown-form]');
      if (cdForm) cdForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const label  = $('#cd-label').value.trim() || 'Countdown';
        const target = $('#cd-target').value;
        if (!target) return;
        Countdown.save({label, targetISO: new Date(target).toISOString()});
        closeAll(); toast('Countdown saved');
      });

      const pomoForm = $('[data-pomodoro-form]');
      if (pomoForm) pomoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const minutes = $('#pomo-min').value;
        const phase   = $('#pomo-phase').value.trim() || 'Focus';
        Pomodoro.save({minutes, phase}); closeAll(); toast('Pomodoro saved');
      });
    }

    return { init, open, closeAll };
  })();

  /* ═══════════════════  GOALS  ═══════════════════ */
  /* ══════════════════  TILE ACTION ROWS  ══════════════════
     The button row along the bottom of a rebuilt tile, built from data.
     Adding a button to a tab is ONE entry here — never a layout change:

       { id, label, primary?, round?, run() }

     Anything with a `run` fires it; anything with a `tab` jumps there. */
  const TILE_ACTIONS = {
    nutrition: [
      /* opens the meal you are most likely logging right now, rather than
         always breakfast — the form lives per meal section */
      { id: 'meal',    label: '+ Log food', primary: true,
        run: () => {
          const h = new Date().getHours();
          const meal = h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snacks';
          const btn = document.querySelector('[data-meal-add="' + meal + '"]');
          if (!btn) return;
          btn.click();
          btn.closest('.meal-sec')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } },
      { id: 'targets', label: 'Targets',
        run: () => document.getElementById('targets-toggle')?.click() },
      { id: 'water',   label: 'Water',       tab: 'logs' },
      { id: 'stack',   label: 'Supplements', tab: 'supplements' },
    ],
  };

  function renderTileActions(root) {
    (root || document).querySelectorAll('[data-tile-actions]').forEach(host => {
      const key = host.getAttribute('data-tile-actions');
      const defs = TILE_ACTIONS[key];
      if (!defs || host.dataset.built === '1') return;
      host.innerHTML = defs.map(d =>
        '<button class="tile-actions__btn' + (d.primary ? ' is-primary' : '') + (d.round ? ' is-round' : '') +
        '" type="button" data-tile-action="' + d.id + '">' + esc(d.label) + '</button>'
      ).join('');
      host.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-tile-action]'); if (!btn) return;
        const def = defs.find(d => d.id === btn.getAttribute('data-tile-action')); if (!def) return;
        if (def.tab) Tabs.setActive(def.tab);
        else if (def.run) def.run();
      });
      host.dataset.built = '1';   // listener is delegated; bind it once
    });
  }

  /* ══════════════════  THE STUDY GUIDE  ══════════════════
     Two exams stand between Nathan and the diploma, and they are seventeen
     days wide. Kept as data rather than markup so the plan can be rewritten
     after August without touching a single line of rendering.

     The whole strategy rests on one fact: Earth & Space hands you a reference
     tables booklet during the exam. Half that paper is knowing where to look,
     not what you remember — which is the right bet when you have seventeen
     days and little memory of either science. */
  const Study = (() => {
    const KEY = 'nv.study';
    let st = Store.get(KEY, null) || { ticks: {} };
    const save = () => Store.set(KEY, st);

    const EXAMS = [
      { name: 'English Language Arts',   when: '2026-08-18T08:30', note: 'Never taken. Your English average is 86.7.', tone: 'ela' },
      { name: 'Earth & Space Sciences',  when: '2026-08-19T08:30', note: 'You scored 64. One point.',                  tone: 'ess' },
      { name: 'Life Science: Biology',   when: '2026-08-19T12:30', note: 'Backup shot. Costs nothing to sit.',          tone: 'alt' },
    ];

    const PHASES = [
      { label: 'Days 1–2 · set up', tasks: [
        { k:'a1', t:'Print the Earth Science Reference Tables', s:'Read every page once. Just learn what lives where.' },
        { k:'a2', t:'Download 3 past ELA and 3 past Earth Science exams', s:'NYSED publishes them free, with answer keys.' },
        { k:'a3', t:'Sit one Earth Science paper cold — tables open, untimed', s:'Score it. That is your baseline, not your verdict.' },
      ]},
      { label: 'Days 3–9 · the grind', tasks: [
        { k:'b1', t:'One Earth Science paper a day', s:'Mark every question the tables could have answered. Ninety minutes.' },
        { k:'b2', t:'Keep a one-page list of what you got wrong TWICE', s:'Only twice-wrong items. Everything else is noise.' },
        { k:'b3', t:'Write one full ELA argument essay, timed', s:'Use the template. Do not polish — finish it.' },
        { k:'b4', t:'Write one Text Analysis response, timed' },
      ]},
      { label: 'Days 10–15 · sharpen', tasks: [
        { k:'c1', t:'Two Earth Science papers under real time limits', s:'Three hours, no phone, no pausing.' },
        { k:'c2', t:'One full ELA paper — all three parts, one sitting', s:'Do this at least once before the day.' },
        { k:'c3', t:'Re-drill only your twice-wrong list', s:'Not the whole syllabus. The list.' },
        { k:'c4', t:'Skim Biology notes — two hours TOTAL', s:'That is the entire Biology plan. A free shot, not a second project.' },
      ]},
      { label: 'Days 16–17 · taper', tasks: [
        { k:'d1', t:'Reference tables only — no new content', s:'Until you can find any chart in under five seconds.' },
        { k:'d2', t:'Re-read your two best essays', s:'Reminding yourself of the shape, not learning.' },
        { k:'d3', t:'Confirm testing site, room and start time', s:'In writing, from the school.' },
        { k:'d4', t:'Sleep properly both nights', s:'Worth more than another paper.' },
      ]},
    ];

    const SECTIONS = [
      { n:'01', title:'Why Earth Science, not Biology', tone:'ess', body:
        `<p>You were <b>one point away</b>. You are closing a gap, not starting from zero.</p>
         <p>And Earth Science hands you a <b>reference tables booklet during the exam</b> — formulas, mineral charts, the rock cycle, earthquake travel times, half-lives, weather symbols, planetary data. All printed. All given to you.</p>
         <p>With seventeen days and little memory of either, bet on the exam that lets you look things up. <b>Sit Biology anyway</b> — it is the same afternoon and you only need one science at 65.</p>` },

      { n:'02', title:'The tables ARE the exam', tone:'ess', body:
        `<p>Students who fail this paper usually did not forget the content — they never learned the booklet, then hunted through fourteen pages under time pressure.</p>
         <p><b>The drill that wins it:</b> on every past-paper question, ask <i>"is this in the tables?"</i> before trying to remember anything. Do that a hundred times and it becomes automatic — which is exactly what you need on the day.</p>
         <p class="study__lbl">Worth memorising anyway</p>
         <ul><li>Earth's motions — seasons, and why Polaris' altitude equals your latitude</li>
         <li>Topographic maps — contours, gradient, which way a stream flows</li>
         <li>Plate boundaries — the three types, and what each builds or destroys</li>
         <li>Erosion and deposition — particle size, sorting, water versus ice</li>
         <li>Air masses and fronts — what weather follows each</li></ul>` },

      { n:'03', title:'ELA is a format, not a knowledge test', tone:'ela', body:
        `<p>Nothing to memorise. What you can learn is the shape of the paper, and it barely changes year to year.</p>
         <p><b>Part 1</b> — 24 multiple choice on three passages. Read the questions first, then the passage. Answer from the text, never from what sounds right.</p>
         <p><b>Part 2</b> — argument essay from four texts. Pick a side in the first two minutes. Use three of the four. Address the other side once.</p>
         <p><b>Part 3</b> — Text Analysis. One central idea, one writing device, how the device builds the idea. Two or three paragraphs.</p>` },

      { n:'04', title:'The argument essay, as a template', tone:'ela', body:
        `<ul><li><b>¶1</b> — state your claim plainly. No throat-clearing.</li>
         <li><b>¶2–4</b> — one reason each: your point, a quote from a <i>named</i> text, then your explanation of why it proves the point. <b>The explanation is where the marks are.</b></li>
         <li><b>¶5</b> — the counterclaim. "Some argue X. However…" Then knock it down.</li>
         <li><b>¶6</b> — restate the claim in different words.</li></ul>
         <p>Cite by name every time — "Text 2 argues…". Graders are looking for evidence from multiple texts, and naming them makes it impossible to miss.</p>` },

      { n:'05', title:'On the day', tone:'', body:
        `<ul><li><b>Answer every question.</b> No penalty for wrong answers on any Regents. A blank is a guaranteed zero.</li>
         <li><b>Use the full three hours.</b> Nobody was ever rewarded for leaving early.</li>
         <li><b>Open the tables before you think.</b> Every question, first move.</li>
         <li><b>Two minutes planning each essay.</b> A planned essay beats a longer unplanned one.</li>
         <li>Pens, pencil, calculator, ID. Arrive thirty minutes early.</li></ul>
         <p><b>If Earth Science lands 60–64 again</b> that is not a failure — it is the appeal window. You will have sat it twice, which is one of the conditions. Ask the school that same week, in writing.</p>` },
    ];

    const daysTo = (iso) => Math.max(0, Math.ceil((new Date(iso) - new Date()) / 86400000));
    const total  = () => PHASES.reduce((a, p) => a + p.tasks.length, 0);
    const done   = () => PHASES.reduce((a, p) => a + p.tasks.filter(t => st.ticks[t.k]).length, 0);

    /* the card on the Academics board */
    function renderCard() {
      const el = $('[data-acad-study]'); if (!el) return;
      const d = daysTo('2026-08-18T08:30');
      const n = done(), all = total();
      el.innerHTML =
        `<div class="eyebrow"><span class="eyebrow__num">01</span>
           <span class="eyebrow__lbl">The Regents</span><span class="eyebrow__rule"></span></div>
         <div class="tile-well cal-well">
           <span class="tile-kick">✦ days to the first exam</span>
           <span class="tile-hero__val">${d}</span>
           <span class="tile-hero__of">ELA · 18 Aug &nbsp;·&nbsp; Sciences · 19 Aug</span>
           <div class="tile-hero__bar"><i style="width:${all ? Math.round(n / all * 100) : 0}%"></i></div>
         </div>
         <p class="study__cardnote">${n} of ${all} steps done — tap to open the guide</p>`;
    }

    function renderGuide() {
      const el = $('[data-study-body]'); if (!el) return;
      const n = done(), all = total();

      el.innerHTML =
        `<div class="study__exams">${EXAMS.map((e, i) => {
          const dt = new Date(e.when);
          return `<div class="study__exam is-${e.tone}" style="animation-delay:${i * 70}ms">
            <i></i>
            <span class="study__exam-m"><b>${esc(e.name)}</b><small>${esc(e.note)}</small></span>
            <span class="study__exam-w">${dt.toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'}).toUpperCase()}<br>
              ${dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span>
          </div>`;
        }).join('')}</div>

        <p class="study__note">Sit all three. You need <b>one</b> science at 65 or above — Earth Science is the morning, Biology the afternoon. Taking both doubles your chances for the price of one extra afternoon.</p>

        ${SECTIONS.map(s => `
          <section class="study__sec ${s.tone ? 'is-' + s.tone : ''}">
            <div class="eyebrow"><span class="eyebrow__num">${s.n}</span>
              <span class="eyebrow__lbl">${esc(s.title)}</span><span class="eyebrow__rule"></span></div>
            <div class="study__body">${s.body}</div>
          </section>`).join('')}

        <section class="study__sec">
          <div class="eyebrow"><span class="eyebrow__num">06</span>
            <span class="eyebrow__lbl">Seventeen days · ${n}/${all}</span><span class="eyebrow__rule"></span></div>
          ${PHASES.map(p => `
            <p class="study__phase">${esc(p.label)}</p>
            <ul class="study__tasks">${p.tasks.map(t => `
              <li><label>
                <input type="checkbox" data-study-tick="${t.k}" ${st.ticks[t.k] ? 'checked' : ''}>
                <span><b>${esc(t.t)}</b>${t.s ? `<small>${esc(t.s)}</small>` : ''}</span>
              </label></li>`).join('')}</ul>`).join('')}
        </section>

        <p class="study__foot">Confirm format against the newest NYSED sample papers — Earth &amp; Space Sciences and Life Science: Biology are recent replacements for the older Physical Setting and Living Environment exams.</p>`;
    }

    function open()  { const m = $('#modal-study'); m.classList.add('is-open'); m.setAttribute('aria-hidden','false'); renderGuide(); }
    function close() { const m = $('#modal-study'); m.classList.remove('is-open'); m.setAttribute('aria-hidden','true'); }

    function init() {
      renderCard();
      const board = $('.board--academics'); if (!board) return;
      board.addEventListener('click', e => { if (e.target.closest('[data-study-open]')) open(); });
      board.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-study-open]')) { e.preventDefault(); open(); }
      });
      const m = $('#modal-study');
      m.addEventListener('click', e => {
        if (e.target.closest('[data-study-close]')) { close(); return; }
        const box = e.target.closest('[data-study-tick]');
        if (box) {
          st.ticks[box.dataset.studyTick] = box.checked; save();
          renderCard();                 // the card's progress follows immediately
          const head = $('.study__sec:last-of-type .eyebrow__lbl');
          if (head) head.textContent = 'Seventeen days · ' + done() + '/' + total();
        }
      });
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && $('#modal-study').classList.contains('is-open')) close();
      });
    }

    return { init, renderCard };
  })();

  /* ══════════════════  STATS  ══════════════════
     The 21st.dev HealthStatCard, rebuilt in this stack.

     WHY NOT THE REACT FILE AS WRITTEN: it needs React, TypeScript, Tailwind,
     the shadcn tree, framer-motion and Radix. This app has no build step —
     that is why a change is live the moment it is saved and why the tabs can
     be plain iframes. Adopting that toolchain to gain one card would mean
     rebuilding everything around it. So the card is reproduced feature for
     feature — stat row with change arrows, spring bars, hover tilt, tooltips,
     legend — using this app's own tokens, which also makes it match.

     The real upgrade: the demo had hardcoded numbers. This reads your logs. */
  const Stats = (() => {
    const PAL = ['#6ab0e0', '#7dd488', '#e0b870', '#c89ae0', '#7dd9d4', '#e0a0a0'];

    const dayKeyBack = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateKey(d); };

    /* average of the last `days`, ignoring days with no entry at all —
       a missing day is unknown, not a zero, and averaging in zeros would
       quietly punish you for not logging */
    function avg(vals) {
      const real = vals.filter(v => typeof v === 'number' && !isNaN(v));
      if (!real.length) return null;
      return real.reduce((a, b) => a + b, 0) / real.length;
    }

    function series(readFn, days) {
      return Array.from({ length: days }, (_, i) => readFn(dayKeyBack(days - 1 - i)));
    }

    function gather() {
      /* 'nv.logs' is a literal here because the Logs module owns that key
         privately — there is no KEYS.logs entry, and reading an undefined
         key would have made this tab quietly empty forever. */
      const logs = Store.get('nv.logs', {}) || {};
      const nut  = Store.get(KEYS.nutrition, {}) || {};

      const sleepBy = {};
      ((logs.sleep && logs.sleep.entries) || []).forEach(e => { if (e && e.date) sleepBy[e.date] = num(e.hours); });
      const waterDays = (logs.water && logs.water.days) || {};
      const stepsV = ((logs.vitals || []).find(v => v && v.id === 'steps') || {}).entries || {};

      const calFor = (dk) => {
        const day = (nut.days || {})[dk]; if (!day) return undefined;
        return Object.values(day.meals || {}).reduce((a, items) =>
          a + (items || []).reduce((b, f) => b + num(f.cal), 0), 0);
      };

      const week  = (fn) => series(fn, 7);
      const prev  = (fn) => Array.from({ length: 7 }, (_, i) => fn(dayKeyBack(13 - i)));

      const mk = (label, fn, unit, dp) => {
        const now = avg(week(fn)), before = avg(prev(fn));
        const pct = (now !== null && before !== null && before !== 0)
          ? Math.round(((now - before) / before) * 100) : null;
        return {
          title: label, unit,
          value: now === null ? '—' : (dp ? now.toFixed(dp) : Math.round(now).toLocaleString()),
          changePercent: pct === null ? null : Math.abs(pct),
          changeDirection: pct === null ? null : (pct >= 0 ? 'up' : 'down'),
        };
      };

      const stats = [
        mk('Sleep',    (dk) => sleepBy[dk],           'h', 1),
        mk('Water',    (dk) => waterDays[dk],         'oz', 0),
        mk('Steps',    (dk) => num(stepsV[dk]) || undefined, '', 0),
        mk('Calories', calFor,                        'kcal', 0),
      ];

      /* the bars: each metric as a percentage of its own goal, so four
         different units can share one axis honestly */
      const goalSleep = (logs.sleep && logs.sleep.goal) || 8;
      const goalWater = (logs.water && logs.water.goal) || 100;
      const goalSteps = (((logs.vitals || []).find(v => v && v.id === 'steps') || {}).goal) || 10000;
      const goalCal   = (nut.targets && nut.targets.cal) || 2800;

      const pctOf = (v, g) => v === null || !g ? 0 : Math.max(0, Math.min(100, Math.round((v / g) * 100)));
      const graph = [
        { label: 'Sleep',    value: pctOf(avg(week((dk) => sleepBy[dk])), goalSleep),   color: PAL[0], description: 'Nightly average vs your ' + goalSleep + 'h goal' },
        { label: 'Water',    value: pctOf(avg(week((dk) => waterDays[dk])), goalWater), color: PAL[1], description: 'Daily average vs your ' + goalWater + 'oz goal' },
        { label: 'Steps',    value: pctOf(avg(week((dk) => num(stepsV[dk]) || undefined)), goalSteps), color: PAL[2], description: 'Daily average vs your ' + goalSteps.toLocaleString() + ' goal' },
        { label: 'Calories', value: pctOf(avg(week(calFor)), goalCal),                  color: PAL[3], description: 'Daily average vs your ' + goalCal.toLocaleString() + ' kcal target' },
      ];

      return { stats, graph, empty: stats.every(s => s.value === '—') };
    }

    function render() {
      const host = $('[data-stats-host]'); if (!host) return;
      const { stats, graph, empty } = gather();

      host.innerHTML =
        '<article class="card card--stats reveal" style="--d:.05s">' +
          '<div class="eyebrow"><span class="eyebrow__num">01</span>' +
          '<span class="eyebrow__lbl">Last 7 days</span><span class="eyebrow__rule"></span></div>' +

          '<div class="stat-row">' + stats.map((s, i) =>
            '<div class="stat-cell" style="animation-delay:' + (i * 60) + 'ms">' +
              '<div class="stat-cell__v"><b>' + esc(String(s.value)) + '</b>' +
                (s.unit ? '<span class="stat-cell__u">' + esc(s.unit) + '</span>' : '') + '</div>' +
              '<p class="stat-cell__t">' + esc(s.title) + '</p>' +
              (s.changePercent === null ? '<p class="stat-cell__d is-flat">no prior week</p>'
                : '<p class="stat-cell__d ' + (s.changeDirection === 'up' ? 'is-up' : 'is-down') + '">' +
                  (s.changeDirection === 'up' ? '▲' : '▼') + ' ' + s.changePercent + '%</p>') +
            '</div>').join('') + '</div>' +

          (empty
            ? '<p class="chart-empty">Nothing logged yet. Log sleep, water or food and this fills itself in.</p>'
            : '<div class="stat-graph">' + graph.map((b, i) =>
                '<div class="stat-bar-wrap" data-tip="' + esc(b.label + ' · ' + b.value + '% — ' + b.description) + '">' +
                  '<div class="stat-bar" style="height:' + Math.max(2, b.value) + '%;' +
                    'background:linear-gradient(180deg,' + b.color + ' 0%,' + b.color + 'cc 100%);' +
                    'animation-delay:' + (i * 60) + 'ms"></div>' +
                '</div>').join('') + '</div>') +

          '<div class="stat-legend">' +
            '<h4 class="stat-legend__t">Against your goals</h4>' +
            '<div class="stat-legend__grid">' + graph.map(b =>
              '<span class="stat-legend__i"><i style="background:' + b.color + '"></i>' +
              esc(b.label) + ' (' + b.value + '%)</span>').join('') + '</div>' +
          '</div>' +
        '</article>';
    }

    return { render };
  })();

  const Goals = (() => {
    const CAT_PALETTE = ['#6ab0e0','#7dd488','#e0b870','#c89ae0','#e0a0a0','#7dd9d4','#d4c97d','#a0a8e0'];
    const RECUR_OPTS = [14,30,60,90];
    const DEFAULT = {
      categories: [
        {id:'health',  label:'Health & Fitness'},
        {id:'career',  label:'Career'},
        {id:'finance', label:'Finance'},
        {id:'general', label:'General'},
      ],
      goals: [],
      shoppingItems: [],
      seeded: false,
    };

    const raw = Store.get(KEYS.goals, null);
    let data;
    if (Array.isArray(raw)) {
      // migrate legacy flat goal list (title/detail/progress) into the new shape
      data = JSON.parse(JSON.stringify(DEFAULT));
      data.goals = raw.map(g => ({
        id: g.id, title: g.title, categoryId: 'general', deadline: '',
        notes: g.detail||'', steps: [], legacyProgress: clamp(g.progress||0,0,100),
        createdAt: g.createdAt||Date.now(), open:false, view:'steps',
      }));
      data.seeded = true;
    } else {
      data = raw || JSON.parse(JSON.stringify(DEFAULT));
    }
    data.categories    = data.categories    || JSON.parse(JSON.stringify(DEFAULT.categories));
    data.goals         = data.goals         || [];
    data.shoppingItems = data.shoppingItems || [];

    const persist = () => Store.set(KEYS.goals, data);
    const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || ('c'+uid());

    let catFilter  = 'all';
    let catEditing = false;
    let shopFilter = 'all';

    /* ---------- category helpers ---------- */
    function catLabel(id){ return data.categories.find(c=>c.id===id)?.label || 'General'; }
    function catColor(id){ const i = data.categories.findIndex(c=>c.id===id); return CAT_PALETTE[i>=0?i%CAT_PALETTE.length:0]; }

    /* ---------- goal helpers ---------- */
    function goalProgress(g){
      if (!g.steps.length) return g.legacyProgress||0;
      const done = g.steps.filter(s=>s.done).length;
      return Math.round((done/g.steps.length)*100);
    }
    function daysUntil(date){
      if (!date) return null;
      const d = new Date(date+'T00:00:00'); const now = new Date(); now.setHours(0,0,0,0);
      return Math.round((d-now)/86400000);
    }
    function deadlineChip(date){
      const dl = daysUntil(date);
      if (dl===null) return '';
      if (dl<0)    return `<span class="goal-deadline is-overdue">${Math.abs(dl)}d overdue</span>`;
      if (dl===0)  return `<span class="goal-deadline is-soon">Due today</span>`;
      if (dl<=7)   return `<span class="goal-deadline is-soon">${dl}d left</span>`;
      return `<span class="goal-deadline">${dl}d left</span>`;
    }

    /* ---------- shopping helpers ---------- */
    function restockInfo(it){
      if (!it.bought || !it.recurDays || !it.boughtAt) return null;
      const due = new Date(it.boughtAt+'T00:00:00'); due.setDate(due.getDate()+(+it.recurDays||0));
      const now = new Date(); now.setHours(0,0,0,0);
      const days = Math.round((due-now)/86400000);
      return { days, isDue: days<=0 };
    }
    function itemsForGoal(goalId){ return data.shoppingItems.filter(it=>it.goalId===goalId); }
    function recurOptionsHTML(sel){
      return `<option value="">No restock</option>` +
        RECUR_OPTS.map(d=>`<option value="${d}" ${+sel===d?'selected':''}>Restock ${d}d</option>`).join('');
    }

    function seed() {
      if (data.seeded) return;
      data.seeded = true;
      persist();
    }

    /* =====================  CATEGORY BAR  ===================== */
    function renderCatBar() {
      const el = $('[data-goal-filter-bar]'); if (!el) return;
      if (catEditing) {
        el.innerHTML = `<div class="ph-cat-editor">
          <p class="ph-cat-editor__title">✎ Edit Categories</p>
          <div class="ph-cat-editor__list">
            ${data.categories.map((c,i)=>`
              <div class="ph-cat-editor__row">
                <input class="input input--sm ph-cat-editor__inp" value="${esc(c.label)}" data-goalcat-rename="${i}" maxlength="28" placeholder="Category name">
                <button class="ph-cat-editor__del" data-goalcat-del="${i}" title="Delete">×</button>
              </div>`).join('')}
          </div>
          <div class="ph-cat-editor__add">
            <input class="input input--sm" id="goal-cat-new-inp" placeholder="New category name…" maxlength="28">
            <button class="btn btn--ghost btn--sm" data-goalcat-add>+ Add</button>
          </div>
          <div class="ph-cat-editor__foot">
            <button class="btn btn--primary btn--sm" data-goalcat-edit-done>✓ Save</button>
          </div>
        </div>`;
        return;
      }
      const allBtn = `<button class="chip chip--sm ${catFilter==='all'?'is-active':''}" data-goal-filter="all">All <b>${data.goals.length}</b></button>`;
      const catBtns = data.categories.map(c=>{
        const n = data.goals.filter(g=>g.categoryId===c.id).length;
        return `<button class="chip chip--sm goal-cat-chip ${catFilter===c.id?'is-active':''}" style="--cat:${catColor(c.id)}" data-goal-filter="${esc(c.id)}">${esc(c.label)} <b>${n}</b></button>`;
      }).join('');
      const editBtn = `<button class="chip chip--sm ph-cat-edit-btn" data-goalcat-edit title="Add · rename · delete categories">✎</button>`;
      el.innerHTML = allBtn + catBtns + editBtn;
    }

    function populateCategorySelects() {
      const opts = data.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
      $$('[data-gf="category"]').forEach(sel=>{ const cur=sel.value; sel.innerHTML=opts; if (cur) sel.value=cur; });
    }

    /* =====================  GOAL CARDS  ===================== */
    function goalRing(pct, color, done) {
      const R = 19, C = 2*Math.PI*R, off = C*(1-clamp(pct/100,0,1));
      return `<div class="goal-ring ${done?'is-done':''}">
        <svg viewBox="0 0 46 46" aria-hidden="true">
          <circle cx="23" cy="23" r="${R}" class="goal-ring__track"/>
          <circle cx="23" cy="23" r="${R}" class="goal-ring__fill" style="stroke:${color}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
        </svg>
        <span class="goal-ring__num">${done?'<b class="goal-ring__check">✓</b>':`${pct}<small>%</small>`}</span>
      </div>`;
    }

    function renderGoals() {
      const el = $('[data-goals-grid]'); if (!el) return;
      const count = $('[data-goals-count]'); if (count) count.textContent = data.goals.length;
      const list = data.goals.filter(g=> catFilter==='all' || g.categoryId===catFilter);
      if (!list.length) { el.innerHTML = `<div class="goals-empty">
        <div class="goals-empty__mark"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="2.5" fill="currentColor"/></svg></div>
        <p class="goals-empty__title">${catFilter==='all'?'No goals forged yet':'Nothing in this category'}</p>
        <p class="goals-empty__hint">Add one above — break it into steps and the progress ring fills itself as you check them off.</p>
      </div>`; return; }

      const sorted = [...list].sort((a,b)=> (a.deadline||'9999-99-99').localeCompare(b.deadline||'9999-99-99') || (b.createdAt-a.createdAt));

      el.innerHTML = sorted.map(g => {
        const pct = goalProgress(g);
        const stepsOpen = g.steps.filter(s=>!s.done).length;
        const shopCount = itemsForGoal(g.id).filter(it=>!it.bought || restockInfo(it)?.isDue).length;
        const col = catColor(g.categoryId);
        const stepsTotal = g.steps.length;
        const stepsDone  = g.steps.filter(s=>s.done).length;
        const isDone     = pct>=100;
        const metaBits = [];
        if (stepsTotal) metaBits.push(`${stepsDone}/${stepsTotal} steps`);
        else metaBits.push('No steps yet');
        if (shopCount) metaBits.push(`${shopCount} to buy`);
        const head = `
          <button class="goal-card__head" data-goal-toggle="${g.id}">
            ${goalRing(pct, col, isDone)}
            <div class="goal-card__info">
              <div class="goal-card__toprow">
                <span class="goal-card__cat" style="--cat:${col}">${esc(catLabel(g.categoryId))}</span>
                ${deadlineChip(g.deadline)}
              </div>
              <span class="goal-card__title ${isDone?'is-done':''}">${esc(g.title)}</span>
              <span class="goal-card__sub">${metaBits.join('&nbsp;·&nbsp;')}</span>
            </div>
            <span class="goal-card__caret ${g.open?'is-open':''}">▾</span>
          </button>`;
        if (!g.open) return `<article class="goal-card ${isDone?'is-complete':''}" data-goal="${g.id}" style="--cat:${col}">${head}</article>`;

        const tabs = ['steps','notes','shopping'].map(v=>
          `<button class="goal-vtab ${g.view===v?'is-active':''}" data-goal-view="${g.id}:${v}">${v==='steps'?`Steps${stepsOpen?` · ${stepsOpen}`:''}`:v==='notes'?'Notes':`Shopping${shopCount?` · ${shopCount}`:''}`}</button>`
        ).join('');

        let body = '';
        if (g.view==='notes') {
          body = `<textarea class="input goal-notes" data-goal-notes="${g.id}" rows="5" placeholder="Important notes about this goal…">${esc(g.notes||'')}</textarea>`;
        } else if (g.view==='shopping') {
          body = renderGoalShopping(g);
        } else {
          const sortedSteps = [...g.steps].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
          body = `<form class="task-add" data-step-add="${g.id}">
              <input class="input input--sm task-add__txt" placeholder="e.g. Run 3x/week for a month" maxlength="120">
              <input class="input input--sm task-add__date" type="date">
              <button class="btn btn--primary btn--sm" type="submit">Add</button>
            </form>
            <div class="task-list">
              ${sortedSteps.map(s=>{
                const dl = daysUntil(s.date);
                const when = s.date ? (dl===0?'Today':dl>0?`in ${dl}d`:`${Math.abs(dl)}d ago`) : '';
                return `<div class="task-row ${s.done?'is-done':''}" data-step="${g.id}:${s.id}">
                  <button class="task-check" data-step-toggle="${g.id}:${s.id}">${s.done?'✓':''}</button>
                  <span class="task-txt">${esc(s.text)}</span>
                  ${s.date?`<span class="task-when ${dl<0&&!s.done?'is-late':''}">${when}</span>`:''}
                  <button class="task-del" data-step-del="${g.id}:${s.id}">×</button>
                </div>`;
              }).join('') || `<p class="bkt__empty">No steps yet — break this goal down into a plan.</p>`}
            </div>`;
        }

        return `<article class="goal-card is-open ${isDone?'is-complete':''}" data-goal="${g.id}" style="--cat:${col}">
          ${head}
          <div class="goal-card__meta">
            <label class="goal-meta-field"><span>Category</span>
              <select class="input input--sm" data-goal-field="${g.id}:categoryId">
                ${data.categories.map(c=>`<option value="${esc(c.id)}" ${c.id===g.categoryId?'selected':''}>${esc(c.label)}</option>`).join('')}
              </select>
            </label>
            <label class="goal-meta-field"><span>Deadline</span><input class="input input--sm" type="date" data-goal-field="${g.id}:deadline" value="${g.deadline||''}"></label>
            <button class="btn btn--ghost btn--sm goal-card__del" data-goal-del="${g.id}">Delete goal</button>
          </div>
          <div class="goal-vtabs">${tabs}</div>
          <div class="goal-card__body">${body}</div>
        </article>`;
      }).join('');
    }

    /* =====================  SHOPPING (shared row renderer)  ===================== */
    function shoppingItemRow(it, showGoal) {
      const info = restockInfo(it);
      const isBought = it.bought && !(info && info.isDue);
      const dueFlag = info ? (info.isDue ? `<span class="shop-restock is-due">↻ Restock due</span>` : `<span class="shop-restock">↻ in ${info.days}d</span>`) : '';
      const total = (+it.price||0) * (+it.qty||1);
      const goalOf = it.goalId ? data.goals.find(g=>g.id===it.goalId) : null;
      return `<div class="shop-row ${isBought?'is-bought':''}" data-shop-row="${it.id}">
        <button class="shop-check" data-shop-toggle="${it.id}" title="${isBought?'Mark not bought':'Mark bought'}">${isBought?'✓':''}</button>
        <div class="shop-row__main">
          <span class="shop-row__name">${esc(it.name)}${it.qty>1?` <b>×${it.qty}</b>`:''}</span>
          <div class="shop-row__meta">
            ${showGoal ? `<span class="shop-row__goal" style="--cat:${catColor(goalOf?.categoryId)}">${goalOf?esc(goalOf.title):'General'}</span>` : ''}
            ${it.recurDays?`<span class="shop-row__recur">↻ every ${it.recurDays}d</span>`:''}
            ${dueFlag}
          </div>
        </div>
        ${total?`<span class="shop-row__price">$${total.toFixed(2)}</span>`:''}
        ${it.link?`<a class="shop-row__link" href="${esc(it.link)}" target="_blank" rel="noopener" title="Open purchase link">↗</a>`:''}
        <button class="shop-row__del" data-shop-del="${it.id}" title="Delete">×</button>
      </div>`;
    }

    function shopAddFormHTML(key, placeholder) {
      return `<form class="shop-add" data-shop-add="${key}">
          <input class="input input--sm" data-sf="name" placeholder="${placeholder}" maxlength="60">
          <input class="input input--sm" data-sf="qty" type="number" min="1" placeholder="Qty" style="max-width:64px">
          <input class="input input--sm" data-sf="price" type="number" min="0" step="0.01" placeholder="$" style="max-width:80px">
          <input class="input input--sm" data-sf="link" placeholder="Link (optional)">
          <select class="input input--sm" data-sf="recur" style="max-width:130px">${recurOptionsHTML('')}</select>
          <button class="btn btn--primary btn--sm" type="submit">Add</button>
        </form>`;
    }

    function renderGoalShopping(g) {
      const items = itemsForGoal(g.id);
      const need   = items.filter(it=>!it.bought || restockInfo(it)?.isDue);
      const bought = items.filter(it=>it.bought && !restockInfo(it)?.isDue);
      return shopAddFormHTML(g.id, 'Item to buy for this goal…') +
        `<div class="shop-list">
          ${need.map(it=>shoppingItemRow(it,false)).join('')}
          ${bought.length ? `<p class="shop-group-lab">Bought</p>${bought.map(it=>shoppingItemRow(it,false)).join('')}` : ''}
          ${!items.length?`<p class="bkt__empty">No items yet for this goal.</p>`:''}
        </div>`;
    }

    /* =====================  GLOBAL SHOPPING LIST  ===================== */
    function populateShopFilter() {
      const sel = $('[data-shop-filter]'); if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = `<option value="all">All Goals</option>` +
        data.goals.map(g=>`<option value="${g.id}">${esc(g.title)}</option>`).join('') +
        `<option value="none">General (no goal)</option>`;
      if (cur) sel.value = cur;
    }

    function renderShoppingList() {
      const el = $('[data-shopping-body]'); if (!el) return;
      let items = data.shoppingItems;
      if (shopFilter==='none') items = items.filter(it=>!it.goalId);
      else if (shopFilter!=='all') items = items.filter(it=>it.goalId===shopFilter);

      const need   = items.filter(it=>!it.bought || restockInfo(it)?.isDue);
      const bought = items.filter(it=>it.bought && !restockInfo(it)?.isDue);
      const needTotal   = need.reduce((s,it)=>s+((+it.price||0)*(+it.qty||1)),0);
      const boughtTotal = bought.reduce((s,it)=>s+((+it.price||0)*(+it.qty||1)),0);

      el.innerHTML = shopAddFormHTML('none', 'Add a general item…') +
        `<div class="shop-totals">
          <span>Need to buy <b>$${needTotal.toFixed(2)}</b></span>
          <span>Already bought <b>$${boughtTotal.toFixed(2)}</b></span>
        </div>
        <div class="shop-list">
          ${need.length ? need.map(it=>shoppingItemRow(it,true)).join('') : `<p class="bkt__empty">Nothing to buy — you're stocked up.</p>`}
          ${bought.length ? `<p class="shop-group-lab">Bought</p>${bought.map(it=>shoppingItemRow(it,true)).join('')}` : ''}
        </div>`;
    }

    /* =====================  HOME WIDGET  ===================== */
    function renderWidget() {
      const el = $('[data-goals-widget]'); if (!el) return;
      if (!data.goals.length) { el.innerHTML = emptyHTML('No goals yet','Open the Goals tab to forge your first.'); return; }
      const top = [...data.goals].sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999')).slice(0,4);
      el.innerHTML = top.map(g => {
        const pct = goalProgress(g);
        return `<div class="goal-mini">
          <div class="goal-mini__row">
            <span class="goal-mini__title">${esc(g.title)}</span>
            <span class="goal-mini__pct">${pct}%</span>
          </div>
          <div class="goal-mini__bar"><i style="width:${pct}%;background:${catColor(g.categoryId)}"></i></div>
        </div>`;
      }).join('');
    }

    function renderAll() {
      seed();
      populateCategorySelects();
      renderCatBar();
      renderGoals();
      populateShopFilter();
      renderShoppingList();
      renderWidget();
    }

    let wired = false;
    function init() {
      const root = $('.board--goals-pro');
      renderAll();
      if (wired || !root) return; wired = true;

      const newForm = $('[data-goal-form]');
      if (newForm) newForm.addEventListener('submit', e => {
        e.preventDefault();
        const title = newForm.querySelector('[data-gf="title"]').value.trim(); if (!title) return;
        const categoryId = newForm.querySelector('[data-gf="category"]').value || data.categories[0]?.id || 'general';
        const deadline = newForm.querySelector('[data-gf="deadline"]').value || '';
        data.goals.unshift({ id:uid(), title, categoryId, deadline, notes:'', steps:[], legacyProgress:0, createdAt:Date.now(), open:true, view:'steps' });
        persist(); newForm.reset(); renderGoals(); renderWidget(); populateShopFilter(); toast('Goal added ✓');
      });

      root.addEventListener('click', e => {
        if (e.target.closest('[data-goalcat-edit]'))     { catEditing = true; renderCatBar(); return; }
        if (e.target.closest('[data-goalcat-edit-done]')) { catEditing = false; renderCatBar(); return; }
        if (e.target.closest('[data-goalcat-add]')) {
          const inp = $('#goal-cat-new-inp'); const lbl = (inp?.value||'').trim(); if (!lbl) return;
          const id = slug(lbl);
          if (!data.categories.find(c=>c.id===id)) { data.categories.push({id,label:lbl}); persist(); }
          renderCatBar(); populateCategorySelects(); renderGoals(); return;
        }
        const catDel = e.target.closest('[data-goalcat-del]');
        if (catDel) {
          if (data.categories.length<=1) { toast('Keep at least one category'); return; }
          const idx = +catDel.dataset.goalcatDel; const removed = data.categories[idx];
          data.categories.splice(idx,1);
          const fallback = data.categories[0].id;
          data.goals.forEach(g=>{ if (g.categoryId===removed.id) g.categoryId = fallback; });
          persist(); renderCatBar(); populateCategorySelects(); renderGoals(); return;
        }
        const catFilterBtn = e.target.closest('[data-goal-filter]');
        if (catFilterBtn) { catFilter = catFilterBtn.dataset.goalFilter; renderCatBar(); renderGoals(); return; }

        const toggle = e.target.closest('[data-goal-toggle]');
        if (toggle) { const g=data.goals.find(x=>x.id===toggle.dataset.goalToggle); if (g) { g.open=!g.open; persist(); renderGoals(); } return; }
        const vtab = e.target.closest('[data-goal-view]');
        if (vtab) { const [id,view]=vtab.dataset.goalView.split(':'); const g=data.goals.find(x=>x.id===id); if (g) { g.view=view; persist(); renderGoals(); } return; }
        const gdel = e.target.closest('[data-goal-del]');
        if (gdel) {
          const id = gdel.dataset.goalDel;
          if (confirm('Delete this goal and its steps/shopping items?')) {
            data.goals = data.goals.filter(g=>g.id!==id);
            data.shoppingItems = data.shoppingItems.filter(it=>it.goalId!==id);
            persist(); renderGoals(); renderWidget(); populateShopFilter(); renderShoppingList();
          }
          return;
        }

        const stepToggle = e.target.closest('[data-step-toggle]');
        if (stepToggle) {
          const [gid,sid] = stepToggle.dataset.stepToggle.split(':');
          const g = data.goals.find(x=>x.id===gid); const s = g?.steps.find(x=>x.id===sid);
          if (s) { s.done=!s.done; persist(); renderGoals(); renderWidget(); }
          return;
        }
        const stepDel = e.target.closest('[data-step-del]');
        if (stepDel) {
          const [gid,sid] = stepDel.dataset.stepDel.split(':');
          const g = data.goals.find(x=>x.id===gid);
          if (g) { g.steps = g.steps.filter(x=>x.id!==sid); persist(); renderGoals(); renderWidget(); }
          return;
        }

        const shopToggle = e.target.closest('[data-shop-toggle]');
        if (shopToggle) {
          const it = data.shoppingItems.find(x=>x.id===shopToggle.dataset.shopToggle); if (!it) return;
          const info = restockInfo(it);
          const today = localDateKey();
          if (!it.bought) { it.bought = true; it.boughtAt = today; }
          else if (info && info.isDue) { it.boughtAt = today; }
          else { it.bought = false; it.boughtAt = null; }
          persist(); renderGoals(); renderShoppingList();
          return;
        }
        const shopDel = e.target.closest('[data-shop-del]');
        if (shopDel) {
          data.shoppingItems = data.shoppingItems.filter(x=>x.id!==shopDel.dataset.shopDel);
          persist(); renderGoals(); renderShoppingList();
          return;
        }
      });

      root.addEventListener('submit', e => {
        const stepAdd = e.target.closest('[data-step-add]');
        if (stepAdd) {
          e.preventDefault();
          const g = data.goals.find(x=>x.id===stepAdd.dataset.stepAdd); if (!g) return;
          const txt = stepAdd.querySelector('.task-add__txt').value.trim(); if (!txt) return;
          const date = stepAdd.querySelector('.task-add__date').value || '';
          g.steps.push({id:uid(),text:txt,done:false,date});
          persist(); renderGoals(); renderWidget();
          return;
        }
        const shopAdd = e.target.closest('[data-shop-add]');
        if (shopAdd) {
          e.preventDefault();
          const goalKey = shopAdd.dataset.shopAdd;
          const get = (k)=> shopAdd.querySelector(`[data-sf="${k}"]`)?.value || '';
          const name = get('name').trim(); if (!name) return;
          const goalId = goalKey==='none' ? '' : goalKey;
          data.shoppingItems.push({
            id:uid(), goalId, name, qty: +get('qty')||1, price: +get('price')||0, link: get('link').trim(),
            bought:false, boughtAt:null, recurDays: get('recur') ? +get('recur') : null, note:'',
          });
          persist(); shopAdd.reset(); renderGoals(); populateShopFilter(); renderShoppingList(); toast('Added to shopping list ✓');
          return;
        }
      });

      root.addEventListener('change', e => {
        const f = e.target.closest('[data-goal-field]');
        if (f) {
          const [id,key] = f.dataset.goalField.split(':');
          const g = data.goals.find(x=>x.id===id); if (!g) return;
          g[key] = f.value; persist(); renderGoals(); renderWidget();
          return;
        }
        const sf = e.target.closest('[data-shop-filter]');
        if (sf) { shopFilter = sf.value; renderShoppingList(); return; }
        const rename = e.target.closest('[data-goalcat-rename]');
        if (rename) {
          const idx = +rename.dataset.goalcatRename;
          const lbl = rename.value.trim(); if (!lbl) return;
          data.categories[idx].label = lbl; persist(); populateCategorySelects(); renderGoals();
          return;
        }
      });

      root.addEventListener('input', e => {
        const notes = e.target.closest('[data-goal-notes]');
        if (notes) {
          const g = data.goals.find(x=>x.id===notes.dataset.goalNotes); if (!g) return;
          g.notes = notes.value; persist();
        }
      });
    }

    /* Voice and any future automation come in HERE rather than writing to
       storage directly — this is the one path that also persists, re-renders
       the widget, and refreshes the shopping filter. Bypassing it leaves the
       screen showing yesterday. */
    function add(title, deadline, categoryId) {
      const t = String(title || '').trim(); if (!t) return null;
      const g = {
        id: uid(), title: t,
        categoryId: categoryId || data.categories[0]?.id || 'general',
        deadline: deadline || '',
        notes: '', steps: [], legacyProgress: 0,
        createdAt: Date.now(), open: true, view: 'steps',
      };
      data.goals.unshift(g);
      persist(); renderGoals(); renderWidget(); populateShopFilter();
      return g;
    }

    return { init, renderWidget, renderAll, add };
  })();

  /* ═══════════════════  REMINDERS  ═══════════════════ */
  const Reminders = (() => {
    let items = Store.get(KEYS.reminders, []);
    const persist = () => Store.set(KEYS.reminders, items);
    const sorted  = () => items.slice().sort((a,b) => new Date(a.when)-new Date(b.when));

    function add(text, when) { items.push({id:uid(),text,when,done:false}); persist(); render(); }
    function remove(id)      { items=items.filter(r=>r.id!==id); persist(); render(); }
    function toggle(id)      { const r=items.find(x=>x.id===id); if(r){r.done=!r.done; persist(); render();} }

    function render() {
      const list  = $('[data-reminders-list]');
      const count = $('[data-reminders-count]');
      const active = items.filter(r=>!r.done).length;
      if (count) count.textContent = active;
      if (!list) return;
      if (!items.length) { list.innerHTML=`<li>${emptyHTML('No reminders','Add a time-stamped reminder above.')}</li>`; return; }
      const now = Date.now();
      list.innerHTML = sorted().map(r => {
        const d = new Date(r.when);
        const overdue = !r.done && d.getTime() < now;
        const dateTxt = isNaN(d) ? '—' : d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
        const timeTxt = isNaN(d) ? '--:--' : d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
        const meta    = isNaN(d) ? '' : (overdue ? 'Overdue' : relative(d));
        return `
          <li class="reminder ${r.done?'is-done':''} ${overdue?'is-overdue':''}" data-rem-id="${r.id}">
            <div class="reminder__when">
              <span class="reminder__date">${dateTxt}</span>
              <span class="reminder__time">${timeTxt}</span>
            </div>
            <div class="reminder__body">
              <p class="reminder__text">${esc(r.text)}</p>
              <p class="reminder__meta">${meta}</p>
            </div>
            <div class="reminder__actions">
              <button class="del-btn" data-rem-toggle="${r.id}" aria-label="Toggle done">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12l5 5 9-11" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="del-btn" data-rem-del="${r.id}" aria-label="Delete">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </li>`;
      }).join('');
    }

    function relative(d) {
      const diff = d.getTime()-Date.now(), days = Math.round(diff/86400000);
      if (days===0) return 'Today'; if (days===1) return 'Tomorrow';
      if (days>1) return `In ${days} days`; return `${Math.abs(days)} days ago`;
    }

    function init() {
      const form = $('[data-reminder-form]');
      if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = $('#rem-text').value.trim();
        const when = $('#rem-when').value;
        if (!text || !when) return;
        add(text, new Date(when).toISOString()); form.reset(); toast('Reminder set');
      });

      const list = $('[data-reminders-list]');
      if (list) list.addEventListener('click', (e) => {
        const t = e.target.closest('[data-rem-toggle]');
        if (t) { toggle(t.dataset.remToggle); return; }
        const d = e.target.closest('[data-rem-del]');
        if (d) { remove(d.dataset.remDel); toast('Reminder removed'); }
      });

      render();
    }

    /* `add` already existed privately; voice needs it, so it is exposed. */
    return { init, render, add };
  })();

  /* ═══════════════════  APP IDEAS (home)  ═══════════════════
     The backlog for this app itself. Every idea carries WHAT you want, WHICH
     tab it belongs to (including "a brand-new tab"), what KIND of change it is
     and how badly you want it. Sorted by need first, then newest — so the top
     of the list is always the next thing worth building.                      */
  const Ideas = (() => {
    const KIND = { feature:'New feature', upgrade:'Upgrade', design:'Design', fix:'Fix', tab:'New tab' };
    const PRI  = { 0:'Need it', 1:'Want it', 2:'Someday' };
    let filter = 'all';

    const load  = () => Store.get(KEYS.ideas, []);
    const save  = (list) => Store.set(KEYS.ideas, list);

    function visible(list) {
      if (filter === 'open')  return list.filter(i => !i.built);
      if (filter === 'built') return list.filter(i => i.built);
      return list;
    }
    /* need-it first, then unbuilt before built, then newest */
    function sorted(list) {
      return [...list].sort((a, b) =>
        (a.built?1:0) - (b.built?1:0) ||
        (a.pri ?? 1) - (b.pri ?? 1) ||
        (b.at ?? 0) - (a.at ?? 0));
    }

    function render() {
      const wrap = $('[data-idea-list]'); if (!wrap) return;
      const all  = load();
      const list = sorted(visible(all));
      const openCount = all.filter(i => !i.built).length;

      const count = $('[data-ideas-count]');
      if (count) count.textContent = openCount;

      $$('[data-idea-filter]').forEach(b =>
        b.classList.toggle('is-active', b.dataset.ideaFilter === filter));

      if (!list.length) {
        wrap.innerHTML = `<p class="idea-empty">${
          filter === 'built' ? 'Nothing shipped yet — check one off and it lands here.'
                             : 'No ideas yet. The next upgrade starts as a line above.'}</p>`;
        return;
      }

      wrap.innerHTML = list.map(i => `
        <div class="idea ${i.built ? 'is-built' : ''} pri-${i.pri ?? 1}" data-idea="${i.id}">
          <button class="idea__check" data-idea-toggle="${i.id}"
                  aria-label="${i.built ? 'Mark as not built' : 'Mark as built'}" type="button">
            ${i.built ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5 9-11" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
          </button>
          <div class="idea__body">
            <p class="idea__text">${esc(i.text)}</p>
            <div class="idea__meta">
              ${i.target ? `<span class="idea__tag ${i.target === 'NEW TAB' ? 'is-new' : ''}">${esc(i.target)}</span>` : ''}
              <span class="idea__kind">${esc(KIND[i.kind] || i.kind || 'Idea')}</span>
              <span class="idea__pri">${esc(PRI[i.pri ?? 1])}</span>
            </div>
          </div>
          <button class="idea__del" data-idea-del="${i.id}" aria-label="Delete idea" type="button">×</button>
        </div>`).join('');
    }

    function add(text, target, kind, pri) {
      const list = load();
      list.push({ id: uid(), text, target, kind, pri: Number(pri), built: false, at: Date.now() });
      save(list); render();
      toast('Idea saved');
    }

    /* Plain-text export. The backlog is only useful if it can leave the app —
       paste this straight into a session and it reads as a build brief. */
    function asText() {
      const list = sorted(load());
      if (!list.length) return 'No ideas yet.';
      const open  = list.filter(i => !i.built);
      const built = list.filter(i => i.built);
      const line = i => `- [${i.built ? 'x' : ' '}] ${i.text}`
        + `  (${i.target || 'unassigned'} · ${KIND[i.kind] || i.kind} · ${PRI[i.pri ?? 1]})`;
      return ['# App ideas', '', `## To build (${open.length})`, ...open.map(line),
              ...(built.length ? ['', `## Built (${built.length})`, ...built.map(line)] : [])].join('\n');
    }

    function init() {
      const copy = $('[data-ideas-copy]');
      if (copy && !copy.dataset.wired) {
        copy.dataset.wired = '1';
        copy.addEventListener('click', async () => {
          const text = asText();
          try { await navigator.clipboard.writeText(text); toast('Backlog copied'); }
          catch (e) {
            /* clipboard is blocked on file:// in some browsers — fall back to a
               selectable prompt so the text is still reachable */
            window.prompt('Copy your backlog:', text);
          }
        });
      }
      const form = $('[data-idea-form]');
      if (form && !form.dataset.wired) {
        form.dataset.wired = '1';
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const t = $('[data-idea-text]');
          const text = (t.value || '').trim(); if (!text) return;
          add(text, $('[data-idea-target]').value, $('[data-idea-kind]').value, $('[data-idea-pri]').value);
          t.value = ''; t.focus();
        });
      }
      const filters = $('[data-idea-filters]');
      if (filters && !filters.dataset.wired) {
        filters.dataset.wired = '1';
        filters.addEventListener('click', (e) => {
          const b = e.target.closest('[data-idea-filter]'); if (!b) return;
          filter = b.dataset.ideaFilter; render();
        });
      }
      const list = $('[data-idea-list]');
      if (list && !list.dataset.wired) {
        list.dataset.wired = '1';
        list.addEventListener('click', (e) => {
          const tog = e.target.closest('[data-idea-toggle]');
          if (tog) {
            const arr = load(); const it = arr.find(x => x.id === tog.dataset.ideaToggle);
            if (it) { it.built = !it.built; save(arr); render(); if (it.built) toast('Shipped'); }
            return;
          }
          const del = e.target.closest('[data-idea-del]');
          if (del) { save(load().filter(x => x.id !== del.dataset.ideaDel)); render(); }
        });
      }
      render();
    }

    /* voice entry point — same list, same sort, same render */
    function add(text, kind, target) {
      const t = String(text || '').trim(); if (!t) return null;
      const list = load();
      const it = {
        id: uid(), at: Date.now(), text: t,
        kind: KIND[kind] ? kind : 'feature',
        pri: 1, built: false,
        target: target || '',
      };
      list.push(it);
      save(list); render();
      return it;
    }

    return { init, render, add };
  })();

  /* ═══════════════════  NOTICED (home)  ═══════════════════
     The app reading itself back to you.

     One hard rule: it may only say things that are TRUE OF YOUR DATA. Every
     line below is computed from a store some tab actually wrote — no filler,
     no horoscope. When there is not enough logged to say anything honest, it
     says exactly that instead of inventing a pattern.

     It reads across tabs on purpose: the useful observations are the ones no
     single tab can see (sleep against training, water against streaks).       */
  const Noticed = (() => {
    const dayKey = (d) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const daysBack = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return dayKey(d); };
    const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch(e){ return fb; } };
    const avg = (a) => a.length ? a.reduce((s,x)=>s+x,0)/a.length : null;
    const r1  = (n) => Math.round(n*10)/10;

    function findings() {
      const out = [];
      const logs  = Store.get('nv.logs', null) || {};
      const sleep = (logs.sleep && logs.sleep.entries) || [];
      const water = (logs.water && logs.water.days) || {};
      const runs  = (logs.running && logs.running.entries) || [];

      /* ── sleep: this week against the fortnight before it ── */
      if (sleep.length >= 6) {
        const cut = daysBack(7);
        const recent = sleep.filter(e => e.date >= cut).map(e => e.hours);
        const older  = sleep.filter(e => e.date <  cut).map(e => e.hours);
        if (recent.length >= 2 && older.length >= 2) {
          const a = avg(recent), b = avg(older), d = r1(a - b);
          if (Math.abs(d) >= 0.4) {
            out.push({ tag:'Sleep', tab:'logs', text: d > 0
              ? `You are sleeping <b>${d}h more</b> a night than you were — ${r1(a)}h average this week.`
              : `You are down <b>${Math.abs(d)}h a night</b> this week — ${r1(a)}h average, from ${r1(b)}h.` });
          }
        }
      }

      /* ── the cross-tab one: does a short night cost you water? ── */
      if (sleep.length >= 5 && Object.keys(water).length >= 5) {
        const goal = (logs.sleep && logs.sleep.goal) || 8;
        const short = [], full = [];
        sleep.forEach(e => {
          const oz = water[e.date];
          if (typeof oz !== 'number') return;
          (e.hours < goal - 1 ? short : full).push(oz);
        });
        if (short.length >= 2 && full.length >= 2) {
          const s = avg(short), f = avg(full);
          if (f > 0 && Math.abs(s - f) / f >= 0.15) {
            out.push({ tag:'Pattern', tab:'logs', text: s < f
              ? `After a <b>short night</b> you drink about <b>${Math.round((1-s/f)*100)}% less water</b>. The tired days are the dry ones.`
              : `Odd one: you drink <b>more</b> on your short-sleep days. Caffeine covering for the sleep, maybe.` });
          }
        }
      }

      /* ── water: the streak, counted honestly ── */
      const wGoal = (logs.water && logs.water.goal) || 100;
      if (Object.keys(water).length >= 3) {
        let streak = 0;
        for (let i = 0; i < 60; i++) {
          const k = daysBack(i);
          if ((water[k] || 0) >= wGoal) streak++;
          else if (i > 0) break;              // today not yet hit is allowed
        }
        if (streak >= 3) out.push({ tag:'Water', tab:'logs', text:`<b>${streak} days</b> straight on your water goal.` });
      }

      /* ── running: is the last one your best pace on that route? ── */
      if (runs.length >= 3) {
        const paced = runs.filter(r => r.miles > 0 && r.secs > 0);
        if (paced.length >= 3) {
          const last = paced[paced.length-1];
          const lastPace = last.secs / last.miles;
          const best = Math.min(...paced.slice(0,-1).map(r => r.secs / r.miles));
          if (lastPace < best) {
            const m = Math.floor(lastPace/60), s = Math.round(lastPace%60);
            out.push({ tag:'Best yet', tab:'logs', gold:true,
              text:`Your last run was your <b>fastest pace</b> yet — ${m}:${String(s).padStart(2,'0')} a mile.` });
          }
        }
      }

      /* ── the map: what is actually overdue ── */
      const mapS = readJSON('nv.map.v2', null);
      if (mapS && Array.isArray(mapS.places)) {
        const t = dayKey(new Date());
        const over = mapS.places.filter(p => !p.done && p.when && p.when.slice(0,10) < t);
        if (over.length) out.push({ tag:'Map', tab:'map',
          text:`<b>${over.length} place${over.length>1?'s':''}</b> on your map ${over.length>1?'have':'has'} gone past the date.` });
      }

      /* ── subscriptions: what leaves the account every month ── */
      const radar = readJSON('radar.v1', null);
      if (radar && Array.isArray(radar.list) && radar.list.length) {
        const monthly = radar.list.reduce((s, x) => {
          const a = Number(x.amount) || 0;
          return s + (x.period === 'yearly' ? a/12 : x.period === 'weekly' ? a*4.33 : a);
        }, 0);
        if (monthly > 0) out.push({ tag:'Money', tab:'subscriptions',
          text:`<b>${(radar.currency||'$')}${Math.round(monthly)}</b> a month leaves on its own, across ${radar.list.length} subscription${radar.list.length>1?'s':''}.` });
      }

      /* ── the backlog you keep for this app ── */
      const ideas = Store.get(KEYS.ideas, []);
      const need = ideas.filter(i => !i.built && i.pri === 0);
      if (need.length) out.push({ tag:'Build', tab:'home',
        text:`<b>${need.length}</b> idea${need.length>1?'s':''} marked <i>need it</i> and still unbuilt.` });

      return out;
    }

    function render() {
      const el = $('[data-noticed]'); if (!el) return;
      const list = findings();
      if (!list.length) {
        el.innerHTML = `<p class="noticed-empty">Nothing worth saying yet — log a few days and patterns start showing up here.</p>`;
        return;
      }
      el.innerHTML = list.slice(0, 5).map(f => `
        <button class="noticed ${f.gold ? 'is-gold' : ''}" data-route="${esc(f.tab)}" type="button">
          <span class="noticed__tag">${esc(f.tag)}</span>
          <span class="noticed__text">${f.text}</span>
        </button>`).join('');
      $$('.noticed', el).forEach(b => b.addEventListener('click', () => Tabs.setActive(b.dataset.route)));
    }
    return { render };
  })();

  /* ═══════════════════  ALERTS  ═══════════════════
     What needs you, now — gathered from the same stores the tabs write to.

     HONEST LIMIT, stated plainly: a web app can only raise a desktop notice
     while it is OPEN in a tab. Phone-style push that arrives when the app is
     closed needs a service worker and a push server; that is a real backend,
     not a checkbox. So this does two things well instead of one thing badly:
       · an in-app drawer that is always accurate the moment you open it
       · desktop notices, if you grant them, while the app is open

     Nothing repeats: each alert is stamped with a key + the day it fired.     */
  const Alerts = (() => {
    const SEEN = 'nv.alerts.seen';
    const dayKey = (d) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch(e){ return fb; } };

    function gather() {
      const out = [];
      const today = dayKey(new Date());

      /* map — places past their date, and places due today */
      const mapS = readJSON('nv.map.v2', null);
      if (mapS && Array.isArray(mapS.places)) {
        mapS.places.forEach(p => {
          if (p.done || !p.when) return;
          const d = p.when.slice(0,10);
          const label = p.name || p.task || 'a place';
          if (d < today) out.push({ id:'map-over-'+p.id, urgent:true, tab:'map',
            tag:'Overdue', text:`<b>${esc(label)}</b> was due ${esc(d)}.` });
          else if (d === today) out.push({ id:'map-today-'+p.id, urgent:true, tab:'map',
            tag:'Today', text:`<b>${esc(label)}</b>${p.task ? ' — ' + esc(p.task) : ''}.` });
        });
      }

      /* subscriptions renewing in the next three days */
      const radar = readJSON('radar.v1', null);
      if (radar && Array.isArray(radar.list)) {
        radar.list.forEach(s => {
          if (!s.renewal) return;
          const days = Math.round((new Date(s.renewal + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
          if (days >= 0 && days <= 3) out.push({ id:'sub-'+s.id+'-'+s.renewal, urgent: days === 0, tab:'subscriptions',
            tag:'Renews', text:`<b>${esc(s.name)}</b> ${days === 0 ? 'renews today' : `renews in ${days} day${days>1?'s':''}`} · ${esc(radar.currency||'$')}${s.amount}.` });
        });
      }

      /* water — only worth saying once the day is well along */
      const logs = Store.get('nv.logs', null) || {};
      const wGoal = (logs.water && logs.water.goal) || 100;
      const oz = (logs.water && logs.water.days && logs.water.days[today]) || 0;
      if (new Date().getHours() >= 18 && oz < wGoal) {
        out.push({ id:'water-'+today, urgent:false, tab:'logs',
          tag:'Water', text:`<b>${wGoal - oz} oz</b> short of your water goal today.` });
      }

      /* sleep — nothing logged for last night */
      const sleep = (logs.sleep && logs.sleep.entries) || [];
      if (sleep.length && new Date().getHours() >= 10 && !sleep.some(e => e.date === today)) {
        out.push({ id:'sleep-'+today, urgent:false, tab:'logs',
          tag:'Sleep', text:`Last night is not logged yet.` });
      }

      /* ideas you called urgent and have not built */
      const need = (Store.get(KEYS.ideas, []) || []).filter(i => !i.built && i.pri === 0);
      if (need.length) out.push({ id:'ideas-'+today, urgent:false, tab:'home',
        tag:'Build', text:`<b>${need.length}</b> idea${need.length>1?'s':''} marked <i>need it</i>.` });

      return out.sort((a,b) => (b.urgent?1:0) - (a.urgent?1:0));
    }

    function render() {
      const list = gather();
      const urgent = list.filter(a => a.urgent).length;
      /* two badges now — the sidebar's and the mobile topbar's — and only one
         of them is ever visible, so both must be kept in step */
      $$('[data-alerts-count]').forEach(countEl => {
        countEl.textContent = list.length;
        countEl.hidden = list.length === 0;
        countEl.classList.toggle('is-urgent', urgent > 0);
      });
      const titleEl = $('[data-alerts-title]');
      if (titleEl) titleEl.textContent = !list.length ? 'All clear'
        : urgent ? `${urgent} need${urgent>1?'':'s'} you now` : `${list.length} to look at`;

      const wrap = $('[data-alerts-list]');
      if (wrap) wrap.innerHTML = !list.length
        ? `<p class="alerts__empty">Nothing pressing. Everything you have logged is on track.</p>`
        : list.map(a => `<button class="alert ${a.urgent?'is-urgent':''}" data-alert-go="${esc(a.tab)}" type="button">
             <span class="alert__tag">${esc(a.tag)}</span>
             <span class="alert__text">${a.text}</span>
           </button>`).join('');

      $$('[data-alert-go]', wrap || document).forEach(b =>
        b.addEventListener('click', () => { close(); Tabs.setActive(b.dataset.alertGo); }));

      notify(list);
      return list;
    }

    /* desktop notices — only for urgent items, only once each, only if allowed */
    function notify(list) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const seen = readJSON(SEEN, {});
      const today = dayKey(new Date());
      let changed = false;
      list.filter(a => a.urgent).slice(0, 3).forEach(a => {
        if (seen[a.id] === today) return;
        seen[a.id] = today; changed = true;
        try {
          new Notification('Life Tracker', {
            body: a.tag + ' — ' + a.text.replace(/<[^>]+>/g, ''),
            tag: a.id, silent: false,
          });
        } catch (e) {}
      });
      if (changed) { try { localStorage.setItem(SEEN, JSON.stringify(seen)); } catch(e){} }
    }

    function open()  { const d = $('[data-alerts]'); if (d) { render(); d.hidden = false; } }
    function close() { const d = $('[data-alerts]'); if (d) d.hidden = true; }

    function paintPermission() {
      const btn = $('[data-alerts-permit]'), note = $('[data-alerts-note]');
      if (!btn || !note) return;
      if (!('Notification' in window)) {
        btn.hidden = true; note.textContent = 'This browser cannot show desktop alerts.'; return;
      }
      if (Notification.permission === 'granted') {
        btn.hidden = true;
        note.textContent = 'Desktop alerts are on — they arrive while the app is open.';
      } else if (Notification.permission === 'denied') {
        btn.hidden = true;
        note.textContent = 'Desktop alerts are blocked in your browser settings for this site.';
      } else {
        btn.hidden = false;
        note.textContent = 'Alerts appear while the app is open in a tab.';
      }
    }

    /* ── phone alerts (real push, via the service worker) ── */
    async function paintPush() {
      const btn = $('[data-push-toggle]'), note = $('[data-push-note]');
      if (!btn || !note || !window.NVPush) return;
      const s = await window.NVPush.status();
      const msg = {
        'unsupported':       ['', 'This browser cannot do phone alerts.'],
        'ios-needs-install': ['', 'On iPhone: tap Share → Add to Home Screen, then open it from there. Apple only allows alerts from an installed app.'],
        'denied':            ['', 'Alerts are blocked for this site in your browser settings.'],
        'no-sw':             ['', 'Alerts need the app served over https — they will work on your live site, not from a local file.'],
        'off':               ['Turn on phone alerts', 'Get your day even when the app is closed.'],
        'on':                ['Turn off phone alerts', 'Phone alerts are on. Your daily push arrives even with the app closed.'],
      }[s] || ['', ''];
      btn.hidden = !msg[0];
      btn.textContent = msg[0];
      btn.dataset.state = s;
      note.textContent = msg[1];
    }

    function init() {
      $$('[data-alerts-open]').forEach(b => b.addEventListener('click', () => { open(); paintPush(); }));
      $$('[data-alerts-close]').forEach(b => b.addEventListener('click', close));
      $('[data-push-toggle]')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        if (btn.dataset.state === 'on') { await window.NVPush.unsubscribe(); }
        else {
          const r = await window.NVPush.subscribe();
          if (!r.ok) toast(
            r.why === 'ios-needs-install' ? 'Add to Home Screen first' :
            r.why === 'denied'            ? 'You declined notifications' :
            r.why === 'no-server-key'     ? 'Server keys not set up yet' :
            r.why === 'signed-out'        ? 'Sign in first — alerts are tied to your account' :
            r.why === 'no-cloud'          ? 'Alerts need the cloud sync connected' :
                                            'Could not turn alerts on');
        }
        btn.disabled = false;
        paintPush();
      });
      /* a tapped notification asks the app to open that tab */
      window.addEventListener('nv-go-tab', (e) => {
        if (e.detail && REAL_PANELS.includes(e.detail)) Tabs.setActive(e.detail);
      });
      $('[data-alerts-permit]')?.addEventListener('click', () => {
        /* permission MUST be requested from a real click — browsers ignore it otherwise */
        Notification.requestPermission().then(() => { paintPermission(); render(); });
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      paintPermission();
      render();
      setInterval(() => { if (!document.hidden) render(); }, 15 * 60 * 1000);
    }
    return { init, render, open };
  })();

  /* ═══════════════════  WORKOUT WIDGET (home)  ═══════════════════ */
  const Workout = (() => {
    function render() {
      const el = $('[data-workout-today]'); if (!el) return;
      const day = SPLIT[new Date().getDay()];

      if (day.type === 'rest') {
        el.innerHTML = `
          <div class="rest-state">
            <span class="rest-state__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.03-.92-.1-1.36A6 6 0 0 1 12.5 3.1 9.3 9.3 0 0 0 12 3Z" stroke-linejoin="round"/></svg>
            </span>
            <p class="rest-state__title">${day.title}</p>
            <p class="rest-state__note">${day.note}</p>
          </div>`;
        return;
      }

      const dateKey = localDateKey();
      const done    = Store.get(KEYS.workout(dateKey), {});
      const total   = day.exercises.length;
      const completed = day.exercises.filter(ex => done[ex.id]).length;

      el.innerHTML = `
        <div class="workout__head">
          <div>
            <p class="workout__day">${day.title}</p>
            <p class="workout__focus">${day.focus}</p>
          </div>
          <span class="workout__progress" data-workout-count>${completed}/${total}</span>
        </div>
        <div class="workout__bar"><i data-workout-fill style="width:${total?(completed/total)*100:0}%"></i></div>
        <div class="workout__list">
          ${day.exercises.map(ex => `
            <label class="check">
              <input type="checkbox" class="check__input" data-workout-ex="${ex.id}" ${done[ex.id]?'checked':''} />
              <span class="check__box" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5 9-11" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <span class="check__text">${esc(ex.name)}</span>
              <span class="check__rx">${ex.sets}×${ex.lo}-${ex.hi}</span>
            </label>`).join('')}
        </div>`;

      el.querySelectorAll('[data-workout-ex]').forEach(input => {
        input.addEventListener('change', () => {
          const store = Store.get(KEYS.workout(dateKey), {});
          store[input.dataset.workoutEx] = input.checked;
          Store.set(KEYS.workout(dateKey), store);
          const comp = day.exercises.filter(ex => store[ex.id]).length;
          const cEl = $('[data-workout-count]'), fEl = $('[data-workout-fill]');
          if (cEl) cEl.textContent = `${comp}/${total}`;
          if (fEl) fEl.style.width = (total?(comp/total)*100:0)+'%';
        });
      });
    }
    return { init:render, render };
  })();

  /* ═══════════════════  BODY WEIGHT  ═══════════════════ */
  const BodyWeight = (() => {
    const DEFAULT = {startWeight:'', startDate:'2026-06-01', currentWeight:''};
    let state = Object.assign({}, DEFAULT, Store.get(KEYS.bodyWeight, {}));
    const persist = () => Store.set(KEYS.bodyWeight, state);

    function updateDelta() {
      const el = $('[data-bw-delta]'); if (!el) return;
      const s = num(state.startWeight), c = num(state.currentWeight);
      if (!s || !c) { el.textContent = '—'; el.className = 'bw__delta'; return; }
      const diff = +(c - s).toFixed(1);
      if (diff === 0) { el.textContent = '= No change'; el.className = 'bw__delta'; return; }
      el.textContent = `${diff>0?'▲':'▼'} ${Math.abs(diff)} kg`;
      el.className = `bw__delta ${diff>0?'is-up':'is-down'}`;
    }

    function render() {
      const si = $('[data-bw-start]'), ci = $('[data-bw-current]'), sd = $('[data-bw-startdate]');
      if (si) si.value = state.startWeight || '';
      if (ci) ci.value = state.currentWeight || '';
      if (sd) sd.textContent = state.startDate || '2026-06-01';
      updateDelta();
    }

    function init() {
      render();
      $('[data-bw-start]')?.addEventListener('change', e => {
        state.startWeight = e.target.value.trim(); persist(); updateDelta();
      });
      $('[data-bw-current]')?.addEventListener('change', e => {
        state.currentWeight = e.target.value.trim(); persist(); updateDelta();
        ProgressLog.refresh();
      });
    }

    return { init, render, get state() { return state; } };
  })();

  /* ═══════════════════  GYM HUB  ═══════════════════ */
  const Gym = (() => {
    let logs = Store.get(KEYS.gymLogs, {});
    let activeDay      = new Date().getDay();
    let sessionDateKey = localDateKey();
    let built = false, saveTimer = null;

    const persist  = () => Store.set(KEYS.gymLogs, logs);
    const exKeyOf  = (dayKey, exId) => `${dayKey}/${exId}`;
    const volume   = (sets) => sets.reduce((s,r) => s + num(r.w)*num(r.r), 0);
    const topSet   = (sets) => {
      let best = null;
      sets.forEach(s => { if(num(s.w)>0 && (!best||num(s.w)>num(best.w))) best=s; });
      return best;
    };

    /* ── SPLIT MUTATIONS ── */
    function addExercise(dayIdx, data) {
      const day = SPLIT[dayIdx];
      if (!day || day.type==='rest') return;
      day.exercises.push({
        id:       uid(),
        name:     (data.name||'New Exercise').trim(),
        bodyPart: (data.bodyPart||'').trim(),
        sets:     clamp(parseInt(data.sets)||3, 1, 20),
        lo:       clamp(parseInt(data.lo)  ||8, 1, 50),
        hi:       clamp(parseInt(data.hi)  ||12,1, 50),
        rest:     clamp(parseInt(data.rest)||90, 0, 600),
      });
      persistSplit(); renderPills(); renderSession(); ProgressLog.refresh(); toast('Exercise added');
    }

    function removeExercise(dayIdx, exId) {
      const day = SPLIT[dayIdx]; if (!day||!day.exercises) return;
      day.exercises = day.exercises.filter(e => e.id!==exId);
      persistSplit(); renderSession(); ProgressLog.refresh(); toast('Exercise removed');
    }

    function updateExConfig(dayIdx, exId, cfg) {
      const day = SPLIT[dayIdx]; if (!day||!day.exercises) return;
      const ex = day.exercises.find(e => e.id===exId); if (!ex) return;
      if (cfg.name)               ex.name     = cfg.name.trim()     || ex.name;
      if (cfg.bodyPart !== undefined) ex.bodyPart = cfg.bodyPart.trim();
      if (cfg.lo)                 ex.lo   = clamp(parseInt(cfg.lo)  ||ex.lo, 1, 50);
      if (cfg.hi)                 ex.hi   = clamp(parseInt(cfg.hi)  ||ex.hi, 1, 50);
      if (cfg.rest !== undefined) ex.rest = clamp(parseInt(cfg.rest)||0,     0, 600);
      persistSplit(); renderSession(); ProgressLog.refresh(); toast('Exercise updated');
    }

    function changeSetCount(dayIdx, exId, delta) {
      const day = SPLIT[dayIdx]; if (!day||!day.exercises) return;
      const ex = day.exercises.find(e => e.id===exId); if (!ex) return;
      ex.sets = clamp(ex.sets + delta, 1, 20);
      persistSplit(); renderSession();
    }

    /* ── DAY PILLS ── */
    function renderPills() {
      const wrap = $('[data-day-pills]'); if (!wrap) return;
      const today = new Date().getDay();
      wrap.innerHTML = SPLIT.map((d,i) => `
        <button class="day-pill ${i===activeDay?'is-active':''} ${d.type==='rest'?'is-rest':''} ${i===today?'is-today':''}"
                data-day="${i}" role="tab" aria-selected="${i===activeDay}">
          <span class="day-pill__dow">${d.dow}</span>
          <span class="day-pill__type">${d.label}</span>
        </button>`).join('');
      wrap.querySelectorAll('[data-day]').forEach(b =>
        b.addEventListener('click', () => {
          activeDay = parseInt(b.dataset.day,10);
          sessionDateKey = localDateKey();
          renderPills(); renderSession();
        }));
    }

    /* ── SESSION ── */
    function renderSession() {
      const host  = $('[data-gym-session]');
      const volEl = $('[data-split-volume]');
      if (!host) return;
      const day    = SPLIT[activeDay];
      const dayIdx = activeDay;

      if (day.type === 'rest') {
        if (volEl) volEl.textContent = 'Rest';
        host.innerHTML = `
          <div class="rest-state" style="padding:48px 0">
            <span class="rest-state__mark"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.03-.92-.1-1.36A6 6 0 0 1 12.5 3.1 9.3 9.3 0 0 0 12 3Z" stroke-linejoin="round"/></svg></span>
            <p class="rest-state__title">${day.title}</p>
            <p class="rest-state__note">${day.note}</p>
          </div>`; return;
      }

      host.innerHTML = `
        <div class="session__head">
          <div>
            <p class="session__title">${day.title}</p>
            <p class="session__focus">${day.focus}</p>
          </div>
          <div class="session__date-wrap">
            <label class="session__date-label" for="session-date">Session Date</label>
            <input id="session-date" class="input input--sm" type="date" value="${sessionDateKey}" data-session-date />
          </div>
        </div>
        ${day.exercises.map(ex => exerciseHTML(day,ex,dayIdx,sessionDateKey)).join('')}
        <div class="add-ex-wrap">
          <button class="btn btn--ghost btn--sm add-ex-toggle" data-add-ex-toggle>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
            Add Exercise
          </button>
          <div class="add-ex-form" data-add-ex-form hidden>
            <div class="add-ex-form__grid">
              <div class="field"><label>Name</label>
                <input class="input input--sm" data-aef-name placeholder="e.g. Bulgarian Split Squat" maxlength="40"/>
              </div>
              <div class="field"><label>Body Part</label>
                <input class="input input--sm" data-aef-body placeholder="e.g. Quads, Chest" maxlength="24"/>
              </div>
              <div class="field"><label>Sets</label>
                <input class="input input--sm" type="number" data-aef-sets value="3" min="1" max="20" inputmode="numeric"/>
              </div>
              <div class="field"><label>Lo Reps</label>
                <input class="input input--sm" type="number" data-aef-lo value="8" min="1" max="50" inputmode="numeric"/>
              </div>
              <div class="field"><label>Hi Reps</label>
                <input class="input input--sm" type="number" data-aef-hi value="12" min="1" max="50" inputmode="numeric"/>
              </div>
              <div class="field"><label>Rest (s)</label>
                <input class="input input--sm" type="number" data-aef-rest value="90" min="0" max="600" inputmode="numeric"/>
              </div>
            </div>
            <div class="add-ex-form__actions">
              <button class="btn btn--ghost btn--sm" data-add-ex-cancel>Cancel</button>
              <button class="btn btn--primary btn--sm" data-add-ex-submit>Add Exercise</button>
            </div>
          </div>
        </div>`;

      updateSplitVolume(day, sessionDateKey);

      // Session date change
      $('[data-session-date]', host)?.addEventListener('change', e => {
        sessionDateKey = e.target.value || localDateKey();
        renderSession();
      });

      // Add-exercise toggle
      $('[data-add-ex-toggle]', host)?.addEventListener('click', () => {
        const form = $('[data-add-ex-form]', host);
        form.hidden = !form.hidden;
        if (!form.hidden) $('[data-aef-name]', host)?.focus();
      });
      $('[data-add-ex-cancel]', host)?.addEventListener('click', () => {
        $('[data-add-ex-form]', host).hidden = true;
      });
      $('[data-add-ex-submit]', host)?.addEventListener('click', () => {
        const name = $('[data-aef-name]', host)?.value.trim();
        if (!name) { toast('Exercise name required'); return; }
        addExercise(dayIdx, {
          name,
          bodyPart: $('[data-aef-body]',  host)?.value,
          sets:     $('[data-aef-sets]',  host)?.value,
          lo:       $('[data-aef-lo]',    host)?.value,
          hi:       $('[data-aef-hi]',    host)?.value,
          rest:     $('[data-aef-rest]',  host)?.value,
        });
      });

      // Delegated handlers — use property assignment so re-renders never stack listeners
      host.oninput = e => {
        if (!e.target.closest('[data-w],[data-r]')) return;
        const exEl = e.target.closest('.exercise');
        if (exEl) queueSave(day, exEl, sessionDateKey);
      };

      host.onclick = e => {
        // toggle config
        const toggleCfg = e.target.closest('[data-ex-toggle-cfg]');
        if (toggleCfg) {
          const exEl = toggleCfg.closest('.exercise');
          const cfg  = exEl?.querySelector('.ex-config');
          if (cfg) { cfg.hidden = !cfg.hidden; }
          return;
        }
        // delete exercise
        const del = e.target.closest('[data-ex-delete]');
        if (del) {
          const exEl = del.closest('.exercise');
          const name = exEl?.querySelector('.exercise__name')?.textContent || 'this exercise';
          if (confirm(`Remove "${name}"?`)) removeExercise(dayIdx, exEl.dataset.exId);
          return;
        }
        // save config
        const saveCfg = e.target.closest('[data-cfg-save]');
        if (saveCfg) {
          const exEl = saveCfg.closest('.exercise');
          const cfg  = exEl.querySelector('.ex-config');
          updateExConfig(dayIdx, exEl.dataset.exId, {
            name:     cfg.querySelector('[data-cfg-name]')?.value,
            bodyPart: cfg.querySelector('[data-cfg-body]')?.value,
            lo:       cfg.querySelector('[data-cfg-lo]')?.value,
            hi:       cfg.querySelector('[data-cfg-hi]')?.value,
            rest:     cfg.querySelector('[data-cfg-rest]')?.value,
          }); return;
        }
        // +set
        const addSet = e.target.closest('[data-set-add]');
        if (addSet) { changeSetCount(dayIdx, addSet.closest('.exercise')?.dataset.exId, +1); return; }
        // -set
        const rmSet = e.target.closest('[data-set-remove]');
        if (rmSet)  { changeSetCount(dayIdx, rmSet.closest('.exercise')?.dataset.exId,  -1); return; }
      };
    }

    /* ── EXERCISE HTML ── */
    function exerciseHTML(day, ex, dayIdx, dateKey) {
      const exKey      = exKeyOf(day.key, ex.id);
      const history    = logs[exKey] || [];
      const todayEntry = history.find(h => h.date===dateKey);
      const previous   = history.filter(h => h.date!==dateKey).slice(-1)[0];

      const lastTop = previous ? topSet(previous.sets) : null;
      const lastTxt = lastTop
        ? `Last · ${num(lastTop.w)}kg × ${num(lastTop.r)} reps`
        : 'No history — set the baseline';

      const setRows = Array.from({length:ex.sets}).map((_,i) => {
        const cur  = todayEntry?.sets?.[i] || {};
        const prev = previous?.sets?.[i]   || {};
        const wVal = (cur.w ?? '') === '' ? '' : cur.w;
        const rVal = (cur.r ?? '') === '' ? '' : cur.r;
        const wPh  = prev.w != null && prev.w !== '' ? String(prev.w) : '—';
        const rPh  = prev.r != null && prev.r !== '' ? String(prev.r) : '—';
        return `
          <div class="set-row" data-set="${i}">
            <span class="set-row__n">Set ${i+1}</span>
            <span class="set-field">
              <input class="input input--sm" data-w inputmode="decimal" value="${wVal}" placeholder="${wPh}" aria-label="${esc(ex.name)} set ${i+1} weight"/>
              <span class="set-field__unit">kg</span>
            </span>
            <span class="set-field">
              <input class="input input--sm" data-r inputmode="numeric" value="${rVal}" placeholder="${rPh}" aria-label="${esc(ex.name)} set ${i+1} reps"/>
              <span class="set-field__unit">rep</span>
            </span>
          </div>`;
      }).join('');

      return `
        <div class="exercise" data-ex-key="${exKey}" data-ex-id="${esc(ex.id)}" data-day-idx="${dayIdx}">
          <div class="exercise__head">
            <div class="exercise__name-wrap">
              <span class="exercise__name">${esc(ex.name)}</span>
              ${ex.bodyPart?`<span class="exercise__bp">${esc(ex.bodyPart)}</span>`:''}
            </div>
            <span class="exercise__rx"><b>${ex.sets}×${ex.lo}-${ex.hi}</b> · ${ex.rest}s rest</span>
            <button class="icon-btn" data-ex-toggle-cfg title="Configure">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="icon-btn" data-ex-delete title="Remove exercise">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <div class="ex-config" hidden>
            <div class="ex-config__grid">
              <div class="field"><label>Name</label>
                <input class="input input--sm" data-cfg-name value="${esc(ex.name)}" maxlength="40"/>
              </div>
              <div class="field"><label>Body Part</label>
                <input class="input input--sm" data-cfg-body value="${esc(ex.bodyPart||'')}" placeholder="e.g. Quads" maxlength="24"/>
              </div>
              <div class="field"><label>Lo Reps</label>
                <input class="input input--sm" type="number" data-cfg-lo value="${ex.lo}" min="1" max="50"/>
              </div>
              <div class="field"><label>Hi Reps</label>
                <input class="input input--sm" type="number" data-cfg-hi value="${ex.hi}" min="1" max="50"/>
              </div>
              <div class="field"><label>Rest (s)</label>
                <input class="input input--sm" type="number" data-cfg-rest value="${ex.rest}" min="0" max="600"/>
              </div>
            </div>
            <div class="ex-config__actions">
              <button class="btn btn--primary btn--sm" data-cfg-save>Save Changes</button>
            </div>
          </div>
          <div class="exercise__meta">
            <span class="exercise__last">${lastTxt}</span>
            <span class="exercise__delta ${deltaClass(history,dateKey)}" data-ex-delta>${deltaText(history,dateKey)}</span>
          </div>
          <div class="sets__legend"><span>Set</span><span>Weight</span><span>Reps</span></div>
          <div class="sets">${setRows}</div>
          <div class="set-ctrl">
            <button class="chip chip--sm" data-set-add title="Add set">+ Set</button>
            <button class="chip chip--sm" data-set-remove title="Remove last set">− Set</button>
          </div>
        </div>`;
    }

    /* ── PROGRESSIVE OVERLOAD ── */
    function deltaInfo(history, dateKey) {
      const todayEntry = history.find(h => h.date===dateKey);
      const previous   = history.filter(h => h.date!==dateKey).slice(-1)[0];
      const tv = todayEntry ? volume(todayEntry.sets) : 0;
      const pv = previous  ? volume(previous.sets)   : 0;
      if (tv===0)  return {cls:'',       text:'Awaiting log'};
      if (!previous) return {cls:'is-new', text:'New entry'};
      if (tv>pv)   return {cls:'is-up',   text:`▲ +${Math.round(tv-pv)} vol`};
      if (tv<pv)   return {cls:'is-down', text:`▼ ${Math.round(tv-pv)} vol`};
      return {cls:'', text:'= holding'};
    }
    const deltaClass = (h,d) => deltaInfo(h,d).cls;
    const deltaText  = (h,d) => deltaInfo(h,d).text;

    function queueSave(day, exEl, dateKey) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveExercise(day, exEl, dateKey), 450);
      writeExercise(exEl, dateKey);
      refreshDelta(exEl, dateKey);
      updateSplitVolume(day, dateKey);
    }

    function writeExercise(exEl, dateKey) {
      const exKey = exEl.dataset.exKey;
      const rows  = $$('.set-row', exEl);
      const sets  = rows.map(row => ({
        w: row.querySelector('[data-w]').value.trim(),
        r: row.querySelector('[data-r]').value.trim(),
      }));
      const hasData = sets.some(s => s.w!==''||s.r!=='');
      const history = (logs[exKey]||[]).filter(h => h.date!==dateKey);
      if (hasData) history.push({date:dateKey, sets});
      logs[exKey] = history;
    }

    function saveExercise(day, exEl, dateKey) {
      writeExercise(exEl, dateKey); persist();
      ProgressLog.refresh(); toast('Lift saved');
    }

    function refreshDelta(exEl, dateKey) {
      const info = deltaInfo(logs[exEl.dataset.exKey]||[], dateKey);
      const el   = exEl.querySelector('[data-ex-delta]');
      if (el) { el.className = `exercise__delta ${info.cls}`; el.textContent = info.text; }
    }

    function updateSplitVolume(day, dateKey) {
      const volEl = $('[data-split-volume]'); if (!volEl) return;
      let total = 0;
      day.exercises.forEach(ex => {
        const entry = (logs[exKeyOf(day.key,ex.id)]||[]).find(h => h.date===dateKey);
        if (entry) total += volume(entry.sets);
      });
      volEl.textContent = total>0 ? `${Math.round(total)} kg·vol` : 'Log lifts';
    }

    function ensureRendered() {
      if (built) { renderPills(); renderSession(); return; }
      built=true; renderPills(); renderSession();
    }

    return { init:()=>{}, ensureRendered, getLogs:()=>logs };
  })();

  /* ═══════════════════  PROGRESS LOG PANEL  ═══════════════════ */
  const ProgressLog = (() => {
    const DEF_STATE = {x:null, y:null, w:360, h:480, collapsed:false, exKey:null};
    let ps = Object.assign({}, DEF_STATE, Store.get(KEYS.gymLogPanel, {}));
    let isDragging=false, dragOff={x:0,y:0};

    function allExercises() {
      const list = [];
      SPLIT.forEach(day => {
        if (day.type!=='train'||!day.exercises) return;
        day.exercises.forEach(ex => list.push({
          key:      `${day.key}/${ex.id}`,
          label:    `${ex.name}${ex.bodyPart?' ('+ex.bodyPart+')':''} — ${day.title}`,
          name:     ex.name,
          bodyPart: ex.bodyPart||'',
        }));
      });
      return list;
    }

    function buildSelect(panel) {
      const sel = $('[data-log-exercise]', panel); if (!sel) return;
      const prev = sel.value || ps.exKey || '';
      const exs  = allExercises();
      sel.innerHTML = `<option value="">— Select exercise —</option>`
        + exs.map(e => `<option value="${esc(e.key)}" ${e.key===prev?'selected':''}>${esc(e.label)}</option>`).join('');
      if (prev && !sel.value) sel.value = prev;
    }

    function renderHistory(panel) {
      const body = $('[data-log-body]', panel); if (!body) return;
      const sel  = $('[data-log-exercise]', panel);
      const exKey = sel?.value || '';
      ps.exKey = exKey;

      if (!exKey) { body.innerHTML = emptyHTML('Select an exercise','Use the dropdown above to view history.'); return; }

      const logs    = Gym.getLogs();
      const history = (logs[exKey]||[]).slice().sort((a,b) => a.date.localeCompare(b.date));
      const exInfo  = allExercises().find(e => e.key===exKey);

      if (!history.length) {
        body.innerHTML = emptyHTML('No history yet','Log a session to start tracking progress.');
        return;
      }

      const rows = history.map((entry,i) => {
        const prev    = i>0 ? history[i-1] : null;
        const vol     = entry.sets.reduce((s,r) => s+num(r.w)*num(r.r), 0);
        const prevVol = prev ? prev.sets.reduce((s,r) => s+num(r.w)*num(r.r), 0) : null;

        let delta='', dCls='';
        if (prevVol!==null) {
          const diff = vol-prevVol;
          if (diff>0)       { delta=`▲ +${Math.round(diff)}`;  dCls='is-up';   }
          else if (diff<0)  { delta=`▼ ${Math.round(diff)}`;   dCls='is-down'; }
          else              { delta='= hold'; }
        } else { delta='Baseline'; dCls='is-new'; }

        let bestSet=null;
        entry.sets.forEach(s => { if(num(s.w)>0&&(!bestSet||num(s.w)>num(bestSet.w))) bestSet=s; });
        const bestStr = bestSet ? `${num(bestSet.w)}kg × ${num(bestSet.r)}` : '—';
        const d = new Date(entry.date+'T12:00:00');
        const dateStr = isNaN(d) ? entry.date : d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'2-digit'});

        return `
          <tr class="log-row">
            <td class="log-cell log-cell--date">${dateStr}</td>
            <td class="log-cell log-cell--best">${bestStr}</td>
            <td class="log-cell log-cell--vol">${Math.round(vol)}</td>
            <td class="log-cell log-cell--delta ${dCls}">${delta}</td>
          </tr>`;
      }).reverse().join('');

      body.innerHTML = `
        ${exInfo ? `<div class="log-ex-info">
          <span class="log-ex-name">${esc(exInfo.name)}</span>
          ${exInfo.bodyPart ? `<span class="log-ex-bp">${esc(exInfo.bodyPart)}</span>` : ''}
        </div>` : ''}
        <div class="log-scroll">
          <table class="log-table">
            <thead><tr>
              <th>Date</th><th>Best Set</th><th>Vol</th><th>Delta</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }

    function saveState() { Store.set(KEYS.gymLogPanel, ps); }

    function applyPosition(panel) {
      panel.style.width  = (ps.w||360)+'px';
      if (!ps.collapsed) panel.style.height = (ps.h||480)+'px';
      if (ps.x!=null && ps.y!=null) {
        panel.style.left   = ps.x+'px';
        panel.style.top    = ps.y+'px';
        panel.style.right  = 'auto';
        panel.style.bottom = 'auto';
      }
    }

    function init() {
      const panel = $('[data-log-panel]'); if (!panel) return;
      applyPosition(panel);

      if (ps.collapsed) {
        $('[data-log-body]', panel).hidden = true;
        panel.classList.add('is-collapsed');
        panel.style.height = '';
        const btn = $('[data-log-toggle]', panel);
        if (btn) btn.textContent = '▲';
      }

      buildSelect(panel);
      renderHistory(panel);

      // collapse toggle
      $('[data-log-toggle]', panel)?.addEventListener('click', () => {
        const body = $('[data-log-body]', panel);
        ps.collapsed = !ps.collapsed;
        if (ps.collapsed) {
          ps.h = panel.offsetHeight;
          panel.style.height = '';
          body.hidden = true;
          panel.classList.add('is-collapsed');
          $('[data-log-toggle]', panel).textContent = '▲';
        } else {
          body.hidden = false;
          panel.classList.remove('is-collapsed');
          panel.style.height = (ps.h||480)+'px';
          $('[data-log-toggle]', panel).textContent = '—';
        }
        saveState();
      });

      // exercise select
      $('[data-log-exercise]', panel)?.addEventListener('change', () => renderHistory(panel));

      // drag (mousedown on handle) — disabled: layout is locked, panel stays pinned
      const handle = null && $('[data-log-drag-handle]', panel);
      handle?.addEventListener('mousedown', e => {
        if (e.button!==0) return;
        if (e.target.closest('select, input, button')) return; // don't steal interactive controls
        e.preventDefault();
        isDragging = true;
        const r = panel.getBoundingClientRect();
        dragOff = {x: e.clientX-r.left, y: e.clientY-r.top};
        panel.classList.add('is-dragging');
        document.body.style.userSelect = 'none';
      });

      document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const x = Math.max(0, Math.min(e.clientX-dragOff.x, window.innerWidth-100));
        const y = Math.max(0, Math.min(e.clientY-dragOff.y, window.innerHeight-60));
        panel.style.left   = x+'px';
        panel.style.top    = y+'px';
        panel.style.right  = 'auto';
        panel.style.bottom = 'auto';
      });

      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        panel.classList.remove('is-dragging');
        document.body.style.userSelect = '';
        const r = panel.getBoundingClientRect();
        ps.x = r.left; ps.y = r.top; saveState();
      });

      // touch drag support
      handle?.addEventListener('touchstart', e => {
        const t = e.touches[0];
        isDragging = true;
        const r = panel.getBoundingClientRect();
        dragOff = {x: t.clientX-r.left, y: t.clientY-r.top};
        panel.classList.add('is-dragging');
      }, {passive:true});

      document.addEventListener('touchmove', e => {
        if (!isDragging) return;
        const t = e.touches[0];
        const x = Math.max(0, Math.min(t.clientX-dragOff.x, window.innerWidth-100));
        const y = Math.max(0, Math.min(t.clientY-dragOff.y, window.innerHeight-60));
        panel.style.left = x+'px'; panel.style.top = y+'px';
        panel.style.right='auto'; panel.style.bottom='auto';
      }, {passive:true});

      document.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false; panel.classList.remove('is-dragging');
        const r = panel.getBoundingClientRect();
        ps.x=r.left; ps.y=r.top; saveState();
      });

      // save size via ResizeObserver
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => {
          if (!ps.collapsed) {
            ps.w = panel.offsetWidth;
            ps.h = panel.offsetHeight;
            saveState();
          }
        }).observe(panel);
      }
    }

    function refresh() {
      const panel = $('[data-log-panel]'); if (!panel) return;
      buildSelect(panel); renderHistory(panel);
    }

    return { init, refresh };
  })();

  /* ═══════════════════  WIDGET MANAGER (universal drag/resize/tab system)  ═══════════════════ */
  const WidgetManager = (() => {
    let state = Store.get(KEYS.widgetState, {});
    const saveState = () => Store.set(KEYS.widgetState, state);
    const LOCKED = true;   // layout locked in place — no drag, resize, or move-to-tab controls

    const ALL_TABS = ['home','gym','nutrition','finance','goals','reminders'];
    const registry = [];   // {id, el, defaultTabs}
    const wired    = new Set();

    // Fallback default positions when grid capture isn't possible
    const FALLBACK_POS = {
      'macro-view':    {x:24,  y:90,  w:310, h:280},
      'nutri-heatmap': {x:350, y:90,  w:420, h:220},
      'supp-widget':   {x:24,  y:390, w:300, h:340},
      'elec-widget':   {x:340, y:390, w:350, h:290},
    };

    /* ── float a card to its stored (or newly-captured) position ── */
    function floatCard(id, el, defaultTabs) {
      const ws = state[id];
      el.classList.add('is-floating');
      el.style.position = 'fixed';
      el.style.margin   = '0';
      el.style.zIndex   = '24';

      if (ws && ws.x != null) {
        el.style.left   = ws.x + 'px';
        el.style.top    = ws.y + 'px';
        if (ws.w) el.style.width  = ws.w + 'px';
        if (ws.h) el.style.height = ws.h + 'px';
      } else {
        const r   = el.getBoundingClientRect();
        const def = FALLBACK_POS[id] || {x:24,y:90,w:320,h:260};
        const x   = r.width > 0 ? r.left  : def.x;
        const y   = r.width > 0 ? r.top   : def.y;
        const w   = r.width > 0 ? r.width : def.w;
        const h   = r.width > 0 ? r.height: def.h;
        el.style.left   = x + 'px';
        el.style.top    = y + 'px';
        el.style.width  = w + 'px';
        el.style.height = h + 'px';
        state[id] = {x, y, w, h, tabs: [...defaultTabs]};
        saveState();
      }
      if (!state[id])      state[id]      = {};
      if (!state[id].tabs) state[id].tabs = [...defaultTabs];
    }

    /* ── size presets (width px) per widget id ── */
    const SIZE_PRESETS = {
      'macro-view':    [{s:'S',w:220},{s:'M',w:310},{s:'L',w:460}],
      'nutri-heatmap': [{s:'S',w:280},{s:'M',w:420},{s:'L',w:600}],
      'supp-widget':   [{s:'S',w:220},{s:'M',w:300},{s:'L',w:420}],
      'elec-widget':   [{s:'S',w:240},{s:'M',w:350},{s:'L',w:480}],
      'countdown':     [{s:'S',w:220},{s:'M',w:320},{s:'L',w:460}],
      'pomodoro':      [{s:'S',w:220},{s:'M',w:320},{s:'L',w:460}],
      'workout':       [{s:'S',w:280},{s:'M',w:380},{s:'L',w:540}],
      'goals-ov':      [{s:'S',w:220},{s:'M',w:320},{s:'L',w:460}],
      'bw':            [{s:'S',w:240},{s:'M',w:340},{s:'L',w:500}],
      'split':         [{s:'S',w:280},{s:'M',w:400},{s:'L',w:580}],
      'gym-timer':     [{s:'S',w:220},{s:'M',w:320},{s:'L',w:460}],
      'photo-ctrl':    [{s:'S',w:300},{s:'M',w:480},{s:'L',w:680}],
      'photo-grid':    [{s:'S',w:380},{s:'M',w:600},{s:'L',w:900}],
    };
    const DEFAULT_SIZE_PRESETS = [{s:'S',w:240},{s:'M',w:340},{s:'L',w:500}];

    /* Inject S/M/L buttons into a card header */
    function addSizeControls(id, el, head) {
      const presets = SIZE_PRESETS[id] || DEFAULT_SIZE_PRESETS;
      const wrap = document.createElement('span');
      wrap.className = 'wm-sizes';
      wrap.setAttribute('data-no-route','');
      presets.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'wm-size-btn';
        btn.textContent = p.s;
        btn.title = p.s==='S' ? 'Small' : p.s==='M' ? 'Medium' : 'Large';
        const curW = state[id]?.w;
        if (curW && Math.abs(curW - p.w) < 12) btn.classList.add('is-active');
        btn.addEventListener('click', e => {
          e.stopPropagation();
          el.style.width  = p.w + 'px';
          el.style.height = 'auto';
          state[id] = {...(state[id]||{}), w:p.w, h:null};
          saveState();
          wrap.querySelectorAll('.wm-size-btn').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
        });
        wrap.appendChild(btn);
      });
      head.appendChild(wrap);
    }

    /* ── wire drag, resize-observer for one card ── */
    function wireCard(id, el) {
      if (wired.has(id)) return;
      wired.add(id);
      if (LOCKED) return;   // frozen layout: skip all drag / resize / move-control wiring

      let drag = false, off = {x:0, y:0};
      const head = el.querySelector('.card__head');
      if (!head) return;

      addTabMover(id, head);
      addSizeControls(id, el, head);

      head.addEventListener('mousedown', e => {
        if (e.button) return;
        if (e.target.closest('button,input,select,a')) return;
        e.preventDefault();
        drag = true;
        const r = el.getBoundingClientRect();
        off = {x: e.clientX - r.left, y: e.clientY - r.top};
        el.classList.add('is-dragging');
        document.body.style.userSelect = 'none';
      });
      document.addEventListener('mousemove', e => {
        if (!drag) return;
        el.style.left   = clamp(e.clientX - off.x, 0, window.innerWidth  - 80) + 'px';
        el.style.top    = clamp(e.clientY - off.y, 0, window.innerHeight - 40) + 'px';
        el.style.right  = 'auto';
        el.style.bottom = 'auto';
      });
      document.addEventListener('mouseup', () => {
        if (!drag) return;
        drag = false;
        el.classList.remove('is-dragging');
        document.body.style.userSelect = '';
        const r = el.getBoundingClientRect();
        state[id] = {...(state[id]||{}), x: r.left, y: r.top};
        saveState();
      });

      // Touch drag
      head.addEventListener('touchstart', e => {
        const t = e.touches[0]; drag = true;
        const r = el.getBoundingClientRect();
        off = {x: t.clientX - r.left, y: t.clientY - r.top};
        el.classList.add('is-dragging');
      }, {passive:true});
      document.addEventListener('touchmove', e => {
        if (!drag) return;
        const t = e.touches[0];
        el.style.left = Math.max(0, t.clientX - off.x) + 'px';
        el.style.top  = Math.max(0, t.clientY - off.y) + 'px';
      }, {passive:true});
      document.addEventListener('touchend', () => {
        if (!drag) return; drag = false;
        el.classList.remove('is-dragging');
        const r = el.getBoundingClientRect();
        state[id] = {...(state[id]||{}), x: r.left, y: r.top};
        saveState();
      });

      // Persist size on native resize
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => {
          if (el.classList.contains('is-floating')) {
            state[id] = {...(state[id]||{}), w: el.offsetWidth, h: el.offsetHeight};
            saveState();
          }
        }).observe(el);
      }
    }

    /* ── add the tab-assignment popup button to a card header ── */
    function addTabMover(id, head) {
      const wrap = document.createElement('span');
      wrap.className = 'wm-mover';
      wrap.setAttribute('data-no-route', '');

      const btn = document.createElement('button');
      btn.className = 'icon-btn wm-mover__btn';
      btn.title = 'Move to tab';
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4" stroke-linecap="round"/>
      </svg>`;

      const menu = document.createElement('div');
      menu.className = 'wm-menu';
      menu.hidden = true;
      menu.innerHTML = `<p class="wm-menu__title">Show on tabs</p>` +
        ALL_TABS.map(t => {
          const on = (state[id]?.tabs || []).includes(t);
          return `<label class="wm-menu__row">
            <input type="checkbox" value="${t}" ${on ? 'checked' : ''}>
            <span>${t.charAt(0).toUpperCase()+t.slice(1)}</span>
          </label>`;
        }).join('');

      wrap.appendChild(btn);
      wrap.appendChild(menu);
      head.appendChild(wrap);

      btn.addEventListener('click', e => {
        e.stopPropagation();
        $$('.wm-menu').forEach(m => { if (m !== menu) m.hidden = true; });
        menu.hidden = !menu.hidden;
      });
      menu.addEventListener('change', () => {
        const tabs = [...menu.querySelectorAll('input:checked')].map(i => i.value);
        state[id] = {...(state[id]||{}), tabs};
        saveState();
        updateVisibility(document.body.dataset.view || 'home');
      });
      document.addEventListener('click', e => { if (!wrap.contains(e.target)) menu.hidden = true; });
    }

    /* ── register + initialise a single card ── */
    function initCard(id, el, defaultTabs) {
      if (LOCKED) return;          // frozen: cards stay in their natural grid slots
      registry.push({id, el, defaultTabs});
      floatCard(id, el, defaultTabs);
      wireCard(id, el);
    }

    /* ── show/hide cards based on current tab ── */
    function updateVisibility(tab) {
      if (LOCKED) return;          // panels handle visibility natively
      registry.forEach(({id, el, defaultTabs}) => {
        const tabs = state[id]?.tabs || defaultTabs;
        // Use explicit 'block' so it overrides .fw-card { display:none } from CSS
        el.style.display = tabs.includes(tab) ? 'block' : 'none';
      });
    }

    /* ── per-group init helpers ── */
    function initHomeCards() {
      [
        {sel:'.card--countdown', id:'countdown',  def:['home']},
        {sel:'.card--pomodoro',  id:'pomodoro',   def:['home']},
        {sel:'.card--workout',   id:'workout',    def:['home']},
        {sel:'.card--goals-ov',  id:'goals-ov',   def:['home']},
      ].forEach(({sel, id, def}) => {
        const c = $(sel);
        if (!c || c.dataset.wmDone) return;
        c.dataset.wmDone = '1';
        initCard(id, c, def);
      });
    }

    function initGymCards() {
      [
        {sel:'.card--bw',        id:'bw',        def:['gym']},
        {sel:'.card--split',     id:'split',      def:['gym']},
        {sel:'.card--gym-timer', id:'gym-timer',  def:['gym']},
      ].forEach(({sel, id, def}) => {
        const c = $(sel);
        if (!c || c.dataset.wmDone) return;
        c.dataset.wmDone = '1';
        initCard(id, c, def);
      });

      $('[data-gym-reset-layout]')?.addEventListener('click', () => {
        ['bw','split','gym-timer'].forEach(id => {
          delete state[id];
          const entry = registry.find(r => r.id === id);
          if (!entry) return;
          const {el, defaultTabs} = entry;
          el.classList.remove('is-floating','is-dragging');
          ['position','left','top','width','height','margin','zIndex','right','bottom'].forEach(p => el.style[p] = '');
          saveState();
          setTimeout(() => floatCard(id, el, defaultTabs), 30);
        });
        toast('Card positions reset');
      });
    }

    function initFloatingWidgets() {
      [
        {sel:'[data-widget="macro-view"]',    id:'macro-view',    def:['home']},
        {sel:'[data-widget="nutri-heatmap"]', id:'nutri-heatmap', def:['home']},
        {sel:'[data-widget="supp-widget"]',   id:'supp-widget',   def:['home']},
        {sel:'[data-widget="elec-widget"]',   id:'elec-widget',   def:['home']},
      ].forEach(({sel, id, def}) => {
        const c = $(sel);
        if (!c || c.dataset.wmDone) return;
        c.dataset.wmDone = '1';
        initCard(id, c, def);
      });
    }

    function initPhotoCards() {
      [
        {sel:'.card--photo-ctrl', id:'photo-ctrl', def:['photos']},
        {sel:'.card--photo-grid', id:'photo-grid', def:['photos']},
      ].forEach(({sel, id, def}) => {
        const c = $(sel);
        if (!c || c.dataset.wmDone) return;
        c.dataset.wmDone = '1';
        initCard(id, c, def);
      });
    }

    return {initHomeCards, initGymCards, initFloatingWidgets, initPhotoCards, updateVisibility};
  })();

  /* ═══════════════════  GYM TIMER  ═══════════════════ */
  const GymTimer = (() => {
    const DEFAULT = {min:2, sec:0, label:'Rest Timer'};
    let state = Object.assign({}, DEFAULT, Store.get(KEYS.gymTimer, {}));
    let total = state.min*60+state.sec, remaining = total;
    let running=false, raf=null, lastTs=null;
    const els = {};

    function cache() {
      els.time  = $('[data-gtimer-time]');
      els.bar   = $('[data-gtimer-bar]');
      els.min   = $('[data-gtimer-min]');
      els.sec   = $('[data-gtimer-sec]');
      els.label = $('[data-gtimer-label]');
      els.desc  = $('[data-gtimer-desc]');
      els.card  = $('.card--gym-timer');
      return !!(els.time && els.bar);
    }

    function paint() {
      const m=Math.floor(remaining/60), s=Math.floor(remaining%60);
      els.time.textContent = `${pad(m)}:${pad(s)}`;
      els.bar.style.width  = (total>0 ? clamp(remaining/total,0,1) : 0)*100+'%';
    }

    function loop(ts) {
      if (!running) return;
      if (lastTs==null) lastTs=ts;
      remaining = Math.max(0, remaining-(ts-lastTs)/1000); lastTs=ts; paint();
      if (remaining>0) raf=requestAnimationFrame(loop);
      else { running=false; els.card?.classList.add('is-done'); toast(state.label+' done'); }
    }

    function setTotalFromInputs() {
      state.min = clamp(parseInt(els.min.value,10)||0, 0, 99);
      state.sec = clamp(parseInt(els.sec.value,10)||0, 0, 59);
      total = state.min*60+state.sec; remaining=total;
      els.card?.classList.remove('is-done'); persistTimer(); paint();
    }
    const persistTimer = () => Store.set(KEYS.gymTimer, state);

    function start() { if (!running&&remaining>0) { running=true; lastTs=null; els.card?.classList.remove('is-done'); raf=requestAnimationFrame(loop); } }
    function pause() { running=false; if(raf) cancelAnimationFrame(raf); }
    function reset() { pause(); remaining=total; els.card?.classList.remove('is-done'); paint(); }

    function init() {
      if (!cache()) return;
      els.min.value = state.min; els.sec.value = pad(state.sec);
      els.desc.value = state.label;
      if (els.label) els.label.textContent = state.label||'Rest Timer';
      paint();

      els.min.addEventListener('change', setTotalFromInputs);
      els.sec.addEventListener('change', setTotalFromInputs);

      $$('[data-gtimer-preset]').forEach(b => b.addEventListener('click', () => {
        const secs = parseInt(b.dataset.gtimerPreset,10);
        els.min.value = Math.floor(secs/60); els.sec.value = pad(secs%60);
        $$('[data-gtimer-preset]').forEach(x => x.classList.toggle('is-active', x===b));
        setTotalFromInputs();
      }));

      $$('[data-gtimer]').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.gtimer;
        if (a==='start') start(); else if (a==='pause') pause(); else if (a==='reset') reset();
      }));

      els.desc.addEventListener('input', () => {
        state.label = els.desc.value.trim()||'Rest Timer';
        if (els.label) els.label.textContent = state.label;
        persistTimer();
      });
    }

    return { init };
  })();

  /* ═══════════════════  NUTRITION  ═══════════════════ */
  const Nutrition = (() => {
    const DEFAULT_TARGETS = {cal:2800, carbs:350, protein:200, fats:80};
    const DEFAULT_ELEC    = {sodium:0, potassium:0, sodiumTarget:2300, potassiumTarget:3500, ratioTarget:1.5};

    let nutState  = Store.get(KEYS.nutrition,   {targets:{...DEFAULT_TARGETS}, days:{}});
    let suppState = Store.get(KEYS.supplements, {list:[], log:{}});
    let elecState = Store.get(KEYS.electrolyte, {...DEFAULT_ELEC});

    if (!nutState.targets) nutState.targets = {...DEFAULT_TARGETS};
    if (!nutState.days)    nutState.days    = {};
    if (!suppState.list)   suppState.list   = [];
    if (!suppState.log)    suppState.log    = {};

    const pNut  = () => Store.set(KEYS.nutrition,   nutState);
    const pSupp = () => Store.set(KEYS.supplements, suppState);
    const pElec = () => Store.set(KEYS.electrolyte, elecState);

    function todayMeals() {
      const k = localDateKey();
      if (!nutState.days[k]) nutState.days[k] = {meals:{breakfast:[],lunch:[],dinner:[],snacks:[]}};
      return {key:k, meals: nutState.days[k].meals};
    }

    function getTotals(dateKey) {
      const day = nutState.days[dateKey];
      if (!day) return {cal:0, carbs:0, protein:0, fats:0};
      return Object.values(day.meals).reduce((acc, items) => {
        items.forEach(f => { acc.cal+=num(f.cal); acc.carbs+=num(f.carbs); acc.protein+=num(f.protein); acc.fats+=num(f.fats); });
        return acc;
      }, {cal:0, carbs:0, protein:0, fats:0});
    }

    /* ══════════════════  QUICK LOG  ══════════════════
       The thing that makes a food tracker survive contact with real life:
       you eat the same twenty things. Every food you log is counted, and the
       ones you reach for most become one-tap cards. No typing, no searching,
       no deciding which meal — it picks the meal from the clock.

       Favourites are DERIVED from your log, so this needs no setup and gets
       better the more you use it. Anything you pin by hand outranks them. */
    function foodTally() {
      const tally = new Map();
      Object.values(nutState.days || {}).forEach(day => {
        Object.values(day.meals || {}).forEach(items => {
          (items || []).forEach(f => {
            const k = String(f.name || '').trim().toLowerCase();
            if (!k) return;
            const cur = tally.get(k);
            if (cur) { cur.n++; }
            else tally.set(k, { n: 1, name: f.name, cal: num(f.cal), protein: num(f.protein), carbs: num(f.carbs), fats: num(f.fats) });
          });
        });
      });
      return tally;
    }

    function quickFoods(limit = 6) {
      const pinned = (nutState.pinned || []).map(p => ({ ...p, pinned: true }));
      const seen = new Set(pinned.map(p => String(p.name).trim().toLowerCase()));
      const learned = [...foodTally().entries()]
        .filter(([k, v]) => v.n >= 2 && !seen.has(k))     // twice before it earns a card
        .sort((a, b) => b[1].n - a[1].n)
        .map(([, v]) => v);
      return [...pinned, ...learned].slice(0, limit);
    }

    function mealForNow() {
      const h = new Date().getHours();
      return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snacks';
    }

    function renderQuickLog() {
      const el = $('[data-nut-quick]'); if (!el) return;
      const foods = quickFoods();
      const meal = mealForNow();

      if (!foods.length) {
        el.innerHTML =
          '<div class="eyebrow"><span class="eyebrow__num">01</span>' +
          '<span class="eyebrow__lbl">Quick log</span><span class="eyebrow__rule"></span></div>' +
          '<p class="chart-empty">Log a food twice and it earns a one-tap card here.</p>';
        return;
      }

      const t = nutState.targets || {};
      el.innerHTML =
        '<div class="eyebrow"><span class="eyebrow__num">01</span>' +
        '<span class="eyebrow__lbl">Quick log · ' + MEAL_LABELS[meal] + '</span>' +
        '<span class="eyebrow__rule"></span></div>' +
        '<div class="ql-grid">' + foods.map((f, i) => {
          const pct = t.cal ? Math.min(100, Math.round((num(f.cal) / t.cal) * 100)) : 0;
          return '<div class="ql-card" style="animation-delay:' + (i * 60) + 'ms">' +
            (f.pinned ? '<button class="ql-remove" data-ql-unpin="' + esc(f.name) + '" title="Unpin">×</button>' : '') +
            '<div class="ql-card__top">' +
              '<span class="ql-chip">' + esc((f.name || '?').trim().charAt(0).toUpperCase()) + '</span>' +
              '<span class="ql-meta">' +
                '<span class="ql-name">' + esc(f.name) + '</span>' +
                '<span class="ql-sub"><b>' + Math.round(num(f.cal)) + '</b> kcal · P' + Math.round(num(f.protein)) + ' C' + Math.round(num(f.carbs)) + ' F' + Math.round(num(f.fats)) + '</span>' +
              '</span>' +
            '</div>' +
            '<div class="ql-bar"><i style="width:' + pct + '%"></i></div>' +
            '<button class="ql-log" data-ql-log="' + i + '"><span class="spark"></span>Log to ' + MEAL_LABELS[meal] + '</button>' +
          '</div>';
        }).join('') + '</div>';

      /* one tap: spark, log, and every dependent view refreshes */
      $$('[data-ql-log]', el).forEach(btn => btn.addEventListener('click', () => {
        const f = foods[+btn.getAttribute('data-ql-log')]; if (!f) return;
        btn.classList.add('is-charging');
        setTimeout(() => btn.classList.remove('is-charging'), 640);

        const { meals } = todayMeals();
        meals[mealForNow()].push({
          id: uid(), name: f.name,
          cal: Math.round(num(f.cal)), protein: Math.round(num(f.protein)),
          carbs: Math.round(num(f.carbs)), fats: Math.round(num(f.fats)),
        });
        pNut();
        btn.classList.add('is-logged');
        btn.textContent = 'Logged';
        toast(f.name + ' logged');
        /* let the spark finish before the grid rebuilds under it */
        setTimeout(() => { renderMeals(); renderMacroRings(); renderMacroWidget(); renderHeatmap(); renderQuickLog(); }, 680);
      }));

      $$('[data-ql-unpin]', el).forEach(btn => btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-ql-unpin');
        nutState.pinned = (nutState.pinned || []).filter(p => p.name !== name);
        pNut(); renderQuickLog();
      }));
    }

    /* ── THE HERO (nutrition tab) ──────────────────────────────────────────
       Vitality's read: one enormous figure, a kick above it, the target
       below, and nothing else competing for the eye. The rings stay — they
       are the detail you look at second, not first. */
    function renderNutHero() {
      const el = $('[data-nut-hero]'); if (!el) return;
      const totals = getTotals(localDateKey());
      const cal = Math.round(totals.cal || 0);
      const tgt = nutState.targets.cal || 0;
      const left = tgt ? tgt - cal : 0;
      /* the motes: sparse, slow, behind everything. Built once and left alone
         so a re-render never restarts them mid-drift. */
      let motes = el.querySelector('.motes');
      if (!motes) {
        motes = document.createElement('div');
        motes.className = 'motes';
        motes.innerHTML = Array.from({ length: 7 }, () => {
          const dur = 9 + Math.random() * 9, delay = -Math.random() * dur;
          return '<i class="mote" style="left:' + (6 + Math.random() * 88).toFixed(1) + '%;bottom:-6px;' +
                 'animation-duration:' + dur.toFixed(1) + 's;animation-delay:' + delay.toFixed(1) + 's"></i>';
        }).join('');
      }

      el.innerHTML =
        '<span class="tile-kick">✦ calories today</span>' +
        '<span class="tile-hero__val">' + cal.toLocaleString() + '</span>' +
        '<span class="tile-hero__of">' + (tgt ? 'of ' + tgt.toLocaleString() + ' kcal' : 'no target set') + '</span>' +
        (tgt
          ? '<p class="tile-foot">' + (left >= 0 ? left.toLocaleString() + ' left today' : Math.abs(left).toLocaleString() + ' over target') + '</p>'
          : '');
      el.prepend(motes);
    }

    /* ── Macro rings (nutrition tab) ── */
    function renderMacroRings() {
      /* called from here so all three existing call sites keep these in step */
      renderNutHero();
      renderQuickLog();
      const el = $('[data-macro-rings]'); if (!el) return;
      const totals = getTotals(localDateKey());
      const t = nutState.targets;
      const R = 36, C = 2 * Math.PI * R;

      el.innerHTML = [
        {label:'Calories', key:'cal',     unit:'kcal', col:'rgba(255,255,255,.95)'},
        {label:'Carbs',    key:'carbs',   unit:'g',    col:'rgba(255,255,255,.70)'},
        {label:'Protein',  key:'protein', unit:'g',    col:'rgba(255,255,255,.50)'},
        {label:'Fats',     key:'fats',    unit:'g',    col:'rgba(255,255,255,.35)'},
      ].map(ring => {
        const val  = Math.round(totals[ring.key]||0);
        const tgt  = t[ring.key] || 1;
        const pct  = clamp(val/tgt, 0, 1);
        const left = Math.max(0, Math.round(tgt - val));
        return `<div class="macro-ring-wrap">
          <svg viewBox="0 0 88 88" width="88" height="88">
            <circle class="macro-ring__track" cx="44" cy="44" r="${R}"/>
            <circle class="macro-ring__arc" cx="44" cy="44" r="${R}"
              stroke="${ring.col}"
              stroke-dasharray="${C.toFixed(2)}"
              stroke-dashoffset="${(C*(1-pct)).toFixed(2)}"
              transform="rotate(-90 44 44)"/>
          </svg>
          <div class="macro-ring__center">
            <span class="macro-ring__val">${val}</span>
            <span class="macro-ring__unit">${ring.unit}</span>
          </div>
          <p class="macro-ring__label">${ring.label}</p>
          <p class="macro-ring__remain">${left} left</p>
        </div>`;
      }).join('');
    }

    /* ── Macro Quick-View widget (home) ── */
    function renderMacroWidget() {
      const el = $('[data-macro-widget]'); if (!el) return;
      const totals = getTotals(localDateKey());
      const t = nutState.targets;
      const R=46, C=2*Math.PI*R;
      const calPct  = clamp((totals.cal||0)/(t.cal||1),0,1);
      const macros  = [
        {label:'Carbs',   val:totals.carbs||0,   tgt:t.carbs,   pct:clamp((totals.carbs||0)/(t.carbs||1),0,1),   hl:true},
        {label:'Protein', val:totals.protein||0, tgt:t.protein, pct:clamp((totals.protein||0)/(t.protein||1),0,1)},
        {label:'Fats',    val:totals.fats||0,    tgt:t.fats,    pct:clamp((totals.fats||0)/(t.fats||1),0,1)},
      ];
      const carbsLeft = Math.max(0, Math.round(t.carbs - (totals.carbs||0)));
      el.innerHTML = `
        <div class="mw-layout">
          <div class="mw-ring-wrap">
            <svg viewBox="0 0 108 108" width="108" height="108">
              <circle class="macro-ring__track" cx="54" cy="54" r="${R}"/>
              <circle class="macro-ring__arc" cx="54" cy="54" r="${R}"
                stroke="rgba(255,255,255,.9)"
                stroke-dasharray="${C.toFixed(2)}"
                stroke-dashoffset="${(C*(1-calPct)).toFixed(2)}"
                transform="rotate(-90 54 54)"/>
            </svg>
            <div class="mw-center">
              <span class="mw-cal">${Math.round(totals.cal||0)}</span>
              <span class="mw-cal-lbl">kcal</span>
              <span class="mw-cal-left">${Math.max(0,Math.round(t.cal-(totals.cal||0)))} left</span>
            </div>
          </div>
          <div class="mw-macros">
            ${macros.map(m=>`
              <div class="mw-macro ${m.hl?'mw-macro--hl':''}">
                <span class="mw-macro__lbl">${m.label}</span>
                <div class="mw-macro__bar"><i style="width:${(m.pct*100).toFixed(1)}%"></i></div>
                <span class="mw-macro__val">${Math.round(m.val)}/${m.tgt}g</span>
              </div>`).join('')}
            <div class="mw-carbs-badge">
              <span class="mw-carbs-num">${carbsLeft}</span>
              <span class="mw-carbs-lbl">g carbs to go</span>
            </div>
          </div>
        </div>`;
    }

    /* ── Nutrition Heatmap ── */
    function renderHeatmap() {
      const el = $('[data-nutri-heatmap]'); if (!el) return;
      const DAYS = 91;
      const cells = [];
      for (let i = DAYS-1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate()-i);
        const key = localDateKey(d);
        const totals = getTotals(key);
        const t = nutState.targets;
        const score = (
          Math.min(1,(totals.cal||0)/(t.cal||1))  +
          Math.min(1,(totals.carbs||0)/(t.carbs||1)) +
          Math.min(1,(totals.protein||0)/(t.protein||1)) +
          Math.min(1,(totals.fats||0)/(t.fats||1))
        ) / 4;
        cells.push({key, score});
      }
      el.innerHTML = `
        <div class="hm-grid">${cells.map(c=>{
          const op = c.score>.8?1:c.score>.5?.65:c.score>.1?.3:.06;
          return `<div class="hm-cell" style="opacity:${op}" title="${c.key} · ${Math.round(c.score*100)}%"></div>`;
        }).join('')}</div>
        <div class="hm-legend">
          <span class="hm-leg-lbl">Less</span>
          <div class="hm-cell" style="opacity:.06"></div>
          <div class="hm-cell" style="opacity:.3"></div>
          <div class="hm-cell" style="opacity:.65"></div>
          <div class="hm-cell" style="opacity:1"></div>
          <span class="hm-leg-lbl">More</span>
        </div>`;
    }

    /* ── Supplement widget (compact, for home) ── */
    function renderSuppWidget() {
      const el = $('[data-supp-widget]'); if (!el) return;
      const TODAY = localDateKey();
      const log = suppState.log[TODAY] || {};
      if (!suppState.list.length) {
        el.innerHTML = `<p class="supp-empty">No supplements — add them in the Nutrition tab.</p>`; return;
      }
      el.innerHTML = suppState.list.map(s => {
        const doses = log[s.id] || new Array(s.freq).fill(false);
        const taken = doses.filter(Boolean).length;
        return `<div class="sw-item" data-sw-id="${s.id}">
          <div class="sw-item__row">
            <span class="sw-item__name">${esc(s.name)}</span>
            <span class="sw-item__prog">${taken}/${s.freq}</span>
          </div>
          ${s.note?`<p class="sw-item__note">${esc(s.note)}</p>`:''}
          <div class="sw-doses">${doses.map((done,i)=>`
            <button class="sw-dose ${done?'is-taken':''}" data-sw-check="${s.id}" data-sw-idx="${i}">
              ${s.times?.[i]||('×'+(i+1))}
            </button>`).join('')}
          </div>
        </div>`;
      }).join('');

      el.querySelectorAll('[data-sw-check]').forEach(btn => {
        btn.addEventListener('click', () => {
          const sid = btn.dataset.swCheck, idx = parseInt(btn.dataset.swIdx);
          const s = suppState.list.find(x=>x.id===sid); if (!s) return;
          if (!suppState.log[TODAY]) suppState.log[TODAY] = {};
          if (!suppState.log[TODAY][sid]) suppState.log[TODAY][sid] = new Array(s.freq).fill(false);
          suppState.log[TODAY][sid][idx] = !suppState.log[TODAY][sid][idx];
          pSupp(); renderSuppWidget(); renderSupplements();
        });
      });
    }

    /* ── Electrolyte widget (compact) ── */
    function renderElecWidget() {
      const el = $('[data-elec-widget]'); if (!el) return;
      const s = elecState;
      const ratio = s.sodium>0&&s.potassium>0 ? (s.potassium/s.sodium) : 0;
      const tgt = s.ratioTarget||1.5;
      const potNeeded = Math.max(0, Math.ceil(s.sodium*tgt - s.potassium));
      const pct = clamp(ratio/tgt*100,0,100);
      let statusCls = ratio>=tgt?'is-good':ratio>=tgt*.65?'is-warn':'is-bad';
      let statusMsg = ratio>=tgt?'Balanced ✓':ratio>=tgt*.65?'Moderate — watch it':'High retention risk';
      if (!s.sodium && !s.potassium) { statusCls=''; statusMsg='Enter values to calculate'; }

      el.innerHTML = `
        <div class="ew-inputs">
          <label class="ew-field">
            <span>Na (mg)</span>
            <input class="input input--sm" type="number" data-ew-na value="${s.sodium||''}" placeholder="e.g. 1800" inputmode="numeric"/>
          </label>
          <label class="ew-field">
            <span>K (mg)</span>
            <input class="input input--sm" type="number" data-ew-k value="${s.potassium||''}" placeholder="e.g. 3200" inputmode="numeric"/>
          </label>
        </div>
        <div class="ew-ratio ${statusCls}">
          <div class="ew-ratio__bar"><i style="width:${pct.toFixed(1)}%"></i></div>
          <div class="ew-ratio__row">
            <span class="ew-ratio__val">K:Na ${ratio>0?ratio.toFixed(2):'—'}</span>
            <span class="ew-ratio__tgt">target ≥ ${tgt}</span>
          </div>
          <p class="ew-status-msg">${statusMsg}</p>
          ${potNeeded>0?`<p class="ew-needed">+${potNeeded}mg potassium needed</p>`:''}
        </div>`;

      $('[data-ew-na]',el)?.addEventListener('input',e=>{elecState.sodium=num(e.target.value);pElec();renderElecWidget();renderElectrolyte();});
      $('[data-ew-k]',el)?.addEventListener('input',e=>{elecState.potassium=num(e.target.value);pElec();renderElecWidget();renderElectrolyte();});
    }

    /* ── Full Supplement list (nutrition tab) ── */
    function renderSupplements() {
      const el = $('[data-supplements]'); if (!el) return;
      const TODAY = localDateKey();
      const log = suppState.log[TODAY] || {};
      if (!suppState.list.length) {
        el.innerHTML = `<div class="empty"><p class="empty__title">No supplements</p><p class="empty__hint">Use the form below to build your stack.</p></div>`; return;
      }
      el.innerHTML = suppState.list.map(s => {
        const doses = log[s.id] || new Array(s.freq).fill(false);
        return `<div class="supp-item">
          <div class="supp-item__head">
            <span class="supp-item__name">${esc(s.name)}</span>
            <span class="supp-item__freq">${s.freq}× daily</span>
            <button class="icon-btn" data-supp-del="${s.id}" title="Remove supplement">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5h6v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          ${s.note?`<p class="supp-item__note">${esc(s.note)}</p>`:''}
          <div class="supp-item__doses">${doses.map((done,i)=>`
            <button class="sw-dose ${done?'is-taken':''}" data-supp-check="${s.id}" data-supp-idx="${i}">
              ${s.times?.[i]||('Dose '+(i+1))}
            </button>`).join('')}
          </div>
        </div>`;
      }).join('');

      el.addEventListener('click', e => {
        const del = e.target.closest('[data-supp-del]');
        if (del) { suppState.list=suppState.list.filter(x=>x.id!==del.dataset.suppDel); pSupp(); renderSupplements(); renderSuppWidget(); return; }
        const chk = e.target.closest('[data-supp-check]');
        if (chk) {
          const sid=chk.dataset.suppCheck, idx=parseInt(chk.dataset.suppIdx);
          const s=suppState.list.find(x=>x.id===sid); if(!s) return;
          if(!suppState.log[TODAY]) suppState.log[TODAY]={};
          if(!suppState.log[TODAY][sid]) suppState.log[TODAY][sid]=new Array(s.freq).fill(false);
          suppState.log[TODAY][sid][idx]=!suppState.log[TODAY][sid][idx];
          pSupp(); renderSupplements(); renderSuppWidget();
        }
      },{once:false});
    }

    /* ── Full Electrolyte monitor (nutrition tab) ── */
    function renderElectrolyte() {
      const el = $('[data-electrolyte]'); if (!el) return;
      const s = elecState;
      const ratio = s.sodium>0&&s.potassium>0 ? (s.potassium/s.sodium) : 0;
      const tgt = s.ratioTarget||1.5;
      const potNeeded = Math.max(0, Math.ceil(s.sodium*tgt - s.potassium));
      const pct = clamp(ratio/tgt*100,0,100);
      let statusCls = ratio>=tgt?'is-good':ratio>=tgt*.65?'is-warn':'is-bad';
      if (!s.sodium && !s.potassium) statusCls = '';

      el.innerHTML = `
        <div class="elec-layout">
          <div class="elec-inputs">
            <div class="field"><label>Sodium intake (mg)</label>
              <input class="input" type="number" data-el-na value="${s.sodium||''}" placeholder="e.g. 1800" inputmode="numeric"/></div>
            <div class="field"><label>Potassium intake (mg)</label>
              <input class="input" type="number" data-el-k value="${s.potassium||''}" placeholder="e.g. 3200" inputmode="numeric"/></div>
          </div>
          <div class="elec-status ${statusCls}">
            <div class="elec-ratio">
              <span class="elec-ratio__label">K:Na Ratio</span>
              <span class="elec-ratio__val">${ratio>0?ratio.toFixed(2):'—'}</span>
            </div>
            <div class="elec-bar"><i style="width:${pct.toFixed(1)}%"></i></div>
            ${potNeeded>0?`<p class="elec-needed">⚡ +${potNeeded}mg potassium to reach target ratio (${tgt})</p>`:''}
            ${ratio>=tgt?'<p class="elec-ok">✓ Balanced — facial water retention minimized</p>':''}
          </div>
          <div class="elec-thresholds">
            <p class="elec-thresh__label">Thresholds (editable)</p>
            <div class="elec-thresh__grid">
              <label class="field"><span>Na target (mg)</span>
                <input class="input input--sm" type="number" data-el-na-tgt value="${s.sodiumTarget||2300}" inputmode="numeric"/></label>
              <label class="field"><span>K target (mg)</span>
                <input class="input input--sm" type="number" data-el-k-tgt value="${s.potassiumTarget||3500}" inputmode="numeric"/></label>
              <label class="field"><span>Ratio target</span>
                <input class="input input--sm" type="number" step="0.1" data-el-ratio-tgt value="${tgt}" inputmode="decimal"/></label>
            </div>
            <p class="elec-thresh__hint">Target Na ≤ ${s.sodiumTarget}mg · K ≥ ${s.potassiumTarget}mg · K:Na ≥ ${tgt}</p>
          </div>
        </div>`;

      $('[data-el-na]',el)?.addEventListener('input',e=>{elecState.sodium=num(e.target.value);pElec();renderElectrolyte();renderElecWidget();});
      $('[data-el-k]',el)?.addEventListener('input',e=>{elecState.potassium=num(e.target.value);pElec();renderElectrolyte();renderElecWidget();});
      $('[data-el-na-tgt]',el)?.addEventListener('change',e=>{elecState.sodiumTarget=num(e.target.value)||2300;pElec();renderElectrolyte();});
      $('[data-el-k-tgt]',el)?.addEventListener('change',e=>{elecState.potassiumTarget=num(e.target.value)||3500;pElec();renderElectrolyte();});
      $('[data-el-ratio-tgt]',el)?.addEventListener('change',e=>{elecState.ratioTarget=num(e.target.value)||1.5;pElec();renderElectrolyte();renderElecWidget();});
    }

    /* ── Meal sections ── */
    const MEAL_KEYS   = ['breakfast','lunch','dinner','snacks'];
    const MEAL_LABELS = {breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',snacks:'Snacks'};

    function renderMeals() {
      const host = $('[data-meals-host]'); if (!host) return;
      const {key:TODAY, meals} = todayMeals();

      host.innerHTML = MEAL_KEYS.map(mk => {
        const items = meals[mk]||[];
        const tot = items.reduce((a,f)=>({cal:a.cal+num(f.cal),carbs:a.carbs+num(f.carbs),protein:a.protein+num(f.protein),fats:a.fats+num(f.fats)}),{cal:0,carbs:0,protein:0,fats:0});
        return `<div class="meal-sec" data-meal="${mk}">
          <div class="meal-sec__head">
            <span class="meal-sec__name">${MEAL_LABELS[mk]}</span>
            <span class="meal-sec__tot">${Math.round(tot.cal)} kcal · P ${Math.round(tot.protein)}g · C ${Math.round(tot.carbs)}g · F ${Math.round(tot.fats)}g</span>
            <button class="chip chip--sm" data-meal-add="${mk}">+ Add food</button>
          </div>
          ${items.map(f=>`<div class="meal-food">
            <span class="meal-food__name">${esc(f.name)}</span>
            <span class="meal-food__macros">${f.cal}kcal · P${f.protein} · C${f.carbs} · F${f.fats}</span>
            <button class="icon-btn" data-food-del="${f.id}" data-food-meal="${mk}" title="Remove">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg>
            </button>
          </div>`).join('')}
          <div class="meal-form" data-meal-form="${mk}" hidden>
            <div class="meal-form__grid">
              <input class="input input--sm" data-f-name placeholder="Food name"/>
              <input class="input input--sm" type="number" data-f-cal placeholder="kcal" inputmode="numeric"/>
              <input class="input input--sm" type="number" data-f-p placeholder="Protein g" inputmode="numeric"/>
              <input class="input input--sm" type="number" data-f-c placeholder="Carbs g" inputmode="numeric"/>
              <input class="input input--sm" type="number" data-f-f placeholder="Fats g" inputmode="numeric"/>
            </div>
            <div class="meal-form__actions">
              <button class="btn btn--ghost btn--sm" data-meal-cancel="${mk}">Cancel</button>
              <button class="btn btn--primary btn--sm" data-meal-save="${mk}">Add</button>
            </div>
          </div>
        </div>`;
      }).join('');

      host.querySelectorAll('[data-meal-add]').forEach(btn => {
        btn.addEventListener('click', () => {
          const form = host.querySelector(`[data-meal-form="${btn.dataset.mealAdd}"]`);
          if (form) { form.hidden=!form.hidden; if(!form.hidden) form.querySelector('[data-f-name]')?.focus(); }
        });
      });
      host.querySelectorAll('[data-meal-cancel]').forEach(btn => {
        btn.addEventListener('click', () => { const f=host.querySelector(`[data-meal-form="${btn.dataset.mealCancel}"]`); if(f) f.hidden=true; });
      });
      host.querySelectorAll('[data-meal-save]').forEach(btn => {
        btn.addEventListener('click', () => {
          const mk = btn.dataset.mealSave;
          const form = host.querySelector(`[data-meal-form="${mk}"]`); if (!form) return;
          const name = form.querySelector('[data-f-name]').value.trim(); if (!name) { toast('Food name required'); return; }
          const food = {id:uid(), name, cal:num(form.querySelector('[data-f-cal]').value)||0, protein:num(form.querySelector('[data-f-p]').value)||0, carbs:num(form.querySelector('[data-f-c]').value)||0, fats:num(form.querySelector('[data-f-f]').value)||0};
          const {meals:m} = todayMeals();
          if (!m[mk]) m[mk]=[];
          m[mk].push(food);
          pNut(); renderMeals(); renderMacroRings(); renderMacroWidget(); renderHeatmap(); toast('Food logged');
        });
      });
      host.querySelectorAll('[data-food-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          const {meals:m} = todayMeals();
          const mk=btn.dataset.foodMeal; if(m[mk]) m[mk]=m[mk].filter(f=>f.id!==btn.dataset.foodDel);
          pNut(); renderMeals(); renderMacroRings(); renderMacroWidget(); renderHeatmap();
        });
      });
    }

    /* ── Targets panel ── */
    function renderTargets() {
      const el = $('[data-macro-targets]'); if (!el) return;
      const t = nutState.targets;
      el.innerHTML = `<div class="targets-grid">
        <div class="field"><label>Calories (kcal)</label><input class="input input--sm" type="number" data-t-cal value="${t.cal}" inputmode="numeric"/></div>
        <div class="field"><label>Carbs (g)</label><input class="input input--sm" type="number" data-t-carbs value="${t.carbs}" inputmode="numeric"/></div>
        <div class="field"><label>Protein (g)</label><input class="input input--sm" type="number" data-t-protein value="${t.protein}" inputmode="numeric"/></div>
        <div class="field"><label>Fats (g)</label><input class="input input--sm" type="number" data-t-fats value="${t.fats}" inputmode="numeric"/></div>
      </div>
      <div class="form__actions" style="margin-top:var(--sp-3)">
        <button class="btn btn--primary btn--sm" data-targets-save>Save Targets</button>
      </div>`;
      $('[data-targets-save]',el)?.addEventListener('click',()=>{
        nutState.targets={cal:num($('[data-t-cal]',el).value)||DEFAULT_TARGETS.cal,carbs:num($('[data-t-carbs]',el).value)||DEFAULT_TARGETS.carbs,protein:num($('[data-t-protein]',el).value)||DEFAULT_TARGETS.protein,fats:num($('[data-t-fats]',el).value)||DEFAULT_TARGETS.fats};
        pNut(); renderAll(); toast('Targets saved');
      });
    }

    /* ── Wire supplement add form ── */
    function wireSuppForm() {
      const form = $('[data-supp-form]'); if (!form) return;
      form.addEventListener('submit', e => {
        e.preventDefault();
        const name = form.querySelector('[data-sf-name]')?.value.trim(); if (!name) return;
        const freq  = clamp(parseInt(form.querySelector('[data-sf-freq]')?.value)||1,1,6);
        const note  = form.querySelector('[data-sf-note]')?.value.trim()||'';
        const tRaw  = form.querySelector('[data-sf-times]')?.value.trim()||'';
        const times = tRaw ? tRaw.split(',').map(x=>x.trim()).slice(0,freq) : [];
        suppState.list.push({id:uid(),name,freq,times,note});
        pSupp(); renderSupplements(); renderSuppWidget(); form.reset(); toast('Supplement added');
      });
    }

    function renderAll() {
      renderMacroRings(); renderMeals(); renderTargets();
      renderSupplements(); renderElectrolyte();
      renderMacroWidget(); renderHeatmap(); renderSuppWidget(); renderElecWidget();
    }

    let inited = false;
    function init() {
      if (!inited) {
        wireSuppForm();
        // Targets toggle
        const ttBtn = $('#targets-toggle'), ttPanel = $('#targets-panel');
        if (ttBtn && ttPanel) {
          ttBtn.addEventListener('click', () => {
            ttPanel.hidden = !ttPanel.hidden;
            ttBtn.setAttribute('aria-expanded', String(!ttPanel.hidden));
          });
        }
        // Date label
        const dlbl = $('#nut-date-lbl');
        if (dlbl) {
          const d = new Date();
          dlbl.textContent = d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
        }
        inited = true;
      }
      renderAll();
    }

    /* ── LOGGING FROM OUTSIDE THIS MODULE ──────────────────────────────────
       Nova needs to add food, and she cannot reach nutState — it lives in this
       closure. Writing to the store behind the module's back would not work
       either: the module already holds its copy, so the write would render
       stale. This is the door in. */
    function logFood(meal, f) {
      if (!f || !f.name) return '';
      const key = ['breakfast','lunch','dinner','snacks'].includes(meal) ? meal : mealForNow();
      const { meals } = todayMeals();
      meals[key].push({
        id: uid(), name: String(f.name).slice(0, 60),
        cal: Math.round(num(f.cal)), protein: Math.round(num(f.protein)),
        carbs: Math.round(num(f.carbs)), fats: Math.round(num(f.fats)),
      });
      pNut();
      renderMeals(); renderMacroRings(); renderMacroWidget(); renderHeatmap();
      return key;
    }

    return {init, logFood, renderMacroWidget, renderHeatmap, renderSuppWidget, renderElecWidget};
  })();

  /* ═══════════════════  FINANCE / SHOPPING  ═══════════════════ */
  const Finance = (() => {
    const PRIORITIES = [{key:'high',label:'High'},{key:'med',label:'Medium'},{key:'low',label:'Low'}];
    const PRI_LABEL  = {high:'High Priority', med:'Medium', low:'Low'};

    const DEFAULTS = () => ({
      vaults: {
        personal: {label:'Personal Vault', sub:'Income · Profit', balance:8500},
        upgrade:  {label:'Upgrade Vault',  sub:'Bronx · Project', balance:25000},
      },
      shoppingRule: 20,
      personalCats:  ['Gym','Skincare','Tech'],
      strategicCats: ['Security','Energy Efficiency','Tenant Retention'],
      personalItems: [
        {id:uid(), name:'Adjustable Dumbbells 90lb', price:550, priority:'high', link:'', category:'Gym',      selected:false},
        {id:uid(), name:'Tretinoin 0.05% · 3-month', price:90,  priority:'med',  link:'', category:'Skincare', selected:false},
        {id:uid(), name:'Mechanical Keyboard',        price:180, priority:'low',  link:'', category:'Tech',     selected:false},
      ],
      assetItems: [
        {id:uid(), name:'4K Security Camera System', price:1200, priority:'high', link:'', category:'Security',          value:1800, selected:false},
        {id:uid(), name:'LED Retrofit · All Units',  price:2400, priority:'med',  link:'', category:'Energy Efficiency', value:900,  selected:false},
        {id:uid(), name:'Lobby Renovation',          price:6500, priority:'low',  link:'', category:'Tenant Retention',  value:4200, selected:false},
      ],
      transactions: [],
      history: {
        personal: [{ts:Date.now(), balance:8500}],
        upgrade:  [{ts:Date.now(), balance:25000}],
      },
      rentRoll: [
        {id:'rr1', unit:'1A', rent:1850, status:'paid'},
        {id:'rr2', unit:'1B', rent:1850, status:'paid'},
        {id:'rr3', unit:'1C', rent:1700, status:'vacant'},
        {id:'rr4', unit:'2A', rent:2100, status:'paid'},
        {id:'rr5', unit:'2B', rent:2100, status:'overdue'},
        {id:'rr6', unit:'2C', rent:1950, status:'paid'},
      ],
    });

    let s = Store.get(KEYS.finance, null);
    if (!s) s = DEFAULTS();
    const dft = DEFAULTS();
    if (!s.vaults)            s.vaults = dft.vaults;
    if (!s.vaults.personal)   s.vaults.personal = dft.vaults.personal;
    if (!s.vaults.upgrade)    s.vaults.upgrade  = dft.vaults.upgrade;
    if (s.shoppingRule == null) s.shoppingRule = dft.shoppingRule;
    if (!Array.isArray(s.personalCats))  s.personalCats  = dft.personalCats;
    if (!Array.isArray(s.strategicCats)) s.strategicCats = dft.strategicCats;
    if (!Array.isArray(s.personalItems)) s.personalItems = [];
    if (!Array.isArray(s.assetItems))    s.assetItems    = [];
    if (!Array.isArray(s.transactions))  s.transactions  = [];
    if (!Array.isArray(s.rentRoll))       s.rentRoll       = dft.rentRoll;
    s.assetItems.forEach(it => { if (it.value == null) it.value = 0; });
    if (!s.history || !Array.isArray(s.history.personal) || !Array.isArray(s.history.upgrade)) {
      s.history = synthHistory();
    }

    const save = () => Store.set(KEYS.finance, s);

    /* transient UI state */
    const ui = {
      vaultEdit:false,
      whatif:   {personal:false, asset:false},
      catsOpen: {personal:false, asset:false},
      editing:  {personal:null,  asset:null},
      justAdded:{personal:null,  asset:null},
      assetView:'procurement',   /* 'procurement' | 'rentroll' */
    };
    const painted = new Set();

    /* helpers */
    const fmt = (n) => (n<0?'-':'') + '$' + Math.abs(Math.round(n)).toLocaleString();
    const availableToSpend = () => s.vaults.personal.balance * (s.shoppingRule/100);
    const itemsOf  = (p) => p==='personal' ? s.personalItems : s.assetItems;
    const catsOf   = (p) => p==='personal' ? s.personalCats  : s.strategicCats;
    const vaultKey = (p) => p==='personal' ? 'personal' : 'upgrade';
    const budgetOf = (p) => p==='personal' ? availableToSpend() : s.vaults.upgrade.balance;
    const selTotal = (p) => itemsOf(p).filter(i=>i.selected).reduce((a,i)=>a+num(i.price),0);
    const root = () => $('[data-tab-panel="finance"]');

    const fmtK   = (n) => { n = Math.round(n); const a = Math.abs(n); return a>=1000 ? '$'+(n/1000).toFixed(a%1000?1:0)+'k' : '$'+n; };
    const roiOf  = (it) => num(it.price) > 0 ? (num(it.value)/num(it.price))*100 : 0;

    /* balance-history snapshots (power the sparklines) */
    function synthHistory() {
      const build = (vk) => {
        const txs = s.transactions.filter(t => t.vaultKey === vk).sort((a,b)=>a.ts-b.ts);
        const cur = s.vaults[vk].balance;
        if (!txs.length) return [{ts:Date.now(), balance:cur}];
        let running = cur + txs.reduce((a,t)=>a+num(t.amount),0);   // opening balance
        const pts = [{ts: txs[0].ts - 1000, balance: running}];
        txs.forEach(t => { running -= num(t.amount); pts.push({ts:t.ts, balance:running}); });
        return pts;
      };
      return {personal: build('personal'), upgrade: build('upgrade')};
    }
    function pushHistory(vk) {
      if (!s.history[vk]) s.history[vk] = [];
      s.history[vk].push({ts:Date.now(), balance:s.vaults[vk].balance});
      if (s.history[vk].length > 250) s.history[vk] = s.history[vk].slice(-250);
    }
    const balanceAt = (hist, ts) => { let b = hist.length ? hist[0].balance : 0; for (const p of hist) { if (p.ts <= ts) b = p.balance; else break; } return b; };
    function totalSeries() {
      const stamps = [...new Set([...s.history.personal, ...s.history.upgrade].map(p=>p.ts))].sort((a,b)=>a-b);
      return stamps.map(t => ({ts:t, balance: balanceAt(s.history.personal,t) + balanceAt(s.history.upgrade,t)}));
    }
    /* turn a {ts,balance}[] series into SVG path data.
       projBal: optional projected balance for dashed provisional segment */
    function buildSpark(series, w, h, pad, projBal) {
      if (!series || !series.length) return null;
      const ys = series.map(p=>num(p.balance));
      const xs = series.map(p=>p.ts);
      // Expand Y range to include projected value so both paths share the same scale
      const allYs = projBal != null ? [...ys, projBal] : ys;
      const minY=Math.min(...allYs), maxY=Math.max(...allYs), minT=Math.min(...xs), maxT=Math.max(...xs);
      const spanY=(maxY-minY)||1, spanT=(maxT-minT)||1, iw=w-pad*2, ih=h-pad*2;
      const X = (t) => series.length===1 ? w-pad : pad + ((t-minT)/spanT)*iw;
      const Y = (v) => maxY===minY ? h/2 : (h-pad) - ((v-minY)/spanY)*ih;
      const pts = series.map(p=>[X(p.ts), Y(num(p.balance))]);
      if (series.length===1) pts.unshift([pad, pts[0][1]]);
      /* same smoothing as the Peak curve, so the money trend reads like every
         other tracker in the app instead of a jagged zig-zag */
      const line = smoothPath(pts);
      const area = `${line} L${pts[pts.length-1][0].toFixed(1)} ${(h-pad).toFixed(1)} L${pts[0][0].toFixed(1)} ${(h-pad).toFixed(1)} Z`;
      const lastPt = pts[pts.length-1];
      let provLine = null, provEndX = null, provEndY = null;
      if (projBal != null) {
        provEndX = w - pad;
        provEndY = Y(projBal);
        provLine = `M${lastPt[0].toFixed(1)} ${lastPt[1].toFixed(1)} L${provEndX.toFixed(1)} ${provEndY.toFixed(1)}`;
      }
      return {line, area, lastX:lastPt[0], lastY:lastPt[1], provLine, provEndX, provEndY};
    }

    /* ── Vaults strip ── */
    function renderVaults() {
      const el = $('[data-fin-vaults]'); if (!el) return;
      const v = s.vaults, avail = availableToSpend();
      if (ui.vaultEdit) {
        el.innerHTML = `
          <div class="fin-vault-edit">
            <div class="fin-ve-col">
              <p class="fin-ve-h">Personal Vault</p>
              <label class="field"><span>Label</span><input class="input input--sm" data-fin-vinput="personal.label" value="${esc(v.personal.label)}"></label>
              <label class="field"><span>Subtitle</span><input class="input input--sm" data-fin-vinput="personal.sub" value="${esc(v.personal.sub)}"></label>
              <label class="field"><span>Balance ($)</span><input class="input input--sm" type="number" data-fin-vinput="personal.balance" value="${v.personal.balance}" inputmode="decimal"></label>
            </div>
            <div class="fin-ve-col">
              <p class="fin-ve-h">Upgrade Vault</p>
              <label class="field"><span>Label</span><input class="input input--sm" data-fin-vinput="upgrade.label" value="${esc(v.upgrade.label)}"></label>
              <label class="field"><span>Subtitle</span><input class="input input--sm" data-fin-vinput="upgrade.sub" value="${esc(v.upgrade.sub)}"></label>
              <label class="field"><span>Balance ($)</span><input class="input input--sm" type="number" data-fin-vinput="upgrade.balance" value="${v.upgrade.balance}" inputmode="decimal"></label>
            </div>
            <div class="fin-ve-col">
              <p class="fin-ve-h">Allocation</p>
              <label class="field"><span>Shopping Rule (%)</span><input class="input input--sm" type="number" min="0" max="100" data-fin-vinput="shoppingRule" value="${s.shoppingRule}" inputmode="numeric"></label>
              <div class="fin-ve-actions">
                <button class="btn btn--ghost btn--sm" data-fin-vault-cancel>Cancel</button>
                <button class="btn btn--primary btn--sm" data-fin-vault-save>Save</button>
              </div>
            </div>
          </div>`;
        return;
      }
      el.innerHTML = `
        <div class="fin-vault fin-vault--personal">
          <div class="fin-vault__glow" aria-hidden="true"></div>
          <p class="fin-vault__label">${esc(v.personal.label)}</p>
          <p class="fin-vault__sub">${esc(v.personal.sub)}</p>
          <p class="fin-vault__bal" data-fin-bal="personal">${fmt(v.personal.balance)}</p>
          <p class="fin-vault__proj" data-fin-vault-proj="personal" hidden></p>
          <div class="fin-rule">
            <div class="fin-rule__row">
              <span class="fin-rule__lbl">Shopping Rule</span>
              <span class="fin-rule__pct">${s.shoppingRule}%</span>
            </div>
            <input class="range fin-rule__range" type="range" min="0" max="100" step="1" value="${s.shoppingRule}" data-fin-rule aria-label="Shopping rule percentage">
            <p class="fin-rule__avail">Available to Spend · <b>${fmt(avail)}</b></p>
          </div>
        </div>
        <div class="fin-vault fin-vault--upgrade">
          <div class="fin-vault__glow" aria-hidden="true"></div>
          <p class="fin-vault__label">${esc(v.upgrade.label)}</p>
          <p class="fin-vault__sub">${esc(v.upgrade.sub)}</p>
          <p class="fin-vault__bal" data-fin-bal="upgrade">${fmt(v.upgrade.balance)}</p>
          <p class="fin-vault__proj" data-fin-vault-proj="upgrade" hidden></p>
          <p class="fin-vault__note">Reserved for building upgrades &amp; renovations</p>
        </div>`;
      applyVaultPreview('personal');
      applyVaultPreview('asset');
    }

    /* ── What-If → live vault balance preview ── */
    function applyVaultPreview(panel) {
      const vk = vaultKey(panel);
      const r = root(); if (!r) return;
      const balEl  = r.querySelector(`[data-fin-bal="${vk}"]`);
      const projEl = r.querySelector(`[data-fin-vault-proj="${vk}"]`);
      if (!balEl) return;
      const real = s.vaults[vk].balance;
      const sel  = selTotal(panel);
      const active = ui.whatif[panel] && sel > 0;
      if (active) {
        const projected = real - sel;
        balEl.textContent = fmt(projected);
        balEl.classList.add('is-projected');
        balEl.classList.toggle('is-negative', projected < 0);
        if (projEl) {
          projEl.hidden = false;
          projEl.innerHTML = `<span class="fin-vault__proj-tag">Projected</span> −${fmt(sel)} from ${fmt(real)}`;
        }
      } else {
        balEl.textContent = fmt(real);
        balEl.classList.remove('is-projected','is-negative');
        if (projEl) { projEl.hidden = true; projEl.innerHTML = ''; }
      }
    }

    /* ── shared item form (add + edit) ── */
    function priorityOptions(sel) {
      return PRIORITIES.map(p => `<option value="${p.key}" ${p.key===sel?'selected':''}>${p.label}</option>`).join('');
    }
    function catOptions(panel, sel) {
      const cats = catsOf(panel);
      let html = cats.map(c => `<option value="${esc(c)}" ${c===sel?'selected':''}>${esc(c)}</option>`).join('');
      if (sel && !cats.includes(sel)) html += `<option value="${esc(sel)}" selected>${esc(sel)}</option>`;
      return html;
    }
    function itemFormHTML(panel, item) {
      const isEdit = !!item, isAsset = panel==='asset';
      return `<form class="fin-form ${isAsset?'fin-form--asset':''}" ${isEdit ? `data-fin-edit-form="${panel}" data-id="${item.id}"` : `data-fin-add="${panel}"`} autocomplete="off">
        <div class="fin-form__grid">
          <input class="input input--sm fin-form__name" data-fin-f="name" placeholder="Item name" value="${isEdit?esc(item.name):''}" maxlength="60" required>
          <input class="input input--sm" type="number" min="0" step="0.01" data-fin-f="price" placeholder="$ Price" value="${isEdit?item.price:''}" inputmode="decimal" required>
          ${isAsset ? `<input class="input input--sm" type="number" min="0" step="1" data-fin-f="value" placeholder="Rent Boost ($/mo)" value="${isEdit?(item.value||''):''}" inputmode="decimal" title="Estimated monthly rent boost added by this upgrade">` : ''}
          <select class="input input--sm fin-form__sel" data-fin-f="priority" aria-label="Priority">${priorityOptions(isEdit?item.priority:'med')}</select>
          <select class="input input--sm fin-form__sel" data-fin-f="category" aria-label="Category">${catOptions(panel, isEdit?item.category:catsOf(panel)[0])}</select>
          <input class="input input--sm fin-form__link" data-fin-f="link" placeholder="Purchase link (optional)" value="${isEdit?esc(item.link||''):''}">
        </div>
        <div class="fin-form__actions">
          ${isEdit ? `<button type="button" class="btn btn--ghost btn--sm" data-fin-edit-cancel="${panel}">Cancel</button>` : ''}
          <button type="submit" class="btn btn--primary btn--sm">${isEdit ? 'Save Changes' : '+ Add Item'}</button>
        </div>
      </form>`;
    }

    /* ── item list ── */
    function renderList(panel) {
      const el = $(`[data-fin-list="${panel}"]`); if (!el) return;
      const items = itemsOf(panel), budget = budgetOf(panel), wi = ui.whatif[panel];
      const animateAll = !painted.has(panel);

      if (!items.length) {
        el.innerHTML = `<div class="empty"><p class="empty__title">No items</p><p class="empty__hint">Add ${panel==='personal'?'something to your wishlist':'an acquisition'} below.</p></div>`;
      } else {
        el.innerHTML = items.map((it, idx) => {
          if (ui.editing[panel] === it.id) return `<div class="fin-item fin-item--editing">${itemFormHTML(panel, it)}</div>`;
          const affordable = num(it.price) <= budget;
          const animCls = (animateAll || ui.justAdded[panel]===it.id) ? 'fin-item--in' : '';
          const glow    = it.priority==='high' ? 'fin-item--high' : '';
          const okLbl   = panel==='personal' ? '✓ Within Rule' : '✓ In Budget';
          const overLbl = panel==='personal' ? '⚠ Exceeds Rule' : '⚠ Over Budget';
          const roi     = roiOf(it);
          const roiTier = roi>=100 ? 'is-high' : roi>=50 ? 'is-mid' : 'is-low';
          const roiChip = panel==='asset'
            ? `<span class="fin-roi ${roiTier}" title="Est. rent boost: ${fmtK(num(it.value))}/mo on a ${fmt(num(it.price))} spend">ROI ${Math.round(roi)}% · +${fmtK(num(it.value))}/mo</span>`
            : '';
          return `<div class="fin-item ${animCls} ${glow} ${it.selected?'is-selected':''}" data-fin-row="${panel}" data-id="${it.id}" style="--i:${idx}">
            ${wi ? `<label class="fin-item__check"><input type="checkbox" data-fin-sel="${panel}" data-id="${it.id}" ${it.selected?'checked':''} aria-label="Select for what-if"></label>` : ''}
            <div class="fin-item__body">
              <div class="fin-item__top">
                <span class="fin-item__name">${esc(it.name)}</span>
                <span class="fin-pri fin-pri--${it.priority}">${PRI_LABEL[it.priority]||'—'}</span>
              </div>
              <div class="fin-item__meta">
                <span class="fin-cat">${esc(it.category||'—')}</span>
                ${it.link ? `<a class="fin-link" href="${esc(it.link)}" target="_blank" rel="noopener">↗ Buy</a>` : ''}
              </div>
            </div>
            <div class="fin-item__right">
              <span class="fin-item__price">${fmt(it.price)}</span>
              <span class="fin-impact ${affordable?'is-ok':'is-over'}">${affordable?okLbl:overLbl}</span>
              ${roiChip}
            </div>
            <div class="fin-item__acts">
              <button class="fin-buy" data-fin-buy="${panel}" data-id="${it.id}" title="Purchase — logs the transaction and deducts from the vault">Purchase</button>
              <button class="icon-btn" data-fin-edit-item="${panel}" data-id="${it.id}" title="Edit item">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 20h9" stroke-linecap="round"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linejoin="round"/></svg>
              </button>
              <button class="icon-btn" data-fin-del="${panel}" data-id="${it.id}" title="Remove item">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>`;
        }).join('');
      }
      painted.add(panel);
      ui.justAdded[panel] = null;
    }

    /* ── panel footer (what-if projection) ── */
    function renderFoot(panel) {
      const el = $(`[data-fin-foot="${panel}"]`); if (!el) return;
      const budget = budgetOf(panel), sel = selTotal(panel), projected = budget - sel;
      const wi = ui.whatif[panel];
      const count = itemsOf(panel).filter(i=>i.selected).length;
      const budLbl = panel==='personal' ? 'Available to Spend' : esc(s.vaults.upgrade.label);
      const over = projected < 0;
      let roiCell = '';
      if (panel==='asset') {
        const tv = itemsOf('asset').reduce((a,i)=>a+num(i.value),0);
        const tp = itemsOf('asset').reduce((a,i)=>a+num(i.price),0);
        const pr = tp ? (tv/tp*100) : 0;
        roiCell = `<div class="fin-foot__cell fin-foot__cell--roi">
          <span class="fin-foot__k">Value Impact · ROI ${Math.round(pr)}%</span>
          <span class="fin-foot__v">${fmt(tv)}</span>
        </div>`;
      }
      el.classList.toggle('fin-foot--wi', wi);
      el.innerHTML = `
        ${roiCell}
        <div class="fin-foot__cell">
          <span class="fin-foot__k">${budLbl}</span>
          <span class="fin-foot__v">${fmt(budget)}</span>
        </div>
        ${wi ? `
          <div class="fin-foot__cell">
            <span class="fin-foot__k">Selected · ${count}</span>
            <span class="fin-foot__v">${fmt(sel)}</span>
          </div>
          <div class="fin-foot__cell fin-foot__cell--proj">
            <span class="fin-foot__k">Projected Balance</span>
            <span class="fin-foot__v fin-foot__proj ${over?'is-exceeded':''}" data-fin-proj="${panel}">${fmt(projected)}</span>
          </div>
          <button class="btn btn--primary btn--sm fin-buy-sel" data-fin-buy-selected="${panel}" ${count?'':'disabled'}>Purchase Selected (${count})</button>
        ` : `
          <button class="chip chip--sm" data-fin-whatif="${panel}">Enable What-If →</button>
        `}`;
    }

    /* ── categories editor ── */
    function renderCatsEditor(panel) {
      const el = $(`[data-fin-cats-editor="${panel}"]`); if (!el) return;
      el.hidden = !ui.catsOpen[panel];
      if (!ui.catsOpen[panel]) { el.innerHTML = ''; return; }
      const label = panel==='personal' ? 'Categories' : 'Strategic Categories';
      el.innerHTML = `
        <p class="fin-cats__label">${label} · comma-separated</p>
        <div class="fin-cats__row">
          <input class="input input--sm" data-fin-cats-input="${panel}" value="${esc(catsOf(panel).join(', '))}">
          <button class="btn btn--primary btn--sm" data-fin-cats-save="${panel}">Save</button>
        </div>`;
    }

    /* ── add form host ── */
    function renderAdd(panel) {
      const el = $(`[data-fin-addhost="${panel}"]`); if (!el) return;
      el.innerHTML = itemFormHTML(panel, null);
    }

    /* ── Rent Roll Grid (Bronx panel alternate view) ── */
    function renderRentRoll() {
      const el = $('[data-fin-rent-roll]'); if (!el) return;
      const units = s.rentRoll;
      const STATUS_CYCLE = {paid:'overdue', overdue:'vacant', vacant:'paid'};
      const collected = units.filter(u=>u.status==='paid').reduce((a,u)=>a+num(u.rent),0);
      const potential = units.reduce((a,u)=>a+num(u.rent),0);
      const vacant   = units.filter(u=>u.status==='vacant').length;
      const overdue  = units.filter(u=>u.status==='overdue').length;
      const occupancy = units.length ? Math.round(((units.length-vacant)/units.length)*100) : 0;

      el.innerHTML = `
        <div class="rr-summary">
          <span class="rr-stat"><b>${fmt(collected)}</b>/mo collected</span>
          <span class="rr-stat">${occupancy}% occupied</span>
          ${overdue  ? `<span class="rr-stat" style="color:var(--fin-bad)">${overdue} overdue</span>`  : ''}
          ${vacant   ? `<span class="rr-stat" style="color:var(--c-fog)">${vacant} vacant</span>`     : ''}
          <span class="rr-stat" style="color:var(--c-mid)">potential ${fmt(potential)}/mo</span>
        </div>
        <div class="rr-grid">
          ${units.map(u => `
            <div class="rr-unit" data-rr-id="${u.id}">
              <div class="rr-unit__row">
                <span class="rr-unit__id">${esc(u.unit)}</span>
                <button class="rr-unit__del" data-rr-del="${u.id}" title="Remove unit">×</button>
              </div>
              <span class="rr-unit__rent">${fmtK(num(u.rent))}/mo</span>
              <button class="rr-status rr-status--${u.status}" data-rr-toggle="${u.id}" title="Click to cycle status">${u.status.charAt(0).toUpperCase()+u.status.slice(1)}</button>
            </div>`).join('')}
        </div>
        <div class="rr-add">
          <input class="input input--sm" data-rr-unit placeholder="Unit (e.g. 3A)" maxlength="6">
          <input class="input input--sm" type="number" data-rr-rent placeholder="$ Rent" inputmode="numeric" min="0">
          <button class="btn btn--ghost btn--sm" data-rr-add>+ Unit</button>
        </div>`;
    }

    /* ── balance-trend sparklines (replaces the static ledger) ── */
    function sparkCardHTML(label, series, key, projectedBalance) {
      const W = 240, H = 58, P = 6;
      const hasProj = projectedBalance != null;
      const cur    = series.length ? series[series.length-1].balance : 0;
      const first  = series.length ? series[0].balance : 0;
      const change = cur - first;
      const pct    = first ? (change/first*100) : 0;
      const dir    = change>0 ? 'up' : change<0 ? 'down' : 'flat';
      const arrow  = dir==='up' ? '▲' : dir==='down' ? '▼' : '■';
      const sp     = buildSpark(series, W, H, P, hasProj ? projectedBalance : undefined);
      const projDrop = hasProj ? (projectedBalance - cur) : 0;
      const projBadge = hasProj
        ? `<span class="spark-card__delta is-down" style="margin-left:auto;opacity:.85">⇢ ${fmt(projectedBalance)} if purchased</span>`
        : '';
      return `<div class="spark-card ${hasProj ? 'has-projection' : ''}">
        <div class="spark-card__head">
          <span class="spark-card__label">${esc(label)}</span>
          <span class="spark-card__delta is-${dir}">${arrow} ${fmt(Math.abs(change))}${first?` · ${Math.abs(pct).toFixed(1)}%`:''}</span>
        </div>
        <p class="spark-card__val">${fmt(cur)}</p>
        <svg class="spark-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="${H}" aria-hidden="true">
          <defs><linearGradient id="sg-${key}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,.2)"/>
            <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
          </linearGradient></defs>
          ${sp ? `
            <path class="spark-area" d="${sp.area}" fill="url(#sg-${key})"/>
            <path class="spark-line" d="${sp.line}" fill="none" vector-effect="non-scaling-stroke"/>
            <circle class="spark-dot" cx="${sp.lastX.toFixed(1)}" cy="${sp.lastY.toFixed(1)}" r="2.6" vector-effect="non-scaling-stroke"/>
            ${sp.provLine ? `
              <path class="spark-provisional" d="${sp.provLine}" fill="none" vector-effect="non-scaling-stroke"/>
              <circle class="spark-prov-dot" cx="${sp.provEndX.toFixed(1)}" cy="${sp.provEndY.toFixed(1)}" r="3" vector-effect="non-scaling-stroke"/>
              <text class="spark-prov-label" x="${(sp.provEndX - 2).toFixed(1)}" y="${Math.max(P+8, sp.provEndY - 5).toFixed(1)}" text-anchor="end" font-size="8">${fmt(projectedBalance)}</text>
            ` : ''}
          ` : ''}
        </svg>
        ${hasProj && projDrop !== 0 ? `<div class="spark-card__proj-bar">${projBadge}</div>` : ''}
        ${series.length<2 && !hasProj ? `<p class="spark-card__hint">No movement yet — purchases chart here.</p>` : ''}
      </div>`;
    }
    function renderTrends() {
      const el = $('[data-fin-trends]'); if (!el) return;
      const cnt = $('[data-fin-ledger-count]'); if (cnt) cnt.textContent = s.transactions.length;
      /* Compute provisional projected balances from active What-If selections */
      const personalSel = selTotal('personal');
      const assetSel    = selTotal('asset');
      const personalProj = (ui.whatif.personal && personalSel > 0) ? s.vaults.personal.balance - personalSel : null;
      const upgradeProj  = (ui.whatif.asset    && assetSel    > 0) ? s.vaults.upgrade.balance  - assetSel    : null;
      const totalProj    = (personalProj !== null || upgradeProj !== null)
        ? (personalProj ?? s.vaults.personal.balance) + (upgradeProj ?? s.vaults.upgrade.balance)
        : null;
      el.innerHTML = [
        {key:'personal', label:s.vaults.personal.label, series:s.history.personal, proj:personalProj},
        {key:'upgrade',  label:s.vaults.upgrade.label,  series:s.history.upgrade,  proj:upgradeProj},
        {key:'total',    label:'Total Capital',         series:totalSeries(),       proj:totalProj},
      ].map(c => sparkCardHTML(c.label, c.series, c.key, c.proj)).join('');
    }

    /* ── panel composite ── */
    function renderPanel(panel) {
      if (panel === 'asset') {
        const isRentRoll = ui.assetView === 'rentroll';
        const rrEl   = $('[data-fin-rent-roll]');
        const listEl = $('[data-fin-list="asset"]');
        const footEl = $('[data-fin-foot="asset"]');
        const addEl  = $('[data-fin-addhost="asset"]');
        const catEl  = $('[data-fin-cats-editor="asset"]');
        /* toggle visibility of procurement vs rent roll sections */
        if (rrEl)   rrEl.hidden   = !isRentRoll;
        if (listEl) listEl.hidden = isRentRoll;
        if (footEl) footEl.hidden = isRentRoll;
        if (addEl)  addEl.hidden  = isRentRoll;
        if (catEl && isRentRoll) { catEl.hidden = true; ui.catsOpen.asset = false; }
        /* sync toggle button label */
        $$('[data-fin-rent-roll-toggle]').forEach(b => {
          b.classList.toggle('is-active', isRentRoll);
          b.textContent = isRentRoll ? '☰ Procurement' : '⊞ Rent Roll';
        });
        if (isRentRoll) { renderRentRoll(); return; }
      }
      renderCatsEditor(panel);
      renderList(panel);
      renderFoot(panel);
      renderAdd(panel);
      $$(`[data-fin-whatif="${panel}"]`).forEach(c => c.classList.toggle('is-active', ui.whatif[panel]));
      $$(`[data-fin-cats="${panel}"]`).forEach(c => c.classList.toggle('is-active', ui.catsOpen[panel]));
    }

    function renderAll() { renderVaults(); renderPanel('personal'); renderPanel('asset'); renderTrends(); }

    /* ── auto-accounting ── */
    function commitPurchase(panel, item) {
      const vk = vaultKey(panel);
      s.vaults[vk].balance = Math.round((s.vaults[vk].balance - num(item.price)) * 100) / 100;
      s.transactions.push({id:uid(), ts:Date.now(), name:item.name, amount:num(item.price), panel, vaultKey:vk, category:item.category||''});
      pushHistory(vk);
    }
    function bumpVault(panel) {
      const bal = root()?.querySelector(`[data-fin-bal="${vaultKey(panel)}"]`);
      if (bal) { bal.classList.remove('is-bump'); void bal.offsetWidth; bal.classList.add('is-bump'); }
    }
    function purchase(panel, id) {
      const item = itemsOf(panel).find(i=>i.id===id); if (!item) return;
      const row = root()?.querySelector(`[data-fin-row="${panel}"][data-id="${id}"]`);
      const done = () => {
        commitPurchase(panel, item);
        const arr = itemsOf(panel), idx = arr.findIndex(i=>i.id===id);
        if (idx > -1) arr.splice(idx, 1);
        save(); renderVaults(); renderPanel(panel); renderTrends(); bumpVault(panel);
        toast(`Purchased · ${item.name}`);
      };
      if (row) { row.classList.add('is-buying'); setTimeout(done, 420); } else done();
    }
    function purchaseSelected(panel) {
      const selected = itemsOf(panel).filter(i=>i.selected);
      if (!selected.length) return;
      const r = root();
      selected.forEach(it => r?.querySelector(`[data-fin-row="${panel}"][data-id="${it.id}"]`)?.classList.add('is-buying'));
      setTimeout(() => {
        selected.forEach(it => commitPurchase(panel, it));
        const ids = new Set(selected.map(i=>i.id));
        if (panel==='personal') s.personalItems = s.personalItems.filter(i=>!ids.has(i.id));
        else s.assetItems = s.assetItems.filter(i=>!ids.has(i.id));
        save(); renderVaults(); renderPanel(panel); renderTrends(); bumpVault(panel);
        toast(`Purchased ${selected.length} item${selected.length>1?'s':''}`);
      }, 440);
    }

    /* ── event wiring (delegated) ── */
    function wireEvents() {
      const r = root(); if (!r) return;

      r.addEventListener('click', e => {
        const t = e.target;
        if (t.closest('[data-fin-edit-vaults]'))  { ui.vaultEdit = true;  renderVaults(); return; }
        if (t.closest('[data-fin-vault-cancel]')) { ui.vaultEdit = false; renderVaults(); return; }
        if (t.closest('[data-fin-vault-save]')) {
          const oldBal = {personal:s.vaults.personal.balance, upgrade:s.vaults.upgrade.balance};
          r.querySelectorAll('[data-fin-vinput]').forEach(inp => {
            const path = inp.dataset.finVinput;
            if (path==='shoppingRule') s.shoppingRule = clamp(parseInt(inp.value,10)||0, 0, 100);
            else {
              const [vk, prop] = path.split('.');
              if (prop==='balance') s.vaults[vk].balance = num(inp.value);
              else s.vaults[vk][prop] = inp.value.trim() || s.vaults[vk][prop];
            }
          });
          ['personal','upgrade'].forEach(vk => { if (s.vaults[vk].balance !== oldBal[vk]) pushHistory(vk); });
          ui.vaultEdit = false; save(); renderAll(); toast('Vaults updated'); return;
        }
        /* Rent Roll toggle */
        if (t.closest('[data-fin-rent-roll-toggle]')) {
          ui.assetView = ui.assetView === 'rentroll' ? 'procurement' : 'rentroll';
          renderPanel('asset'); return;
        }
        /* Rent Roll unit status cycle */
        const rrToggle = t.closest('[data-rr-toggle]');
        if (rrToggle) {
          const STATUS_CYCLE = {paid:'overdue', overdue:'vacant', vacant:'paid'};
          const unit = s.rentRoll.find(u=>u.id===rrToggle.dataset.rrToggle);
          if (unit) { unit.status = STATUS_CYCLE[unit.status] || 'paid'; save(); renderRentRoll(); } return;
        }
        /* Rent Roll unit delete */
        const rrDel = t.closest('[data-rr-del]');
        if (rrDel) {
          s.rentRoll = s.rentRoll.filter(u=>u.id!==rrDel.dataset.rrDel);
          save(); renderRentRoll(); return;
        }
        /* Rent Roll add unit */
        const rrAdd = t.closest('[data-rr-add]');
        if (rrAdd) {
          const rrEl = $('[data-fin-rent-roll]');
          const unitIn = rrEl ? $('[data-rr-unit]', rrEl) : null;
          const rentIn = rrEl ? $('[data-rr-rent]', rrEl) : null;
          const unitVal = unitIn?.value.trim();
          if (!unitVal) { toast('Unit name required'); return; }
          s.rentRoll.push({id:uid(), unit:unitVal, rent:num(rentIn?.value)||0, status:'vacant'});
          save(); renderRentRoll(); return;
        }

        const wi = t.closest('[data-fin-whatif]');
        if (wi) {
          const p = wi.dataset.finWhatif; ui.whatif[p] = !ui.whatif[p];
          renderPanel(p); applyVaultPreview(p); renderTrends(); return;
        }
        const ct = t.closest('[data-fin-cats]');
        if (ct) { const p = ct.dataset.finCats; ui.catsOpen[p] = !ui.catsOpen[p]; renderPanel(p); return; }
        const cs = t.closest('[data-fin-cats-save]');
        if (cs) {
          const p = cs.dataset.finCatsSave;
          const inp = r.querySelector(`[data-fin-cats-input="${p}"]`);
          const list = (inp?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
          if (list.length) { if (p==='personal') s.personalCats = list; else s.strategicCats = list; }
          ui.catsOpen[p] = false; save(); renderPanel(p); toast('Categories saved'); return;
        }
        const buy = t.closest('[data-fin-buy]');
        if (buy) { purchase(buy.dataset.finBuy, buy.dataset.id); return; }
        const bsel = t.closest('[data-fin-buy-selected]');
        if (bsel) { purchaseSelected(bsel.dataset.finBuySelected); return; }
        const ed = t.closest('[data-fin-edit-item]');
        if (ed) { const p = ed.dataset.finEditItem; ui.editing[p] = ed.dataset.id; renderList(p); return; }
        const ec = t.closest('[data-fin-edit-cancel]');
        if (ec) { const p = ec.dataset.finEditCancel; ui.editing[p] = null; renderList(p); return; }
        const del = t.closest('[data-fin-del]');
        if (del) {
          const p = del.dataset.finDel, id = del.dataset.id;
          const row = r.querySelector(`[data-fin-row="${p}"][data-id="${id}"]`);
          const fin = () => { const arr = itemsOf(p), i = arr.findIndex(x=>x.id===id); if (i>-1) arr.splice(i,1); save(); renderPanel(p); };
          if (row) { row.classList.add('is-removing'); setTimeout(fin, 300); } else fin();
          return;
        }
        if (t.closest('[data-fin-clear-ledger]')) {
          const hasData = s.transactions.length || s.history.personal.length > 1 || s.history.upgrade.length > 1;
          if (!hasData) return;
          s.transactions = [];
          s.history = {
            personal: [{ts:Date.now(), balance:s.vaults.personal.balance}],
            upgrade:  [{ts:Date.now(), balance:s.vaults.upgrade.balance}],
          };
          save(); renderTrends(); toast('Trends reset'); return;
        }
      });

      r.addEventListener('change', e => {
        const t = e.target;
        if (t.matches('[data-fin-rule]')) {
          s.shoppingRule = clamp(parseInt(t.value,10)||0, 0, 100);
          save(); renderVaults(); renderPanel('personal'); return;
        }
        if (t.matches('[data-fin-sel]')) {
          const p = t.dataset.finSel, id = t.dataset.id;
          const it = itemsOf(p).find(x=>x.id===id); if (!it) return;
          it.selected = t.checked; save();
          r.querySelector(`[data-fin-row="${p}"][data-id="${id}"]`)?.classList.toggle('is-selected', t.checked);
          renderFoot(p); applyVaultPreview(p); renderTrends(); return;
        }
      });

      r.addEventListener('input', e => {
        if (e.target.matches('[data-fin-rule]')) {
          const pct = clamp(parseInt(e.target.value,10)||0, 0, 100);
          const pctEl = r.querySelector('.fin-rule__pct'); if (pctEl) pctEl.textContent = pct + '%';
          const avEl  = r.querySelector('.fin-rule__avail b'); if (avEl) avEl.textContent = fmt(s.vaults.personal.balance * (pct/100));
        }
      });

      r.addEventListener('submit', e => {
        const form = e.target;
        if (form.matches('[data-fin-add]')) {
          e.preventDefault();
          const p = form.dataset.finAdd;
          const get = (k) => form.querySelector(`[data-fin-f="${k}"]`)?.value ?? '';
          const name = get('name').trim(); if (!name) { toast('Item name required'); return; }
          const item = {id:uid(), name, price:num(get('price')), priority:get('priority')||'med', category:get('category')||catsOf(p)[0]||'', link:get('link').trim(), value: p==='asset' ? num(get('value')) : 0, selected:false};
          itemsOf(p).push(item);
          ui.justAdded[p] = item.id;
          save(); renderList(p); renderFoot(p); renderAdd(p); toast('Item added');
          return;
        }
        if (form.matches('[data-fin-edit-form]')) {
          e.preventDefault();
          const p = form.dataset.finEditForm, id = form.dataset.id;
          const it = itemsOf(p).find(x=>x.id===id); if (!it) return;
          const get = (k) => form.querySelector(`[data-fin-f="${k}"]`)?.value ?? '';
          it.name = get('name').trim() || it.name;
          it.price = num(get('price'));
          it.priority = get('priority') || it.priority;
          it.category = get('category') || it.category;
          it.link = get('link').trim();
          if (p==='asset') it.value = num(get('value'));
          ui.editing[p] = null; save(); renderPanel(p); toast('Item updated');
          return;
        }
      });
    }

    let inited = false;
    function init() {
      if (!inited) { wireEvents(); inited = true; }
      renderAll();
    }

    return { init };
  })();

  /* ═══════════════════  PHOTOS  ═══════════════════ */
  const Photos = (() => {
    const KEY = 'nv.photos';
    const WK  = 'nv.photowidget';
    let photos  = Store.get(KEY, []);
    let wState  = Store.get(WK, {x:null, y:null, size:'md', idx:0, visible:false});

    /* ── IndexedDB for full-size images ── */
    let _db = null;
    function getDB() {
      if (_db) return Promise.resolve(_db);
      return new Promise((res, rej) => {
        const req = indexedDB.open('nv.photodb', 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore('imgs');
        req.onsuccess  = e => { _db = e.target.result; res(_db); };
        req.onerror    = () => rej(req.error);
      });
    }
    async function dbSave(id, dataUrl) {
      const db = await getDB();
      return new Promise((res, rej) => {
        const tx = db.transaction('imgs','readwrite');
        tx.objectStore('imgs').put(dataUrl, id);
        tx.oncomplete = () => res();
        tx.onerror    = () => rej(tx.error);
      });
    }
    async function dbLoad(id) {
      const db = await getDB();
      return new Promise(res => {
        const tx  = db.transaction('imgs','readonly');
        const req = tx.objectStore('imgs').get(id);
        req.onsuccess = () => res(req.result || null);
        req.onerror   = () => res(null);
      });
    }
    async function dbDel(id) {
      const db = await getDB();
      return new Promise(res => {
        const tx = db.transaction('imgs','readwrite');
        tx.objectStore('imgs').delete(id);
        tx.oncomplete = () => res();
        tx.onerror    = () => res();
      });
    }

    const persist  = () => Store.set(KEY, photos);
    const persistW = () => Store.set(WK, wState);

    /* ── Dynamic categories ── */
    const KEY_CATS = 'nv.photocats';
    const KEY_PINS = 'nv.photopins';
    const DEFAULT_CATS = [
      {id:'gym',      label:'Gym'},
      {id:'bronx',    label:'Bronx'},
      {id:'family',   label:'Family'},
      {id:'personal', label:'Personal'},
      {id:'business', label:'Business'},
    ];
    const KEY_TAGS = 'nv.phototags';
    const DEFAULT_TAGS = [
      {id:'before',   label:'Before'},
      {id:'after',    label:'After'},
      {id:'progress', label:'Progress'},
    ];
    let categories = Store.get(KEY_CATS, DEFAULT_CATS);
    let photoPins  = Store.get(KEY_PINS, []);
    let tags       = Store.get(KEY_TAGS, DEFAULT_TAGS);
    const persistCats = () => Store.set(KEY_CATS, categories);
    const persistPins = () => Store.set(KEY_PINS, photoPins);
    const persistTags = () => Store.set(KEY_TAGS, tags);
    const getCatLabel = (id) => id==='all' ? 'All' : (categories.find(c=>c.id===id)?.label || id);
    const getTagLabel = (id) => !id ? '' : (tags.find(t=>t.id===id)?.label || id);
    const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || ('t'+uid());
    const PIN_SIZES   = {sm:140, md:200, lg:300};
    const ALL_TABS_PH = ['home','gym','nutrition','finance','photos','goals','reminders'];

    let activeFilter = 'all';
    let compareMode  = false;
    let compareIds   = [];
    let pendingUrl   = null;
    let catEditing   = false;

    const filtered = () => activeFilter === 'all' ? photos : photos.filter(p => p.category === activeFilter);

    /* ── Filter bar (dynamic categories + inline editor) ── */
    function renderFilterBar() {
      const el = $('[data-photo-filter]'); if (!el) return;
      if (catEditing) {
        el.innerHTML = `<div class="ph-cat-editor">
          <p class="ph-cat-editor__title">✎ Edit Categories</p>
          <div class="ph-cat-editor__list">
            ${categories.map((c,i) => `
              <div class="ph-cat-editor__row">
                <input class="input input--sm ph-cat-editor__inp" value="${esc(c.label)}" data-cat-rename="${i}" maxlength="28" placeholder="Category name">
                <button class="ph-cat-editor__del" data-cat-del="${i}" title="Delete">×</button>
              </div>`).join('')}
          </div>
          <div class="ph-cat-editor__add">
            <input class="input input--sm" id="ph-cat-new-inp" placeholder="New category name…" maxlength="28">
            <button class="btn btn--ghost btn--sm" data-cat-add>+ Add</button>
          </div>
          <div class="ph-cat-editor__foot">
            <button class="btn btn--primary btn--sm" data-ph-cat-edit-done>✓ Save</button>
          </div>
        </div>`;
        return;
      }
      const allBtn  = `<button class="chip chip--sm ${activeFilter==='all'?'is-active':''}" data-filter="all">All</button>`;
      const catBtns = categories.map(c =>
        `<button class="chip chip--sm ${c.id===activeFilter?'is-active':''}" data-filter="${esc(c.id)}">${esc(c.label)}</button>`
      ).join('');
      const editBtn = `<button class="chip chip--sm ph-cat-edit-btn" data-ph-cat-edit title="Add · rename · delete categories">✎</button>`;
      el.innerHTML  = allBtn + catBtns + editBtn;
    }

    /* ── Photo grid ── */
    async function renderGrid() {
      const el = $('[data-photo-grid]'); if (!el) return;
      const list = filtered();
      const countEl = $('[data-photo-count]');
      if (countEl) countEl.textContent = photos.length;
      if (!list.length) {
        el.innerHTML = emptyHTML('No photos yet', 'Tap "Add Photo" — before & after, family moments, Bronx progress, anything.');
        return;
      }
      el.innerHTML = list.map((p, i) => {
        const tagHtml = p.tag ? `<span class="ph-tag ph-tag--${esc(p.tag)}">${esc(getTagLabel(p.tag))}</span>` : '';
        const selCls  = compareIds.includes(p.id) ? 'is-selected' : '';
        const cmpBtn  = compareMode
          ? `<button class="photo-card__cmp-btn" data-photo-cmp="${p.id}">${compareIds.includes(p.id) ? '✓ Selected' : 'Pick'}</button>`
          : '';
        return `
          <div class="photo-card ${selCls}" data-photo-card="${p.id}" style="--i:${i}">
            <div class="photo-card__thumb">
              <img data-ph-thumb="${p.id}" src="" alt="${esc(p.caption||'Photo')}" loading="lazy">
              <div class="photo-card__overlay">
                ${cmpBtn}
                <button class="photo-card__view-btn" data-photo-view="${p.id}">View</button>
                <button class="photo-card__pin-btn" data-photo-pin="${p.id}" title="Pin to a tab as floating frame">📌 Pin</button>
                <button class="photo-card__widget-btn" data-photo-to-widget="${p.id}" title="Open in slideshow widget">⧉</button>
                <button class="photo-card__del-btn" data-photo-del="${p.id}" aria-label="Delete photo">×</button>
              </div>
            </div>
            <div class="photo-card__info">
              <p class="photo-card__caption">${esc(p.caption||'Untitled')}</p>
              <div class="photo-card__meta">
                <span class="ph-cat ph-cat--${p.category}">${esc(getCatLabel(p.category))}</span>
                ${tagHtml}
                <span class="ph-date">${p.date||''}</span>
              </div>
            </div>
          </div>`;
      }).join('');
      /* async fill thumbnails */
      for (const p of list) {
        const img = $(`[data-ph-thumb="${p.id}"]`);
        if (img) dbLoad(p.id).then(url => { if (url && img) img.src = url; });
      }
    }

    function renderAll() { renderFilterBar(); renderGrid(); }

    /* ── Upload zone ── */
    function showUploadZone() {
      const z = $('[data-photo-upload-zone]'); if (!z) return;
      z.hidden = false;
      const d = $('[data-photo-date]', z);
      if (d && !d.value) d.value = localDateKey();
      /* populate category select from current categories */
      const catSel = $('[data-photo-cat]', z);
      if (catSel) catSel.innerHTML = categories.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
      /* populate tag select from current tags (+ inline add) */
      populateTagSelect();
    }

    function populateTagSelect() {
      const tagSel = $('[data-photo-tag]');
      if (!tagSel) return;
      const cur = tagSel.value;
      tagSel.innerHTML = `<option value="">No tag</option>` +
        tags.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('') +
        `<option value="__new">＋ Add new tag…</option>`;
      if (cur && cur!=='__new') tagSel.value = cur;
    }
    function hideUploadZone() {
      const z = $('[data-photo-upload-zone]'); if (!z) return;
      z.hidden = true; pendingUrl = null;
      const prev = $('[data-photo-preview]', z);
      if (prev) { prev.src = ''; prev.classList.remove('is-loaded'); }
      const pl = $('[data-ph-placeholder]', z); if (pl) pl.hidden = false;
      const cap = $('[data-photo-caption]', z); if (cap) cap.value = '';
      const tag = $('[data-photo-tag]', z);     if (tag) tag.value = '';
    }

    async function doSavePhoto() {
      if (!pendingUrl) { toast('Select an image first'); return; }
      const cap  = $('[data-photo-caption]')?.value.trim() || '';
      const date = $('[data-photo-date]')?.value || localDateKey();
      const cat  = $('[data-photo-cat]')?.value  || 'personal';
      const tag  = $('[data-photo-tag]')?.value  || '';
      const id   = uid();
      photos.unshift({id, date, caption:cap, category:cat, tag, createdAt:Date.now()});
      persist();
      await dbSave(id, pendingUrl);
      hideUploadZone();
      renderAll();
      toast('Photo saved ✓');
    }

    async function doDeletePhoto(id) {
      photos = photos.filter(p => p.id !== id);
      persist();
      await dbDel(id);
      if (wState.idx >= photos.length) { wState.idx = Math.max(0, photos.length - 1); persistW(); }
      renderAll();
      toast('Photo removed');
    }

    /* ── Lightbox ── */
    async function openLightbox(id) {
      const p = photos.find(x => x.id === id); if (!p) return;
      const m = $('#modal-photo'); if (!m) return;
      const url = await dbLoad(id);
      const img = $('[data-pm-img]', m); if (img) img.src = url || '';
      const cap = $('[data-pm-caption]', m); if (cap) cap.textContent = p.caption || '';
      const cat = $('[data-pm-cat]', m); if (cat) cat.textContent = getCatLabel(p.category);
      const dt  = $('[data-pm-date]', m); if (dt) dt.textContent  = p.date || '';
      m.classList.add('is-open'); m.setAttribute('aria-hidden','false');
    }
    function closeLightbox() {
      const m = $('#modal-photo'); if (!m) return;
      m.classList.remove('is-open'); m.setAttribute('aria-hidden','true');
    }

    /* ── Before/After compare ── */
    async function renderCompare() {
      const panel = $('[data-photo-compare]'); if (!panel) return;
      if (compareIds.length < 2) { panel.hidden = true; return; }
      panel.hidden = false;
      const [p1, p2] = compareIds.map(id => photos.find(x => x.id === id));
      if (!p1 || !p2) return;
      const [u1, u2] = await Promise.all([dbLoad(p1.id), dbLoad(p2.id)]);
      const sideHtml = (p, u, fallback) => `
        <span class="compare-side__label">${p.tag ? p.tag.toUpperCase() : fallback} · ${p.date||''}</span>
        <img src="${u||''}" alt="${esc(p.caption)}" />
        <p>${esc(p.caption)}</p>`;
      $('[data-compare-left]', panel).innerHTML  = sideHtml(p1, u1, 'Before');
      $('[data-compare-right]', panel).innerHTML = sideHtml(p2, u2, 'After');
    }

    /* ── Photo Pins (individual photos pinned as floating frames on any tab) ── */
    function renderPinFrame(pin) {
      const el = document.createElement('div');
      el.className = 'photo-pin';
      el.dataset.pinId = pin.id;
      el.style.cssText = `position:fixed;left:${pin.x||24}px;top:${pin.y||100}px;width:${PIN_SIZES[pin.size||'md']}px;z-index:25;display:none;`;
      el.innerHTML = `
        <div class="photo-pin__head" data-pin-drag="${pin.id}">
          <span class="photo-pin__grip" aria-hidden="true">⠿</span>
          <span class="photo-pin__icon" aria-hidden="true">📌</span>
          <div class="photo-pin__ctrls">
            <button class="photo-pin__sz ${pin.size==='sm'?'is-active':''}" data-pin-size="sm" data-for="${pin.id}">S</button>
            <button class="photo-pin__sz ${(pin.size||'md')==='md'?'is-active':''}" data-pin-size="md" data-for="${pin.id}">M</button>
            <button class="photo-pin__sz ${pin.size==='lg'?'is-active':''}" data-pin-size="lg" data-for="${pin.id}">L</button>
            <button class="photo-pin__tabs-btn" data-pin-tabs="${pin.id}" title="Choose which tabs show this">☰</button>
            <button class="photo-pin__close" data-pin-del="${pin.id}" title="Remove pin">×</button>
          </div>
        </div>
        <div class="photo-pin__tab-menu" data-pin-menu="${pin.id}" hidden>
          <p class="photo-pin__tab-menu-title">Show on tabs</p>
          ${ALL_TABS_PH.map(t=>`<label class="photo-pin__tab-row">
            <input type="checkbox" value="${t}" ${(pin.tabs||[]).includes(t)?'checked':''}> ${t.charAt(0).toUpperCase()+t.slice(1)}
          </label>`).join('')}
        </div>
        <div class="photo-pin__img-wrap">
          <img class="photo-pin__img" data-pin-img="${pin.id}" src="" alt="">
        </div>
        <p class="photo-pin__cap" data-pin-cap="${pin.id}"></p>`;
      return el;
    }

    function mountPin(pin) {
      const container = $('[data-photo-pins]'); if (!container) return;
      if (container.querySelector(`[data-pin-id="${pin.id}"]`)) return;
      const el = renderPinFrame(pin);
      container.appendChild(el);
      /* fill image + caption */
      const ph = photos.find(x=>x.id===pin.photoId);
      if (ph) {
        const capEl = el.querySelector(`[data-pin-cap="${pin.id}"]`);
        if (capEl) capEl.textContent = ph.caption || '';
        dbLoad(ph.id).then(url => {
          const img = el.querySelector(`[data-pin-img="${pin.id}"]`);
          if (img && url) img.src = url;
        });
      }
      /* drag */
      let dr = false, drOff = {x:0,y:0};
      el.querySelector(`[data-pin-drag="${pin.id}"]`)?.addEventListener('mousedown', ev => {
        if (ev.button || ev.target.closest('button')) return;
        ev.preventDefault(); dr = true;
        const r = el.getBoundingClientRect();
        drOff = {x:ev.clientX-r.left, y:ev.clientY-r.top};
        el.classList.add('is-dragging');
        document.body.style.userSelect = 'none';
      });
      document.addEventListener('mousemove', ev => {
        if (!dr) return;
        el.style.left = clamp(ev.clientX-drOff.x,0,window.innerWidth-60)+'px';
        el.style.top  = clamp(ev.clientY-drOff.y,0,window.innerHeight-40)+'px';
      });
      document.addEventListener('mouseup', () => {
        if (!dr) return; dr = false;
        el.classList.remove('is-dragging');
        document.body.style.userSelect = '';
        const r = el.getBoundingClientRect();
        const idx = photoPins.findIndex(pp=>pp.id===pin.id);
        if (idx>=0) { photoPins[idx].x=Math.round(r.left); photoPins[idx].y=Math.round(r.top); persistPins(); }
      });
      /* size */
      el.querySelectorAll('[data-pin-size]').forEach(btn => btn.addEventListener('click', ev => {
        ev.stopPropagation();
        const sz = btn.dataset.pinSize;
        el.style.width = PIN_SIZES[sz]+'px';
        el.querySelectorAll('[data-pin-size]').forEach(b=>b.classList.toggle('is-active',b.dataset.pinSize===sz));
        const idx = photoPins.findIndex(pp=>pp.id===pin.id);
        if (idx>=0) { photoPins[idx].size=sz; persistPins(); }
      }));
      /* tab menu */
      const tabsBtn = el.querySelector(`[data-pin-tabs="${pin.id}"]`);
      const tabMenu = el.querySelector(`[data-pin-menu="${pin.id}"]`);
      tabsBtn?.addEventListener('click', ev => { ev.stopPropagation(); if(tabMenu) tabMenu.hidden=!tabMenu.hidden; });
      tabMenu?.addEventListener('change', () => {
        const tabs = [...tabMenu.querySelectorAll('input:checked')].map(i=>i.value);
        const idx = photoPins.findIndex(pp=>pp.id===pin.id);
        if (idx>=0) { photoPins[idx].tabs=tabs; persistPins(); }
        updatePinVisibility(document.body.dataset.view||'home');
      });
      document.addEventListener('click', ev => { if (!el.contains(ev.target)&&tabMenu) tabMenu.hidden=true; });
      /* close */
      el.querySelector(`[data-pin-del="${pin.id}"]`)?.addEventListener('click', ()=>removePin(pin.id));
    }

    function updatePinVisibility(tab) {
      const container = $('[data-photo-pins]'); if (!container) return;
      photoPins.forEach(pin => {
        const el = container.querySelector(`[data-pin-id="${pin.id}"]`);
        if (el) el.style.display = (pin.tabs||[]).includes(tab) ? 'flex' : 'none';
      });
    }

    function createPin(photoId) {
      const ph = photos.find(x=>x.id===photoId); if (!ph) return;
      const offset = photoPins.length * 24;
      const pin = {
        id: 'pin_'+uid(), photoId,
        tabs: [document.body.dataset.view||'home'],
        x: clamp(24+offset, 0, window.innerWidth-240),
        y: clamp(100+offset, 0, window.innerHeight-220),
        size: 'md',
      };
      photoPins.push(pin); persistPins();
      mountPin(pin);
      updatePinVisibility(document.body.dataset.view||'home');
      toast('Pinned ✓ — use ☰ on the frame to pick which tabs show it');
    }

    function removePin(id) {
      photoPins = photoPins.filter(p=>p.id!==id); persistPins();
      $('[data-photo-pins]')?.querySelector(`[data-pin-id="${id}"]`)?.remove();
      toast('Pin removed');
    }

    function initPins() {
      photoPins.forEach(mountPin);
      updatePinVisibility(document.body.dataset.view||'home');
    }

    /* ── Floating photo widget ── */
    const WIDGET_SIZES = {sm:180, md:260, lg:400};

    async function renderWidget() {
      const el = $('[data-photo-widget]'); if (!el) return;
      const empty = $('[data-pw-empty]', el);
      const img   = $('[data-pw-img]', el);
      const cap   = $('[data-pw-caption]', el);
      const date  = $('[data-pw-date]', el);
      const ctr   = $('[data-pw-counter]', el);
      if (!photos.length) {
        if (empty) empty.hidden = false;
        if (img)   img.src = '';
        if (cap)   cap.textContent = 'No photos added yet';
        if (date)  date.textContent = '';
        if (ctr)   ctr.textContent  = '';
        return;
      }
      const idx = clamp(wState.idx, 0, photos.length - 1);
      const p   = photos[idx];
      if (empty) empty.hidden = true;
      if (cap)   cap.textContent  = p.caption || '';
      if (date)  date.textContent = p.date    || '';
      if (ctr)   ctr.textContent  = `${idx+1} / ${photos.length}`;
      const url = await dbLoad(p.id);
      if (img && url) img.src = url;
    }

    function applyWidgetSize(el) {
      const w = WIDGET_SIZES[wState.size] || 260;
      el.style.width = w + 'px';
      $$('[data-pw-size]', el).forEach(b => b.classList.toggle('is-active', b.dataset.pwSize === wState.size));
    }

    function showWidget(idx) {
      const el = $('[data-photo-widget]'); if (!el) return;
      if (idx != null) wState.idx = clamp(idx, 0, Math.max(0, photos.length - 1));
      wState.visible = true;
      el.hidden = false;
      applyWidgetSize(el);
      persistW();
      renderWidget();
    }

    function initWidget() {
      const el = $('[data-photo-widget]'); if (!el) return;
      /* restore saved position */
      if (wState.x != null && wState.y != null) {
        el.style.right = 'auto'; el.style.bottom = 'auto';
        el.style.left  = wState.x + 'px';
        el.style.top   = wState.y + 'px';
      }
      applyWidgetSize(el);
      el.hidden = !wState.visible;
      if (wState.visible) renderWidget();

      /* drag */
      let isDragging = false, dragOff = {x:0, y:0};
      $('[data-pw-drag]', el)?.addEventListener('mousedown', e => {
        if (e.button !== 0 || e.target.closest('button')) return;
        e.preventDefault();
        isDragging = true;
        const r = el.getBoundingClientRect();
        dragOff = {x: e.clientX - r.left, y: e.clientY - r.top};
        el.classList.add('is-dragging');
        document.body.style.userSelect = 'none';
      });
      document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const x = clamp(e.clientX - dragOff.x, 0, window.innerWidth  - 80);
        const y = clamp(e.clientY - dragOff.y, 0, window.innerHeight - 40);
        el.style.left = x + 'px'; el.style.top = y + 'px';
        el.style.right = 'auto'; el.style.bottom = 'auto';
      });
      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        el.classList.remove('is-dragging');
        document.body.style.userSelect = '';
        const r = el.getBoundingClientRect();
        wState.x = Math.round(r.left); wState.y = Math.round(r.top);
        persistW();
      });
      /* size controls */
      $$('[data-pw-size]', el).forEach(btn => btn.addEventListener('click', () => {
        wState.size = btn.dataset.pwSize;
        applyWidgetSize(el); persistW();
      }));
      /* close */
      $('[data-pw-close]', el)?.addEventListener('click', () => {
        wState.visible = false; el.hidden = true; persistW();
      });
      /* prev / next */
      $('[data-pw-prev]', el)?.addEventListener('click', () => {
        if (!photos.length) return;
        wState.idx = (wState.idx - 1 + photos.length) % photos.length;
        persistW(); renderWidget();
      });
      $('[data-pw-next]', el)?.addEventListener('click', () => {
        if (!photos.length) return;
        wState.idx = (wState.idx + 1) % photos.length;
        persistW(); renderWidget();
      });
    }

    /* ── Wire the Photos tab panel ── */
    function wirePanel() {
      /* file input — wrapped in a label so click auto-triggers */
      const fileInput = $('[data-photo-file-input]'); if (!fileInput) return;
      fileInput.addEventListener('change', e => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          pendingUrl = ev.target.result;
          const prev = $('[data-photo-preview]');
          const pl   = $('[data-ph-placeholder]');
          if (prev) { prev.src = pendingUrl; prev.classList.add('is-loaded'); }
          if (pl)   pl.hidden = true;
          showUploadZone();
        };
        reader.readAsDataURL(file);
        e.target.value = ''; /* allow re-picking same file */
      });

      /* delegated clicks on the photos panel */
      const panel = $('[data-tab-panel="photos"]'); if (!panel) return;

      /* custom tag: choosing "Add new tag…" prompts for a label */
      panel.addEventListener('change', e => {
        const sel = e.target.closest('[data-photo-tag]'); if (!sel) return;
        if (sel.value !== '__new') return;
        const lbl = (prompt('New tag name (e.g. Milestone, 90-day):')||'').trim();
        if (!lbl) { sel.value=''; return; }
        const id = slug(lbl);
        if (!tags.find(t=>t.id===id)) { tags.push({id,label:lbl}); persistTags(); }
        populateTagSelect();
        sel.value = id;
        toast('Tag added ✓');
      });

      panel.addEventListener('click', async e => {
        const t = e.target;

        /* filter pill */
        const flt = t.closest('[data-filter]');
        if (flt && $('[data-photo-filter]')?.contains(flt)) {
          activeFilter = flt.dataset.filter; renderAll(); return;
        }
        /* cancel upload */
        if (t.closest('[data-photo-cancel]')) { hideUploadZone(); return; }
        /* save photo */
        if (t.closest('[data-photo-save]')) { await doSavePhoto(); return; }
        /* enter category edit mode */
        if (t.closest('[data-ph-cat-edit]')) { catEditing = true; renderFilterBar(); return; }
        /* save category edits */
        if (t.closest('[data-ph-cat-edit-done]')) {
          document.querySelectorAll('[data-cat-rename]').forEach(inp => {
            const i = parseInt(inp.dataset.catRename), lbl = inp.value.trim();
            if (lbl && categories[i]) categories[i].label = lbl;
          });
          catEditing = false; persistCats();
          const catSel = $('[data-photo-cat]');
          if (catSel) catSel.innerHTML = categories.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
          renderAll(); toast('Categories updated ✓'); return;
        }
        /* delete a category */
        const catDel = t.closest('[data-cat-del]');
        if (catDel) {
          if (categories.length <= 1) { toast('Must keep at least one category'); return; }
          categories.splice(parseInt(catDel.dataset.catDel), 1); renderFilterBar(); return;
        }
        /* add a new category */
        if (t.closest('[data-cat-add]')) {
          const inp = document.getElementById('ph-cat-new-inp');
          const lbl = inp?.value.trim(); if (!lbl) { toast('Enter a category name'); return; }
          const id  = lbl.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') || uid();
          if (categories.find(c=>c.id===id)) { toast('Category already exists'); return; }
          categories.push({id, label:lbl});
          if (inp) inp.value = ''; renderFilterBar(); return;
        }
        /* pin photo to a tab */
        const pinBtn = t.closest('[data-photo-pin]');
        if (pinBtn) { createPin(pinBtn.dataset.photoPin); return; }
        /* lightbox view */
        const vBtn = t.closest('[data-photo-view]');
        if (vBtn) { openLightbox(vBtn.dataset.photoView); return; }
        /* delete */
        const dBtn = t.closest('[data-photo-del]');
        if (dBtn) { await doDeletePhoto(dBtn.dataset.photoDel); return; }
        /* send to floating widget */
        const wBtn = t.closest('[data-photo-to-widget]');
        if (wBtn) {
          const idx = photos.findIndex(p => p.id === wBtn.dataset.photoToWidget);
          showWidget(idx >= 0 ? idx : 0);
          toast('Opened in photo widget — drag it anywhere');
          return;
        }
        /* compare pick */
        const cBtn = t.closest('[data-photo-cmp]');
        if (cBtn) {
          const id = cBtn.dataset.photoCmp;
          const i  = compareIds.indexOf(id);
          if (i >= 0) compareIds.splice(i, 1);
          else if (compareIds.length < 2) compareIds.push(id);
          renderGrid();
          if (compareIds.length === 2) renderCompare();
          return;
        }
        /* toggle compare mode */
        if (t.closest('[data-photo-compare-toggle]')) {
          compareMode = !compareMode; compareIds = [];
          const cmp = $('[data-photo-compare]'); if (cmp) cmp.hidden = true;
          const btn = $('[data-photo-compare-toggle]');
          if (btn) btn.classList.toggle('is-active', compareMode);
          renderAll(); return;
        }
        /* clear comparison */
        if (t.closest('[data-compare-clear]')) {
          compareIds = []; compareMode = false;
          const cmp = $('[data-photo-compare]'); if (cmp) cmp.hidden = true;
          renderAll(); return;
        }
      });
    }

    /* ── Lightbox modal events ── */
    function wireLightbox() {
      const m = $('#modal-photo'); if (!m) return;
      m.addEventListener('click', e => {
        if (e.target.closest('[data-pm-close]') || e.target === m) closeLightbox();
      });
    }

    let inited = false;
    function init() {
      if (!inited) {
        wirePanel();
        wireLightbox();
        inited = true;
      }
      renderAll();
      populateTagSelect();
    }

    return { init, initWidget, initPins, renderAll, renderWidget, showWidget, updatePinVisibility };
  })();

  /* ═══════════════════  FINANCE HEATMAP PANEL  ═══════════════════ */
  const FinHeatmap = (() => {
    const KEY = 'nv.finhm';
    let ps = Store.get(KEY, {x:null, y:null, collapsed:false});
    let isDragging = false, dragOff = {x:0, y:0};
    const fmtMoney = (n) => (n<0?'-':'') + '$' + Math.abs(Math.round(n)).toLocaleString();

    /* Build a day-keyed spend map from Finance transactions */
    function spendByDay() {
      const map = {};
      try {
        const fin = Store.get(KEYS.finance, null);
        if (!fin || !Array.isArray(fin.transactions)) return map;
        fin.transactions.forEach(t => {
          const d = new Date(t.ts);
          const k = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
          map[k] = (map[k] || 0) + num(t.amount);
        });
      } catch(e) {}
      return map;
    }

    function render() {
      const el = $('[data-fhm-inner]'); if (!el) return;
      const DAYS = 91;
      const spendMap = spendByDay();
      const allAmounts = Object.values(spendMap).filter(v => v > 0);
      const maxSpend = allAmounts.length ? Math.max(...allAmounts) : 1;
      const today = new Date();
      const cells = [];
      for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const spend = spendMap[key] || 0;
        cells.push({key, spend, isFuture: false});
      }
      const cleanDays  = cells.filter(c => c.spend === 0).length;
      const totalSpend = cells.reduce((a,c)=>a+c.spend, 0);
      const spendDays  = cells.filter(c => c.spend > 0).length;

      function cellClass(c) {
        if (c.isFuture) return 'fhm-cell--future';
        if (c.spend === 0) return 'fhm-cell--none';
        const ratio = c.spend / maxSpend;
        if (ratio < 0.25) return 'fhm-cell--low';
        if (ratio < 0.65) return 'fhm-cell--mid';
        return 'fhm-cell--high';
      }

      el.innerHTML = `
        <div class="fhm-grid">
          ${cells.map(c => `<div class="fhm-cell ${cellClass(c)}" title="${c.key}${c.spend ? ' · ' + fmtMoney(c.spend) + ' spent' : ' · No spend ✓'}"></div>`).join('')}
        </div>
        <div class="fhm-legend">
          <span class="fhm-leg-lbl">High</span>
          <div class="fhm-cell fhm-cell--high"  style="width:10px;height:10px;aspect-ratio:unset"></div>
          <div class="fhm-cell fhm-cell--mid"   style="width:10px;height:10px;aspect-ratio:unset"></div>
          <div class="fhm-cell fhm-cell--low"   style="width:10px;height:10px;aspect-ratio:unset"></div>
          <div class="fhm-cell fhm-cell--none"  style="width:10px;height:10px;aspect-ratio:unset"></div>
          <span class="fhm-leg-lbl">Low / Clean</span>
        </div>
        <div class="fhm-stats">
          <div class="fhm-stat">
            <span class="fhm-stat__val">${cleanDays}</span>
            <span class="fhm-stat__lbl">Clean days</span>
          </div>
          <div class="fhm-stat">
            <span class="fhm-stat__val">${spendDays}</span>
            <span class="fhm-stat__lbl">Spend days</span>
          </div>
          <div class="fhm-stat">
            <span class="fhm-stat__val">${fmtMoney(totalSpend)}</span>
            <span class="fhm-stat__lbl">90-day total</span>
          </div>
        </div>`;
    }

    function saveState() { Store.set(KEY, ps); }

    function applyPosition(panel) {
      if (ps.x != null && ps.y != null) {
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
        panel.style.left = ps.x + 'px'; panel.style.top = ps.y + 'px';
      }
    }

    function init() {
      const panel = $('[data-fhm-panel]'); if (!panel) return;
      applyPosition(panel);

      if (ps.collapsed) {
        panel.classList.add('is-collapsed');
        const btn = $('[data-fhm-toggle]', panel); if (btn) btn.textContent = '▲';
      }

      render();

      /* collapse toggle */
      $('[data-fhm-toggle]', panel)?.addEventListener('click', () => {
        ps.collapsed = !ps.collapsed;
        panel.classList.toggle('is-collapsed', ps.collapsed);
        const btn = $('[data-fhm-toggle]', panel);
        if (btn) btn.textContent = ps.collapsed ? '▲' : '—';
        saveState();
      });

      /* drag */
      const handle = $('[data-fhm-drag]', panel);
      handle?.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        if (e.target.closest('button')) return;
        e.preventDefault();
        isDragging = true;
        const r = panel.getBoundingClientRect();
        dragOff = {x: e.clientX - r.left, y: e.clientY - r.top};
        panel.classList.add('is-dragging');
        document.body.style.userSelect = 'none';
      });

      document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const x = clamp(e.clientX - dragOff.x, 0, window.innerWidth - 80);
        const y = clamp(e.clientY - dragOff.y, 0, window.innerHeight - 40);
        panel.style.left = x + 'px'; panel.style.top = y + 'px';
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
      });

      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        panel.classList.remove('is-dragging');
        document.body.style.userSelect = '';
        const r = panel.getBoundingClientRect();
        ps.x = r.left; ps.y = r.top; saveState();
      });
    }

    return { init, render };
  })();

  /* ═══════════════════  ACADEMICS  ═══════════════════ */
  const Academics = (() => {
    const KEY = 'nv.academics';
    const SAT_GOAL = 1550;
    const STAGES = ['Brainstorm','Outline','Draft','Revise','Final'];

    const DEFAULT = {
      sat: { goal: SAT_GOAL, attempts: [] },   // attempt: {id,date,type,total,math,english,note}
      subjects: [],   // {id,name,type,examDate,credits,target,secured,open,view, buckets:{red,yellow,green}, tasks:[], materials:[], sessions:[]}
      essay: {
        theme: 'Faith / Family / Purpose',
        stage: 'Brainstorm',
        text: '',
        limit: 650,
        ideas: [],          // {id,text}
        supplements: [],     // {id,school,prompt,limit,stage,text}
      },
      recs: [],   // {id,name,role,relationship,status,dateAsked,deadline,thanked,note}
      ecs: [],    // {id,name,category,role,hours,grades,desc}
      seeded: false,
    };

    /* ══════════════════  THE APPLICATION  ══════════════════
       Colleges ask for a fixed set of things. This is that list, its real
       state read from the data you already keep, and — where a piece has a
       date attached — the ability to put it on the calendar rather than
       leave it as a worry.

       Each row is one entry. Adding a requirement later is one object. */
    function readiness() {
      const d = data || {};
      const sat = (d.sat && d.sat.attempts) || [];
      const best = sat.reduce((m, a) => Math.max(m, num(a.total)), 0);
      const recs = d.recs || [];
      const asked = recs.filter(r => r.status && r.status !== 'planned').length;
      const ecs   = d.ecs || [];
      const essay = d.essay || {};
      const words = String(essay.text || '').trim().split(/\s+/).filter(Boolean).length;

      /* A checklist you cannot tick is a list of accusations. Ticked ids
         live in their own key so the computed states (SAT, essay, activities)
         keep working underneath and a tick simply wins. */
      const ticked = Store.get(PKEY, []);
      const tset = Array.isArray(ticked) ? ticked : [];
      const mark = (list) => list.map(r => tset.indexOf(r.id) >= 0 ? Object.assign({}, r, { state: 'done', urgent: false }) : r);
      return mark([
        /* THE PLAN, AS OF 8 AUGUST 2026. Nebraska (UNHS) is the route: five
           courses, no PE, no Regents. Ordered by what is irreversible if it
           slips, not by what is comfortable. */
        { id: 'unhs', label: 'Enrol at Nebraska + start course 1',
          state: 'todo', urgent: true,
          note: 'Financial Skills first — an 85% unlocks dual credit',
          due: '2026-08-08',
          hint: 'You need 5 courses whatever the evaluation says. Do not wait for it.' },
        /* A decision with no deadline never gets made. This one gets an hour.
           09:00 in Puebla, so it lands with his coffee rather than at 4am. */
        { id: 'college', label: 'Decide freshman college',
          state: 'todo', urgent: true,
          note: 'ASU W.P. Carey online from Puebla — or Indiana Kelley in person',
          due: '2026-08-09', at: '09:00', end: '10:00',
          hint: 'Both roads end at Babson in 2028. Pick where you will get a 3.7.' },
        { id: 'transcript', label: 'HSES transcript request',
          state: 'todo', urgent: true,
          note: 'envirostudies.org form · official · by email · passport as ID',
          due: '2026-08-08',
          hint: 'The long pole. Everything downstream waits on this.' },
        { id: 'msg', label: 'Ms. G — transcript straight to Nebraska',
          state: 'todo', urgent: true,
          note: 'Ask her to email it to highschool@nebraska.edu',
          due: '2026-08-08',
          hint: 'A transcript that passes through your hands stops being official.' },
        { id: 'prior', label: 'Call Marian Catholic — transcript',
          state: 'todo', urgent: true,
          note: 'Marian Catholic HS, Tamaqua PA — call (570) 467-3335, ask for Mrs. Sheer',
          due: '2026-08-10', at: '09:30',
          hint: 'MONDAY. Nebraska may need it — your CR* credits have no grades attached.' },
        { id: 'recs', label: 'Recommendations',
          state: asked >= 2 ? 'done' : asked ? 'doing' : 'todo',
          note: asked ? asked + ' asked' : 'Acosta · Zechowski · Ms. Arkin as spare',
          due: '2026-08-08',
          hint: 'Letters are portable. They do not need you enrolled.' },
        /* The invite has to land AFTER the email, or it reads as a cold link
           from a stranger. Emails first, then FERPA, then invite. */
        /* He keeps saying he has no activities. He has four. This row exists
           to make him look at them written down. */
        { id: 'activities', label: 'Common App — Activities section',
          state: 'todo', urgent: true,
          note: 'The app · the smart-home business · the Bronx building',
          due: '2026-08-09', at: '12:00', end: '13:00',
          hint: 'Also tick the household-responsibilities box — unpaid family business work counts.' },
        { id: 'ferpa', label: 'FERPA + invite the three teachers',
          state: 'todo', urgent: true,
          note: 'Email Acosta, Santana, Arkin FIRST — then waive FERPA and invite',
          due: '2026-08-09', at: '11:00', end: '12:00',
          hint: 'Waive your rights. A letter you can read is one they half-trust.' },
        { id: 'byu', label: 'BYU price check',
          state: 'todo',
          note: 'is@byu.edu — ask about religion course requirements',
          due: '2026-08-15',
          hint: 'Seven-day clock, then decide without them.' },
        { id: 'health', label: 'Dermatologist + doctor',
          state: 'todo',
          note: 'Skin, scars, red dots — and the nose',
          due: '2026-08-10',
          hint: 'One visit answers five goals.' },
        { id: 'common', label: 'Common App',
          state: 'todo',
          note: 'nathanvelez@gmail.com · fix Education · FERPA · invite both teachers',
          due: '2026-08-15',
          hint: 'No AP exam scores. Anywhere.' },
        { id: 'tripwire', label: 'The tripwire',
          state: 'todo', urgent: true,
          note: 'Course 1 half done at 90s — or the pace theory was wrong',
          due: '2026-09-01',
          hint: 'The last date returning to HSES is still physically possible.' },
        { id: 'discharge', label: 'HSES discharge as TRANSFER',
          state: 'todo',
          note: 'Send them proof of your UNHS enrolment',
          due: '2026-09-01',
          hint: 'Otherwise you are a no-show senior when April asks for a final transcript.' },
        { id: 'sat', label: 'SAT',
          state: best >= 1300 ? 'done' : best ? 'doing' : 'todo',
          note: best ? 'Best ' + best : 'Register — Oct or Nov, Puebla or CDMX',
          due: '2026-10-03',
          hint: 'Reasoning, not recall. Algebra I — you scored 91.' },
        { id: 'essay', label: 'Personal essay',
          state: words > 500 ? 'done' : words ? 'doing' : 'todo',
          note: words ? words + ' words · ' + (essay.stage || '') : 'Not started',
          due: '2026-10-15',
          hint: 'Two countries, the app, the building, the business.' },
        { id: 'ecs', label: 'Activities',
          state: ecs.length >= 3 ? 'done' : ecs.length ? 'doing' : 'todo',
          note: ecs.length ? ecs.length + ' listed' : 'The app, the building, the business',
          hint: 'Three real things beat a list.' },
        { id: 'babson', label: 'Babson Early Action',
          state: 'todo',
          note: 'Plus Baruch, Syracuse, Temple, Houston, Indiana, Baylor',
          due: '2026-11-01',
          hint: 'The lottery ticket. The real door is transferring in 2028.' },
      ]);
    }

    /* ══════════════════  THE FIVE  ══════════════════
       A New York diploma needs five Regents at 65 or above — and the five are
       SLOTS, not exams. Geometry does nothing once Algebra I is passed, and
       the language exam fills the fifth slot on its own. Showing them as
       requirements rather than as a list of scores is the difference between
       "I failed three exams" and "I need two more". Both are true; only one
       is useful. */
    const PKEY = 'nv.plandone';   // ids the user has ticked off by hand
    const RKEY = 'nv.regents';
    const REGENTS_SEED = [
      { slot: 'English',        exam: 'ELA',                   score: null, sitting: '2026-08-18' },
      { slot: 'Math',           exam: 'Algebra I',             score: 66 },
      { slot: 'Science',        exam: 'Earth & Space Sciences',score: 64, sitting: '2026-08-19', room: '2072', retake: true },
      { slot: 'Social Studies', exam: 'Global History II',     score: 73 },
      { slot: '+1 Pathway',     exam: 'Spanish LOTE',          score: 98 },
    ];
    const regents = () => {
      const saved = Store.get(RKEY, null);
      return Array.isArray(saved) && saved.length ? saved : REGENTS_SEED;
    };

    function renderRegents() {
      const host = $('[data-acad-regents]'); if (!host) return;
      const rows = regents();
      const passed = rows.filter(r => num(r.score) >= 65).length;
      const today = localDateKey();

      host.innerHTML =
        `<div class="eyebrow"><span class="eyebrow__num">02</span>
           <span class="eyebrow__lbl">The five</span><span class="eyebrow__rule"></span></div>
         <div class="tile-well cal-well">
           <span class="tile-kick">✦ regents passed</span>
           <span class="tile-hero__val">${passed}</span>
           <span class="tile-hero__of">of 5 required · ${5 - passed} to go</span>
           <div class="tile-hero__bar"><i style="width:${passed / 5 * 100}%"></i></div>
         </div>
         <div class="rgt">${rows.map((r, i) => {
            const s = num(r.score);
            const ok = s >= 65;
            /* 60–64 is its own state: not a pass, but the appeal window */
            const appeal = s >= 60 && s < 65;
            const state = ok ? 'is-pass' : r.score == null ? 'is-none' : appeal ? 'is-appeal' : 'is-fail';
            const when = r.sitting
              ? new Date(r.sitting + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
              : '';
            return `<div class="rgt__row ${state}" style="animation-delay:${i * 45}ms">
              <span class="rgt__dot"></span>
              <span class="rgt__m">
                <b>${esc(r.slot)}</b>
                <i>${esc(r.exam)}${r.sitting && !ok ? ' · ' + when + (r.room ? ' · room ' + r.room : '') : ''}</i>
              </span>
              <span class="rgt__s">${r.score == null ? '—' : r.score}</span>
            </div>`;
          }).join('')}</div>
         ${rows.some(r => num(r.score) >= 60 && num(r.score) < 65)
            ? `<p class="rgt__note">A score of 60–64 can be appealed once you have sat that exam twice and had extra help in the subject. One granted appeal still earns a full Regents diploma.</p>`
            : ''}`;
    }

    function renderReadiness() {
      const host = $('[data-acad-readiness]'); if (!host) return;
      const rows = readiness();
      const done = rows.filter(r => r.state === 'done').length;
      const pct = Math.round(done / rows.length * 100);
      const today = localDateKey();
      const daysTo = (ds) => ds ? Math.round((new Date(ds + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000) : null;

      host.innerHTML =
        `<div class="eyebrow"><span class="eyebrow__num">00</span>
           <span class="eyebrow__lbl">The application</span><span class="eyebrow__rule"></span></div>
         <div class="tile-well cal-well">
           <span class="tile-kick">✦ ready</span>
           <span class="tile-hero__val">${done}</span>
           <span class="tile-hero__of">of ${rows.length} pieces · ${pct}%</span>
           <div class="tile-hero__bar"><i style="width:${pct}%"></i></div>
         </div>
         <div class="rdy">${rows.map((r, i) => {
            const n = daysTo(r.due);
            const late = n !== null && n < 0;
            return `<button type="button" data-rdy="${r.id}" class="rdy__row is-${r.state} ${r.urgent && r.state !== 'done' ? 'is-urgent' : ''}"
                         style="animation-delay:${i * 45}ms">
              <span class="rdy__dot"></span>
              <span class="rdy__main">
                <b>${esc(r.label)}</b>
                <i>${esc(r.note || '')}${r.hint ? ' — ' + esc(r.hint) : ''}</i>
              </span>
              <span class="rdy__when">${r.due
                ? (late ? 'overdue' : n === 0 ? 'today' : n + 'd')
                : ''}</span>
            </button>`;
          }).join('')}</div>
         <div class="tile-actions">
           <button class="tile-actions__btn is-primary" data-acad-toplan type="button">Put this on my calendar</button>
         </div>`;
    }

    let data = Store.get(KEY, null);
    if (!data) { data = JSON.parse(JSON.stringify(DEFAULT)); }
    // shallow-ensure shape
    data.sat      = data.sat      || {goal:SAT_GOAL, attempts:[]};
    data.subjects = data.subjects || [];
    data.essay    = data.essay    || JSON.parse(JSON.stringify(DEFAULT.essay));
    data.recs     = data.recs     || [];
    data.ecs      = data.ecs      || [];
    let subjFilter = 'all';

    const save = () => Store.set(KEY, data);

    /* ---- seed starter content from the user's stated plan (once) ---- */
    function seed() {
      if (data.seeded) return;
      const mk = (name,type,credits,examDate) => ({
        id:uid(), name, type, examDate:examDate||'', credits, target:5, secured:false,
        open:false, view:'plan',
        buckets:{red:[],yellow:[],green:[]}, tasks:[], materials:[], sessions:[],
      });
      data.subjects = [
        mk('Calculus BC','AP',8,'2027-05-10'),
        mk('Statistics','AP',3,'2027-05-13'),
        mk('English Language','AP',3,'2027-05-11'),
        mk('Comparative Government','AP',3,'2027-05-17'),
        mk('Macroeconomics','AP',3,'2027-05-14'),
        mk('Microeconomics','AP',3,'2027-05-14'),
        mk('Foreign Language','AP',3,''),
        mk('Principles of Management','CLEP',3,''),
        mk('Intro to Business','CLEP',3,''),
      ];
      data.recs = [
        {id:uid(),name:'',role:'community',relationship:'Church / community leader',status:'planned',dateAsked:'',deadline:'',thanked:false,note:''},
        {id:uid(),name:'',role:'coach',relationship:'Athletic coach / mentor',status:'planned',dateAsked:'',deadline:'',thanked:false,note:''},
        {id:uid(),name:'',role:'professional',relationship:'Employer / business mentor',status:'planned',dateAsked:'',deadline:'',thanked:false,note:''},
      ];
      data.essay.ideas = [
        {id:uid(),text:'A moment my faith carried me through a hard season'},
        {id:uid(),text:'How my family’s sacrifice shaped my purpose'},
        {id:uid(),text:'Teaching myself — discipline as an act of devotion'},
      ];
      data.seeded = true;
      save();
    }

    /* =====================  SAT  ===================== */
    function scoreClass(total){ return total>=1500?'is-elite':total>=1350?'is-strong':total>=1200?'is-mid':'is-base'; }

    function renderSAT() {
      const el = $('[data-sat-body]'); if (!el) return;
      const goal = data.sat.goal || SAT_GOAL;
      const chip = $('[data-sat-goal-chip]'); if (chip) chip.textContent = 'Goal: '+goal;
      const all = [...data.sat.attempts].sort((a,b)=> (a.date||'').localeCompare(b.date||''));
      const official = all.filter(a=>a.type==='official');
      const latest = all[all.length-1];
      const prev   = all[all.length-2];
      const best   = all.reduce((m,a)=> a.total>m?a.total:m, 0);

      if (!all.length) {
        el.innerHTML = `<div class="sat-empty">
          <p class="sat-empty__big">${goal}<span>+</span></p>
          <p class="sat-empty__hint">Your target. Log your first practice test or official attempt to start tracking.</p>
        </div>`;
        return;
      }

      const delta = (latest && prev) ? (latest.total - prev.total) : null;
      const toGoal = goal - (latest? latest.total : 0);
      const pct = clamp((latest? latest.total : 0)/1600,0,1)*100;

      const deltaHTML = delta===null ? `<span class="sat-delta is-first">First attempt</span>`
        : delta>=0 ? `<span class="sat-delta is-up">▲ +${delta}</span>`
        : `<span class="sat-delta is-down">▼ ${delta}</span>`;

      const dial = `
        <div class="sat-hero">
          <div class="sat-hero__main">
            <p class="sat-hero__label">Latest ${latest.type==='official'?'· Official':'· Practice'}</p>
            <p class="sat-hero__score ${scoreClass(latest.total)}">${latest.total}</p>
            ${deltaHTML}
            <p class="sat-hero__sub">${latest.date||''} &nbsp;·&nbsp; Best ${best} &nbsp;·&nbsp; ${toGoal>0?`${toGoal} to goal`:'Goal reached ✦'}</p>
          </div>
          <div class="sat-hero__break">
            <div class="sat-split">
              <span class="sat-split__k">Math</span>
              <span class="sat-split__v">${latest.math||'—'}</span>
              <span class="sat-split__bar"><i style="width:${clamp((latest.math||0)/800,0,1)*100}%"></i></span>
            </div>
            <div class="sat-split">
              <span class="sat-split__k">EBRW</span>
              <span class="sat-split__v">${latest.english||'—'}</span>
              <span class="sat-split__bar"><i style="width:${clamp((latest.english||0)/800,0,1)*100}%"></i></span>
            </div>
          </div>
        </div>
        <div class="sat-goalbar"><span class="sat-goalbar__fill" style="width:${pct}%"></span><span class="sat-goalbar__goal" style="left:${(goal/1600)*100}%" title="Goal ${goal}"></span></div>`;

      // attempt history (newest first)
      const rows = [...all].reverse().map(a => {
        const i = all.indexOf(a);
        const p = i>0 ? all[i-1] : null;
        const d = p ? a.total-p.total : null;
        const dTag = d===null?'' : d>=0?`<span class="sat-row__d is-up">+${d}</span>`:`<span class="sat-row__d is-down">${d}</span>`;
        return `<div class="sat-row" data-sat-row="${a.id}">
          <span class="sat-row__type ${a.type==='official'?'is-official':'is-practice'}">${a.type==='official'?'OFFICIAL':'PRACTICE'}</span>
          <span class="sat-row__date">${a.date||'—'}</span>
          <span class="sat-row__total ${scoreClass(a.total)}">${a.total}</span>
          <span class="sat-row__mini">M ${a.math||'—'} · V ${a.english||'—'}</span>
          ${dTag}
          <button class="sat-row__del" data-sat-del="${a.id}" title="Delete">×</button>
        </div>`;
      }).join('');

      el.innerHTML = dial + `
        <div class="sat-stats">
          <div class="sat-stat"><span class="sat-stat__v">${all.length}</span><span class="sat-stat__k">Total Attempts</span></div>
          <div class="sat-stat"><span class="sat-stat__v">${official.length}</span><span class="sat-stat__k">Official</span></div>
          <div class="sat-stat"><span class="sat-stat__v">${all.length-official.length}</span><span class="sat-stat__k">Practice</span></div>
        </div>
        <div class="sat-history" data-sat-history>${rows}</div>`;
    }

    function satAddForm() {
      const el = $('[data-sat-body]'); if (!el) return;
      const today = localDateKey();
      const wrap = document.createElement('div');
      wrap.className = 'sat-form';
      wrap.innerHTML = `
        <p class="sat-form__title">Log SAT Attempt</p>
        <div class="sat-form__row">
          <label class="sat-form__seg">
            <select class="input input--sm" data-f="type">
              <option value="practice">Practice Test</option>
              <option value="official">Official SAT</option>
            </select>
          </label>
          <input class="input input--sm" type="date" data-f="date" value="${today}">
        </div>
        <div class="sat-form__row">
          <label class="sat-form__lab">Math<input class="input input--sm" type="number" min="200" max="800" step="10" data-f="math" placeholder="800"></label>
          <label class="sat-form__lab">EBRW<input class="input input--sm" type="number" min="200" max="800" step="10" data-f="english" placeholder="750"></label>
        </div>
        <input class="input input--sm" data-f="note" placeholder="Note (optional) — e.g. timed, no calc section…" maxlength="80">
        <div class="sat-form__actions">
          <button class="btn btn--ghost btn--sm" data-sat-cancel>Cancel</button>
          <button class="btn btn--primary btn--sm" data-sat-confirm>Save Attempt</button>
        </div>`;
      el.prepend(wrap);
      wrap.querySelector('[data-f="math"]').focus();
    }

    /* =====================  CREDITS  ===================== */
    function renderCredits() {
      const el = $('[data-credits-body]'); if (!el) return;
      const secured   = data.subjects.filter(s=>s.secured).reduce((n,s)=>n+(+s.credits||0),0);
      const projected = data.subjects.reduce((n,s)=>n+(+s.credits||0),0);
      const TARGET = 30; // ~ one year of college
      const pct = clamp(secured/TARGET,0,1)*100;
      const securedList = data.subjects.filter(s=>s.secured);
      const R = 52, C = 2*Math.PI*R, off = C*(1-clamp(secured/TARGET,0,1));

      el.innerHTML = `
        <div class="credits-dial">
          <svg viewBox="0 0 120 120" class="credits-ring">
            <circle cx="60" cy="60" r="${R}" class="credits-ring__track"/>
            <circle cx="60" cy="60" r="${R}" class="credits-ring__fill" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
          </svg>
          <div class="credits-dial__center">
            <span class="credits-dial__num">${secured}</span>
            <span class="credits-dial__unit">credits secured</span>
          </div>
        </div>
        <div class="credits-meta">
          <div class="credits-meta__row"><span>Projected (all exams)</span><strong>${projected}</strong></div>
          <div class="credits-meta__row"><span>1-year target</span><strong>${TARGET}</strong></div>
          <div class="credits-meta__bar"><i style="width:${pct}%"></i></div>
          <p class="credits-meta__note">${secured>=TARGET?'A full year of college credit secured. ✦':`${TARGET-secured} more credits = a free year of tuition.`}</p>
        </div>
        ${securedList.length?`<div class="credits-chips">${securedList.map(s=>`<span class="credits-chip">${esc(s.name)} <b>+${s.credits}</b></span>`).join('')}</div>`
          :`<p class="credits-empty">Mark a subject “secured” after you pass its exam to bank the credits here.</p>`}`;
    }

    /* =====================  SUBJECTS (AP / CLEP)  ===================== */
    function renderSubjFilter() {
      const el = $('[data-subj-filter-bar]'); if (!el) return;
      const counts = {all:data.subjects.length, AP:data.subjects.filter(s=>s.type==='AP').length, CLEP:data.subjects.filter(s=>s.type==='CLEP').length};
      el.innerHTML = ['all','AP','CLEP'].map(t=>
        `<button class="acad-type-tab ${subjFilter===t?'is-active':''}" data-subj-filter="${t}">${t==='all'?'All':t} <b>${counts[t]}</b></button>`
      ).join('');
    }

    function daysUntil(date){
      if(!date) return null;
      const d = new Date(date+'T00:00:00'); const now=new Date(); now.setHours(0,0,0,0);
      return Math.round((d-now)/86400000);
    }

    function bucketPct(s){
      const r=s.buckets.red.length, y=s.buckets.yellow.length, g=s.buckets.green.length;
      const tot=r+y+g; if(!tot) return {r:0,y:0,g:0,tot:0,mastery:0};
      return {r:(r/tot)*100, y:(y/tot)*100, g:(g/tot)*100, tot, mastery:Math.round((g/tot)*100)};
    }

    function renderSubjects() {
      const el = $('[data-subjects-grid]'); if (!el) return;
      const list = data.subjects.filter(s=> subjFilter==='all' || s.type===subjFilter);
      if (!list.length) {
        el.innerHTML = `<p class="acad-empty">No subjects yet. Tap “+ Subject” to add an AP or CLEP and start building your road to a 5.</p>`;
        return;
      }
      el.innerHTML = list.map(s => {
        const bp = bucketPct(s);
        const dleft = daysUntil(s.examDate);
        const dueChip = dleft===null?'' : dleft<0?`<span class="subj-due is-past">Done</span>`
          : `<span class="subj-due ${dleft<=30?'is-soon':''}">${dleft}d</span>`;
        const tasksOpen = s.tasks.filter(t=>!t.done).length;
        const head = `
          <button class="subj-head" data-subj-toggle="${s.id}">
            <span class="subj-type ${s.type==='CLEP'?'is-clep':'is-ap'}">${s.type}</span>
            <span class="subj-name">${esc(s.name)}</span>
            ${s.secured?`<span class="subj-secured" title="Credits secured">✦</span>`:''}
            ${dueChip}
            <span class="subj-mastery" title="Mastery">${bp.mastery}%</span>
            <span class="subj-caret ${s.open?'is-open':''}">▾</span>
          </button>
          <div class="subj-rgb" title="${s.buckets.red.length} unknown · ${s.buckets.yellow.length} reviewing · ${s.buckets.green.length} mastered">
            <span class="subj-rgb__r" style="flex:${s.buckets.red.length||0.001}"></span>
            <span class="subj-rgb__y" style="flex:${s.buckets.yellow.length||0.001}"></span>
            <span class="subj-rgb__g" style="flex:${s.buckets.green.length||0.001}"></span>
          </div>`;
        if (!s.open) return `<article class="subj-card" data-subj="${s.id}">${head}</article>`;

        const tabs = ['plan','tasks','prep'].map(v=>
          `<button class="subj-vtab ${s.view===v?'is-active':''}" data-subj-view="${s.id}:${v}">${v==='plan'?'Mastery':v==='tasks'?`Tasks${tasksOpen?` · ${tasksOpen}`:''}`:'Prep'}</button>`
        ).join('');

        let body='';
        if (s.view==='plan') {
          const col = (key,label,cls) => {
            const items = s.buckets[key];
            return `<div class="bkt bkt--${cls}">
              <div class="bkt__head"><span class="bkt__dot"></span>${label}<b>${items.length}</b></div>
              <div class="bkt__list">
                ${items.map(t=>`<div class="term" data-term="${s.id}:${key}:${t.id}">
                    <span class="term__txt">${esc(t.text)}</span>
                    <span class="term__ctrl">
                      ${key!=='red'?`<button class="term__mv" data-term-move="${s.id}:${key}:${t.id}:back" title="Less known">◀</button>`:''}
                      ${key!=='green'?`<button class="term__mv" data-term-move="${s.id}:${key}:${t.id}:fwd" title="More known">▶</button>`:''}
                      <button class="term__del" data-term-del="${s.id}:${key}:${t.id}" title="Delete">×</button>
                    </span>
                  </div>`).join('') || `<p class="bkt__empty">—</p>`}
              </div>
              <form class="bkt__add" data-term-add="${s.id}:${key}">
                <input class="input input--sm" placeholder="Add concept…" maxlength="60">
              </form>
            </div>`;
          };
          body = `<p class="subj-hint">Move each concept as you learn it: <b class="t-red">Unknown</b> → <b class="t-yellow">Reviewing</b> → <b class="t-green">Mastered</b>.</p>
            <div class="bkts">${col('red','Unknown','red')}${col('yellow','Reviewing','yellow')}${col('green','Mastered','green')}</div>`;
        }
        else if (s.view==='tasks') {
          const sorted = [...s.tasks].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
          body = `<form class="task-add" data-task-add="${s.id}">
              <input class="input input--sm task-add__txt" placeholder="e.g. Do 20 MCQ on Unit 3" maxlength="120">
              <input class="input input--sm task-add__date" type="date" value="${localDateKey()}">
              <button class="btn btn--primary btn--sm" type="submit">Add</button>
            </form>
            <div class="task-list">
              ${sorted.map(t=>{
                const dl=daysUntil(t.date);
                const when = t.date? (dl===0?'Today':dl===1?'Tomorrow':dl>0?`in ${dl}d`:`${Math.abs(dl)}d ago`):'';
                return `<div class="task-row ${t.done?'is-done':''}" data-task="${s.id}:${t.id}">
                  <button class="task-check" data-task-toggle="${s.id}:${t.id}">${t.done?'✓':''}</button>
                  <span class="task-txt">${esc(t.text)}</span>
                  ${t.date?`<span class="task-when ${dl<0&&!t.done?'is-late':''}">${when}</span>`:''}
                  <button class="task-del" data-task-del="${s.id}:${t.id}">×</button>
                </div>`;
              }).join('') || `<p class="bkt__empty">No tasks yet — add your plan for today.</p>`}
            </div>`;
        }
        else { // prep
          const mats = s.materials;
          const totMin = s.sessions.reduce((n,x)=>n+(+x.min||0),0);
          body = `<div class="prep-grid">
            <div class="prep-meta">
              <label class="prep-field"><span>Exam date</span><input class="input input--sm" type="date" data-subj-field="${s.id}:examDate" value="${s.examDate||''}"></label>
              <label class="prep-field"><span>Credits</span><input class="input input--sm" type="number" min="0" max="12" data-subj-field="${s.id}:credits" value="${s.credits||0}"></label>
              <label class="prep-toggle"><input type="checkbox" data-subj-secured="${s.id}" ${s.secured?'checked':''}><span>Credits secured (exam passed)</span></label>
              <button class="btn btn--ghost btn--sm prep-del" data-subj-del="${s.id}">Delete subject</button>
            </div>
            <div class="prep-mats">
              <p class="prep-sub">What to buy / do to get a 5</p>
              <form class="mat-add" data-mat-add="${s.id}"><input class="input input--sm" placeholder="e.g. Princeton Review Calc BC book" maxlength="80"></form>
              <div class="mat-list">
                ${mats.map(m=>`<div class="mat-row ${m.done?'is-done':''}">
                  <button class="mat-check" data-mat-toggle="${s.id}:${m.id}">${m.done?'✓':''}</button>
                  <span>${esc(m.text)}</span>
                  <button class="mat-del" data-mat-del="${s.id}:${m.id}">×</button>
                </div>`).join('') || `<p class="bkt__empty">Nothing listed yet.</p>`}
              </div>
            </div>
            <div class="prep-sessions">
              <p class="prep-sub">Study time logged <b>${(totMin/60).toFixed(1)}h</b></p>
              <form class="sess-add" data-sess-add="${s.id}">
                <input class="input input--sm" type="number" min="5" step="5" placeholder="min" style="max-width:74px">
                <button class="btn btn--primary btn--sm" type="submit">Log</button>
              </form>
              <div class="sess-dots">
                ${s.sessions.slice(-24).map(x=>`<span class="sess-dot" title="${x.date} · ${x.min}m" style="opacity:${clamp(0.3+(x.min/120),0.3,1)}"></span>`).join('')||'<span class="bkt__empty">No sessions</span>'}
              </div>
            </div>
          </div>`;
        }
        return `<article class="subj-card is-open" data-subj="${s.id}">${head}
          <div class="subj-body"><div class="subj-vtabs">${tabs}</div>${body}</div></article>`;
      }).join('');
    }

    function addSubject() {
      const name = prompt('Subject name (e.g. Calculus BC, Microeconomics):'); if(!name) return;
      const type = (prompt('Type — AP or CLEP?','AP')||'AP').toUpperCase().includes('CLEP')?'CLEP':'AP';
      data.subjects.push({id:uid(),name:name.trim(),type,examDate:'',credits:3,target:5,secured:false,open:true,view:'plan',
        buckets:{red:[],yellow:[],green:[]},tasks:[],materials:[],sessions:[]});
      save(); renderSubjects(); renderSubjFilter(); renderCredits();
    }

    /* =====================  ESSAY  ===================== */
    function renderEssay() {
      const el = $('[data-essay-body]'); if (!el) return;
      const e = data.essay;
      const words = e.text.trim()? e.text.trim().split(/\s+/).length : 0;
      const stageIdx = STAGES.indexOf(e.stage);
      const pipe = STAGES.map((st,i)=>`<button class="essay-stage ${i<=stageIdx?'is-done':''} ${i===stageIdx?'is-current':''}" data-essay-stage="${st}">${st}</button>`).join('<span class="essay-stage__sep"></span>');

      const supps = e.supplements.map(su=>{
        const w = su.text.trim()? su.text.trim().split(/\s+/).length:0;
        return `<div class="supp-row" data-supp="${su.id}">
          <div class="supp-row__top">
            <input class="input input--sm supp-school" data-supp-field="${su.id}:school" value="${esc(su.school)}" placeholder="School name">
            <span class="supp-count ${su.limit&&w>su.limit?'is-over':''}">${w}${su.limit?`/${su.limit}`:''}</span>
            <button class="supp-del" data-supp-del="${su.id}">×</button>
          </div>
          <input class="input input--sm supp-prompt" data-supp-field="${su.id}:prompt" value="${esc(su.prompt)}" placeholder="Prompt / question">
          <textarea class="input input--sm supp-text" data-supp-field="${su.id}:text" rows="2" placeholder="Draft…">${esc(su.text)}</textarea>
        </div>`;
      }).join('');

      el.innerHTML = `
        <div class="essay-theme"><span class="essay-theme__k">Theme</span><span class="essay-theme__v">${esc(e.theme)}</span></div>
        <div class="essay-pipe">${pipe}</div>
        <div class="essay-ideas">
          <p class="prep-sub">Brainstorm — angles to explore</p>
          <form class="idea-add" data-idea-add><input class="input input--sm" placeholder="Add an idea / story angle…" maxlength="120"></form>
          <div class="idea-chips">
            ${e.ideas.map(i=>`<span class="idea-chip">${esc(i.text)}<button data-idea-del="${i.id}">×</button></span>`).join('')||'<p class="bkt__empty">No ideas yet.</p>'}
          </div>
        </div>
        <div class="essay-main">
          <div class="essay-main__head"><p class="prep-sub">Personal Statement (Common App)</p>
            <span class="essay-wc ${words>e.limit?'is-over':''}">${words}/${e.limit} words</span></div>
          <textarea class="input essay-textarea" data-essay-text rows="7" placeholder="Write your personal statement here. Autosaves.">${esc(e.text)}</textarea>
          <div class="essay-bar"><i style="width:${clamp(words/e.limit,0,1)*100}%"></i></div>
        </div>
        <div class="essay-supps">
          <p class="prep-sub">Supplemental Essays</p>
          ${supps || '<p class="bkt__empty">No supplements yet — tap “+ School”.</p>'}
        </div>`;
    }

    /* =====================  RECS  ===================== */
    const REC_ROLES = {community:'Community / Church', coach:'Coach / Mentor', professional:'Professional', teacher:'Instructor', other:'Other'};
    const REC_STATUS = ['planned','asked','agreed','submitted'];
    function renderRecs() {
      const el = $('[data-recs-body]'); if (!el) return;
      if (!data.recs.length) { el.innerHTML = `<p class="acad-empty">No recommenders yet. Aim for 2–3 letters from people who know you well.</p>`; return; }
      el.innerHTML = data.recs.map(r=>{
        const sIdx = REC_STATUS.indexOf(r.status);
        const steps = REC_STATUS.map((st,i)=>`<button class="rec-step ${i<=sIdx?'is-done':''} ${i===sIdx?'is-cur':''}" data-rec-status="${r.id}:${st}">${st}</button>`).join('');
        const dl = daysUntil(r.deadline);
        return `<div class="rec-card" data-rec="${r.id}">
          <div class="rec-card__top">
            <input class="input input--sm rec-name" data-rec-field="${r.id}:name" value="${esc(r.name)}" placeholder="Recommender name">
            <select class="input input--sm rec-role" data-rec-field="${r.id}:role">
              ${Object.entries(REC_ROLES).map(([k,v])=>`<option value="${k}" ${r.role===k?'selected':''}>${v}</option>`).join('')}
            </select>
            <button class="rec-del" data-rec-del="${r.id}">×</button>
          </div>
          <input class="input input--sm rec-rel" data-rec-field="${r.id}:relationship" value="${esc(r.relationship||'')}" placeholder="How they know you">
          <div class="rec-steps">${steps}</div>
          <div class="rec-foot">
            <label class="rec-dl">Deadline<input class="input input--sm" type="date" data-rec-field="${r.id}:deadline" value="${r.deadline||''}"></label>
            ${r.deadline?`<span class="rec-dchip ${dl!=null&&dl<14?'is-soon':''}">${dl!=null?(dl<0?'past':dl+'d left'):''}</span>`:''}
            <label class="rec-thx"><input type="checkbox" data-rec-thanked="${r.id}" ${r.thanked?'checked':''}><span>Thank-you sent</span></label>
          </div>
        </div>`;
      }).join('');
    }

    /* =====================  EXTRACURRICULARS  ===================== */
    const EC_CATS = {sports:'Athletics', community:'Community / Service', leadership:'Academic / Leadership', arts:'Arts', work:'Work / Internship', other:'Other'};
    function renderECs() {
      const el = $('[data-ecs-grid]'); if (!el) return;
      const totalHours = data.ecs.reduce((n,e)=>n+(+e.hours||0),0);
      if (!data.ecs.length) { el.innerHTML = `<p class="acad-empty">No activities yet. Colleges love depth — a few committed activities beat many shallow ones.</p>`; return; }
      el.innerHTML = `<div class="ec-summary"><span><b>${data.ecs.length}</b> activities</span><span><b>${totalHours}</b> total hrs</span></div>` +
        data.ecs.map(e=>`<div class="ec-card ec--${e.category}" data-ec="${e.id}">
          <div class="ec-card__top">
            <span class="ec-cat">${EC_CATS[e.category]||'Other'}</span>
            <button class="ec-del" data-ec-del="${e.id}">×</button>
          </div>
          <input class="input input--sm ec-name" data-ec-field="${e.id}:name" value="${esc(e.name)}" placeholder="Activity name">
          <input class="input input--sm ec-role" data-ec-field="${e.id}:role" value="${esc(e.role||'')}" placeholder="Your role / position">
          <textarea class="input input--sm ec-desc" data-ec-field="${e.id}:desc" rows="2" placeholder="What you did & impact…">${esc(e.desc||'')}</textarea>
          <div class="ec-foot">
            <select class="input input--sm" data-ec-field="${e.id}:category">
              ${Object.entries(EC_CATS).map(([k,v])=>`<option value="${k}" ${e.category===k?'selected':''}>${v}</option>`).join('')}
            </select>
            <label class="ec-hrs">Hrs/wk?<input class="input input--sm" type="number" min="0" data-ec-field="${e.id}:hours" value="${e.hours||0}"></label>
          </div>
        </div>`).join('');
    }

    /* ══════════════════  THE MEETING  ══════════════════
       Twenty minutes with the school decides January 2027, and the school is
       not going to raise any of this on its own — the counselor who knew the
       file retired. So the asks are ordered by what is irreversible if it goes
       unasked, not by what is comfortable to say.

       ASK 1 is first for a reason: the credit total is the number the whole
       plan is built on, and nobody outside that office can see it. */
    const MKEY = 'nv.meetprep';
    const MEETING = {
      who: 'Ms. Gahuancela',
      goal: 'Get the credit number · put January 2027 on the record',
      asks: [
        { id: 'credits', rank: 'must',
          say: 'Can you tell me my exact credit total through June 2026?',
          why: 'The transcript you have says 31.08 — but that only counts through fall 2025. Every plan depends on the real number, and NYCSA will not open from here.' },
        { id: 'january', rank: 'must',
          say: 'I want to graduate in January 2027. Is that possible with where I stand?',
          why: 'Nobody at the school knows you want this. Until somebody does, it cannot happen.' },
        { id: 'program', rank: 'must',
          say: 'If it is possible, can you program me this fall for what I still need — Economics, Government, English, math, the arts credit and PE?',
          why: 'You can have every credit and still not graduate if the fall schedule is missing a required course.' },
        { id: 'writing', rank: 'must',
          say: 'Could you email me a summary of what we agreed?',
          why: 'Your counselor retired on 30 July. A conversation nobody wrote down does not survive a staff change.' },
        { id: 'counselor', rank: 'ask',
          say: 'Who is my counselor now that Ms. Eva has retired?',
          why: 'You need a name and an email, or your file has no guardian.' },
        { id: 'transcript', rank: 'ask',
          say: 'Could you send me an official transcript through June 2026?',
          why: 'Colleges need it anyway — and it answers the credit question in writing.' },
        { id: 'regents', rank: 'ask',
          say: 'Can you confirm the school has me registered for ELA on the 18th and Earth & Space on the 19th?',
          why: 'Mr. Eng confirmed both. A second check against the school record costs one sentence.' },
        { id: 'appeal', rank: 'ask',
          say: 'If Earth & Space comes back 60–64 again, how does the appeal work here?',
          why: 'A second sitting in that range opens the appeal — and a granted appeal is still a full Regents diploma.' },
        { id: 'recs', rank: 'ask',
          say: 'Which teachers would you suggest I ask for recommendation letters?',
          why: 'You have none yet, and it is August. Her answer is also a warm introduction.' },
      ],
      /* The one thing that is safer unsaid: the enrollment record has not been
         corrected yet, and raising it now risks the August seats. */
      avoid: 'Do not raise the homeschool letter of intent. Your exams are twelve days away and the seats are registered — that conversation happens after the 19th.',
      armed: 'If PE comes up as a problem: state rules prorate it — a quarter credit per semester enrolled, so a seven-semester graduate needs 1¾ PE credits, not 4.',
    };

    function renderMeeting() {
      const host = $('[data-acad-meeting]'); if (!host) return;
      const done = Store.get(MKEY, []);
      const set = Array.isArray(done) ? done : [];
      const musts = MEETING.asks.filter(a => a.rank === 'must');
      const hit = musts.filter(a => set.includes(a.id)).length;

      host.innerHTML =
        `<div class="eyebrow"><span class="eyebrow__num">00</span>
           <span class="eyebrow__lbl">The meeting</span><span class="eyebrow__rule"></span></div>
         <div class="tile-well mtg-well">
           <span class="tile-kick">✦ ${esc(MEETING.who)}</span>
           <span class="tile-hero__val">${hit}<em>/${musts.length}</em></span>
           <span class="tile-hero__of">${esc(MEETING.goal)}</span>
           <div class="tile-hero__bar"><i style="width:${hit / musts.length * 100}%"></i></div>
         </div>
         <div class="mtg">${MEETING.asks.map((a, i) => {
            const on = set.includes(a.id);
            return `<button class="mtg__row ${on ? 'is-on' : ''} ${a.rank === 'must' ? 'is-must' : ''}"
                      data-mtg="${a.id}" style="animation-delay:${i * 40}ms">
              <span class="mtg__box"></span>
              <span class="mtg__m">
                <b>${esc(a.say)}</b>
                <i>${esc(a.why)}</i>
              </span>
              ${a.rank === 'must' ? '<span class="mtg__flag">must</span>' : ''}
            </button>`;
          }).join('')}</div>
         <p class="mtg__note mtg__note--warn">${esc(MEETING.avoid)}</p>
         <p class="mtg__note">${esc(MEETING.armed)}</p>`;
    }

    function renderAll(){ seed(); renderReadiness(); renderMeeting(); renderRegents(); renderSAT(); renderCredits(); renderSubjFilter(); renderSubjects(); renderEssay(); renderRecs(); renderECs(); }

    /* =====================  EVENTS (delegated)  ===================== */
    let wired=false;
    function init() {
      const root = $('.board--academics'); if(!root) return;
      renderAll();
      if (wired) return; wired=true;

      // ---- click delegation ----
      root.addEventListener('click', e => {
        const t = e.target;
        const c = sel => t.closest(sel);

        /* Tick an ask the moment it is answered — mid-meeting, one thumb. */
        const mtg = c('[data-mtg]');
        if (mtg) {
          const id = mtg.getAttribute('data-mtg');
          const cur = Store.get(MKEY, []);
          const arr = Array.isArray(cur) ? cur : [];
          const i = arr.indexOf(id);
          if (i >= 0) arr.splice(i, 1); else arr.push(id);
          Store.set(MKEY, arr);
          renderMeeting();
          return;
        }

        /* Tick a piece off. Stored by id, so it survives a reload and the
           computed rows (SAT, essay, activities) still light up on their own. */
        const rdy = c('[data-rdy]');
        if (rdy) {
          const id = rdy.getAttribute('data-rdy');
          const cur = Store.get(PKEY, []);
          const arr = Array.isArray(cur) ? cur : [];
          const at = arr.indexOf(id);
          if (at >= 0) arr.splice(at, 1); else arr.push(id);
          Store.set(PKEY, arr);
          renderReadiness();
          return;
        }

        /* Turn the checklist into dated days. Written straight to the day
           records so they appear in the calendar, the home list and Nova's
           board alike — and skipped if already there, so pressing it twice
           does not duplicate your own plan. */
        if (c('[data-acad-toplan]')) {
          let added = 0;
          readiness().filter(r => r.due && r.state !== 'done').forEach(r => {
            const k = 'nv.day.' + r.due;
            const listD = Store.get(k, []);
            const arr = Array.isArray(listD) ? listD : [];
            if (arr.some(x => x && String(x.text || '').includes(r.label))) return;
            const item = { text: r.label + ' — ' + (r.note || ''), done: false };
            /* a time turns it into a block on the timeline rather than an
               untimed item sitting in the inbox */
            if (r.at)  item.at  = r.at;
            if (r.end) item.end = r.end;
            arr.push(item);
            Store.set(k, arr);
            added++;
          });
          window.dispatchEvent(new CustomEvent('nv-day-changed'));
          toast(added ? added + ' added to your calendar' : 'Already on your calendar');
          return;
        }

        // SAT
        if (c('[data-sat-add]'))      { satAddForm(); return; }
        if (c('[data-sat-cancel]'))   { renderSAT(); return; }
        if (c('[data-sat-confirm]'))  {
          const f = c('.sat-form');
          const g = k => f.querySelector(`[data-f="${k}"]`).value;
          const math=+g('math')||0, eng=+g('english')||0;
          if(!math && !eng){ toast('Enter at least one score'); return; }
          data.sat.attempts.push({id:uid(),date:g('date')||localDateKey(),type:g('type'),math,english:eng,total:math+eng,note:g('note')});
          save(); renderSAT(); toast('Attempt logged'); return;
        }
        const satDel = c('[data-sat-del]'); if (satDel) { data.sat.attempts=data.sat.attempts.filter(a=>a.id!==satDel.dataset.satDel); save(); renderSAT(); return; }

        // subject filter
        const sf = c('[data-subj-filter]'); if (sf){ subjFilter=sf.dataset.subjFilter; renderSubjFilter(); renderSubjects(); return; }
        if (c('[data-subj-add]')) { addSubject(); return; }

        const st = c('[data-subj-toggle]'); if (st){ const s=data.subjects.find(x=>x.id===st.dataset.subjToggle); if(s){s.open=!s.open; save(); renderSubjects();} return; }
        const sv = c('[data-subj-view]'); if (sv){ const [id,v]=sv.dataset.subjView.split(':'); const s=data.subjects.find(x=>x.id===id); if(s){s.view=v; save(); renderSubjects();} return; }
        const sdel = c('[data-subj-del]'); if (sdel){ if(confirm('Delete this subject and all its data?')){ data.subjects=data.subjects.filter(x=>x.id!==sdel.dataset.subjDel); save(); renderSubjects(); renderSubjFilter(); renderCredits(); } return; }

        // term move/del
        const tm = c('[data-term-move]'); if (tm){ const [id,key,tid,dir]=tm.dataset.termMove.split(':'); moveTerm(id,key,tid,dir); return; }
        const td = c('[data-term-del]'); if (td){ const [id,key,tid]=td.dataset.termDel.split(':'); const s=data.subjects.find(x=>x.id===id); if(s){s.buckets[key]=s.buckets[key].filter(x=>x.id!==tid); save(); renderSubjects();} return; }

        // tasks
        const tt = c('[data-task-toggle]'); if (tt){ const [id,tid]=tt.dataset.taskToggle.split(':'); const s=data.subjects.find(x=>x.id===id); const tk=s?.tasks.find(x=>x.id===tid); if(tk){tk.done=!tk.done; save(); renderSubjects();} return; }
        const tdl = c('[data-task-del]'); if (tdl){ const [id,tid]=tdl.dataset.taskDel.split(':'); const s=data.subjects.find(x=>x.id===id); if(s){s.tasks=s.tasks.filter(x=>x.id!==tid); save(); renderSubjects();} return; }

        // materials
        const mt = c('[data-mat-toggle]'); if (mt){ const [id,mid]=mt.dataset.matToggle.split(':'); const s=data.subjects.find(x=>x.id===id); const m=s?.materials.find(x=>x.id===mid); if(m){m.done=!m.done; save(); renderSubjects();} return; }
        const mdl = c('[data-mat-del]'); if (mdl){ const [id,mid]=mdl.dataset.matDel.split(':'); const s=data.subjects.find(x=>x.id===id); if(s){s.materials=s.materials.filter(x=>x.id!==mid); save(); renderSubjects();} return; }

        // secured toggle handled in change; subject delete done above

        // essay
        const es = c('[data-essay-stage]'); if (es){ data.essay.stage=es.dataset.essayStage; save(); renderEssay(); return; }
        const idel = c('[data-idea-del]'); if (idel){ data.essay.ideas=data.essay.ideas.filter(x=>x.id!==idel.dataset.ideaDel); save(); renderEssay(); return; }
        if (c('[data-essay-add-supp]')) { data.essay.supplements.push({id:uid(),school:'',prompt:'',limit:0,stage:'Brainstorm',text:''}); save(); renderEssay(); return; }
        const sudel = c('[data-supp-del]'); if (sudel){ data.essay.supplements=data.essay.supplements.filter(x=>x.id!==sudel.dataset.suppDel); save(); renderEssay(); return; }

        // recs
        if (c('[data-rec-add]')) { data.recs.push({id:uid(),name:'',role:'community',relationship:'',status:'planned',dateAsked:'',deadline:'',thanked:false,note:''}); save(); renderRecs(); return; }
        const rs = c('[data-rec-status]'); if (rs){ const [id,st2]=rs.dataset.recStatus.split(':'); const r=data.recs.find(x=>x.id===id); if(r){r.status=st2; save(); renderRecs();} return; }
        const rdel = c('[data-rec-del]'); if (rdel){ data.recs=data.recs.filter(x=>x.id!==rdel.dataset.recDel); save(); renderRecs(); return; }

        // ecs
        if (c('[data-ec-add]')) { data.ecs.push({id:uid(),name:'',category:'community',role:'',hours:0,desc:''}); save(); renderECs(); return; }
        const ecdel = c('[data-ec-del]'); if (ecdel){ data.ecs=data.ecs.filter(x=>x.id!==ecdel.dataset.ecDel); save(); renderECs(); return; }
      });

      // ---- submit delegation (inline add forms) ----
      root.addEventListener('submit', e => {
        const f = e.target; e.preventDefault();
        if (f.matches('[data-term-add]')) { const [id,key]=f.dataset.termAdd.split(':'); const inp=f.querySelector('input'); const v=inp.value.trim(); if(v){ const s=data.subjects.find(x=>x.id===id); s.buckets[key].push({id:uid(),text:v}); save(); renderSubjects(); } }
        else if (f.matches('[data-task-add]')) { const id=f.dataset.taskAdd; const txt=f.querySelector('.task-add__txt').value.trim(); const date=f.querySelector('.task-add__date').value; if(txt){ const s=data.subjects.find(x=>x.id===id); s.tasks.push({id:uid(),text:txt,date,done:false}); save(); renderSubjects(); } }
        else if (f.matches('[data-mat-add]')) { const id=f.dataset.matAdd; const inp=f.querySelector('input'); const v=inp.value.trim(); if(v){ const s=data.subjects.find(x=>x.id===id); s.materials.push({id:uid(),text:v,done:false}); save(); renderSubjects(); } }
        else if (f.matches('[data-sess-add]')) { const id=f.dataset.sessAdd; const inp=f.querySelector('input'); const m=+inp.value||0; if(m>0){ const s=data.subjects.find(x=>x.id===id); s.sessions.push({id:uid(),date:localDateKey(),min:m}); save(); renderSubjects(); } }
        else if (f.matches('[data-idea-add]')) { const inp=f.querySelector('input'); const v=inp.value.trim(); if(v){ data.essay.ideas.push({id:uid(),text:v}); save(); renderEssay(); } }
      });

      // ---- input/change delegation (live fields) ----
      const onField = e => {
        const t = e.target;
        // subject fields
        const sf2 = t.closest('[data-subj-field]'); if (sf2){ const [id,k]=sf2.dataset.subjField.split(':'); const s=data.subjects.find(x=>x.id===id); if(s){ s[k]= k==='credits'? (+t.value||0): t.value; save(); if(k==='credits'||k==='examDate'){ renderCredits(); } } return; }
        const sec = t.closest('[data-subj-secured]'); if (sec){ const s=data.subjects.find(x=>x.id===sec.dataset.subjSecured); if(s){ s.secured=t.checked; save(); renderSubjects(); renderCredits(); } return; }
        // essay text
        if (t.matches('[data-essay-text]')) { data.essay.text=t.value; save(); const wc=root.querySelector('.essay-wc'); const words=t.value.trim()?t.value.trim().split(/\s+/).length:0; if(wc){ wc.textContent=`${words}/${data.essay.limit} words`; wc.classList.toggle('is-over',words>data.essay.limit);} const bar=root.querySelector('.essay-bar i'); if(bar) bar.style.width=clamp(words/data.essay.limit,0,1)*100+'%'; return; }
        const supf = t.closest('[data-supp-field]'); if (supf){ const [id,k]=supf.dataset.suppField.split(':'); const su=data.essay.supplements.find(x=>x.id===id); if(su){ su[k]= k==='limit'?(+t.value||0):t.value; save(); if(k==='text'){ const w=t.value.trim()?t.value.trim().split(/\s+/).length:0; const cnt=t.closest('.supp-row')?.querySelector('.supp-count'); if(cnt){ cnt.textContent=`${w}${su.limit?`/${su.limit}`:''}`; cnt.classList.toggle('is-over',su.limit&&w>su.limit);} } } return; }
        // rec fields
        const rf = t.closest('[data-rec-field]'); if (rf){ const [id,k]=rf.dataset.recField.split(':'); const r=data.recs.find(x=>x.id===id); if(r){ r[k]=t.value; save(); if(k==='deadline'){renderRecs();} } return; }
        const rt = t.closest('[data-rec-thanked]'); if (rt){ const r=data.recs.find(x=>x.id===rt.dataset.recThanked); if(r){ r.thanked=t.checked; save(); } return; }
        // ec fields
        const ef = t.closest('[data-ec-field]'); if (ef){ const [id,k]=ef.dataset.ecField.split(':'); const ec=data.ecs.find(x=>x.id===id); if(ec){ ec[k]= k==='hours'?(+t.value||0):t.value; save(); if(k==='category'){renderECs();} else if(k==='hours'){const sum=root.querySelector('.ec-summary'); if(sum){const th=data.ecs.reduce((n,x)=>n+(+x.hours||0),0); sum.innerHTML=`<span><b>${data.ecs.length}</b> activities</span><span><b>${th}</b> total hrs</span>`;}} } return; }
      };
      root.addEventListener('input', onField);
      root.addEventListener('change', onField);
    }

    function moveTerm(id,key,tid,dir){
      const s=data.subjects.find(x=>x.id===id); if(!s) return;
      const order=['red','yellow','green']; const i=order.indexOf(key);
      const ni = dir==='fwd'? Math.min(2,i+1): Math.max(0,i-1);
      if(ni===i) return;
      const idx=s.buckets[key].findIndex(x=>x.id===tid); if(idx<0) return;
      const [term]=s.buckets[key].splice(idx,1);
      s.buckets[order[ni]].push(term); save(); renderSubjects();
    }

    return { init, renderAll };
  })();

  /* ═══════════════════  LOGS  ═══════════════════ */
  const Logs = (() => {
    const KEY = 'nv.logs';
    const SLEEP_GOAL = 8;     // hours
    const WATER_GOAL = 100;   // oz
    const QUALITY = ['Poor','Fair','Good','Great','Excellent'];

    const DEFAULT = {
      sleep:   { goal: SLEEP_GOAL, entries: [] },
      water:   { goal: WATER_GOAL, days: {} },
      running: { entries: [] },
      vitals:  [],
      seeded:  false,
    };

    let data = Store.get(KEY, null) || JSON.parse(JSON.stringify(DEFAULT));
    // shape-ensure (older / partial saves)
    data.sleep   = data.sleep   || JSON.parse(JSON.stringify(DEFAULT.sleep));
    data.water   = data.water   || JSON.parse(JSON.stringify(DEFAULT.water));
    data.running = data.running || JSON.parse(JSON.stringify(DEFAULT.running));
    data.vitals  = data.vitals  || [];
    data.sleep.entries   = data.sleep.entries   || [];
    data.water.days      = data.water.days      || {};
    data.running.entries = data.running.entries || [];

    const save = () => Store.set(KEY, data);
    const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || ('v'+uid());

    function seed() {
      if (data.seeded) return;
      data.vitals = [
        { id:'mood',        label:'Mood',         icon:'☺', unit:'/5',    goal:null,  max:5,    lowerBetter:false, entries:{} },
        { id:'steps',       label:'Steps',        icon:'◆', unit:'steps', goal:10000, max:null, lowerBetter:false, entries:{} },
        { id:'mindfulness', label:'Mindfulness',  icon:'◎', unit:'min',   goal:10,    max:null, lowerBetter:false, entries:{} },
        { id:'screen',      label:'Screen Time',  icon:'▭', unit:'hrs',   goal:null,  max:null, lowerBetter:true,  entries:{} },
      ];
      data.seeded = true;
      save();
    }

    /* ---------- date helpers ---------- */
    function lastNDays(n) {
      const out = [];
      for (let i=n-1;i>=0;i--) { const d = new Date(); d.setDate(d.getDate()-i); out.push(localDateKey(d)); }
      return out;
    }
    function dayLabel(key) {
      const d = new Date(key+'T00:00:00');
      return d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,2);
    }
    function fmtDate(key) {
      if (!key) return '—';
      const d = new Date(key+'T00:00:00');
      return d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
    }

    /* =====================  SLEEP  ===================== */
    function hoursBetween(bed,wake){
      if (!bed || !wake) return null;
      const [bh,bm]=bed.split(':').map(Number), [wh,wm]=wake.split(':').map(Number);
      let mins = (wh*60+wm)-(bh*60+bm);
      if (mins<=0) mins += 24*60;
      return Math.round((mins/60)*100)/100;
    }
    function sleepClass(h){ return h>=8?'is-elite':h>=7?'is-strong':h>=6?'is-mid':'is-base'; }

    function renderSleep() {
      const el = $('[data-sleep-body]'); if (!el) return;
      const goal = data.sleep.goal || SLEEP_GOAL;
      const chip = $('[data-sleep-goal-chip]'); if (chip) chip.textContent = `Goal: ${goal}h`;
      const all = [...data.sleep.entries].sort((a,b)=>(a.date||'').localeCompare(b.date||''));

      if (!all.length) {
        el.innerHTML = `<div class="acad-empty">No nights logged yet. Tap "+ Log Night" to record your first.</div>`;
        return;
      }

      const latest = all[all.length-1];
      const prev   = all[all.length-2];
      const delta  = prev ? Math.round((latest.hours-prev.hours)*100)/100 : null;
      const deltaHTML = delta===null ? `<span class="sleep-delta is-first">First night logged</span>`
        : delta>=0 ? `<span class="sleep-delta is-up">▲ +${delta}h</span>`
        : `<span class="sleep-delta is-down">▼ ${delta}h</span>`;

      const days = lastNDays(7);
      const byDate = {}; all.forEach(e=> byDate[e.date]=e);
      const bars = days.map(dk=>{
        const e = byDate[dk];
        const h = e ? e.hours : 0;
        const pct = clamp(h/12,0,1)*100;
        const hit = e && e.hours>=goal;
        return `<div class="sleep-bar ${e?'':'is-empty'} ${hit?'is-hit':''}" title="${dayLabel(dk)} · ${e?h+'h':'No log'}">
          <i style="height:${pct}%"></i><b>${dayLabel(dk)}</b>
        </div>`;
      }).join('');

      const week = days.map(dk=>byDate[dk]).filter(Boolean);
      const avg  = week.length ? Math.round((week.reduce((s,e)=>s+e.hours,0)/week.length)*10)/10 : 0;
      const best = week.length ? Math.max(...week.map(e=>e.hours)) : 0;
      const debt = Math.max(0, Math.round((week.reduce((s,e)=>s+Math.max(0,goal-e.hours),0))*10)/10);

      const rows = [...all].reverse().slice(0,10).map(e=>{
        const span = (e.bed && e.wake) ? `${e.bed} → ${e.wake}` : '—';
        const qBadge = e.quality ? `<span class="sleep-row__q is-q${e.quality}">${QUALITY[e.quality-1]}</span>` : `<span class="sleep-row__q is-q0">—</span>`;
        return `<div class="sleep-row" data-sleep-row="${e.id}">
          <span class="sleep-row__date">${fmtDate(e.date)}</span>
          <span class="sleep-row__span">${span}</span>
          <span class="sleep-row__hrs ${sleepClass(e.hours)}">${e.hours}h</span>
          ${qBadge}
          <button class="sleep-row__del" data-sleep-del="${e.id}" title="Delete">×</button>
        </div>`;
      }).join('');

      el.innerHTML = `
        <div class="sleep-hero">
          <div class="sleep-hero__main">
            <p class="sleep-hero__label">Last Night</p>
            <p class="sleep-hero__score ${sleepClass(latest.hours)}">${latest.hours}<span>h</span></p>
            ${deltaHTML}
            <p class="sleep-hero__sub">${fmtDate(latest.date)}${latest.bed&&latest.wake?` · ${latest.bed} → ${latest.wake}`:''}${latest.quality?` · ${QUALITY[latest.quality-1]}`:''}</p>
          </div>
          <div class="sleep-bars">${bars}</div>
        </div>
        <div class="sleep-curve">
          ${trackerChart('sleep', all.slice(-30).map(e=>({label:fmtDate(e.date), value:e.hours})), {unit:'h', caption:'Sleep trend'})}
        </div>
        <div class="sat-stats sleep-stats">
          <div class="sat-stat"><span class="sat-stat__v">${avg||'—'}h</span><span class="sat-stat__k">7-Day Avg</span></div>
          <div class="sat-stat"><span class="sat-stat__v">${best||'—'}h</span><span class="sat-stat__k">Best Night</span></div>
          <div class="sat-stat"><span class="sat-stat__v ${debt>0?'is-down':''}">${debt>0?debt+'h':'On track'}</span><span class="sat-stat__k">Sleep Debt</span></div>
        </div>
        <div class="sleep-history">${rows}</div>`;
    }

    function sleepAddForm() {
      const el = $('[data-sleep-body]'); if (!el) return;
      const today = localDateKey();
      const wrap = document.createElement('div');
      wrap.className = 'sleep-form';
      wrap.innerHTML = `
        <p class="sleep-form__title">Log a Night's Sleep</p>
        <div class="sleep-form__row">
          <input class="input input--sm" type="date" data-f="date" value="${today}">
          <select class="input input--sm" data-f="quality">
            <option value="">Quality…</option>
            ${QUALITY.map((q,i)=>`<option value="${i+1}">${q}</option>`).join('')}
          </select>
        </div>
        <div class="sleep-form__row">
          <label class="sleep-form__lab">Bedtime<input class="input input--sm" type="time" data-f="bed"></label>
          <label class="sleep-form__lab">Wake<input class="input input--sm" type="time" data-f="wake"></label>
          <label class="sleep-form__lab">Hours<input class="input input--sm" type="number" min="0" max="14" step="0.25" data-f="hours" placeholder="auto"></label>
        </div>
        <p class="sleep-form__hint">Fill bed + wake time and hours auto-calculates — or just enter hours directly.</p>
        <div class="sleep-form__actions">
          <button class="btn btn--ghost btn--sm" data-sleep-cancel>Cancel</button>
          <button class="btn btn--primary btn--sm" data-sleep-confirm>Save Night</button>
        </div>`;
      el.prepend(wrap);
      wrap.querySelector('[data-f="hours"]').focus();
    }

    /* =====================  WATER  ===================== */
    function renderWater() {
      const el = $('[data-water-body]'); if (!el) return;
      const goal = data.water.goal || WATER_GOAL;
      const chip = $('[data-water-goal-chip]'); if (chip) chip.textContent = `Goal: ${goal} oz`;
      const today = localDateKey();
      const oz = data.water.days[today] || 0;
      const pct = clamp(oz/goal,0,1)*100;
      const hitGoal = oz>=goal;

      let streak = 0;
      { const d = new Date();
        if (!hitGoal) d.setDate(d.getDate()-1);
        for(;;){ const k=localDateKey(d); if((data.water.days[k]||0)>=goal){ streak++; d.setDate(d.getDate()-1); } else break; }
      }

      const days = lastNDays(7);
      const bars = days.map(dk=>{
        const v = data.water.days[dk]||0;
        const p = clamp(v/goal,0,1)*100;
        const hit = v>=goal;
        return `<div class="water-bar ${hit?'is-hit':''}" title="${dayLabel(dk)} · ${v} oz">
          <i style="height:${p}%"></i><b>${dayLabel(dk)}</b>
        </div>`;
      }).join('');

      el.innerHTML = `
        <div class="water-hero">
          <div class="water-vessel">
            <div class="water-vessel__fill" style="height:${pct}%"></div>
            <span class="water-vessel__num">${oz}<small>oz</small></span>
          </div>
          <div class="water-side">
            <p class="water-side__pct">${Math.round(pct)}% of goal</p>
            <div class="water-quick">
              <button class="water-chip" data-water-add="8">+8 oz</button>
              <button class="water-chip" data-water-add="16">+16 oz</button>
              <button class="water-chip" data-water-add="24">+24 oz</button>
              <button class="water-chip" data-water-add="32">+32 oz</button>
            </div>
            <button class="water-reset" data-water-reset title="Reset today">Reset today</button>
            <p class="water-streak">${streak>0?`🔥 ${streak}-day streak`:'Hit your goal to start a streak'}</p>
          </div>
        </div>
        <div class="water-bars">${bars}</div>
        <div class="water-curve">
          ${(() => {
            /* only days you actually logged — empty days would drag a false
               line down to zero and make the trend a lie */
            const series = lastNDays(30)
              .map(dk => ({ label: dayLabel(dk), value: data.water.days[dk] || 0 }))
              .filter(p => p.value > 0);
            return trackerChart('water', series, { unit:'oz', caption:'Intake trend' });
          })()}
        </div>`;
    }

    /* =====================  RUNNING  ===================== */
    function paceOf(miles, secs){
      if (!miles || !secs) return null;
      const ps = secs/miles;
      const m = Math.floor(ps/60), s = Math.round(ps%60);
      return `${m}:${pad(s)}`;
    }
    function paceSecs(miles,secs){ return miles ? secs/miles : Infinity; }

    function renderRunning() {
      const el = $('[data-running-body]'); if (!el) return;
      const all = [...data.running.entries].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
      if (!all.length) {
        el.innerHTML = `<div class="acad-empty">No runs logged yet. Tap "+ Log Run" to track your first mile.</div>`;
        return;
      }
      const totalMiles = Math.round(all.reduce((s,r)=>s+(+r.miles||0),0)*100)/100;
      const days7 = new Set(lastNDays(7));
      const weekRuns = all.filter(r=>days7.has(r.date));
      const weekMiles = Math.round(weekRuns.reduce((s,r)=>s+(+r.miles||0),0)*100)/100;
      const longest = all.reduce((m,r)=> (+r.miles||0)>(+m.miles||0)?r:m, all[0]);
      const fastest = all.reduce((m,r)=> paceSecs(r.miles,r.secs)<paceSecs(m.miles,m.secs)?r:m, all[0]);

      const rows = [...all].reverse().slice(0,10).map(r=>{
        const pace = paceOf(r.miles, r.secs);
        const dur = `${Math.floor(r.secs/60)}:${pad(r.secs%60)}`;
        return `<div class="run-row" data-run-row="${r.id}">
          <span class="run-row__date">${fmtDate(r.date)}</span>
          <span class="run-row__mi">${r.miles} mi</span>
          <span class="run-row__dur">${dur}</span>
          <span class="run-row__pace">${pace?pace+' /mi':'—'}</span>
          <span class="run-row__route">${r.route?esc(r.route):'—'}${r.kind?` <i>· ${esc(r.kind)}</i>`:''}</span>
          <button class="run-row__del" data-run-del="${r.id}" title="Delete">×</button>
        </div>`;
      }).join('');

      el.innerHTML = `
        <div class="sat-stats run-stats">
          <div class="sat-stat"><span class="sat-stat__v">${totalMiles}</span><span class="sat-stat__k">Total Miles</span></div>
          <div class="sat-stat"><span class="sat-stat__v">${weekMiles}</span><span class="sat-stat__k">This Week</span></div>
          <div class="sat-stat"><span class="sat-stat__v">${paceOf(fastest.miles,fastest.secs)||'—'}</span><span class="sat-stat__k">Best Pace /mi</span></div>
          <div class="sat-stat"><span class="sat-stat__v">${longest.miles} mi</span><span class="sat-stat__k">Longest Run</span></div>
        </div>
        <div class="run-curve">
          ${trackerChart('runs', [...all].slice(-30).map(r=>({label:fmtDate(r.date), value:r.miles})), {unit:'mi', caption:'Distance'})}
        </div>
        <div class="run-history">${rows}</div>`;
    }

    function runAddForm() {
      const el = $('[data-running-body]'); if (!el) return;
      const today = localDateKey();
      const wrap = document.createElement('div');
      wrap.className = 'run-form';
      wrap.innerHTML = `
        <p class="run-form__title">Log a Run</p>
        <div class="run-form__row">
          <input class="input input--sm" type="date" data-f="date" value="${today}">
          <input class="input input--sm" type="number" min="0" step="0.01" data-f="miles" placeholder="Distance (mi)">
          <input class="input input--sm" type="text" data-f="time" placeholder="Time (mm:ss)" maxlength="6">
        </div>
        <div class="run-form__row">
          <input class="input input--sm" data-f="route" placeholder="Route — e.g. Central Park Loop" maxlength="60">
          <select class="input input--sm" data-f="kind">
            <option value="">Route type…</option>
            <option>Park Loop</option><option>Bridge Run</option><option>Track</option>
            <option>Greenway</option><option>Street</option><option>Treadmill</option>
          </select>
        </div>
        <p class="run-form__hint">🗺 Pin this route on the NYC map — coming soon.</p>
        <div class="run-form__actions">
          <button class="btn btn--ghost btn--sm" data-run-cancel>Cancel</button>
          <button class="btn btn--primary btn--sm" data-run-confirm>Save Run</button>
        </div>`;
      el.prepend(wrap);
      wrap.querySelector('[data-f="miles"]').focus();
    }

    /* =====================  QUICK VITALS  ===================== */
    function vitalBars(v) {
      const days = lastNDays(7);
      const vals = Object.values(v.entries).map(Number).filter(Number.isFinite);
      return days.map(dk=>{
        const val = v.entries[dk];
        const max = v.max || (v.goal ? v.goal*1.25 : Math.max(1,...vals,0));
        const pct = (val!=null && max) ? clamp(val/max,0,1)*100 : 0;
        const hit = v.goal!=null && val!=null && (v.lowerBetter ? val<=v.goal : val>=v.goal);
        return `<div class="vital-bar ${val!=null?'':'is-empty'} ${hit?'is-hit':''}" title="${dayLabel(dk)} · ${val!=null?val+' '+v.unit:'No log'}"><i style="height:${pct}%"></i></div>`;
      }).join('');
    }

    function renderVitals() {
      const el = $('[data-vitals-grid]'); if (!el) return;
      if (!data.vitals.length) { el.innerHTML = `<div class="acad-empty">No trackers yet. Tap "+ Tracker" to add one (e.g. Mood, Steps, Reading).</div>`; return; }
      const today = localDateKey();
      el.innerHTML = data.vitals.map(v=>{
        const todayVal = v.entries[today];
        return `<div class="vital-card" data-vital-card="${v.id}">
          <div class="vital-card__head">
            <span class="vital-card__icon">${v.icon||'✦'}</span>
            <span class="vital-card__label">${esc(v.label)}</span>
            <button class="vital-card__del" data-vital-del="${v.id}" title="Remove tracker">×</button>
          </div>
          <div class="vital-card__input">
            <input class="input input--sm" type="number" step="any" data-vital-val="${v.id}" value="${todayVal!=null?todayVal:''}" placeholder="Today…">
            <span class="vital-card__unit">${esc(v.unit||'')}</span>
          </div>
          ${v.goal!=null?`<p class="vital-card__goal">Goal: ${v.goal} ${esc(v.unit||'')}</p>`:''}
          <div class="vital-bars">${vitalBars(v)}</div>
        </div>`;
      }).join('');
    }

    function addVital() {
      const lbl = (prompt('New tracker name (e.g. Reading, Pushups, Energy):')||'').trim();
      if (!lbl) return;
      const id = slug(lbl);
      if (data.vitals.find(v=>v.id===id)) { toast('Tracker already exists'); return; }
      const unit = (prompt('Unit (e.g. min, pages, /5, reps) — optional:')||'').trim();
      data.vitals.push({ id, label:lbl, icon:'✦', unit, goal:null, max:null, lowerBetter:false, entries:{} });
      save(); renderVitals(); toast('Tracker added ✓');
    }

    /* =====================  RENDER ALL / INIT  ===================== */
    function renderAll(){
      seed();
      renderSleep(); renderWater(); renderRunning(); renderVitals();
    }

    let wired = false;
    function init(){
      const root = $('.board--logs'); if (!root) return;
      renderAll();
      if (wired) return; wired = true;

      root.addEventListener('click', e=>{
        /* ---- sleep ---- */
        if (e.target.closest('[data-sleep-add]')) { if (!$('.sleep-form')) sleepAddForm(); return; }
        if (e.target.closest('[data-sleep-cancel]')) { $('.sleep-form')?.remove(); return; }
        if (e.target.closest('[data-sleep-confirm]')) {
          const f = $('.sleep-form'); if (!f) return;
          const get = (k)=> f.querySelector(`[data-f="${k}"]`)?.value || '';
          const date = get('date') || localDateKey();
          const bed = get('bed'), wake = get('wake');
          let hours = parseFloat(get('hours'));
          const auto = hoursBetween(bed,wake);
          if (!Number.isFinite(hours) || hours<=0) hours = auto;
          if (!Number.isFinite(hours) || hours<=0) { toast('Enter hours, or both bed & wake times'); return; }
          const quality = +get('quality') || 0;
          data.sleep.entries.push({ id:uid(), date, bed, wake, hours: Math.round(hours*100)/100, quality, note:'' });
          save(); f.remove(); renderSleep(); toast('Night logged ✓');
          return;
        }
        const sdel = e.target.closest('[data-sleep-del]');
        if (sdel) { data.sleep.entries = data.sleep.entries.filter(x=>x.id!==sdel.dataset.sleepDel); save(); renderSleep(); return; }

        /* ---- water ---- */
        const wadd = e.target.closest('[data-water-add]');
        if (wadd) {
          const today = localDateKey();
          const amt = +wadd.dataset.waterAdd || 0;
          data.water.days[today] = (data.water.days[today]||0) + amt;
          save(); renderWater(); toast(`+${amt} oz logged`);
          return;
        }
        if (e.target.closest('[data-water-reset]')) {
          delete data.water.days[localDateKey()]; save(); renderWater();
          return;
        }

        /* ---- running ---- */
        if (e.target.closest('[data-run-add]')) { if (!$('.run-form')) runAddForm(); return; }
        if (e.target.closest('[data-run-cancel]')) { $('.run-form')?.remove(); return; }
        if (e.target.closest('[data-run-confirm]')) {
          const f = $('.run-form'); if (!f) return;
          const get = (k)=> f.querySelector(`[data-f="${k}"]`)?.value || '';
          const date = get('date') || localDateKey();
          const miles = parseFloat(get('miles'));
          const timeStr = get('time').trim();
          let secs = 0;
          if (timeStr.includes(':')) { const [m,s] = timeStr.split(':').map(Number); secs = (m||0)*60+(s||0); }
          else secs = Math.round((parseFloat(timeStr)||0)*60);
          if (!Number.isFinite(miles) || miles<=0 || !secs) { toast('Enter distance and time'); return; }
          data.running.entries.push({ id:uid(), date, miles: Math.round(miles*100)/100, secs, route:get('route').trim(), kind:get('kind'), note:'' });
          save(); f.remove(); renderRunning(); toast('Run logged ✓');
          return;
        }
        const rdel = e.target.closest('[data-run-del]');
        if (rdel) { data.running.entries = data.running.entries.filter(x=>x.id!==rdel.dataset.runDel); save(); renderRunning(); return; }

        /* ---- vitals ---- */
        if (e.target.closest('[data-vital-add]')) { addVital(); return; }
        const vdel = e.target.closest('[data-vital-del]');
        if (vdel) {
          const id = vdel.dataset.vitalDel;
          if (confirm('Remove this tracker and its history?')) { data.vitals = data.vitals.filter(v=>v.id!==id); save(); renderVitals(); }
          return;
        }
      });

      root.addEventListener('input', e=>{
        const vi = e.target.closest('[data-vital-val]');
        if (!vi) return;
        const id = vi.dataset.vitalVal;
        const v = data.vitals.find(x=>x.id===id); if (!v) return;
        const today = localDateKey();
        const raw = vi.value;
        if (raw==='') delete v.entries[today];
        else { const n = parseFloat(raw); if (Number.isFinite(n)) v.entries[today]=n; }
        save();
        const card = vi.closest('[data-vital-card]');
        const barsEl = card?.querySelector('.vital-bars');
        if (barsEl) barsEl.innerHTML = vitalBars(v);
      });
    }

    return { init, renderAll };
  })();

  /* ═══════════════════  CLOTHES & ACCESSORIES (haul tracker · closet)  ═══════════════════ */
  const Clothes = (() => {
    const KEY = 'nv.clothes';
    const CNY_USD = 0.147;
    const STATUS_LABEL = {wishlist:'Wishlist', ordered:'Ordered', warehouse:'In Warehouse', shipped:'Shipped', arrived:'Arrived'};
    const MEAS_FIELDS = ['Chest','Shoulders','Sleeve','Waist','Inseam','Wrist'];

    const DEFAULT = () => ({
      cats: [
        {id: uid(), name: 'Shirts'},
        {id: uid(), name: 'Jeans'},
        {id: uid(), name: 'Watches'},
        {id: uid(), name: 'Accessories'},
      ],
      items: [],
      meas: {},          // {chest:{in,cm}, …}
      shipRate: 0,
      pFilter: '',       // '' | high | medium | low
      sFilter: '',       // '' | wishlist | ordered | warehouse | shipped | arrived
      tagFilter: '',
    });

    let st = null;
    const save = () => Store.set(KEY, st);
    const usd  = (it) => num(it.cny) * CNY_USD;
    const fmt$ = (n) => '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const safeUrl = (u) => {
      u = String(u || '').trim();
      if (!u) return '';
      if (/^javascript:/i.test(u)) return '';
      return /^https?:\/\//i.test(u) ? u : 'https://' + u;
    };

    /* ── filtering (priority + status + tag combine) ── */
    const anyFilter = () => !!(st.pFilter || st.sFilter || st.tagFilter);
    function visible() {
      return st.items.filter(it => {
        if (st.pFilter && (it.priority || 'medium') !== st.pFilter) return false;
        if (st.sFilter && it.status !== st.sFilter)                 return false;
        if (st.tagFilter && (it.tag || '') !== st.tagFilter)        return false;
        return true;
      });
    }

    /* ── stats + shipping estimator ── */
    function setStat(sel, text) {
      const el = $(sel);
      if (el.textContent === text) return;
      el.textContent = text;
      el.classList.remove('bump');
      void el.offsetWidth;               // restart the pop animation
      el.classList.add('bump');
    }
    function renderStats() {
      const items = visible();
      const spent  = items.reduce((s, it) => s + usd(it), 0);
      const weight = items.reduce((s, it) => s + num(it.weight), 0);
      const cost   = (weight / 1000) * num(st.shipRate);
      setStat('[data-cl-count]',  String(items.length));
      setStat('[data-cl-spent]',  fmt$(spent));
      setStat('[data-cl-weight]', weight.toLocaleString() + ' g');
      setStat('[data-cl-shipcost]', fmt$(cost));
      $('[data-cl-scope]').textContent = anyFilter() ? 'filtered view' : 'all items';
    }

    /* ── measurements card ── */
    function renderMeas() {
      const wrap = $('[data-cl-meas]');
      wrap.querySelectorAll('.cl-meas__row').forEach(r => r.remove());
      MEAS_FIELDS.forEach(label => {
        const k = label.toLowerCase();
        const m = st.meas[k] || {};
        const row = document.createElement('div');
        row.className = 'cl-meas__row';
        row.innerHTML =
          `<span class="cl-meas__name">${label}</span>` +
          `<input class="input input--sm" type="number" min="0" step="0.1" inputmode="decimal" data-meas-in="${k}" value="${m.in ?? ''}" placeholder="—" aria-label="${label} in inches">` +
          `<input class="input input--sm" type="number" min="0" step="0.1" inputmode="decimal" data-meas-cm="${k}" value="${m.cm ?? ''}" placeholder="—" aria-label="${label} in centimeters">`;
        wrap.appendChild(row);
      });
    }

    /* ── item card ── */
    const PRIO_LABEL = {high: 'HIGH 🔥', medium: 'MEDIUM', low: 'LOW'};
    function itemCard(it, idx) {
      const cpw = it.status === 'arrived'
        ? (it.wears > 0 ? usd(it) / it.wears : usd(it))
        : null;
      const links = [];
      if (it.store) links.push(`<a class="cl-link" href="${esc(safeUrl(it.store))}" target="_blank" rel="noopener noreferrer">Store ↗</a>`);
      if (it.agent) links.push(`<a class="cl-link" href="${esc(safeUrl(it.agent))}" target="_blank" rel="noopener noreferrer">Agent ↗</a>`);
      if (it.status === 'shipped' && it.tracking)
        links.push(`<a class="cl-link cl-link--track" href="https://www.17track.net/en/track?nums=${encodeURIComponent(it.tracking)}" target="_blank" rel="noopener noreferrer">📦 ${esc(it.tracking)}</a>`);

      const prio = it.priority || 'medium';
      return `<article class="cl-item ${prio === 'high' ? 'is-high' : ''}" data-cl-item="${it.id}" style="--i:${(idx || 0) % 12}">
        <div class="cl-item__media">
          ${it.img
            ? `<img src="${esc(it.img.startsWith('data:image/') ? it.img : safeUrl(it.img))}" alt="" loading="lazy">`
            : `<span class="cl-item__noimg" aria-hidden="true">
                 <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 3 5 6 3 10l3 2v9h12v-9l3-2-2-4-4-3-2 2h-2L9 3Z" stroke-linejoin="round"/></svg>
               </span>`}
          <span class="cl-badge cl-badge--${esc(prio)}">${PRIO_LABEL[prio] || prio}</span>
          <span class="cl-status cl-status--${esc(it.status)}">${STATUS_LABEL[it.status] || it.status}</span>
        </div>
        <div class="cl-item__body">
          <p class="cl-item__name">${esc(it.name)}</p>
          <p class="cl-item__price">
            <b>${fmt$(usd(it))}</b>${num(it.cny) ? ` <span>¥${num(it.cny).toLocaleString()}</span>` : ''}
            ${num(it.weight) ? `<span class="cl-item__wt">${num(it.weight).toLocaleString()} g</span>` : ''}
          </p>
          ${it.size ? `<p class="cl-item__meta">${esc(it.size)}</p>` : ''}
          ${it.desc ? `<p class="cl-item__desc">${esc(it.desc)}</p>` : ''}
          ${it.tag  ? `<span class="cl-tag">${esc(it.tag)}</span>` : ''}
          ${links.length ? `<div class="cl-item__links">${links.join('')}</div>` : ''}
          ${it.status === 'arrived' ? `
            <div class="cl-wear">
              <button class="btn btn--ghost btn--sm" data-cl-wear="${it.id}">+1 Log Wear</button>
              <span class="cl-wear__stats">
                <b>${it.wears || 0}</b> worn · CPW <b>${fmt$(cpw)}</b>
              </span>
            </div>` : ''}
        </div>
        <div class="cl-item__actions">
          <button class="icon-btn" data-cl-edit="${it.id}" aria-label="Edit item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 20h9" stroke-linecap="round"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linejoin="round"/></svg>
          </button>
          <button class="icon-btn" data-cl-del="${it.id}" aria-label="Delete item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke-linejoin="round" stroke-linecap="round"/></svg>
          </button>
        </div>
      </article>`;
    }

    /* ── categories grid ── */
    function renderCats() {
      const wrap = $('[data-cl-cats]');
      const vis = visible();
      wrap.innerHTML = st.cats.map(cat => {
        const items = vis.filter(it => it.catId === cat.id);
        return `<article class="card cl-cat" data-cl-cat="${cat.id}">
          <header class="card__head">
            <span class="card__tag">§</span>
            <h3 class="card__title">${esc(cat.name)}</h3>
            <span class="card__count">${items.length}</span>
            <button class="btn btn--ghost btn--sm" data-cl-additem="${cat.id}">+ Add Item</button>
            <button class="icon-btn" data-cl-delcat="${cat.id}" aria-label="Delete section ${esc(cat.name)}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/></svg>
            </button>
          </header>
          ${items.length
            ? `<div class="cl-grid">${items.map((it, i) => itemCard(it, i)).join('')}</div>`
            : `<p class="cl-cat__empty">Nothing here${anyFilter() ? ' under this filter' : ''} — add an item.</p>`}
        </article>`;
      }).join('');
    }

    function renderFilters() {
      $('[data-cl-showall]').classList.toggle('is-active', !anyFilter());
      $$('[data-cl-pfilter]').forEach(b => b.classList.toggle('is-active', b.dataset.clPfilter === st.pFilter));
      $$('[data-cl-sfilter]').forEach(b => b.classList.toggle('is-active', b.dataset.clSfilter === st.sFilter));
      $('[data-cl-banner]').hidden = st.sFilter !== 'warehouse';
      const sel = $('[data-cl-tagfilter]');
      const tags = [...new Set(st.items.map(it => (it.tag || '').trim()).filter(Boolean))].sort();
      const cur = st.tagFilter;
      sel.innerHTML = '<option value="">All haul tags</option>' +
        tags.map(t => `<option value="${esc(t)}" ${t === cur ? 'selected' : ''}>${esc(t)}</option>`).join('');
      if (cur && !tags.includes(cur)) { st.tagFilter = ''; }
    }

    function render() {
      renderFilters();
      renderStats();
      renderCats();
    }

    /* ── modal ── */
    let editingId = null, pendingCatId = null;
    const modal = () => $('#modal-clothes');
    function openModal(catId, item) {
      editingId = item ? item.id : null;
      pendingCatId = catId;
      const f = $('[data-cl-form]');
      f.reset();
      $('[data-cl-modal-title]').textContent = item ? 'Edit Item' : 'Add Item';
      if (item) {
        f.name.value = item.name;   f.cny.value = item.cny ?? '';
        f.weight.value = item.weight ?? ''; f.size.value = item.size || '';
        f.desc.value = item.desc || ''; f.img.value = item.img && !item.img.startsWith('data:image/') ? item.img : '';
        f.store.value = item.store || ''; f.agent.value = item.agent || '';
        f.tag.value = item.tag || ''; f.priority.value = item.priority || 'medium';
        f.status.value = item.status || 'wishlist'; f.tracking.value = item.tracking || '';
      }
      pendingImg = item ? (item.img && item.img.startsWith('data:image/') ? item.img : null) : null;
      $('[data-cl-trackwrap]').hidden = f.status.value !== 'shipped';
      modal().classList.add('is-open');
      modal().setAttribute('aria-hidden', 'false');
      setTimeout(() => f.name.focus(), 60);
    }
    function closeModal() {
      modal().classList.remove('is-open');
      modal().setAttribute('aria-hidden', 'true');
      editingId = pendingCatId = null;
      pendingImg = null;
    }

    /* file upload → compressed dataURL (kept small for localStorage) */
    let pendingImg = null;
    function readFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      const img = new Image();
      img.onload = () => {
        const MAX = 360;
        const k = Math.min(1, MAX / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        pendingImg = c.toDataURL('image/jpeg', 0.72);
        URL.revokeObjectURL(img.src);
        toast('Image attached');
      };
      img.src = URL.createObjectURL(file);
    }

    function submit(e) {
      e.preventDefault();
      const f = e.target;
      const name = f.name.value.trim();
      if (!name) return;
      const urlImg = f.img.value.trim();
      const data = {
        name,
        cny: num(f.cny.value), weight: num(f.weight.value),
        size: f.size.value.trim(), desc: f.desc.value.trim(),
        img: urlImg || pendingImg || '',
        store: f.store.value.trim(), agent: f.agent.value.trim(),
        tag: f.tag.value.trim(),
        priority: f.priority.value, status: f.status.value,
        tracking: f.tracking.value.trim(),
      };
      if (editingId) {
        const it = st.items.find(i => i.id === editingId);
        if (it) Object.assign(it, data);
        toast('Item updated');
      } else {
        st.items.push(Object.assign({id: uid(), catId: pendingCatId, wears: 0}, data));
        toast('Item added');
      }
      save(); closeModal(); render();
    }

    /* ── events (single delegated listener on the panel) ── */
    function wire() {
      const panel = $('[data-tab-panel="clothes"]');

      panel.addEventListener('click', (e) => {
        if (e.target.closest('[data-cl-showall]')) {
          st.pFilter = st.sFilter = st.tagFilter = ''; save(); render(); return;
        }
        const pChip = e.target.closest('[data-cl-pfilter]');
        if (pChip) {   // click again to clear
          st.pFilter = st.pFilter === pChip.dataset.clPfilter ? '' : pChip.dataset.clPfilter;
          save(); render(); return;
        }
        const sChip = e.target.closest('[data-cl-sfilter]');
        if (sChip) {
          st.sFilter = st.sFilter === sChip.dataset.clSfilter ? '' : sChip.dataset.clSfilter;
          save(); render(); return;
        }

        const addCat = e.target.closest('[data-cl-addcat]');
        if (addCat) {
          const name = (prompt('Name for the new section:') || '').trim();
          if (name) { st.cats.push({id: uid(), name}); save(); render(); }
          return;
        }
        const delCat = e.target.closest('[data-cl-delcat]');
        if (delCat) {
          const cat = st.cats.find(c => c.id === delCat.dataset.clDelcat);
          if (!cat) return;
          const n = st.items.filter(i => i.catId === cat.id).length;
          if (!confirm(`Delete section "${cat.name}"${n ? ` and its ${n} item(s)` : ''}?`)) return;
          st.items = st.items.filter(i => i.catId !== cat.id);
          st.cats  = st.cats.filter(c => c.id !== cat.id);
          save(); render(); return;
        }
        const addItem = e.target.closest('[data-cl-additem]');
        if (addItem) { openModal(addItem.dataset.clAdditem, null); return; }

        const edit = e.target.closest('[data-cl-edit]');
        if (edit) {
          const it = st.items.find(i => i.id === edit.dataset.clEdit);
          if (it) openModal(it.catId, it);
          return;
        }
        const del = e.target.closest('[data-cl-del]');
        if (del) {
          const it = st.items.find(i => i.id === del.dataset.clDel);
          if (it && confirm(`Delete "${it.name}"?`)) {
            st.items = st.items.filter(i => i.id !== it.id);
            save(); render();
          }
          return;
        }
        const wear = e.target.closest('[data-cl-wear]');
        if (wear) {
          const it = st.items.find(i => i.id === wear.dataset.clWear);
          if (it) {
            it.wears = (it.wears || 0) + 1;
            const r = wear.getBoundingClientRect();
            window.lifeFX?.burst?.(r.left + r.width / 2, r.top + r.height / 2);
            save(); render();
          }
          return;
        }
      });

      panel.addEventListener('input', (e) => {
        const t = e.target;
        if (t.matches('[data-cl-shiprate]')) { st.shipRate = num(t.value); save(); renderStats(); return; }
        if (t.matches('[data-cl-tagfilter]')) { st.tagFilter = t.value; save(); render(); return; }
        const inKey = t.getAttribute('data-meas-in'), cmKey = t.getAttribute('data-meas-cm');
        if (inKey) {
          const v = num(t.value);
          st.meas[inKey] = {in: t.value === '' ? '' : v, cm: t.value === '' ? '' : Math.round(v * 25.4) / 10};
          const cmEl = panel.querySelector(`[data-meas-cm="${inKey}"]`);
          if (cmEl) cmEl.value = st.meas[inKey].cm;
          save(); return;
        }
        if (cmKey) {
          const v = num(t.value);
          st.meas[cmKey] = {in: t.value === '' ? '' : Math.round(v / 2.54 * 10) / 10, cm: t.value === '' ? '' : v};
          const inEl = panel.querySelector(`[data-meas-in="${cmKey}"]`);
          if (inEl) inEl.value = st.meas[cmKey].in;
          save(); return;
        }
      });

      /* modal wiring */
      const m = modal();
      m.addEventListener('click', (e) => { if (e.target.closest('[data-cl-close]')) closeModal(); });
      $('[data-cl-form]').addEventListener('submit', submit);
      $('[data-cl-status]').addEventListener('change', (e) => {
        $('[data-cl-trackwrap]').hidden = e.target.value !== 'shipped';
      });
      $('[data-cl-file]').addEventListener('change', (e) => readFile(e.target.files[0]));
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && m.classList.contains('is-open')) closeModal();
      });
    }

    /* ── init ── */
    let booted = false;
    function init() {
      if (!booted) {
        booted = true;
        st = Store.get(KEY, null);
        if (!st || !Array.isArray(st.cats)) st = DEFAULT();
        // heal any missing fields from older saves + migrate the old single filter
        st.meas = st.meas || {}; st.items = st.items || [];
        st.pFilter = st.pFilter || ''; st.sFilter = st.sFilter || ''; st.tagFilter = st.tagFilter || '';
        if (st.filter) {
          if (st.filter === 'high') st.pFilter = 'high';
          if (st.filter === 'warehouse' || st.filter === 'arrived') st.sFilter = st.filter;
          delete st.filter;
        }
        save();
        $('[data-cl-shiprate]').value = st.shipRate || '';
        renderMeas();
        wire();
      }
      render();
    }

    return {init};
  })();

  /* ═══════════════════  CHRONO — forever-stopwatches (HH:MM:SS → Day → Week → Year)  ═══════════════════ */
  const Chrono = (() => {
    const watches = [];   // {el, get, set}
    function fmt(ms) {
      const s = Math.max(0, Math.floor(ms / 1000));
      const hh = pad(Math.floor((s % 86400) / 3600));
      const mm = pad(Math.floor((s % 3600) / 60));
      const ss = pad(s % 60);
      const days = Math.floor(s / 86400);
      if (!days) return hh + ':' + mm + ':' + ss;
      const years = Math.floor(days / 365);
      const weeks = Math.floor((days % 365) / 7);
      const d = (days % 365) % 7;
      const parts = [];
      if (years) parts.push('Year ' + years);
      if (weeks) parts.push('Week ' + weeks);
      if (d || (!years && !weeks)) parts.push('Day ' + d);
      parts.push(hh + ':' + mm);
      return parts.join(' · ');
    }
    const elapsed = (w) => (w.acc || 0) + (w.startedAt ? Date.now() - w.startedAt : 0);
    function paint(reg) {
      const w = reg.get() || {};
      reg.el.querySelector('[data-ch-time]').textContent = fmt(elapsed(w));
      const btn = reg.el.querySelector('[data-ch-toggle]');
      btn.textContent = w.startedAt ? 'Pause' : (w.acc ? 'Resume' : 'Start');
      reg.el.classList.toggle('is-running', !!w.startedAt);
    }
    function mount(el, get, set) {
      el.innerHTML =
        '<span class="chrono__time" data-ch-time>00:00:00</span>' +
        '<span class="chrono__ctrl">' +
        '<button class="btn-bracket" data-ch-toggle type="button"><span>[</span>&nbsp;Start&nbsp;<span>]</span></button>' +
        '<button class="btn-bracket" data-ch-reset type="button"><span>[</span>&nbsp;Reset&nbsp;<span>]</span></button></span>';
      const reg = {el, get, set};
      el.querySelector('[data-ch-toggle]').addEventListener('click', () => {
        const w = Object.assign({acc: 0, startedAt: null}, get());
        if (w.startedAt) { w.acc += Date.now() - w.startedAt; w.startedAt = null; }
        else w.startedAt = Date.now();
        set(w); paint(reg);
      });
      el.querySelector('[data-ch-reset]').addEventListener('click', () => {
        if (!confirm('Reset this stopwatch to zero?')) return;
        set({acc: 0, startedAt: null}); paint(reg);
      });
      watches.push(reg);
      paint(reg);
    }
    setInterval(() => {
      if (document.hidden) return;
      watches.forEach(reg => { if (document.body.contains(reg.el)) paint(reg); });
    }, 1000);
    return {mount};
  })();

  /* ── THE CURVE ────────────────────────────────────────────────────────────
     The Peak tab's energy curve, generalised so every tracker that has a run
     of numbers draws the same shape: a smooth spline (not straight segments),
     a gradient that fades out beneath it, a soft glow on the stroke, dotted
     grid lines behind, and a lit dot on the latest reading.

     Call it with any series and it renders in the tab's own accent:
        svgLine([1,4,3,9], width, height)

     Every gradient/filter gets a unique id — two charts on one screen used to
     share the id "lcg" and fight over the same gradient.                    */
  let __curveId = 0;
  function smoothPath(xy) {
    if (xy.length < 3) return xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    let d = 'M' + xy[0][0].toFixed(1) + ' ' + xy[0][1].toFixed(1);
    for (let i = 0; i < xy.length - 1; i++) {
      const p0 = xy[i - 1] || xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' + c2x.toFixed(1) + ' ' + c2y.toFixed(1)
         + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  function svgLine(pts, w = 280, h = 72) {
    if (!pts || pts.length < 2) return '<p class="chart-empty">Log a few days to grow the line.</p>';
    const min = Math.min(...pts), max = Math.max(...pts);
    const span = (max - min) || 1;
    const step = w / (pts.length - 1);
    const xy = pts.map((v, i) => [i * step, h - 8 - ((v - min) / span) * (h - 18)]);
    const path = smoothPath(xy);
    const last = xy[xy.length - 1];
    const up = pts[pts.length - 1] >= pts[0];
    const id = 'cv' + (++__curveId);
    const grid = [0.25, 0.5, 0.75].map(f =>
      `<line class="curve-grid" x1="0" y1="${(h * f).toFixed(1)}" x2="${w}" y2="${(h * f).toFixed(1)}"/>`).join('');
    return `<svg class="linechart curve ${up ? 'is-up' : 'is-down'}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style="stop-color:var(--accent-bright);stop-opacity:.30"/>
          <stop offset="100%" style="stop-color:var(--accent-bright);stop-opacity:0"/>
        </linearGradient>
      </defs>
      ${grid}
      <path d="${path} L${w} ${h} L0 ${h} Z" fill="url(#${id})" stroke="none"/>
      <path class="curve-line" d="${path}" fill="none" stroke="var(--accent-bright)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle class="curve-head" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.6" fill="#fff"/>
    </svg>`;
  }

  /* ═══════════════════  THE TRACKER CHART  ═══════════════════
     The Peak tab's chart, generalised so any tracker gets the same instrument:

       LINE   the smooth curve — the shape of the habit
       BARS   one bar per entry — the individual sessions
       STACK  the running total — everything you have put in so far

     Hover (or drag on touch) to scrub: a vertical rule follows the pointer and
     the readout above shows that entry's value and label.

     Usage — returns HTML, mount it anywhere:
        trackerChart('sleep', series, { unit:'h', caption:'Sleep trend' })
     where series = [{ label:'Mar 3', value:7.5 }, …]

     Mode is remembered per chart id for the session, so switching tabs and
     coming back keeps the view you chose.                                    */
  const ChartModes = new Map();
  const CHART_SERIES = new Map();          // id -> series, so scrubbing can read values

  function trackerChart(id, series, opts = {}) {
    const unit    = opts.unit || '';
    const caption = opts.caption || '';
    const W = 640, H = opts.height || 150, PAD_B = 22, PAD_T = 14;
    const mode = ChartModes.get(id) || opts.mode || 'line';
    CHART_SERIES.set(id, series);

    const modeBar = ['line', 'bars', 'stack'].map(m =>
      `<button class="tc-mode ${m === mode ? 'is-on' : ''}" data-tc-mode="${id}:${m}" type="button">${m}</button>`
    ).join('');

    const head = `<div class="tc-head">
        <div class="tc-headL">
          ${caption ? `<p class="tc-cap">${esc(caption)}</p>` : ''}
          <p class="tc-read" data-tc-read="${id}">${
            series.length ? `<b>${fmtNum(series[series.length-1].value)}</b><span>${esc(unit)}</span><i>${esc(series[series.length-1].label || 'latest')}</i>` : ''
          }</p>
        </div>
        <div class="tc-modes">${modeBar}</div>
      </div>`;

    if (series.length < 2) {
      return `<div class="tc" data-tc="${id}">${head}
        <p class="chart-empty">Log a few entries and the chart draws itself.</p></div>`;
    }

    /* STACK is the cumulative total; LINE and BARS plot the values themselves */
    let vals = series.map(p => Number(p.value) || 0);
    if (mode === 'stack') { let run = 0; vals = vals.map(v => (run += v)); }

    const max = Math.max(...vals), min = Math.min(0, Math.min(...vals));
    const span = (max - min) || 1;
    const stepX = W / (vals.length - 1 || 1);
    const Y = v => (H - PAD_B) - ((v - min) / span) * (H - PAD_B - PAD_T);
    const xy = vals.map((v, i) => [i * stepX, Y(v)]);

    const gid = 'tcg' + (++__curveId);
    const grid = [0.33, 0.66, 1].map(f =>
      `<line class="curve-grid" x1="0" y1="${(PAD_T + (H - PAD_B - PAD_T) * f).toFixed(1)}" x2="${W}" y2="${(PAD_T + (H - PAD_B - PAD_T) * f).toFixed(1)}"/>`
    ).join('');

    let body = '';
    if (mode === 'bars') {
      const bw = Math.max(2, Math.min(26, (W / vals.length) * 0.6));
      body = vals.map((v, i) => {
        const x = (i * stepX) - bw / 2, y = Y(v);
        return `<rect class="tc-bar" x="${Math.max(0, x).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, (H - PAD_B) - y).toFixed(1)}" rx="2"/>`;
      }).join('');
    } else {
      const path = smoothPath(xy);
      body = `<path d="${path} L${W} ${H - PAD_B} L0 ${H - PAD_B} Z" fill="url(#${gid})" stroke="none"/>
              <path class="curve-line" d="${path}" fill="none" stroke="var(--accent-bright)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
              <circle class="curve-head" cx="${xy[xy.length-1][0].toFixed(1)}" cy="${xy[xy.length-1][1].toFixed(1)}" r="3.6" fill="#fff"/>`;
    }

    /* first / middle / last labels only — a full axis turns to mush at width */
    const axis = [0, Math.floor((series.length - 1) / 2), series.length - 1]
      .filter((v, i, a) => a.indexOf(v) === i)
      .map(i => `<text class="tc-x" x="${Math.min(W - 2, Math.max(2, i * stepX)).toFixed(1)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}">${esc(series[i].label || '')}</text>`)
      .join('');

    return `<div class="tc" data-tc="${id}" data-tc-unit="${esc(unit)}">
      ${head}
      <div class="tc-plot" data-tc-plot="${id}">
        <svg class="tc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style="stop-color:var(--accent-bright);stop-opacity:.30"/>
            <stop offset="100%" style="stop-color:var(--accent-bright);stop-opacity:0"/>
          </linearGradient></defs>
          ${grid}${body}${axis}
          <line class="tc-scrub" data-tc-scrub="${id}" x1="0" y1="${PAD_T}" x2="0" y2="${H - PAD_B}" style="opacity:0"/>
        </svg>
      </div>
    </div>`;
  }
  const fmtNum = (n) => {
    const v = Number(n) || 0;
    return (Math.abs(v) >= 100 || Number.isInteger(v)) ? Math.round(v).toLocaleString() : (Math.round(v * 10) / 10).toString();
  };

  /* one delegated listener drives every chart on the page, so charts keep
     working after any tab re-renders its markup */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tc-mode]'); if (!b) return;
    const [id, m] = b.dataset.tcMode.split(':');
    ChartModes.set(id, m);
    /* re-render whichever module owns this chart. Logs owns sleep/water/runs;
       add a line here when a new tab starts using trackerChart. */
    if (['sleep','water','runs'].includes(id) && typeof Logs !== 'undefined' && Logs.renderAll) Logs.renderAll();
    else if (id.startsWith('sport-') && typeof Sports !== 'undefined' && Sports.render) Sports.render();
  });
  document.addEventListener('pointermove', (e) => {
    const plot = e.target.closest('[data-tc-plot]'); if (!plot) return;
    const id = plot.dataset.tcPlot;
    const series = CHART_SERIES.get(id); if (!series || series.length < 2) return;
    const r = plot.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const i = Math.round(f * (series.length - 1));
    const wrap = plot.closest('.tc');
    const read = wrap && wrap.querySelector('[data-tc-read]');
    const unit = (wrap && wrap.dataset.tcUnit) || '';
    if (read) read.innerHTML = `<b>${fmtNum(series[i].value)}</b><span>${esc(unit)}</span><i>${esc(series[i].label || '')}</i>`;
    const scrub = plot.querySelector('[data-tc-scrub]');
    if (scrub) { const x = (i / (series.length - 1)) * 640; scrub.setAttribute('x1', x); scrub.setAttribute('x2', x); scrub.style.opacity = '1'; }
  }, { passive: true });
  document.addEventListener('pointerleave', (e) => {
    const plot = e.target.closest && e.target.closest('[data-tc-plot]'); if (!plot) return;
    const scrub = plot.querySelector('[data-tc-scrub]'); if (scrub) scrub.style.opacity = '0';
  }, true);

  /* ═══════════════════  SPORTS — 6-month plans · logs · charts · stopwatches  ═══════════════════ */
  const Sports = (() => {
    const KEY = 'nv.sports';
    const PLANS = {
      climbing: {
        name: 'Rock Climbing', metrics: [{k: 'grade', l: 'Top grade', u: 'V'}, {k: 'mins', l: 'Session', u: 'min'}],
        plan: [
          {t: 'Movement & Footwork', w: ['Climb 2–3×/wk, easy grades — silent feet drill every warm-up', 'Straight-arm climbing: hang on the skeleton, not the biceps', 'Flag/drop-knee drills on 10 easy problems per session', 'TEST: max flash grade + 10 problems in a session — record it']},
          {t: 'Volume Base', w: ['3 sessions — 20+ problems each, 2 grades under max', 'Traverse endurance: 10 min continuous climbing ×2', 'Down-climb everything you send this week', 'Deload · 1 easy session + antagonist push-ups/band work']},
          {t: 'Technique Under Fatigue', w: ['4×4s: 4 problems back-to-back, 4 rounds, rest 4 min', 'Overhang week — hips to the wall, toe hooks', 'Slab week — trust the rubber, no hands where possible', 'TEST: repeat Month 1 flash test — should be +1 grade']},
          {t: 'Strength Intro', w: ['Hangboard 2×/wk (open hand, 7:3 repeaters) — ONLY if elbows healthy', 'Limit bouldering: 5 max attempts on a project grade', 'Core: front lever progressions + toes-to-bar 3×/wk', 'Deload · easy mileage + mobility for hips/shoulders']},
          {t: 'Power & Projects', w: ['Campus/dyno session 1×/wk — explosive, full rest', 'Project week: pick 2 problems at max+1, work the beta', 'Repeat 4×4s — compare pump vs Month 3', 'Deload · technique games, no grades']},
          {t: 'Send Season', w: ['Project burns: 3 quality attempts/session, film them', 'Volume day + project day alternating', 'Mini-taper: half volume, keep intensity', 'TEST WEEK: max grade attempt — compare Month 1']},
        ],
      },
      soccer: {
        name: 'Soccer', metrics: [{k: 'touches', l: 'Touches', u: 'min'}, {k: 'juggles', l: 'Juggle PR', u: ''}],
        plan: [
          {t: 'First Touch & Control', w: ['15 min daily wall passes — both feet, 2-touch', 'Juggling ladder: set a baseline PR, beat it 3×', 'Cone dribbling 10 min/day — inside/outside/sole', 'TEST: juggle PR + 20 wall passes without miss']},
          {t: 'Ball Mastery', w: ['La Croqueta + body feints — 20 reps each side daily', '1v1 moves: pick 3, drill to instinct', 'Weak foot only week — passing, shooting, dribbling', 'Deload · free play / futsal touch']},
          {t: 'Passing & Vision', w: ['Driven + lofted passes 30/day against wall or partner', 'Rondo or small-sided games 2×/wk', 'Scan habit: look over shoulder before every touch', 'TEST: repeat Month 1 tests — compare']},
          {t: 'Shooting & Finishing', w: ['50 shots/wk — placement over power, both feet', 'First-time finishes from cutbacks', 'Volleys + half-volleys session', 'Deload · juggling + wall work only']},
          {t: 'Speed & Engine', w: ['Sprints: 6×30 m + 4×60 m, full recovery, 2×/wk', 'Change-of-direction ladder + 5-10-5 drill', 'Interval runs: 8×1 min hard / 1 min easy', 'Deload · technical maintenance']},
          {t: 'Game Sharpness', w: ['Pickup/organized games 2–3×/wk — one focus per game', 'Film yourself once — count giveaways', 'Set-piece week: corners, free kicks, PKs', 'TEST WEEK: all benchmarks + honest self-review']},
        ],
      },
      basketball: {
        name: 'Basketball', metrics: [{k: 'mins', l: 'Practice', u: 'min'}, {k: 'makes', l: 'Makes /100', u: ''}],
        plan: [
          {t: 'Foundations & Handle', w: ['Daily 15-min dribble routine — 2-ball + cones', 'Form shooting: 100 close-range makes/day', 'Layup package: 50 each hand, both sides', 'TEST: 50 free throws — record your %']},
          {t: 'Shooting Mechanics', w: ['Catch-&-shoot 150/day, mid-range', 'Off-the-dribble pull-ups 100/day', '3PT from both corners, 100/day', 'Deload + repeat the FT test']},
          {t: 'Game Moves', w: ['Triple-threat + explosive first step drills', 'Pick-&-roll reads — 30 min film/week', 'Live 1v1 reps, 3 sessions', 'BENCHMARK: chart your shooting % vs Month 1']},
          {t: 'Athleticism', w: ['Plyometrics 2×/wk + core circuit', 'Lateral quickness — ladder + slides', 'Vertical work + finishing through contact', 'Deload · light skill maintenance']},
          {t: 'Live Play', w: ['Pickup 3×/wk — count turnovers & assists', 'Scrimmage focus: defensive stance every play', 'Conditioning: 17s under 66 seconds', 'Deload + FT test again']},
          {t: 'Polish & Prove', w: ['Weakness week — attack your worst stat', 'Full workout circuit 5×/wk', 'Filmed games / mini-tournament', 'TEST WEEK: repeat every Month 1 benchmark']},
        ],
      },
      swimming: {
        name: 'Swimming', metrics: [{k: 'laps', l: 'Laps', u: ''}, {k: 'time100', l: '100m time', u: 's'}],
        plan: [
          {t: 'Water Comfort & Breath', w: ['2–3 swims — bilateral breathing every 3 strokes', 'Kickboard sets: 8×25 m, streamline focus', 'Exhale-underwater drills — never hold your breath', 'TEST: 100 m freestyle timed, easy effort']},
          {t: 'Freestyle Technique', w: ['Catch-up drill + fingertip drag, 6×50 m each', 'High-elbow catch: single-arm freestyle 8×25 m', 'Body rotation: 6-kick switch drill', 'Deload · easy 20-min continuous swim']},
          {t: 'Endurance Base', w: ['Ladder: 4×100 m with 20 s rest', 'Continuous 400 m — even pace', 'Pull buoy sets for catch strength 6×50 m', 'TEST: 100 m timed — compare Month 1']},
          {t: 'Other Strokes', w: ['Backstroke week — 50% of volume', 'Breaststroke timing: kick-glide-pull', 'IM order intro: 4×100 m one stroke each', 'Deload · choice swim + flip-turn practice']},
          {t: 'Speed Work', w: ['8×25 m sprint, full rest — count strokes', '4×50 m descend (each faster)', 'Broken 100s: 4×(4×25 m) at target pace', 'Deload · drills + easy aerobic']},
          {t: 'Test Distance', w: ['Race-pace 100s: 5×100 m at goal', 'Open turns + streamlines under fatigue', 'Mini-taper — half volume, sharp 25s', 'TEST WEEK: 100 m + 400 m all-out — compare every benchmark']},
        ],
      },
      mma: {
        name: 'MMA', metrics: [{k: 'rounds', l: 'Rounds', u: ''}, {k: 'mins', l: 'Training', u: 'min'}],
        plan: [
          {t: 'Stance & Fundamentals', w: ['Stance + footwork 15 min/day — mirror work', 'Jab-cross mechanics: 200 quality reps/day', 'Sprawl + level-change drill 3×/wk', 'TEST: 3×3 min shadowbox rounds — film it']},
          {t: 'Striking Base', w: ['Add hooks + elbows — combos off the jab', 'Kicks: teep + low kick technique, 50/side/day', 'Heavy bag 3 rounds, focus on form not power', 'Deload · shadowbox + mobility (hips!)']},
          {t: 'Grappling Base', w: ['Takedown entries: double/single, 20 reps/day', 'Guard fundamentals: shrimp, bridge, stand-up in base', 'Positional escapes — mount + side control', 'TEST: film 3 rounds — compare Month 1 footage']},
          {t: 'Defense & Head Movement', w: ['Slip-roll-pivot patterns 10 min/day', 'Check kicks + catch-counter drills', 'Wall wrestling / cage work basics', 'Deload · light technique + neck work']},
          {t: 'Live Rounds', w: ['Light sparring 2×/wk IF coached — control ego', 'Grappling rounds 3×/wk — survive, then attack', 'Conditioning: 5×3 min bag rounds, 1 min rest', 'Deload · drill your best weapons only']},
          {t: 'Fight Simulation', w: ['MMA rounds: strike→shot→ground flow', 'Weakness camp — attack your worst area', 'Hard conditioning week: assault bike + rounds', 'TEST WEEK: 5×5 min sim rounds + film review']},
        ],
      },
    };

    let st = null;
    const save = () => Store.set(KEY, st);
    const active = () => st.sports.find(s => s.id === st.activeId) || st.sports[0];
    const SCORE = {full: 2, partial: 1, miss: -1};

    function seed() {
      const mk = (key) => ({id: uid(), name: PLANS[key].name, tpl: key,
                            startDate: localDateKey(), logs: [], watch: {acc: 0, startedAt: null}});
      return {sports: ['climbing', 'soccer', 'basketball', 'swimming', 'mma'].map(mk), activeId: null};
    }

    function weekPos(s) {
      const [y, m, d] = s.startDate.split('-').map(Number);
      const days = Math.max(0, Math.floor((Date.now() - new Date(y, m - 1, d)) / 86400000));
      const week = Math.min(23, Math.floor(days / 7));
      return {month: Math.floor(week / 4) + 1, week: (week % 4) + 1, weekAbs: week + 1};
    }

    function render() {
      const tabs = $('[data-sp-tabs]');
      tabs.innerHTML = st.sports.map(s =>
        `<button class="cl-chip ${s.id === active().id ? 'is-active' : ''}" data-sp-pick="${s.id}">${esc(s.name)}</button>`).join('') +
        `<button class="cl-chip" data-sp-add>+ Add Sport</button>`;

      const s = active(); if (!s) return;
      const tpl = PLANS[s.tpl] || PLANS.climbing;
      const pos = weekPos(s);
      const today = localDateKey();
      const todayLog = s.logs.find(l => l.date === today);
      let acc = 0;
      const pts = s.logs.slice(-42).map(l => (acc += (SCORE[l.completed] ?? 0)));

      $('[data-sp-body]').innerHTML = `
        <article class="card sp-card--now reveal" style="--d:.02s">
          <header class="card__head"><span class="card__tag">I.</span><h3 class="card__title">Where You Stand</h3>
            <span class="card__count">Month ${pos.month} · Week ${pos.week}</span></header>
          <p class="sp-now__theme">${esc(tpl.plan[pos.month - 1].t)}</p>
          <p class="sp-now__focus">${esc(tpl.plan[pos.month - 1].w[pos.week - 1])}</p>
        </article>

        <article class="card sp-card--watch reveal" style="--d:.05s">
          <header class="card__head"><span class="card__tag">II.</span><h3 class="card__title">${esc(s.name)} Clock</h3></header>
          <div class="chrono" data-sp-watch></div>
          <p class="sp-hint">Runs for days, weeks, months — it keeps counting until you reset it.</p>
        </article>

        <article class="card sp-card--log reveal" style="--d:.08s">
          <header class="card__head"><span class="card__tag">III.</span><h3 class="card__title">Log Today</h3>
            ${todayLog ? '<span class="card__count">logged ✓</span>' : ''}</header>
          <div class="sp-log">
            <div class="sp-log__row">
              <button class="cl-chip ${todayLog?.completed === 'full' ? 'is-active' : ''}" data-sp-done="full">Did the work</button>
              <button class="cl-chip ${todayLog?.completed === 'partial' ? 'is-active' : ''}" data-sp-done="partial">Partial</button>
              <button class="cl-chip ${todayLog?.completed === 'miss' ? 'is-active' : ''}" data-sp-done="miss">Missed</button>
            </div>
            <div class="sp-log__metrics">
              ${tpl.metrics.map(m => `<label class="sp-metric"><span>${esc(m.l)}${m.u ? ' (' + m.u + ')' : ''}</span>
                <input class="input input--sm" type="number" step="0.1" min="0" inputmode="decimal"
                  data-sp-metric="${m.k}" value="${todayLog?.metrics?.[m.k] ?? ''}" placeholder="—"></label>`).join('')}
            </div>
          </div>
        </article>

        <article class="card sp-card--chart reveal" style="--d:.11s">
          <header class="card__head"><span class="card__tag">IV.</span><h3 class="card__title">Progress</h3>
            <span class="card__count">${s.logs.length} days logged</span></header>
          ${trackerChart('sport-' + s.id,
              s.logs.slice(-42).map((l, i) => ({ label: fmtDate(l.date), value: pts[i] })),
              { unit: 'pts', caption: 'Consistency score' })}
          <p class="sp-hint">Every "did the work" pushes the line up (+2), partial +1, missed −1. Protect the climb.</p>
        </article>

        <article class="card sp-card--plan reveal" style="--d:.14s">
          <header class="card__head"><span class="card__tag">V.</span><h3 class="card__title">6-Month Plan</h3>
            <button class="icon-btn" data-sp-delsport aria-label="Remove this sport">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/></svg>
            </button></header>
          <div class="sp-plan">
            ${tpl.plan.map((mo, mi) => `
              <details class="sp-month ${mi + 1 === pos.month ? 'is-now' : ''}" ${mi + 1 === pos.month ? 'open' : ''}>
                <summary><b>Month ${mi + 1}</b> — ${esc(mo.t)}${mi + 1 === pos.month ? ' <span class="sp-nowtag">NOW</span>' : ''}</summary>
                <ol class="sp-weeks">
                  ${mo.w.map((wk, wi) => `<li class="${mi + 1 === pos.month && wi + 1 === pos.week ? 'is-now' : ''}">
                    <span class="sp-wk">W${wi + 1}</span> ${esc(wk)}</li>`).join('')}
                </ol>
              </details>`).join('')}
          </div>
        </article>`;

      Chrono.mount($('[data-sp-watch]'), () => active().watch,
        (w) => { active().watch = w; save(); });
    }

    function logToday(patch) {
      const s = active();
      const today = localDateKey();
      let log = s.logs.find(l => l.date === today);
      if (!log) { log = {date: today, completed: null, metrics: {}}; s.logs.push(log); }
      Object.assign(log, patch);
      s.logs.sort((a, b) => a.date < b.date ? -1 : 1);
      save();
    }

    let booted = false;
    function wire() {
      const panel = $('[data-tab-panel="sports"]');
      panel.addEventListener('click', (e) => {
        const pick = e.target.closest('[data-sp-pick]');
        if (pick) { st.activeId = pick.dataset.spPick; save(); render(); return; }
        if (e.target.closest('[data-sp-add]')) {
          const name = (prompt('Sport name? (I will attach a general athletic plan — tell Claude the sport and he will write a real 6-month plan for it.)') || '').trim();
          if (!name) return;
          st.sports.push({id: uid(), name, tpl: 'climbing', startDate: localDateKey(), logs: [], watch: {acc: 0, startedAt: null}});
          st.activeId = st.sports[st.sports.length - 1].id;
          save(); render(); return;
        }
        if (e.target.closest('[data-sp-delsport]')) {
          const s = active();
          if (st.sports.length <= 1) { toast('Keep at least one sport.'); return; }
          if (!confirm(`Remove ${s.name} and its logs?`)) return;
          st.sports = st.sports.filter(x => x.id !== s.id);
          st.activeId = st.sports[0].id;
          save(); render(); return;
        }
        const done = e.target.closest('[data-sp-done]');
        if (done) {
          logToday({completed: done.dataset.spDone});
          const r = done.getBoundingClientRect();
          if (done.dataset.spDone === 'full') window.lifeFX?.burst?.(r.left + r.width / 2, r.top + r.height / 2);
          render(); return;
        }
      });
      panel.addEventListener('input', (e) => {
        const m = e.target.getAttribute('data-sp-metric');
        if (!m) return;
        const s = active();
        const today = localDateKey();
        let log = s.logs.find(l => l.date === today);
        if (!log) { log = {date: today, completed: null, metrics: {}}; s.logs.push(log); }
        log.metrics = log.metrics || {};
        log.metrics[m] = e.target.value === '' ? '' : num(e.target.value);
        save();
      });
    }

    function init() {
      if (!booted) {
        booted = true;
        st = Store.get(KEY, null);
        if (!st || !Array.isArray(st.sports) || !st.sports.length) st = seed();
        if (!st.activeId) st.activeId = st.sports[0].id;
        save();
        wire();
      }
      render();
    }
    /* render is exposed so the chart's mode toggle can redraw this tab */
    return {init, render};
  })();

  /* ═══════════════════  CALENDAR — years ahead · crosses · auto to-dos · progress drawer  ═══════════════════ */
  const Cal = (() => {
    const KEY = 'nv.cal';
    const DAY_PREFIX = 'nv.day.';
    const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let st = null, view = null, selected = null;
    const save = () => Store.set(KEY, st);
    const dk = (d) => localDateKey(d);
    const getDayRec = (ds) => Store.get(DAY_PREFIX + ds, []);
    const setDayRec = (ds, goals) => { Store.set(DAY_PREFIX + ds, goals); window.dispatchEvent(new CustomEvent('nv-day-changed')); };

    /* Auto-plan rules start EMPTY on purpose — the layout ships first;
       the user's real goals get wired in (with exact times) during a
       dedicated planning session. The engine below is ready and waiting. */
    function seedRules() { return []; }
    function ruleHits(rule, date) {
      const wd = date.getDay();
      switch (rule.freq) {
        case 'daily':    return true;
        case 'weekdays': return wd >= 1 && wd <= 5;
        case 'weekend':  return wd === 0 || wd === 6;
        case 'sat':      return wd === 6;
        case 'sun':      return wd === 0;
        default:         return false;
      }
    }
    /* write matching auto-rules into a day's to-do record (today/future only) */
    function materialize(ds) {
      const today = dk(new Date());
      if (ds < today) return;
      const [y, m, d] = ds.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const goals = getDayRec(ds);
      let dirty = false;
      st.rules.filter(r => r.active && ruleHits(r, date)).forEach(r => {
        if (!goals.some(g => g.text === r.text)) { goals.push({text: r.text, done: false, auto: true}); dirty = true; }
      });
      if (dirty) setDayRec(ds, goals);
    }

    /* ══════════════════  CAPACITY  ══════════════════
       The number that makes twenty goals plannable. A plan you cannot fit is
       not a plan, and you only find that out by measuring — so every view
       below is built on these two functions.

       Untimed items still cost you something; counting them as zero would let
       an inbox of thirty tasks read as a free day. Fifteen minutes each is a
       deliberate under-estimate — enough to register, not enough to panic. */
    const UNTIMED_MIN = 15;
    const DEFAULT_AVAIL = [4, 3, 3, 3, 3, 3, 5];   // Sun…Sat, hours you can actually spend

    function availFor(date) {
      const a = (st && st.avail) || DEFAULT_AVAIL;
      const h = a[date.getDay()];
      return typeof h === 'number' ? h : DEFAULT_AVAIL[date.getDay()];
    }

    /* minutes committed on a date, and how that sits against the day's ceiling */
    function loadFor(ds) {
      const goals = getDayRec(ds);
      let mins = 0;
      goals.forEach(g => {
        if (g.at && g.end)      mins += Math.max(0, minutesOf(g.end) - minutesOf(g.at));
        else if (g.at)          mins += 30;
        else                    mins += UNTIMED_MIN;
      });
      const [y, m, d] = ds.split('-').map(Number);
      const capMin = availFor(new Date(y, m - 1, d)) * 60;
      return {
        mins, capMin,
        pct: capMin ? Math.round(mins / capMin * 100) : 0,
        done: goals.filter(g => g.done).length,
        total: goals.length,
        over: capMin > 0 && mins > capMin,
      };
    }

    const hrs = (m) => {
      if (!m) return '0h';
      const h = Math.floor(m / 60), r = Math.round(m % 60);
      return h ? h + 'h' + (r ? ' ' + r + 'm' : '') : r + 'm';
    };
    /* Monday-start week containing a date — planning weeks begin on Monday
       even where the month grid starts on Sunday */
    function weekStart(d) {
      const x = new Date(d); const wd = (x.getDay() + 6) % 7;
      x.setDate(x.getDate() - wd); x.setHours(0, 0, 0, 0); return x;
    }

    /* cross state for a day: 'white' (all done), 'red' (incomplete + past), null */
    function crossFor(ds, today) {
      const goals = getDayRec(ds);
      if (!goals.length) return null;
      const allDone = goals.every(g => g.done);
      if (allDone) return 'white';
      return ds < today ? 'red' : null;
    }

    /* ══════════════════  THE LOAD METER  ══════════════════
       This week's committed hours against the hours that exist. Watching this
       fill while a plan is placed is how you learn it does not fit BEFORE you
       agree to it, rather than in March. */
    function renderLoad() {
      const host = $('[data-cal-load]'); if (!host) return;
      const v = panelView();
      const base = view || new Date();

      /* The meter measures whatever you are LOOKING at. A week meter sitting
         above a month grid answers a question nobody asked. */
      let from, days, label;
      if (v === 'month') {
        from = new Date(base.getFullYear(), base.getMonth(), 1);
        days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
        label = base.toLocaleDateString('en-US', { month: 'long' });
      } else if (v === 'year') {
        from = new Date(base.getFullYear(), 0, 1);
        days = ((base.getFullYear() % 4 === 0 && base.getFullYear() % 100 !== 0) || base.getFullYear() % 400 === 0) ? 366 : 365;
        label = String(base.getFullYear());
      } else {
        from = weekStart(base); days = 7; label = 'this week';
      }

      let mins = 0, capMin = 0, worst = null;
      for (let i = 0; i < days; i++) {
        const d = new Date(from); d.setDate(from.getDate() + i);
        const L = loadFor(dk(d));
        mins += L.mins; capMin += L.capMin;
        /* naming the worst day is only useful at week scale — across a year it
           is noise, and the day name alone would not even identify it */
        if (v === 'week' && L.over && (!worst || L.pct > worst.pct)) worst = { pct: L.pct, name: WD[d.getDay()] };
      }
      const pct = capMin ? Math.round(mins / capMin * 100) : 0;
      const band = pct > 100 ? 'is-over' : pct > 85 ? 'is-tight' : '';

      host.innerHTML =
        `<div class="cal-load__head">
           <span class="cal-load__kick">✦ ${esc(label)}</span>
           <button class="cal-load__edit" data-cal-avail type="button">${hrs(capMin)} available · edit</button>
         </div>
         <div class="cal-load__row">
           <b class="cal-load__val">${hrs(mins)}</b>
           <span class="cal-load__of">committed · ${pct}%</span>
         </div>
         <div class="cal-load__bar ${band}"><i style="width:${Math.min(100, pct)}%"></i>${
           pct > 100 ? `<u style="left:100%"></u>` : ''}</div>
         ${worst ? `<p class="cal-load__warn">${worst.name} is at ${worst.pct}% — something has to move.</p>` : ''}`;
    }

    /* ══════════════════  THE WEEK  ══════════════════
       Seven rows, not seven columns: a phone cannot render a true hour grid
       across seven columns and stay legible, and this is planned on a phone.
       Each row carries the day's blocks in true time position plus its load,
       so a week that does not fit announces itself at a glance. */
    function renderWeek() {
      const host = $('[data-cal-week]'); if (!host) return;
      const ws = weekStart(view || new Date());
      const today = dk(new Date());
      const DAY_START = 5 * 60, DAY_END = 24 * 60, SPAN = DAY_END - DAY_START;

      const rows = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws); d.setDate(ws.getDate() + i);
        const ds = dk(d);
        const L = loadFor(ds);
        const goals = getDayRec(ds);

        const marks = goals.filter(g => g.at).map(g => {
          const s = Math.max(DAY_START, minutesOf(g.at));
          const e = Math.min(DAY_END, g.end ? minutesOf(g.end) : s + 30);
          const left = ((s - DAY_START) / SPAN) * 100;
          const w = Math.max(1.6, ((e - s) / SPAN) * 100);
          return `<i class="cal-wk__block ${g.done ? 'is-done' : ''}" style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%"
                     title="${esc(g.text)} · ${fmtAt(g.at)}"></i>`;
        }).join('');

        const nowMark = ds === today
          ? (() => { const n = new Date(); const m = n.getHours() * 60 + n.getMinutes();
              if (m < DAY_START || m > DAY_END) return '';
              return `<i class="cal-wk__now" style="left:${(((m - DAY_START) / SPAN) * 100).toFixed(2)}%"></i>`; })()
          : '';

        return `<button class="cal-wk ${ds === today ? 'is-today' : ''} ${L.over ? 'is-over' : ''}"
                        data-cal-openday="${ds}" type="button" style="animation-delay:${i * 45}ms">
          <span class="cal-wk__day"><b>${WD[d.getDay()]}</b><i>${d.getDate()}</i></span>
          <span class="cal-wk__track">${marks}${nowMark}</span>
          <span class="cal-wk__load">
            <b>${L.total ? hrs(L.mins) : '—'}</b>
            <span class="cal-wk__bar"><i style="width:${Math.min(100, L.pct)}%"></i></span>
          </span>
        </button>`;
      }).join('');

      const end = new Date(ws); end.setDate(ws.getDate() + 6);
      host.innerHTML =
        `<div class="eyebrow"><span class="eyebrow__num">01</span>
           <span class="eyebrow__lbl">${ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
           <span class="eyebrow__rule"></span></div>
         <div class="cal-wk__scale"><span>5a</span><span>9a</span><span>12p</span><span>3p</span><span>6p</span><span>9p</span><span>12a</span></div>
         ${rows}`;
    }

    /* ══════════════════  THE YEAR  ══════════════════
       Consistency, at the only scale where consistency is visible. Cells
       cascade in on entry — twenty seconds of work that makes a year of
       kept promises feel earned. */
    function renderYear() {
      const host = $('[data-cal-year]'); if (!host) return;
      const today = dk(new Date());
      const y = (view || new Date()).getFullYear();
      const first = new Date(y, 0, 1);
      const start = weekStart(first);
      const cells = [];
      let streak = 0, best = 0, run = 0, kept = 0;

      for (let w = 0; w < 53; w++) {
        for (let dow = 0; dow < 7; dow++) {
          const d = new Date(start); d.setDate(start.getDate() + w * 7 + dow);
          if (d.getFullYear() !== y) { cells.push({ blank: true, w, dow }); continue; }
          const ds = dk(d);
          const g = getDayRec(ds);
          const lvl = !g.length ? 0
            : g.every(x => x.done) ? 3
            : g.filter(x => x.done).length / g.length >= 0.5 ? 2 : 1;
          if (lvl === 3) kept++;
          /* a streak survives days with nothing planned; it breaks on a day
             you planned something and did not do it */
          if (ds <= today) {
            if (lvl === 3) { run++; best = Math.max(best, run); }
            else if (g.length) run = 0;
          }
          cells.push({ ds, lvl, w, dow, future: ds > today });
        }
      }
      streak = run;

      const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      host.innerHTML =
        `<div class="eyebrow"><span class="eyebrow__num">02</span>
           <span class="eyebrow__lbl">${y} · every day you kept</span><span class="eyebrow__rule"></span></div>
         <div class="cal-yr__stats">
           <span><b>${kept}</b><i>days kept</i></span>
           <span><b>${streak}</b><i>current streak</i></span>
           <span><b>${best}</b><i>longest</i></span>
         </div>
         <div class="cal-yr__scroll"><div class="cal-yr__grid">${
           cells.map((c, i) => c.blank
             ? `<i class="cal-yr__c is-blank" style="grid-column:${c.w + 1};grid-row:${c.dow + 1}"></i>`
             : `<i class="cal-yr__c l${c.lvl} ${c.future ? 'is-future' : ''} ${c.ds === today ? 'is-today' : ''}"
                    style="grid-column:${c.w + 1};grid-row:${c.dow + 1};animation-delay:${Math.min(900, i * 1.1).toFixed(0)}ms"
                    data-cal-openday="${c.ds}" title="${c.ds}"></i>`).join('')
         }</div><div class="cal-yr__months">${
           MON.map(m => `<span>${m}</span>`).join('')
         }</div></div>
         <p class="cal-yr__key"><span>less</span><i class="cal-yr__c l0"></i><i class="cal-yr__c l1"></i><i class="cal-yr__c l2"></i><i class="cal-yr__c l3"></i><span>more</span></p>`;
    }

    /* which of the three panel views is showing */
    function panelView() { return (st && st.panelView) || 'week'; }
    function setPanelView(v) {
      st.panelView = v; save();
      ['week','month','year'].forEach(k => {
        const el = $(k === 'month' ? '[data-cal-grid]' : '[data-cal-' + k + ']');
        if (el) el.hidden = (k !== v);
      });
      $$('[data-cal-view]').forEach(b => b.classList.toggle('is-active', b.dataset.calView === v));
      const leg = $('[data-cal-legend]'); if (leg) leg.hidden = (v !== 'month');
      if (v === 'week') renderWeek();
      if (v === 'year') renderYear();
      if (v === 'month') renderMonth();
      renderLoad();          // the meter measures whatever view is showing
      /* renderMonth owns the title; the other two set their own */
      const t = $('[data-cal-title]');
      if (t && v === 'week') {
        const ws = weekStart(view || new Date()), we = new Date(ws); we.setDate(ws.getDate() + 6);
        t.textContent = 'Week of ' + ws.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      } else if (t && v === 'year') {
        t.textContent = String((view || new Date()).getFullYear());
      }
    }

    function renderMonth() {
      const y = view.getFullYear(), mo = view.getMonth();
      $('[data-cal-title]').textContent = view.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
      const first = new Date(y, mo, 1);
      const days = new Date(y, mo + 1, 0).getDate();
      const today = dk(new Date());
      let html = WD.map(w => `<span class="cal-wd">${w.slice(0, 1)}</span>`).join('');
      for (let i = 0; i < first.getDay(); i++) html += '<span class="cal-cell is-void"></span>';
      for (let d = 1; d <= days; d++) {
        const ds = `${y}-${pad(mo + 1)}-${pad(d)}`;
        const cross = crossFor(ds, today);
        const nGoals = Math.min(3, getDayRec(ds).length);
        html += `<button class="cal-cell ${ds === today ? 'is-today' : ''} ${ds === selected ? 'is-selected' : ''}" data-cal-day="${ds}">
          <span class="cal-cell__n">${d}</span>
          <span class="cal-dots" aria-hidden="true">${'<i></i>'.repeat(nGoals)}</span>
          ${cross ? `<span class="cal-cross cal-cross--${cross}" aria-label="${cross === 'white' ? 'day completed' : 'day incomplete'}">✝</span>` : ''}
        </button>`;
      }
      $('[data-cal-grid]').innerHTML = html;
    }

    /* ── Command Center day timeline: minute-precise canvas, 5 AM → 5 AM.
         Mouse-wheel zooms (anchored at the cursor); gridlines are CSS
         gradients so 1-minute precision costs zero DOM; blocks position
         absolutely by minute; snapping tightens as you zoom in. ── */
    const SLOT_START = 5;                        // day starts 5 AM
    const DAY_MIN = 24 * 60;
    let pxPerMin = 1, cvScroll = null;           // zoom state + scroll restore
    let vmode = 'flow';                          // 'flow' = Structured-style plan · 'zoom' = precision timeline
    const hourLabel = (h) => { const hh = h % 24; const t = hh % 12 || 12; return t + (hh < 12 ? ' AM' : ' PM'); };
    const fmtAt = (at) => { if (!at) return ''; let [h, m] = at.split(':').map(Number); const t = h % 12 || 12; return t + ':' + pad(m) + (h < 12 ? ' AM' : ' PM'); };
    const minutesOf = (at) => { let [h, m] = at.split(':').map(Number); if (h < SLOT_START) h += 24; return (h - SLOT_START) * 60 + m; };
    const minToAt = (min) => { const t = clamp(Math.round(min), 0, DAY_MIN - 1) + SLOT_START * 60; return pad(Math.floor(t / 60) % 24) + ':' + pad(t % 60); };
    const snapStep = () => pxPerMin >= 6 ? 1 : pxPerMin >= 2 ? 5 : pxPerMin >= 1.2 ? 15 : 30;
    function canvasBG() {
      const p = pxPerMin;
      const layers = [`repeating-linear-gradient(to bottom, rgba(255,255,255,.10) 0, rgba(255,255,255,.10) 1px, transparent 1px, transparent ${60 * p}px)`];
      if (p >= 1.2) layers.push(`repeating-linear-gradient(to bottom, rgba(255,255,255,.05) 0, rgba(255,255,255,.05) 1px, transparent 1px, transparent ${15 * p}px)`);
      if (p >= 3)   layers.push(`repeating-linear-gradient(to bottom, rgba(255,255,255,.04) 0, rgba(255,255,255,.04) 1px, transparent 1px, transparent ${5 * p}px)`);
      if (p >= 6)   layers.push(`repeating-linear-gradient(to bottom, rgba(255,255,255,.03) 0, rgba(255,255,255,.03) 1px, transparent 1px, transparent ${p}px)`);
      return layers.join(',');
    }
    function blockHTML(g, i, positioned) {
      let style = '';
      if (positioned && g.at) {
        const top = minutesOf(g.at) * pxPerMin;
        const endMin = g.end ? Math.max(minutesOf(g.end), minutesOf(g.at) + 5) : minutesOf(g.at) + 30;
        const h = Math.max(23, (endMin - minutesOf(g.at)) * pxPerMin);
        style = `style="top:${top.toFixed(1)}px;height:${h.toFixed(1)}px"`;
      }
      return `<div class="cal-block ${positioned ? 'cal-block--cv' : ''} ${g.done ? 'is-done' : ''} ${g.alert ? 'has-alert' : ''}"
        ${style} draggable="true" data-cal-drag="${i}" data-cal-block="${i}" role="button" tabindex="0">
        <label class="td-check" data-no-open><input type="checkbox" data-cal-check="${i}" ${g.done ? 'checked' : ''}><i></i></label>
        <span class="cal-block__txt">${esc(g.text)}</span>
        <b class="cal-block__at">${fmtAt(g.at)}${g.end ? '–' + fmtAt(g.end) : ''}</b>
        ${g.subs?.length ? `<span class="cal-block__subs">${g.subs.filter(s => s.done).length}/${g.subs.length}</span>` : ''}
        ${g.alert ? '<span class="cal-block__bell" aria-hidden="true">⏰</span>' : ''}
      </div>`;
    }

    function renderDay() {
      const wrap = $('[data-cal-daybody]');
      if (!selected) { wrap.innerHTML = '<p class="cl-cat__empty">Pick a day on the calendar.</p>'; return; }
      materialize(selected);
      const [y, m, d] = selected.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const today = dk(new Date());
      const goals = getDayRec(selected);
      const notes = (st.notes[selected] || []);
      const rems = Store.get(KEYS.reminders, []).filter(r => r.when && dk(new Date(r.when)) === selected);
      const rel = selected === today ? 'Today' : (selected === dk(new Date(Date.now() + 86400000)) ? 'Tomorrow' : '');

      $('[data-cal-daytitle]').textContent =
        (rel ? rel + ' — ' : '') + date.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});

      /* timed goals live on the canvas; untimed wait in the tray */
      const prevWrap = $('[data-cal-cvwrap]');
      const keepScroll = prevWrap ? prevWrap.scrollTop : null;
      const anytime = [], timed = [];
      goals.forEach((g, i) => { (g.at ? timed : anytime).push([g, i]); });
      timed.sort((a, b2) => a[0].at < b2[0].at ? -1 : 1);
      const done = goals.filter(g => g.done).length;
      const pct = goals.length ? Math.round(done / goals.length * 100) : 0;

      let labels = '';
      for (let h = 0; h < 24; h++) {
        labels += `<span class="cal-cv-hour" style="top:${(h * 60 * pxPerMin).toFixed(1)}px">${hourLabel(h + SLOT_START)}</span>`;
        if (pxPerMin >= 3) for (const q of [15, 30, 45])
          labels += `<span class="cal-cv-q" style="top:${((h * 60 + q) * pxPerMin).toFixed(1)}px">:${q}</span>`;
      }

      /* Structured-style flow: cards on a spine with free-time gaps */
      let flowHTML = '';
      if (vmode === 'flow') {
        const rowsF = timed.map(([g, i]) => ({g, i, start: minutesOf(g.at), end: g.end ? minutesOf(g.end) : minutesOf(g.at) + 30}));
        const nowD = new Date();
        const nowMin = selected === today ? minutesOf(pad(nowD.getHours()) + ':' + pad(nowD.getMinutes())) : -1;
        flowHTML = rowsF.map((r, k) => {
          const prev = rowsF[k - 1];
          const gap = prev ? r.start - prev.end : 0;
          const isNow = nowMin >= 0 && nowMin >= r.start && nowMin < r.end && !r.g.done;
          const gapTxt = gap >= 60 ? Math.floor(gap / 60) + ' h ' + (gap % 60 ? (gap % 60) + ' min' : '') : gap + ' min';
          return (gap >= 15 ? `<div class="flow-gap"><i></i>${gapTxt} free<i></i></div>` : '') +
          `<div class="flow-item ${r.g.done ? 'is-done' : ''} ${isNow ? 'is-now' : ''}" data-cal-block="${r.i}" role="button" tabindex="0">
            <span class="flow-time"><b>${fmtAt(r.g.at)}</b>${r.g.end ? `<small>${fmtAt(r.g.end)}</small>` : ''}</span>
            <span class="flow-node" data-no-open><label class="td-check"><input type="checkbox" data-cal-check="${r.i}" ${r.g.done ? 'checked' : ''}><i></i></label></span>
            <div class="flow-card">
              <p class="flow-card__title">${esc(r.g.text)}</p>
              ${r.g.desc ? `<p class="flow-card__desc">${esc(r.g.desc.slice(0, 90))}${r.g.desc.length > 90 ? '…' : ''}</p>` : ''}
              ${(r.g.subs?.length || r.g.alert) ? `<p class="flow-card__meta">${r.g.subs?.length ? r.g.subs.filter(s => s.done).length + '/' + r.g.subs.length + ' steps' : ''}${r.g.alert ? ' · ⏰' : ''}</p>` : ''}
            </div>
          </div>`;
        }).join('') || '<p class="td-empty">Nothing scheduled yet — add below, then tap a card to plan it.</p>';
      }

      wrap.innerHTML = `
        <div class="cal-dayswitch">
          <button class="icon-btn" data-cal-dprev aria-label="Previous day" type="button">‹</button>
          <button class="cl-chip ${selected === today ? 'is-active' : ''}" data-cal-dtoday type="button">Today</button>
          <button class="icon-btn" data-cal-dnext aria-label="Next day" type="button">›</button>
          <span class="cal-viewtoggle">
            <button class="cl-chip ${vmode === 'flow' ? 'is-active' : ''}" data-cal-vmode="flow" type="button">Plan</button>
            <button class="cl-chip ${vmode === 'zoom' ? 'is-active' : ''}" data-cal-vmode="zoom" type="button">Timeline</button>
          </span>
        </div>

        <!-- the hero: what is LEFT, not what is done. A day is read forwards. -->
        <div class="tile-well cal-well">
          <span class="tile-kick">✦ ${selected === today ? 'left today' : (goals.length ? 'on this day' : 'nothing yet')}</span>
          <span class="tile-hero__val">${goals.length ? (goals.length - done) : '—'}</span>
          <span class="tile-hero__of">${goals.length ? 'of ' + goals.length + ' · ' + pct + '% done' : 'add something below'}</span>
          <div class="tile-hero__bar ${pct >= 100 ? 'is-over' : ''}"><i style="width:${pct}%"></i></div>
        </div>

        <!-- This day's capacity, and the door to the planning views. Without
             it the panel behind this modal is invisible, which is exactly how
             the week and the year went unnoticed. -->
        ${(() => {
          const L = loadFor(selected);
          return `<div class="cal-dayload ${L.over ? 'is-over' : ''}">
            <span class="cal-dayload__txt"><b>${hrs(L.mins)}</b> of ${hrs(L.capMin)} ${L.over ? '· over' : 'planned'}</span>
            <span class="cal-dayload__bar"><i style="width:${Math.min(100, L.pct)}%"></i></span>
            <button class="cal-dayload__go" data-cal-toweek type="button">Week ›</button>
          </div>`;
        })()}

        ${anytime.length ? `
        <div class="cal-tray">
          <span class="cal-tray__label">Inbox — unscheduled</span>
          ${anytime.map(([g, i]) => blockHTML(g, i, false)).join('')}
        </div>` : ''}

        ${vmode === 'flow' ? `<div class="flow">${flowHTML}</div>` : `
        <div class="cal-zoombar">
          <button class="icon-btn" data-cal-zoomout aria-label="Zoom out" type="button">−</button>
          <button class="icon-btn" data-cal-zoomin aria-label="Zoom in" type="button">+</button>
          <span class="cal-zoombar__hint">scroll to zoom · drag to schedule · snapping to ${snapStep()} min</span>
        </div>
        <div class="cal-cvwrap" data-cal-cvwrap>
          <div class="cal-canvas" data-cal-canvas style="height:${(DAY_MIN * pxPerMin).toFixed(0)}px;background-image:${canvasBG()}">
            ${labels}
            ${selected === today ? (() => {
              const now = new Date();
              const nm = minutesOf(pad(now.getHours()) + ':' + pad(now.getMinutes()));
              return `<div class="cal-nowline" style="top:${(nm * pxPerMin).toFixed(1)}px"><i></i><span>${fmtAt(pad(now.getHours()) + ':' + pad(now.getMinutes()))}</span></div>`;
            })() : ''}
            ${timed.map(([g, i]) => blockHTML(g, i, true)).join('')}
          </div>
        </div>`}

        <div class="td-add cal-add">
          <input class="cal-time cal-time--new" type="time" data-cal-newtime aria-label="Time (optional)">
          <input class="input" type="text" data-cal-newgoal placeholder="Add a to-do… (time optional)" />
          <button class="btn btn--primary btn--sm" data-cal-addgoal>+ Add</button>
        </div>

        <p class="cal-sec">Notes from Claude</p>
        <ul class="cal-notes">
          ${notes.filter(n => n.from === 'claude').map(n => `<li class="cal-note cal-note--claude">${esc(n.text)}</li>`).join('')
            || '<li class="cal-note">Nothing yet — once we plan your goals together, guidance for each day lands here.</li>'}
        </ul>

        <p class="cal-sec">My notes</p>
        <ul class="cal-notes">
          ${notes.filter(n => n.from !== 'claude').map(n =>
            `<li class="cal-note">${esc(n.text)} <button class="td-del" data-cal-delnote="${n.id}" aria-label="Delete note">×</button></li>`).join('') || '<li class="cal-note">—</li>'}
        </ul>
        <div class="td-add">
          <input class="input" type="text" data-cal-newnote placeholder="Write a note for this day…" />
          <button class="btn btn--ghost btn--sm" data-cal-addnote>+ Note</button>
        </div>

        ${rems.length ? `<p class="cal-sec">Reminders</p>
        <ul class="cal-notes">${rems.map(r => `<li class="cal-note ${r.done ? 'is-done' : ''}">⏰ ${esc(r.text)}</li>`).join('')}</ul>` : ''}`;

      /* keep (or set) the timeline scroll position across re-renders */
      const cw = $('[data-cal-cvwrap]');
      if (cw) {
        const s = cvScroll != null ? cvScroll : keepScroll;
        if (s != null) cw.scrollTop = s;
        cvScroll = null;
      }
    }

    /* progress drawer: completion % line + white-vs-red cross scale (last 30 days) */
    function renderDrawer() {
      const today = new Date();
      const todayStr = dk(today);
      const pts = [];
      let white = 0, red = 0, tracked = 0;
      for (let i = 29; i >= 0; i--) {
        const ds = dk(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
        const goals = getDayRec(ds);
        if (!goals.length) { pts.push(pts.length ? pts[pts.length - 1] : 0); continue; }
        tracked++;
        const pct = Math.round(goals.filter(g => g.done).length / goals.length * 100);
        pts.push(pct);
        if (pct === 100) white++;
        else if (ds < todayStr) red++;
      }
      /* streak: consecutive fully-done days ending today/yesterday */
      let streak = 0;
      for (let i = 0; i < 366; i++) {
        const ds = dk(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
        const goals = getDayRec(ds);
        const fullDay = goals.length > 0 && goals.every(g => g.done);
        if (fullDay) { streak++; continue; }
        if (i === 0) continue;              // today still in progress — don't break the streak
        break;
      }
      const ratio = (white + red) ? Math.round(white / (white + red) * 100) : 0;
      $('[data-cal-drawerbody]').innerHTML = `
        ${svgLine(pts, 280, 90)}
        <p class="sp-hint">Daily completion % — last 30 days. White-cross days hit 100.</p>

        <p class="cal-sec">The Scale · white vs red</p>
        <div class="cal-scale" role="img" aria-label="${white} white-cross days versus ${red} red-cross days">
          <span class="cal-scale__side cal-scale__side--white">✝ ${white}</span>
          <span class="cal-scale__bar"><i style="width:${ratio}%"></i></span>
          <span class="cal-scale__side cal-scale__side--red">${red} ✝</span>
        </div>
        <p class="sp-hint">${ratio}% of your judged days ended in a white cross.</p>

        <div class="cl-stats" style="grid-template-columns:1fr 1fr 1fr">
          <div class="cl-stat"><b>${streak}</b><span>Streak</span></div>
          <div class="cl-stat"><b>${white}</b><span>White /30</span></div>
          <div class="cl-stat"><b>${tracked}</b><span>Tracked</span></div>
        </div>`;
    }

    /* ── fullscreen day modal ── */
    const dayModal = () => $('#modal-calday');
    function openDay()  {
      const m = dayModal(); m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false');
      cvScroll = Math.max(0, 7 * 60 * pxPerMin - 40);   // land the view around noon
      renderDay();
    }
    function closeDay() { const m = dayModal(); m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true'); closeDrawer(); }

    /* ── goal drawer (slides from the right): description · sub-tasks · alert ── */
    let drawerIdx = null;
    const gDrawer = () => $('[data-cal-gdrawer]');
    function openDrawer(i) {
      const goals = getDayRec(selected);
      const g = goals[i]; if (!g) return;
      drawerIdx = i;
      const D = gDrawer();
      $('[data-gd-title]', D).value = g.text;
      $('[data-gd-time]', D).value = g.at || '';
      $('[data-gd-end]', D).value = g.end || '';
      $('[data-gd-desc]', D).value = g.desc || '';
      $('[data-gd-alert]', D).checked = !!g.alert;
      renderSubs(g);
      D.classList.add('is-open');
      D.setAttribute('aria-hidden', 'false');
    }
    function closeDrawer() {
      const D = gDrawer(); if (!D) return;
      D.classList.remove('is-open');
      D.setAttribute('aria-hidden', 'true');
      drawerIdx = null;
    }
    function renderSubs(g) {
      $('[data-gd-subs]', gDrawer()).innerHTML = (g.subs || []).map((s, si) =>
        `<li class="gd-sub ${s.done ? 'is-done' : ''}">
          <label class="td-check"><input type="checkbox" data-gd-subchk="${si}" ${s.done ? 'checked' : ''}><i></i></label>
          <span>${esc(s.text)}</span>
          <button class="td-del" data-gd-subdel="${si}" aria-label="Delete sub-task">×</button>
        </li>`).join('') || '<li class="gd-sub gd-sub--empty">No sub-tasks yet.</li>';
    }
    function drawerGoal() {
      if (drawerIdx == null) return null;
      const goals = getDayRec(selected);
      return goals[drawerIdx] ? {goals, g: goals[drawerIdx]} : null;
    }
    function wireDrawer() {
      const D = gDrawer();
      D.addEventListener('click', (e) => {
        if (e.target.closest('[data-gd-close]')) { closeDrawer(); return; }
        if (e.target.closest('[data-gd-addsub]')) {
          const ctx = drawerGoal(); if (!ctx) return;
          const inp = $('[data-gd-newsub]', D);
          const v = (inp.value || '').trim(); if (!v) return;
          (ctx.g.subs = ctx.g.subs || []).push({text: v, done: false});
          inp.value = '';
          setDayRec(selected, ctx.goals); renderSubs(ctx.g); renderDay();
          return;
        }
        const sd = e.target.closest('[data-gd-subdel]');
        if (sd) {
          const ctx = drawerGoal(); if (!ctx) return;
          ctx.g.subs.splice(+sd.dataset.gdSubdel, 1);
          setDayRec(selected, ctx.goals); renderSubs(ctx.g); renderDay();
          return;
        }
        if (e.target.closest('[data-gd-del]')) {
          const ctx = drawerGoal(); if (!ctx) return;
          if (!confirm('Delete this goal?')) return;
          ctx.goals.splice(drawerIdx, 1);
          setDayRec(selected, ctx.goals);
          closeDrawer(); renderDay(); renderMonth(); renderDrawer();
          return;
        }
      });
      D.addEventListener('change', (e) => {
        const ctx = drawerGoal(); if (!ctx) return;
        const sc = e.target.closest('[data-gd-subchk]');
        if (sc) {
          ctx.g.subs[+sc.dataset.gdSubchk].done = sc.checked;
          setDayRec(selected, ctx.goals); renderSubs(ctx.g); renderDay();
          return;
        }
        if (e.target.matches('[data-gd-time]'))  { ctx.g.at = e.target.value || undefined; setDayRec(selected, ctx.goals); renderDay(); return; }
        if (e.target.matches('[data-gd-end]')) {
          const v = e.target.value || undefined;
          if (v && ctx.g.at && minutesOf(v) <= minutesOf(ctx.g.at)) { toast('End must be after the start.'); e.target.value = ctx.g.end || ''; return; }
          ctx.g.end = v; setDayRec(selected, ctx.goals); renderDay(); return;
        }
        if (e.target.matches('[data-gd-alert]')) {
          ctx.g.alert = e.target.checked; delete ctx.g.alerted;
          setDayRec(selected, ctx.goals); renderDay();
          toast(ctx.g.alert ? 'Reminder set — fires while the app is open' : 'Reminder off');
          return;
        }
      });
      D.addEventListener('input', (e) => {
        const ctx = drawerGoal(); if (!ctx) return;
        if (e.target.matches('[data-gd-title]')) {
          const v = e.target.value.trim();
          if (v) { ctx.g.text = v; setDayRec(selected, ctx.goals); }
          return;
        }
        if (e.target.matches('[data-gd-desc]')) { ctx.g.desc = e.target.value; setDayRec(selected, ctx.goals); return; }
      });
      D.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('[data-gd-newsub]')) $('[data-gd-addsub]', D).click();
      });
    }

    /* reminder alerts — fire while the app is open (also nudges the now-line) */
    function checkAlerts() {
      const today = dk(new Date());
      const now = new Date();
      const hhmm = pad(now.getHours()) + ':' + pad(now.getMinutes());
      const nl = document.querySelector('.cal-nowline');
      if (nl && selected === today) {
        nl.style.top = (minutesOf(hhmm) * pxPerMin).toFixed(1) + 'px';
        const lbl = nl.querySelector('span');
        if (lbl) lbl.textContent = fmtAt(hhmm);
      }
      const goals = getDayRec(today);
      let dirty = false;
      goals.forEach(g => {
        if (g.alert && g.at && !g.done && !g.alerted && hhmm >= g.at) {
          toast('⏰ ' + g.text + ' — it is time.');
          g.alerted = true; dirty = true;
        }
      });
      if (dirty) Store.set(DAY_PREFIX + today, goals);
    }

    let booted = false, dragIdx = null;
    function wire() {
      const panel = $('[data-tab-panel="calendar"]');

      /* Ticking anything anywhere changes the load, so the meter and whichever
         view is showing follow the data rather than the tab being reopened. */
      window.addEventListener('nv-day-changed', () => {
        if (!booted) return;
        renderLoad();
        const v = panelView();
        if (v === 'week') renderWeek(); else if (v === 'year') renderYear();
      });

      /* month grid + drawer live on the panel */
      panel.addEventListener('click', (e) => {
        /* prev/next step by whatever unit the current view measures in */
        const step = (n) => {
          const v = panelView();
          if (v === 'week')      view.setDate(view.getDate() + 7 * n);
          else if (v === 'year') view.setFullYear(view.getFullYear() + n);
          else                   view.setMonth(view.getMonth() + n);
          setPanelView(v);
        };
        if (e.target.closest('[data-cal-prev]')) { step(-1); return; }
        if (e.target.closest('[data-cal-next]')) { step(1);  return; }

        const vb = e.target.closest('[data-cal-view]');
        if (vb) { view = new Date(); setPanelView(vb.dataset.calView); return; }

        /* the availability editor — the ceiling every plan is measured against */
        if (e.target.closest('[data-cal-avail]')) {
          const cur = (st.avail || DEFAULT_AVAIL).slice();
          const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
          const next = cur.slice();
          for (let i = 1; i <= 7; i++) {
            const d = i % 7;                                   // ask Mon→Sun, store Sun-first
            const ans = window.prompt('Hours you can realistically give on ' + names[d] + ':', String(cur[d]));
            if (ans === null) return;                          // cancel abandons the whole edit
            const n = parseFloat(ans);
            next[d] = Number.isFinite(n) ? Math.max(0, Math.min(24, n)) : cur[d];
          }
          st.avail = next; save();
          renderLoad(); setPanelView(panelView());
          toast('Weekly capacity updated');
          return;
        }

        if (e.target.closest('[data-cal-today]')) { view = new Date(); selected = dk(new Date()); renderMonth(); renderDay(); openDay(); return; }
        const openBtn = e.target.closest('[data-cal-openday]');
        if (openBtn) { selected = openBtn.dataset.calOpenday; view = new Date(selected + 'T00:00:00'); renderMonth(); renderDay(); openDay(); return; }
        const cell = e.target.closest('[data-cal-day]');
        if (cell) { selected = cell.dataset.calDay; renderMonth(); renderDay(); openDay(); return; }
        if (e.target.closest('[data-cal-drawertab]')) {
          $('[data-cal-drawer]').classList.toggle('is-open');
          renderDrawer(); return;
        }
      });

      /* everything inside the day lives on the modal */
      const M = dayModal();
      M.addEventListener('click', (e) => {
        if (e.target.closest('[data-calday-close]')) { closeDay(); renderMonth(); renderDrawer(); return; }
        /* out of the day and into the planning views behind it */
        if (e.target.closest('[data-cal-toweek]')) {
          closeDay(); renderLoad(); setPanelView('week'); return;
        }
        const dprev = e.target.closest('[data-cal-dprev]'), dnext = e.target.closest('[data-cal-dnext]'), dtoday = e.target.closest('[data-cal-dtoday]');
        if (dprev || dnext || dtoday) {           // Structured-style day hopping inside the planner
          if (dtoday) selected = dk(new Date());
          else { const [y2, m2, d2] = selected.split('-').map(Number); selected = dk(new Date(y2, m2 - 1, d2 + (dnext ? 1 : -1))); }
          const [vy, vm2] = selected.split('-').map(Number);
          view = new Date(vy, vm2 - 1, 1);
          closeDrawer(); renderMonth(); renderDay(); return;
        }
        const vmBtn = e.target.closest('[data-cal-vmode]');
        if (vmBtn) { vmode = vmBtn.dataset.calVmode; renderDay(); return; }
        const block = e.target.closest('[data-cal-block]');
        if (block && !e.target.closest('[data-no-open]')) {   // open the goal drawer
          openDrawer(+block.dataset.calBlock);
          return;
        }
        if (e.target.closest('[data-cal-addgoal]')) {
          const inp = $('[data-cal-newgoal]', M);
          const v = (inp.value || '').trim(); if (!v) return;
          const at = ($('[data-cal-newtime]', M)?.value || '') || undefined;
          const goals = getDayRec(selected); goals.push({text: v, done: false, at});
          setDayRec(selected, goals); renderDay(); return;
        }
        const delGoal = e.target.closest('[data-cal-delgoal]');
        if (delGoal) {
          const goals = getDayRec(selected); goals.splice(+delGoal.dataset.calDelgoal, 1);
          setDayRec(selected, goals); renderDay(); return;
        }
        if (e.target.closest('[data-cal-addnote]')) {
          const inp = $('[data-cal-newnote]', M);
          const v = (inp.value || '').trim(); if (!v) return;
          (st.notes[selected] = st.notes[selected] || []).push({id: uid(), text: v, from: 'me'});
          save(); renderDay(); return;
        }
        const delNote = e.target.closest('[data-cal-delnote]');
        if (delNote) {
          st.notes[selected] = (st.notes[selected] || []).filter(n => n.id !== delNote.dataset.calDelnote);
          save(); renderDay(); return;
        }
      });
      M.addEventListener('change', (e) => {
        const chk = e.target.closest('[data-cal-check]');
        if (chk) {
          const goals = getDayRec(selected);
          const g = goals[+chk.dataset.calCheck];
          if (g) { g.done = chk.checked; if (chk.checked) g.doneAt = Date.now(); else delete g.doneAt; }
          setDayRec(selected, goals);
          renderDay(); renderMonth(); renderDrawer();   // 100% → white cross lands instantly
        }
      });
      M.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (e.target.matches('[data-cal-newgoal]')) $('[data-cal-addgoal]', M).click();
        if (e.target.matches('[data-cal-newnote]')) $('[data-cal-addnote]', M).click();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && M.classList.contains('is-open')) { closeDay(); renderMonth(); renderDrawer(); }
      });

      /* drag a goal onto an hour (HH:00) or an exact minute slot */
      M.addEventListener('dragstart', (e) => {
        const row = e.target.closest('[data-cal-drag]');
        if (!row) return;
        dragIdx = +row.dataset.calDrag;
        row.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(dragIdx)); } catch {}
      });
      M.addEventListener('dragend', (e) => {
        dragIdx = null;
        M.querySelectorAll('.is-dragging, .is-over').forEach(el => el.classList.remove('is-dragging', 'is-over'));
      });
      M.addEventListener('dragover', (e) => {
        const cv = e.target.closest('[data-cal-canvas]');
        if (cv && dragIdx != null) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          cv.classList.add('is-over');
        }
      });
      M.addEventListener('drop', (e) => {
        const cv = e.target.closest('[data-cal-canvas]');
        if (!cv || dragIdx == null) return;
        e.preventDefault();
        const y = e.clientY - cv.getBoundingClientRect().top;
        const step = snapStep();
        const min = Math.round((y / pxPerMin) / step) * step;
        const goals = getDayRec(selected);
        const g = goals[dragIdx];
        if (g) {
          const dur = (g.at && g.end) ? minutesOf(g.end) - minutesOf(g.at) : null;
          g.at = minToAt(min);
          if (dur && dur > 0) g.end = minToAt(min + dur);   // dragging keeps the block's length
          setDayRec(selected, goals);
        }
        dragIdx = null;
        renderDay();
      });

      /* mouse-wheel zoom, anchored at the cursor (passive:false so we own the scroll) */
      M.addEventListener('wheel', (e) => {
        const cv = e.target.closest('[data-cal-canvas]');
        if (!cv) return;
        e.preventDefault();
        const wrapEl = cv.parentElement;
        const yIn = e.clientY - wrapEl.getBoundingClientRect().top;
        const minuteAt = (wrapEl.scrollTop + yIn) / pxPerMin;
        pxPerMin = clamp(pxPerMin * (e.deltaY < 0 ? 1.25 : 0.8), 0.45, 8);
        cvScroll = Math.max(0, minuteAt * pxPerMin - yIn);
        renderDay();
      }, {passive: false});
      M.addEventListener('click', (e) => {          // +/- buttons for touch screens
        const zin = e.target.closest('[data-cal-zoomin]'), zout = e.target.closest('[data-cal-zoomout]');
        if (!zin && !zout) return;
        const wrapEl = $('[data-cal-cvwrap]', M);
        const mid = wrapEl ? wrapEl.clientHeight / 2 : 200;
        const minuteAt = wrapEl ? (wrapEl.scrollTop + mid) / pxPerMin : 0;
        pxPerMin = clamp(pxPerMin * (zin ? 1.5 : 1 / 1.5), 0.45, 8);
        cvScroll = Math.max(0, minuteAt * pxPerMin - mid);
        renderDay();
      });

      /* floating stopwatch: drag anywhere, lock in place */
      const float = $('[data-cal-watchfloat]');
      const bar   = $('[data-cal-watchdrag]');
      const lockBtn = $('[data-cal-watchlock]');
      function applyWatchPos() {
        const p = st.watchPos || {};
        float.classList.toggle('is-locked', !!p.locked);
        if (p.x != null) {
          float.style.left = clamp(p.x, 0, window.innerWidth - 120) + 'px';
          float.style.top  = clamp(p.y, 0, window.innerHeight - 60) + 'px';
          float.style.right = 'auto'; float.style.bottom = 'auto';
        }
      }
      let wDrag = null;
      bar.addEventListener('pointerdown', (e) => {
        if (st.watchPos?.locked) return;
        if (e.target.closest('button')) return;
        const r = float.getBoundingClientRect();
        wDrag = {dx: e.clientX - r.left, dy: e.clientY - r.top};
        bar.setPointerCapture(e.pointerId);
        float.classList.add('is-moving');
      });
      bar.addEventListener('pointermove', (e) => {
        if (!wDrag) return;
        st.watchPos = Object.assign({}, st.watchPos, {x: e.clientX - wDrag.dx, y: e.clientY - wDrag.dy});
        applyWatchPos();
      });
      bar.addEventListener('pointerup', () => {
        if (!wDrag) return;
        wDrag = null; float.classList.remove('is-moving'); save();
      });
      lockBtn.addEventListener('click', () => {
        st.watchPos = Object.assign({}, st.watchPos, {locked: !st.watchPos?.locked});
        save(); applyWatchPos();
        toast(st.watchPos.locked ? 'Clock locked in place' : 'Clock unlocked — drag it anywhere');
      });
      applyWatchPos();

      Chrono.mount($('[data-cal-watch]'), () => st.watch, (w) => { st.watch = w; save(); });
      wireDrawer();
      checkAlerts();
      setInterval(checkAlerts, 30000);
    }

    function materializeToday() {
      if (!st) {
        st = Store.get(KEY, null);
        if (!st || !Array.isArray(st.rules)) st = {rules: seedRules(), notes: {}, watch: {acc: 0, startedAt: null}};
        save();
      }
      materialize(dk(new Date()));
    }

    function init() {
      if (!booted) {
        booted = true;
        materializeToday();          // ensures st exists + today is populated
        view = new Date();
        selected = dk(new Date());
        wire();
      }
      renderMonth();
      renderDay();
      renderDrawer();
      renderLoad();
      setPanelView(panelView());

      /* ── WHAT YOU LAND ON ────────────────────────────────────────────────
         The month is a record; the day is the thing you act on. Opening the
         tab therefore lands on TODAY's timeline, with the month one close-tap
         behind it. Entering the tab always returns you to today — a calendar
         that reopens on whatever date you last poked at is a calendar that
         has stopped answering "what now?". */
      view = new Date();
      selected = dk(new Date());
      renderMonth();
      renderDay();
      openDay();
    }
    return {init, materializeToday};
  })();

  /* ═══════════════════  DAYFLOW (goal ticker · day ring · to-do)  ═══════════════════ */
  const DayFlow = (() => {
    const DAY_PREFIX = 'nv.day.';
    const STREAK_KEY = 'nv.day.streak';
    const WAKE_HOUR = 8, SLEEP_HOUR = 24;

    /* ── date helpers (6 AM day boundary) ── */
    function activeDate() {
      const d = new Date();
      if (d.getHours() < 6) d.setDate(d.getDate() - 1);
      return localDateKey(d);
    }
    function tomorrowDate() {
      const d = new Date();
      if (d.getHours() >= 6) d.setDate(d.getDate() + 1);
      return localDateKey(d);
    }
    function fmtDate(s) {
      const [y,m,dd] = s.split('-').map(Number);
      return new Date(y, m-1, dd).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});
    }
    const dayKey  = (s) => DAY_PREFIX + s;
    const getDay  = (s) => Store.get(dayKey(s), []);
    const setDay  = (s, goals) => { Store.set(dayKey(s), goals); window.dispatchEvent(new CustomEvent('nv-day-changed')); };
    function listDayKeys() {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(DAY_PREFIX) && /\d{4}-\d{2}-\d{2}$/.test(k)) out.push(k.slice(DAY_PREFIX.length));
      }
      return out.sort();
    }

    /* ── rollover: pull undone goals from past days into today.
         Past records are KEPT (calendar history / crosses) — copied
         items get a `rolled` flag so they only move once. ── */
    function rollover() {
      const today = activeDate();
      const todays = getDay(today);
      let moved = false;
      listDayKeys().forEach(ds => {
        if (ds >= today) return;
        const old = getDay(ds);
        let dirty = false;
        old.forEach(g => {
          if (g.done || g.rolled) return;
          if (!todays.some(t => t.text === g.text)) { todays.push({text: g.text, done: false}); moved = true; }
          g.rolled = true; dirty = true;
        });
        if (dirty) Store.set(dayKey(ds), old);
      });
      if (moved) setDay(today, todays);
    }

    /* ── streak: consecutive fully-completed days ── */
    function checkStreak() {
      const st = Store.get(STREAK_KEY, {count: 0, lastProcessedDate: ''});
      const today = activeDate();
      listDayKeys().forEach(ds => {
        if (ds >= today || ds <= st.lastProcessedDate) return;
        const goals = getDay(ds);
        if (!goals.length) return;                       // empty day doesn't break it
        st.count = goals.every(g => g.done) ? st.count + 1 : 0;
        st.lastProcessedDate = ds;
      });
      Store.set(STREAK_KEY, st);
      return st;
    }

    /* ── DAY RING · sun cycle (accent follows the active theme) ── */
    function themeRgb(name, fb) {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return (raw || fb).split(',').map(Number);
    }
    function themeHexToRgb(name, fbHex) {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fbHex;
      const h = raw.replace('#', '');
      return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16));
    }
    function ringColor(pct) {
      const RING_STOPS = [
        [0,   [207,207,207]],                                  // dawn bone
        [20,  [236,236,236]],                                  // morning paper
        [40,  themeRgb('--accent-br-rgb', '225,29,56')],       // midday bright accent
        [60,  themeRgb('--accent-rgb', '196,22,59')],          // afternoon accent
        [80,  themeRgb('--accent-wine-rgb', '110,31,42')],     // evening wine
        [100, themeHexToRgb('--c-oxblood', '#2A0A12')],        // night deep tone
      ];
      for (let i = 1; i < RING_STOPS.length; i++) {
        const [p1, c1] = RING_STOPS[i-1], [p2, c2] = RING_STOPS[i];
        if (pct <= p2) {
          const t = (pct - p1) / (p2 - p1);
          return 'rgb(' + c1.map((v, j) => Math.round(v + (c2[j]-v)*t)).join(',') + ')';
        }
      }
      return 'rgb(' + RING_STOPS[RING_STOPS.length - 1][1].join(',') + ')';
    }
    const C = 2 * Math.PI * 52;
    function updateRing() {
      const fill = $('[data-ring-fill]'); if (!fill) return;
      const now = new Date();
      const hours = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
      const pctEl = $('[data-ring-pct]'), phaseEl = $('[data-ring-phase]'), clockEl = $('[data-ring-clock]');
      const statusEl = $('[data-ring-status]'), remainEl = $('[data-ring-remain]');
      let h12 = now.getHours() % 12 || 12;
      if (clockEl) clockEl.textContent = h12 + ':' + pad(now.getMinutes()) + (now.getHours() < 12 ? ' AM' : ' PM');

      let pct, color, phase, status, remain;
      if (hours < WAKE_HOUR) {
        pct = 0; color = '#4a4a4a'; phase = 'SLEEPING'; status = 'Still sleeping';
        const mins = Math.round((WAKE_HOUR - hours) * 60);
        remain = Math.floor(mins/60) + 'h ' + (mins%60) + 'm until wake-up';
        if (pctEl) pctEl.textContent = '—';
      } else {
        pct = clamp((hours - WAKE_HOUR) / (SLEEP_HOUR - WAKE_HOUR) * 100, 0, 100);
        color = ringColor(pct);
        phase  = pct < 25 ? 'MORNING' : pct < 50 ? 'MIDDAY' : pct < 75 ? 'AFTERNOON' : pct < 90 ? 'EVENING' : 'BEDTIME';
        status = pct < 25 ? 'Morning — fresh start' : pct < 50 ? 'Midday — keep moving'
               : pct < 75 ? 'Afternoon — push it'   : pct < 90 ? 'Evening — wrap up' : 'Bedtime soon';
        const mins = Math.round((SLEEP_HOUR - hours) * 60);
        remain = Math.floor(mins/60) + 'h ' + (mins%60) + 'm awake time left';
        if (pctEl) pctEl.textContent = Math.round(pct) + '%';
      }
      fill.style.strokeDasharray = C;
      fill.style.strokeDashoffset = C * (1 - pct/100);
      fill.style.stroke = color;
      if (phaseEl)  phaseEl.textContent  = phase;
      if (statusEl) statusEl.textContent = status;
      if (remainEl) remainEl.textContent = remain;
    }

    /* ── GOAL TICKER ── */
    let cycleIdx = 0, tickerT = null;
    function tickerItems() {
      const goals = getDay(activeDate());
      const done = goals.filter(g => g.done).length;
      if (!goals.length) return {items: [{status:'empty', text:'No goals set for today — add one to get rolling.'}], done, total: 0};
      if (done === goals.length) return {items: [{status:'done', text:'All goals done — solid day.'}], done, total: goals.length};
      return {items: goals.filter(g => !g.done).map(g => ({status:'pending', text: g.text})), done, total: goals.length};
    }
    function tick() {
      const stage = $('[data-ticker-stage]'); if (!stage) return;
      const {items, done, total} = tickerItems();
      const item = items[cycleIdx % items.length];
      cycleIdx++;
      const meta = $('[data-ticker-meta]');
      if (meta) meta.textContent = done + '/' + total;
      const glyph = item.status === 'done' ? '✓' : item.status === 'pending' ? '○' : '·';
      const old = stage.querySelector('.hm-ticker__row');
      const row = document.createElement('div');
      row.className = 'hm-ticker__row' + (old ? ' is-entering' : '');
      row.innerHTML = '<span class="hm-ticker__status" data-status="' + item.status + '">' + glyph + '</span>'
                    + '<span class="hm-ticker__text">' + esc(item.text) + '</span>';
      if (old) { old.classList.add('is-leaving'); setTimeout(() => old.remove(), 460); }
      stage.appendChild(row);
    }
    function startTicker() {
      clearInterval(tickerT);
      tick();
      tickerT = setInterval(tick, 5000);
    }

    /* ── TO-DO LISTS ── */
    function renderTodayHeader(goals) {
      const done = goals.filter(g => g.done).length, total = goals.length;
      const numEl = $('[data-td-num]'), totEl = $('[data-td-total]'), lblEl = $('[data-td-label]');
      if (numEl) numEl.textContent = done;
      if (totEl) totEl.textContent = '/ ' + total;
      if (lblEl) lblEl.textContent = !total ? 'no goals yet' : done === total ? 'all done — solid day' : 'complete';
      const card = $('[data-td-card]');
      if (card) card.classList.toggle('is-all-done', total > 0 && done === total);
      const bar = $('[data-td-bar]');
      if (bar) bar.innerHTML = goals.map(g => '<i class="' + (g.done ? 'is-done' : '') + '"></i>').join('');
      const push = $('[data-td-push]');
      if (push) push.hidden = !goals.some(g => !g.done);
      const dateEl = $('[data-td-date]');
      if (dateEl) dateEl.textContent = 'Today — ' + fmtDate(activeDate());
    }
    function renderStreak() {
      const st = Store.get(STREAK_KEY, {count: 0});
      const pill = $('[data-td-streak]'), n = $('[data-td-streak-num]');
      if (n) n.textContent = st.count;
      if (pill) pill.classList.toggle('is-active', st.count > 0);
    }
    function buildRow(goals, idx, dateStr, readOnly) {
      const g = goals[idx];
      const li = document.createElement('li');
      li.className = 'td-row' + (g.done ? ' is-done' : '');
      li.innerHTML =
        '<label class="td-check"><input type="checkbox" ' + (g.done ? 'checked' : '') + (readOnly ? ' disabled title="Activates at 6 AM tomorrow"' : '') + '><i></i></label>' +
        '<span class="td-text">' + esc(g.text) + '</span>' +
        '<button class="td-del" aria-label="Delete goal">×</button>';
      li.querySelector('input').addEventListener('change', (e) => {
        goals[idx].done = e.target.checked;
        if (e.target.checked) goals[idx].doneAt = Date.now(); else delete goals[idx].doneAt;
        setDay(dateStr, goals); render();
      });
      const txt = li.querySelector('.td-text');
      txt.addEventListener('click', () => {
        if (txt.isContentEditable) return;
        txt.contentEditable = 'true'; txt.focus();
        const range = document.createRange(); range.selectNodeContents(txt); range.collapse(false);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        const commit = () => {
          txt.contentEditable = 'false';
          const v = txt.textContent.trim();
          if (v && v !== goals[idx].text) { goals[idx].text = v; setDay(dateStr, goals); }
          render();
        };
        txt.addEventListener('blur', commit, {once: true});
        txt.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); txt.blur(); }
          if (ev.key === 'Escape') { txt.textContent = goals[idx].text; txt.blur(); }
        });
      });
      li.querySelector('.td-del').addEventListener('click', () => {
        goals.splice(idx, 1); setDay(dateStr, goals); render();
      });
      return li;
    }
    function renderList(dateStr, listSel, emptySel, readOnly, expanded) {
      const ul = $(listSel), empty = $(emptySel);
      if (!ul) return;
      const goals = getDay(dateStr);
      ul.innerHTML = '';
      if (empty) empty.hidden = goals.length > 0;
      const LIMIT = 5;
      const showAll = expanded || goals.length <= LIMIT;
      goals.forEach((g, i) => {
        if (!showAll && i >= LIMIT) return;
        ul.appendChild(buildRow(goals, i, dateStr, readOnly));
      });
      if (goals.length > LIMIT) {
        const btn = document.createElement('button');
        btn.className = 'td-more';
        btn.textContent = expanded ? 'Show less ▴' : 'Show ' + (goals.length - LIMIT) + ' more ▾';
        btn.addEventListener('click', () => renderList(dateStr, listSel, emptySel, readOnly, !expanded));
        ul.appendChild(btn);
      }
      return goals;
    }

    function render() {
      const goals = renderList(activeDate(), '[data-td-list]', '[data-td-empty]', false, false) || [];
      renderTodayHeader(goals);
      renderStreak();
      renderList(tomorrowDate(), '[data-tm-list]', '[data-tm-empty]', true, false);
      const cnt = $('[data-tm-count]');
      if (cnt) cnt.textContent = getDay(tomorrowDate()).length + ' planned';
      const tmDate = $('[data-tm-date]');
      if (tmDate) tmDate.textContent = 'Plan tomorrow — ' + fmtDate(tomorrowDate());
    }

    function wireAdd(inputSel, btnSel, dateFn) {
      const input = $(inputSel), btn = $(btnSel);
      if (!input || !btn) return;
      const add = () => {
        const v = input.value.trim(); if (!v) return;
        const ds = dateFn();
        const goals = getDay(ds);
        goals.push({text: v, done: false});
        setDay(ds, goals);
        input.value = '';
        render();
      };
      btn.addEventListener('click', add);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
    }

    let booted = false;
    function init() {
      if (booted || !$('[data-td-list]')) return;
      booted = true;
      rollover();
      checkStreak();
      wireAdd('[data-td-input]', '[data-td-add]', activeDate);
      wireAdd('[data-tm-input]', '[data-tm-add]', tomorrowDate);
      $('[data-td-push]')?.addEventListener('click', () => {
        const today = activeDate(), tmr = tomorrowDate();
        const goals = getDay(today), plan = getDay(tmr);
        goals.filter(g => !g.done).forEach(g => {
          if (!plan.some(p => p.text === g.text)) plan.push({text: g.text, done: false});
        });
        setDay(tmr, plan);
        setDay(today, goals.filter(g => g.done));
        render();
        toast('Remaining goals pushed to tomorrow');
      });
      window.addEventListener('nv-day-changed', () => { cycleIdx = 0; tick(); });
      render();
      startTicker();
      updateRing();
      setInterval(updateRing, 60 * 1000);
    }

    return {init, render: () => { if (booted) { render(); updateRing(); } else init(); }};
  })();

  /* ═══════════════════  TABS  ═══════════════════ */
  const Tabs = (() => {
    const navlinks = () => $$('.navlink');
    const toplinks = () => $$('.topbar__link');

    function showPanel(name) {
      $$('[data-tab-panel]').forEach(p => { p.hidden=true; });
      if (REAL_PANELS.includes(name)) {
        const panel = $(`[data-tab-panel="${name}"]`);
        if (panel) panel.hidden = false;
        if (name==='home')      { Goals.renderWidget(); Ideas.init(); Noticed.render(); DayFlow.render(); }
        if (name==='goals')     Goals.renderAll();
        if (name==='reminders') Reminders.render();
        if (name==='gym')       { Gym.ensureRendered(); ProgressLog.refresh(); WidgetManager.initGymCards(); }
        if (name==='nutrition') Nutrition.init();
        if (name==='finance')   { Finance.init(); FinHeatmap.render(); }
        if (name==='photos')    { Photos.init(); WidgetManager.initPhotoCards(); }
        if (name==='academics') { Academics.init(); Study.init(); }
        if (name==='logs')      Logs.init();
        if (name==='clothes')   Clothes.init();
        if (name==='sports')    Sports.init();
        if (name==='calendar')  Cal.init();
      } else {
        const ph   = $('[data-tab-panel="placeholder"]');
        const meta = TAB_META[name]||{eyebrow:'Module',title:name,desc:'Module reserved.'};
        $('[data-placeholder-eyebrow]', ph).textContent = meta.eyebrow;
        $('[data-placeholder-title]',   ph).textContent = meta.title;
        $('[data-placeholder-desc]',    ph).textContent = meta.desc||'Module reserved.';
        ph.hidden = false;
      }
    }

    function setActive(name) {
      const meta = TAB_META[name]||{eyebrow:'Module',title:name};
      navlinks().forEach(t => {
        const on = t.dataset.tab===name;
        t.classList.toggle('is-active', on);
        if (t.hasAttribute('role')) t.setAttribute('aria-selected', String(on));
      });
      toplinks().forEach(t => t.classList.toggle('is-active', t.dataset.tab===name));

      const eyebrow = $('[data-view-eyebrow]'), title = $('[data-view-title]');
      if (eyebrow) eyebrow.textContent = meta.eyebrow;
      if (title)   title.textContent   = meta.title;
      document.body.dataset.view = name;
      WidgetManager.updateVisibility(name);
      Photos.updatePinVisibility(name);

      showPanel(name);
      /* Stats reads every other tab's data, so it is rebuilt on entry rather
         than at boot — otherwise it would show whatever was true when the app
         started, which is exactly the number you did not want. */
      if (name === 'stats') Stats.render();
      const activeTop = toplinks().find(t => t.dataset.tab===name);
      activeTop?.scrollIntoView?.({behavior:'smooth',inline:'center',block:'nearest'});
      window.scrollTo({top:0,behavior:'smooth'});
    }

    function init() {
      navlinks().forEach(t => t.addEventListener('click', e => { e.preventDefault(); setActive(t.dataset.tab); }));
      toplinks().forEach(t => t.addEventListener('click', () => setActive(t.dataset.tab)));
      const brand = $('.sidebar__brand');
      if (brand) brand.addEventListener('click', e => { e.preventDefault(); setActive('home'); });

      $$('[data-route]').forEach(el => {
        if (el.tagName==='BUTTON') {
          el.addEventListener('click', e => { e.stopPropagation(); setActive(el.dataset.route); });
        } else {
          el.addEventListener('click', e => {
            if (e.target.closest('[data-no-route]')||e.target.closest('button')) return;
            setActive(el.dataset.route);
          });
          el.addEventListener('keydown', e => {
            if (e.key==='Enter'||e.key===' ') { e.preventDefault(); setActive(el.dataset.route); }
          });
        }
      });

      /* Embedded tabs live in iframes and cannot switch tabs themselves, so they
         ask the parent to do it. The Map uses this to send you from a pin
         straight to the tab that actually tracks that place. */
      window.addEventListener('message', (e) => {
        const m = e.data;
        if (!m || m.source !== 'nv-embed' || m.type !== 'go') return;
        if (typeof m.tab !== 'string' || !REAL_PANELS.includes(m.tab)) return;
        setActive(m.tab);
        /* An anchor names a page INSIDE that tab ("soccer", "push day"). Tabs
           render asynchronously, so look for something matching once they have.
           Falls back to just opening the tab when nothing matches — never a
           dead end. */
        const anchor = (m.anchor || '').trim().toLowerCase();
        if (!anchor) return;
        setTimeout(() => {
          const panel = $(`[data-tab-panel="${m.tab}"]`); if (!panel) return;
          const hit = $$('button, [role="tab"], .cl-chip, .chip, summary', panel)
            .find(el => (el.textContent || '').trim().toLowerCase().includes(anchor));
          if (hit) { hit.click(); hit.scrollIntoView({ behavior:'smooth', block:'center' }); }
        }, 260);
      });
    }

    return { init, setActive };
  })();

  /* ══════════════════  VOICE  ══════════════════
     Say it instead of typing it. One mic, every tab, phone included.

     WHAT IT COSTS: nothing. Speech-to-text is the browser's own Web Speech
     API — no key, no server, no per-request charge. The command is then matched
     against patterns here, locally. So it is instant, it works when the network
     is flaky, and your voice goes to no service of ours.

     THE LIMIT, SAID PLAINLY: pattern matching understands commands with a
     recognisable shape — "add a goal…", "remind me to… at six", "go to gym".
     It cannot reason. "Work out when I should study and block it out" needs a
     real language model, which means a key behind an /api proxy like weather
     and stocks already use. That is a deliberate second version.

     Every action goes through the owning module's own add(), so it persists and
     re-renders exactly as if you had typed it into the form yourself. */
  const Voice = (() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SR;
    let rec = null, listening = false;
    /* guards the one-shot retry below. Reset only on a MANUAL tap — resetting it
       when recognition opens would let a failing service retry forever. */
    let retried = false;

    /* Spoken language is not tab names. "Food", "money" and "school" are what
       a person actually says. */
    const TAB_WORDS = {
      home:'home', dashboard:'home',
      gym:'gym', workout:'gym', workouts:'gym', training:'gym', lift:'gym', lifts:'gym',
      nutrition:'nutrition', food:'nutrition', macros:'nutrition', meals:'nutrition', calories:'nutrition',
      supplements:'supplements', stack:'supplements', supplement:'supplements',
      subscriptions:'subscriptions', subs:'subscriptions',
      vitals:'vitals', recovery:'vitals',
      peak:'peak', energy:'peak',
      map:'map', maps:'map', places:'map', weather:'map',
      stocks:'stocks', stock:'stocks', portfolio:'stocks',
      finance:'finance', money:'finance', budget:'finance',
      photos:'photos', pictures:'photos',
      academics:'academics', school:'academics', sat:'academics', college:'academics',
      goals:'goals', goal:'goals',
      reminders:'reminders',
      logs:'logs', water:'logs', steps:'logs', sleep:'logs',
      clothes:'clothes', wardrobe:'clothes', fits:'clothes',
      sports:'sports', soccer:'sports',
      calendar:'calendar', schedule:'calendar', agenda:'calendar',
      stats:'stats', statistics:'stats',
    };

    const WORD_NUM = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8,
                       nine:9, ten:10, eleven:11, twelve:12, noon:12, midnight:0 };
    const WD = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };

    const fmtHM = (h, m) => {
      const ap = h < 12 ? 'am' : 'pm';
      const hh = h % 12 === 0 ? 12 : h % 12;
      return hh + (m ? ':' + String(m).padStart(2, '0') : '') + ap;
    };
    const tidy = (s) => String(s || '')
      .replace(/^(to|that|a|an|the)\s+/i, '')
      .replace(/\s+/g, ' ').trim()
      .replace(/^./, c => c.toUpperCase());

    /* ── WHEN ──────────────────────────────────────────────────────────────
       Returns the moment AND the leftover text, so what gets saved is "Gym"
       rather than "gym at six pm tomorrow". */
    function parseWhen(raw) {
      let s = ' ' + String(raw).toLowerCase() + ' ';
      const date = new Date(); date.setSeconds(0, 0);
      let hour = null, min = 0, saidDate = '';

      if (/\btomorrow\b/.test(s)) {
        date.setDate(date.getDate() + 1); saidDate = 'tomorrow';
        s = s.replace(/\btomorrow\b/g, ' ');
      } else if (/\b(today|tonight)\b/.test(s)) {
        saidDate = 'today';
        if (/\btonight\b/.test(s)) hour = 20;
        s = s.replace(/\b(today|tonight)\b/g, ' ');
      } else {
        const m = s.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
        if (m) {
          let delta = (WD[m[2]] - date.getDay() + 7) % 7;
          /* "Monday" spoken on a Monday means the NEXT one — nobody schedules
             something for a day that is already half gone */
          if (delta === 0) delta = 7;
          date.setDate(date.getDate() + delta);
          saidDate = m[2][0].toUpperCase() + m[2].slice(1);
          s = s.replace(m[0], ' ');
        }
      }

      let t = s.match(/\bat\s+(\d{1,2})[:.](\d{2})\s*(am|pm)?/) || s.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)\b/);
      if (t) {
        hour = +t[1]; min = +t[2];
        if (t[3] === 'pm' && hour < 12) hour += 12;
        if (t[3] === 'am' && hour === 12) hour = 0;
        s = s.replace(t[0], ' ');
      } else {
        t = s.match(/\bat\s+(\d{1,2})\s*(am|pm)?\b/) || s.match(/\b(\d{1,2})\s*(am|pm)\b/);
        if (t) {
          hour = +t[1];
          if (t[2] === 'pm' && hour < 12) hour += 12;
          else if (t[2] === 'am' && hour === 12) hour = 0;
          /* No am/pm said. "At 6" nearly always means the evening, "at 9" the
             morning. Guess — then say the guess back, so a wrong one is caught
             by ear straight away instead of silently sitting in the calendar. */
          else if (hour >= 1 && hour <= 7) hour += 12;
          s = s.replace(t[0], ' ');
        } else {
          const w = s.match(/\bat\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|midnight)\s*(am|pm)?\b/);
          if (w) {
            hour = WORD_NUM[w[1]];
            if (w[2] === 'pm' && hour < 12) hour += 12;
            else if (!w[2] && hour >= 1 && hour <= 7) hour += 12;
            s = s.replace(w[0], ' ');
          }
        }
      }

      if (hour !== null) date.setHours(hour, min, 0, 0);
      const said = [saidDate, hour !== null ? fmtHM(hour, min) : ''].filter(Boolean).join(' at ');
      return { date, hour, min, rest: s.replace(/\s+/g, ' ').trim(), said };
    }

    /* a day-list item, written the way DayFlow and Cal both already read it */
    function addDayTask(ds, text) {
      const key = 'nv.day.' + ds;
      const cur = Store.get(key, []);
      const arr = Array.isArray(cur) ? cur : [];
      arr.push({ text, done: false });
      Store.set(key, arr);
      window.dispatchEvent(new CustomEvent('nv-day-changed'));
      try { if (DayFlow && DayFlow.render) DayFlow.render(); } catch (e) {}
    }

    /* ── WHAT ──────────────────────────────────────────────────────────────
       Most specific first. "Add a goal to go to the gym" must not be caught by
       the navigation rule merely because it contains "go to". */
    function interpret(raw) {
      const low = raw.trim().replace(/[.!]+$/, '').toLowerCase();

      let m = low.match(/^(?:add|create|new|set)\s+(?:a\s+|an\s+)?goal\s+(?:to\s+|of\s+|called\s+)?(.+)$/);
      if (m) {
        const w = parseWhen(m[1]);
        const title = tidy(w.rest);
        if (!title) return { ok:false, say:'I heard "goal" but not what the goal is.' };
        const deadline = w.said ? localDateKey(w.date) : '';
        Goals.add(title, deadline);
        return { ok:true, tab:'goals', say:'Goal added: ' + title + (deadline ? ', due ' + w.said : '') };
      }

      m = low.match(/^(?:add|create|new|save)\s+(?:an\s+|a\s+)?(?:app\s+)?idea\s+(?:to\s+|for\s+|about\s+)?(.+)$/)
       || low.match(/^idea\s+(.+)$/);
      if (m) {
        const text = tidy(m[1]);
        if (!text) return { ok:false, say:'I heard "idea" but not what it was.' };
        const isTab = /\btabs?\b/.test(text.toLowerCase());
        Ideas.add(text, isTab ? 'tab' : 'feature', isTab ? 'NEW TAB' : '');
        return { ok:true, tab:'home', say:'Idea saved: ' + text };
      }

      m = low.match(/^remind\s+me\s+(?:to\s+|about\s+|that\s+)?(.+)$/);
      if (m) {
        const w = parseWhen(m[1]);
        const text = tidy(w.rest);
        if (!text) return { ok:false, say:'I heard "remind me" but not what about.' };
        /* no time said → 9am, and say so, rather than filing it at whatever
           minute it happens to be right now */
        if (w.hour === null) w.date.setHours(9, 0, 0, 0);
        Reminders.add(text, w.date.toISOString());
        return { ok:true, tab:'reminders', say:'Reminder set: ' + text + ', ' + (w.said || 'today at 9am') };
      }

      m = low.match(/^(?:add|put)\s+(?:a\s+)?(?:task|to-?do|todo)\s+(.+)$/)
       || low.match(/^(?:add|put)\s+(.+?)\s+(?:to|on|in)\s+(?:my\s+)?(?:day|list|today|calendar|schedule)$/)
       || low.match(/^(?:schedule|block)\s+(.+)$/);
      if (m) {
        const w = parseWhen(m[1]);
        const text = tidy(w.rest);
        if (!text) return { ok:false, say:'I did not catch what to add.' };
        addDayTask(localDateKey(w.date), w.hour !== null ? fmtHM(w.hour, w.min) + ' · ' + text : text);
        return { ok:true, tab:'home', say:'Added ' + text + (w.said ? ' ' + w.said : ' to today') };
      }

      /* navigation last, so it never swallows the rules above */
      m = low.match(/^(?:go\s+to|open|show(?:\s+me)?|take\s+me\s+to|switch\s+to)\s+(?:the\s+|my\s+)?(.+)$/);
      if (m) {
        const word = m[1].replace(/\s+tab$/, '').trim();
        const tab = jumpTo(word);
        if (tab) return { ok:true, tab, say:'Opening ' + tab };
        return { ok:false, say:'I have no tab called ' + word };
      }

      /* ── THE QUICK JUMP ──────────────────────────────────────────────────
         A bare word that names a tab IS a navigation command. Typing "gym"
         should not require the ceremony of "go to gym" — this is the fastest
         way through the app, and it runs entirely here with no model call and
         no key. Last resort, so it can never shadow a real command. */
      if (!/\s/.test(low)) {
        const tab = jumpTo(low);
        if (tab) return { ok:true, tab, say:'Opening ' + tab };
      }

      return { ok:false, unknown:true, say:'I did not understand that.' };
    }

    /* ══════════════════  THE WAKE WORD  ══════════════════
       "Nova" opens her, the way you'd expect. What this is NOT is Siri: a web
       page cannot wake from a closed tab or a locked phone — only the
       operating system can do that. This runs while the app is open, and only
       when switched on, because it holds the microphone the entire time.

       Two browser realities shape the code below. Only ONE recogniser may
       hold the microphone, so the wake listener must stand down before the
       command listener starts and resume after. And Chrome ends recognition
       after a stretch of silence, so it has to restart itself or it quietly
       dies after a minute and looks broken. */
    const WAKE_KEY = 'nv.voice.wake';
    let wakeRec = null, wakeOn = false, wakePaused = false, wakeTimer = null;
    let armed = false, armTimer = null;
    /* what a speech engine actually hears when someone says "Nova" */
    const WAKE_RE = /\b(nova|no va|nomad|nover|novah|neva|nouveau)\b/i;

    /* ── WHY THE COMMAND RIDES THE SAME STREAM ────────────────────────────
       The obvious build — hear "Nova", stop the wake listener, start a fresh
       recogniser for the command — costs a full teardown and a new handshake
       with the speech service every single time. That handshake IS the lag.

       So we never switch. The words after "Nova" arrive on the stream that is
       already open, and the panel lights up on the INTERIM result, before the
       engine has even finalised the word. She answers while you are still
       talking rather than after you have stopped. */
    function armGlow() {
      show('live', 'Nova', 'Listening…');
      $('[data-voice-fab]')?.classList.add('is-live');
    }
    function arm() {
      armed = true;
      armGlow();
      clearTimeout(armTimer);
      /* said her name and then nothing — stand down rather than staying armed
         and grabbing the next unrelated sentence in the room */
      armTimer = setTimeout(() => { armed = false; $('[data-voice-fab]')?.classList.remove('is-live'); hideSoon(1200); }, 7000);
    }
    function disarm() {
      armed = false; clearTimeout(armTimer);
      $('[data-voice-fab]')?.classList.remove('is-live');
    }

    function wakeStart() {
      if (!SR || !wakeOn || wakePaused || wakeRec) return;
      try {
        wakeRec = new SR();
        wakeRec.lang = 'en-US';
        wakeRec.continuous = true;
        wakeRec.interimResults = true;
        wakeRec.onresult = (e) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            const txt = String(res[0].transcript || '');
            const m = txt.match(WAKE_RE);

            if (!armed) {
              if (!m) continue;
              /* light up the moment the word appears, final or not */
              if (!res.isFinal) { armGlow(); continue; }
              /* "nova open gym" — the command came in the same breath */
              const cut = txt.toLowerCase().lastIndexOf(m[0].toLowerCase()) + m[0].length;
              const after = txt.slice(cut).replace(/^[\s,.]+/, '').trim();
              if (after) { disarm(); spoken = true; run(after); return; }
              arm();                                   // just her name — wait for it
            } else if (res.isFinal) {
              const cmd = txt.replace(WAKE_RE, '').replace(/^[\s,.]+/, '').trim();
              if (cmd) { disarm(); spoken = true; run(cmd); return; }
            }
          }
        };
        /* Chrome ends the stream on silence; without this it dies after ~60s */
        wakeRec.onend = () => { wakeRec = null; if (wakeOn && !wakePaused) wakeTimer = setTimeout(wakeStart, 350); };
        wakeRec.onerror = (e) => {
          wakeRec = null;
          /* a refused mic or an unreachable speech service will never fix
             itself by retrying — switch off and say so, rather than looping */
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'network') {
            setWake(false);
            show('bad', 'Wake word off', e.error === 'network'
              ? 'The speech service is unreachable from this browser.'
              : 'The microphone was blocked.');
            hideSoon(9000);
          }
        };
        wakeRec.start();
      } catch (err) { wakeRec = null; }
    }

    function wakeStop() {
      clearTimeout(wakeTimer);
      disarm();
      if (wakeRec) { try { wakeRec.onend = null; wakeRec.abort(); } catch (e) {} wakeRec = null; }
    }

    /* the command listener gives the microphone back when it is finished */
    function wakeResume() {
      if (!wakeOn) return;
      wakePaused = false;
      clearTimeout(wakeTimer);
      wakeTimer = setTimeout(wakeStart, 600);
    }

    function setWake(on) {
      wakeOn = !!on;
      Store.set(WAKE_KEY, wakeOn);
      const box = $('[data-voice-wake]'); if (box) box.checked = wakeOn;
      $('[data-voice-fab]')?.classList.toggle('is-wake', wakeOn);
      wakePaused = false;
      if (wakeOn) wakeStart(); else wakeStop();
    }

    /* Navigating from the hub has to dismiss the hub. Calling setActive alone
       switches the tab UNDERNEATH a full-screen overlay, which looks to the
       person like nothing happened. hide() dismisses and routes in one move,
       and is a no-op once the hub is already gone. */
    function goTab(tab) {
      if (document.body.classList.contains('intro-locked') && window.lifeHub && window.lifeHub.hide) {
        window.lifeHub.hide(tab);
      } else {
        Tabs.setActive(tab);
      }
    }

    /* exact word first, then a unique prefix — "nut" is nutrition, but "s"
       matches four tabs and so resolves to nothing rather than a guess */
    function jumpTo(word) {
      const w = String(word || '').trim().toLowerCase();
      if (!w) return null;
      if (TAB_WORDS[w]) return TAB_WORDS[w];
      const first = TAB_WORDS[w.split(' ')[0]];
      if (first) return first;
      const hits = [...new Set(
        Object.keys(TAB_WORDS).filter(k => k.startsWith(w)).map(k => TAB_WORDS[k])
      )];
      return hits.length === 1 ? hits[0] : null;
    }

    /* Short, and only on a real action. A machine that narrates everything
       gets muted within a day. */
    /* ══════════════════  HER VOICE  ══════════════════
       Browsers ship wildly different voice sets, so rather than name one that
       may not exist we score what is actually installed. The target is the
       calm British assistant register: en-GB first, female second, and the
       Google voices above the robotic system ones. */
    const VOICE_KEY = 'nv.voice.name';
    let VOICES = [], chosenVoice = null;

    function voiceScore(v) {
      let s = 0;
      if (/en[-_]GB/i.test(v.lang)) s += 12;          // the Jarvis accent
      else if (/^en/i.test(v.lang)) s += 4;
      if (/female|woman|hazel|serena|kate|libby|sonia|martha|fiona|karen|moira|tessa|samantha|zira|aria|jenny|ava|allison/i.test(v.name)) s += 9;
      if (/google/i.test(v.name)) s += 4;             // markedly more natural in Chrome
      if (/\b(male|david|daniel|george|ryan|mark|alex|fred|arthur|oliver)\b/i.test(v.name)) s -= 10;
      return s;
    }
    function loadVoices() {
      try { VOICES = window.speechSynthesis.getVoices() || []; } catch (e) { VOICES = []; }
      if (!VOICES.length) return;
      const saved = Store.get(VOICE_KEY, null);
      const match = saved && VOICES.find(v => v.name === saved);
      chosenVoice = match || VOICES.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
      renderVoicePicker();
    }
    function renderVoicePicker() {
      const sel = $('[data-voice-picker]'); if (!sel || !VOICES.length) return;
      const en = VOICES.filter(v => /^en/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
      sel.innerHTML = (en.length ? en : VOICES).map(v =>
        `<option value="${esc(v.name)}"${chosenVoice && v.name === chosenVoice.name ? ' selected' : ''}>${esc(v.name.replace(/^(Microsoft|Google)\s+/, ''))}</option>`
      ).join('');
      sel.hidden = false;
    }

    function speak(text) {
      try {
        if (!window.speechSynthesis) return;
        const u = new SpeechSynthesisUtterance(text);
        if (chosenVoice) u.voice = chosenVoice;
        /* a touch slower and a touch brighter than the default — assistant,
           not newsreader */
        u.rate = 1.0; u.pitch = 1.08; u.volume = .9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }

    const panel = () => $('[data-voice-panel]');
    function show(state, line, sub) {
      const p = panel(); if (!p) return;
      p.hidden = false; p.dataset.state = state;
      const l = $('[data-voice-line]'), s = $('[data-voice-sub]');
      if (l) l.textContent = line || '';
      if (s) s.textContent = sub || '';
    }
    let hideT = null;
    function hideSoon(ms) {
      clearTimeout(hideT);
      hideT = setTimeout(() => { const p = panel(); if (p) p.hidden = true; }, ms);
    }

    /* ── THE DIVISION OF LABOUR ─────────────────────────────────────────────
       Patterns run first: instant, free, and they work with no signal. Only
       what they cannot parse goes to the model — so "add task gym at 6" never
       costs anything, and "who won the game last night" gets the web. */
    /* whether the model has ever answered — null until we have tried once, so
       the first unknown phrase still gets a real attempt */
    let modelUp = null, misses = 0, spoken = false;

    async function run(text) {
      let r;
      try { r = interpret(text); }
      catch (e) { r = { ok:false, say:'That tripped me up.' }; }

      const save = $('[data-voice-save]');
      if (save) save.hidden = true;

      if (r.ok) {
        show('ok', '“' + text + '”', r.say);
        speak(r.say);
        if (r.tab && REAL_PANELS.includes(r.tab)) goTab(r.tab);
        hideSoon(3600);
        return;
      }

      /* A named failure — no tab called that, "goal" with no goal — is a real
         answer. Don't spend a model call telling them the same thing. */
      if (!r.unknown) { show('bad', '“' + text + '”', r.say); hideSoon(9000); return; }

      /* ── MISHEARD, NOT MISUNDERSTOOD ──────────────────────────────────────
         When there is no model to fall back on, an unrecognised phrase is
         almost always a mishearing — so ask again rather than making them
         wait on a network round-trip that can only report that her thinking
         is not connected. Twice, then stop, because a third "sorry?" is worse
         than admitting defeat. */
      if (spoken && modelUp === false) {
        if (misses < 2) {
          misses++;
          show('live', 'Sorry?', 'Say that again');
          speak('Sorry?');
          /* if the wake listener already holds the microphone, re-arm it —
             starting a second recogniser would collide and both would fail */
          if (wakeOn && wakeRec) arm();
          else setTimeout(() => { retried = false; try { start(); } catch (e) {} }, 380);
          return;
        }
        misses = 0;
        show('bad', '“' + text + '”', 'I did not catch that. You can type it below.');
        if (save) { save.hidden = false; save.dataset.text = text; }
        hideSoon(10000);
        return;
      }
      misses = 0;

      await think(text, save);
    }

    /* ══════════════════  WHAT NOVA KNOWS  ══════════════════
       A briefing of the board, rebuilt on every question so it is never stale.

       This is a SUMMARY, not a dump. Sending the raw stores would cost a
       fortune per question and bury the answer in noise — so each tab is
       reduced to the shape a person would actually ask about: what is open,
       what is due, this week's averages, today's totals.

       Read through Store rather than the modules, because a module holds its
       state in a closure loaded at init — Store is the truth on disk. */
    function snapshot() {
      const day  = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateKey(d); };
      const today = localDateKey();
      const s = { today, weekday: new Date().toLocaleDateString(undefined, { weekday: 'long' }) };

      /* ── goals: the open ones, with how far along and what is overdue ── */
      const gd = Store.get(KEYS.goals, {}) || {};
      const goals = Array.isArray(gd.goals) ? gd.goals : [];
      const pct = (g) => !Array.isArray(g.steps) || !g.steps.length
        ? (g.legacyProgress || 0)
        : Math.round(g.steps.filter(x => x.done).length / g.steps.length * 100);
      s.goals = goals.map(g => ({
        title: g.title,
        percent: pct(g),
        deadline: g.deadline || null,
        openSteps: (g.steps || []).filter(x => !x.done).map(x => x.text).slice(0, 5),
      })).filter(g => g.percent < 100);
      s.goalsDone = goals.length - s.goals.length;

      /* ── today, and what rolled over unfinished ── */
      const rawDay = Store.get('nv.day.' + today, []);
      const list = Array.isArray(rawDay) ? rawDay : (rawDay && typeof rawDay === 'object' ? [rawDay] : []);
      s.today = {
        open: list.filter(t => t && !t.done).map(t => t.text),
        done: list.filter(t => t && t.done).length,
      };

      /* ── logs: this week against the goals they set ── */
      const lg = Store.get('nv.logs', {}) || {};
      const avg = (a) => { const r = a.filter(v => typeof v === 'number' && !isNaN(v)); return r.length ? Math.round(r.reduce((x, y) => x + y, 0) / r.length) : null; };
      const sleepBy = {}; ((lg.sleep && lg.sleep.entries) || []).forEach(e => { if (e && e.date) sleepBy[e.date] = num(e.hours); });
      const water = (lg.water && lg.water.days) || {};
      const steps = ((lg.vitals || []).find(v => v && v.id === 'steps') || {}).entries || {};
      const wk = (fn) => Array.from({ length: 7 }, (_, i) => fn(day(6 - i)));
      s.week = {
        sleepAvgHours:  avg(wk(d => sleepBy[d])),  sleepGoal: (lg.sleep && lg.sleep.goal) || null,
        waterAvg:       avg(wk(d => water[d])),    waterGoal: (lg.water && lg.water.goal) || null,
        stepsAvg:       avg(wk(d => num(steps[d]) || undefined)),
        sleptLastNight: sleepBy[day(1)] ?? null,
        waterToday:     water[today] ?? null,
      };

      /* ── food: today's totals against target ── */
      const nut = Store.get(KEYS.nutrition, {}) || {};
      const dayN = (nut.days || {})[today];
      if (dayN) {
        const t = Object.values(dayN.meals || {}).reduce((a, items) =>
          (items || []).reduce((b, f) => ({
            cal: b.cal + num(f.cal), protein: b.protein + num(f.protein),
            carbs: b.carbs + num(f.carbs), fats: b.fats + num(f.fats),
          }), a), { cal: 0, protein: 0, carbs: 0, fats: 0 });
        s.foodToday = { calories: Math.round(t.cal), protein: Math.round(t.protein), carbs: Math.round(t.carbs), fats: Math.round(t.fats) };
      }
      s.foodTargets = nut.targets || null;

      /* ── body weight: latest and the direction of travel ── */
      const bw = Store.get(KEYS.bodyWeight, null);
      const bwArr = Array.isArray(bw) ? bw : (bw && Array.isArray(bw.entries) ? bw.entries : []);
      if (bwArr.length) {
        const sorted = [...bwArr].sort((a, b) => String(a.date).localeCompare(String(b.date)));
        s.weight = { latest: sorted[sorted.length - 1].weight ?? sorted[sorted.length - 1].value, on: sorted[sorted.length - 1].date };
        if (sorted.length > 1) s.weight.previous = sorted[Math.max(0, sorted.length - 8)].weight ?? sorted[Math.max(0, sorted.length - 8)].value;
      }

      /* ── the rest: counts and near-term items only ── */
      const rem = Store.get(KEYS.reminders, []) || [];
      s.reminders = (Array.isArray(rem) ? rem : []).filter(r => r && !r.done)
        .slice(0, 6).map(r => ({ text: r.text, when: r.when || r.at || null }));
      const ideas = Store.get(KEYS.ideas, []) || [];
      s.ideas = (Array.isArray(ideas) ? ideas : []).filter(i => i && !i.built).map(i => i.text).slice(0, 8);
      s.gymSplit = Store.get(KEYS.gymSplit, null);

      const subs = Store.get('nv.subs.v1', null);
      if (subs && Array.isArray(subs.items)) {
        s.subscriptions = { count: subs.items.length, monthly: Math.round(subs.items.reduce((a, x) => a + num(x.price || x.amount), 0)) };
      }
      return s;
    }

    /* the last few turns, so a follow-up ("what about tomorrow?") makes sense.
       Kept in memory only — it dies with the tab, which is the right lifetime
       for a conversation and keeps it out of any store that syncs. */
    let history = [];
    const HISTORY_TURNS = 8;

    /* ── ASKING NOVA PROPERLY ───────────────────────────────────────────────
       /api/nova holds the model key server-side — it is never in this file,
       because anything in this file is public. */
    async function think(text, save) {
      show('live', '“' + text + '”', 'Thinking…');
      $('[data-voice-fab]')?.classList.add('is-thinking');
      try {
        const res = await fetch('/api/nova', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, board: snapshot(), history }),
        });
        const d = await res.json();

        /* remember whether she has a brain, so the next unrecognised phrase
           can be answered instantly instead of waiting on this again */
        modelUp = !(d.error === 'no_key' || d.error === 'bad_key');

        if (d.error) {
          const why = d.error === 'no_key'
            ? 'My thinking is not connected yet — add ANTHROPIC_API_KEY in Vercel and redeploy.'
            : d.error === 'bad_key'      ? 'That API key was rejected.'
            : d.error === 'rate_limited' ? 'Too many questions at once — try again in a moment.'
                                         : 'I could not reach my thinking just now.';
          show('bad', '“' + text + '”', why);
          if (save) { save.hidden = false; save.dataset.text = text; }
          hideSoon(11000);
          return;
        }

        /* An action decided by the model still goes through the module's own
           add(), so a spoken goal is identical to a typed one. */
        if (d.kind === 'action') {
          const said = perform(d.action, d.input || {});
          show(said ? 'ok' : 'bad', '“' + text + '”', said || 'I understood, but could not do it.');
          if (said) speak(said);
          remember(text, said || 'could not do it');
          hideSoon(3800);
          return;
        }

        show('ok', '“' + text + '”', d.text + (d.searched ? '  ·  from the web' : ''));
        speak(d.text);
        remember(text, d.text);
        hideSoon(Math.min(30000, 6000 + d.text.length * 55));
      } catch (e) {
        show('bad', '“' + text + '”', 'I could not reach my thinking — you may be offline.');
        if (save) { save.hidden = false; save.dataset.text = text; }
        hideSoon(11000);
      } finally {
        $('[data-voice-fab]')?.classList.remove('is-thinking');
      }
    }

    /* Only the exchange is kept, never the board — the board is rebuilt fresh
       each turn, so storing it here would let a stale copy leak into a later
       answer. */
    function remember(said, replied) {
      history.push({ role: 'user', content: said });
      history.push({ role: 'assistant', content: String(replied).slice(0, 600) });
      if (history.length > HISTORY_TURNS * 2) history = history.slice(-HISTORY_TURNS * 2);
    }

    /* mark a task on a given day done, by matching its text loosely */
    function completeDayTask(dateKey, needle) {
      const k = 'nv.day.' + dateKey;
      const raw = Store.get(k, []);
      const listT = Array.isArray(raw) ? raw : [];
      const want = String(needle || '').trim().toLowerCase();
      if (!want) return '';
      const hit = listT.find(t => t && !t.done && String(t.text || '').toLowerCase().includes(want));
      if (!hit) return '';
      hit.done = true; hit.doneAt = Date.now();
      Store.set(k, listT);
      DayFlow.render();
      return hit.text;
    }

    /* the model names an action; this is the only place that maps names to the
       app's real add() functions */
    function perform(action, a) {
      try {
        if (action === 'complete_task') {
          const done = completeDayTask(a.date || localDateKey(), a.text);
          return done ? 'Ticked off: ' + done : '';
        }
        if (action === 'complete_goal') {
          const gd = Store.get(KEYS.goals, {}) || {};
          const want = String(a.title || '').trim().toLowerCase();
          const g = (gd.goals || []).find(x => x && String(x.title || '').toLowerCase().includes(want));
          if (!g) return '';
          (g.steps || []).forEach(st => { st.done = true; });
          if (!g.steps || !g.steps.length) g.legacyProgress = 100;
          Store.set(KEYS.goals, gd);
          Goals.renderAll(); Goals.renderWidget();
          return 'Goal complete: ' + g.title;
        }
        if (action === 'add_goal') {
          const g = Goals.add(a.title, a.deadline || '');
          return g ? 'Goal added: ' + g.title + (a.deadline ? ', due ' + a.deadline : '') : '';
        }
        if (action === 'add_task') {
          const label = a.time ? a.time + ' · ' + a.text : a.text;
          addDayTask(a.date || localDateKey(new Date()), label);
          Tabs.setActive('home');
          return 'Added ' + a.text + (a.time ? ' at ' + a.time : '') + ' on ' + (a.date || 'today');
        }
        if (action === 'add_reminder') {
          const when = new Date(a.when);
          if (isNaN(when)) return '';
          Reminders.add(a.text, when.toISOString());
          Tabs.setActive('reminders');
          return 'Reminder set: ' + a.text;
        }
        if (action === 'log_food') {
          const items = Array.isArray(a.items) ? a.items : [];
          if (!items.length) return '';
          let cal = 0, n = 0;
          items.forEach(f => { if (Nutrition.logFood(a.meal, f)) { cal += num(f.cal); n++; } });
          if (!n) return '';
          Tabs.setActive('nutrition');
          return 'Logged ' + n + (n === 1 ? ' item' : ' items') + ' · ' + Math.round(cal) + ' kcal';
        }
        if (action === 'add_idea') {
          const it = Ideas.add(a.text, a.kind || 'feature', a.kind === 'tab' ? 'NEW TAB' : '');
          return it ? 'Idea saved: ' + it.text : '';
        }
        if (action === 'navigate') {
          if (!REAL_PANELS.includes(a.tab)) return '';
          goTab(a.tab);
          return 'Opening ' + a.tab;
        }
      } catch (e) {}
      return '';
    }

    function start() {
      if (!supported) {
        show('bad', 'This browser cannot listen', 'Type it here instead — the commands are the same.');
        const f = $('[data-voice-fallback]');
        if (f) { f.hidden = false; f.focus(); }
        return;
      }
      if (listening) { stop(); return; }

      rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = false;

      listening = true;
      $('[data-voice-fab]')?.classList.add('is-live');
      show('live', 'Listening…', 'Try “add a goal to run a 10k” or “go to gym”');

      rec.onresult = (e) => {
        let interim = '', final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript;
        }
        if (interim) show('live', '“' + interim + '”', 'Listening…');
        if (final) { spoken = true; run(final.trim()); }
      };
      rec.onerror = (e) => {
        listening = false;
        $('[data-voice-fab]')?.classList.remove('is-live');

        /* 'network' does NOT mean your internet is down. Web Speech is not
           on-device: Chrome and Safari stream the audio to a speech service and
           get text back. Embedded browsers — VS Code's Simple Browser, in-app
           webviews, some privacy builds — have no access to that service, and
           fail this way every single time. Chrome also throws it spuriously on
           a first attempt, so one silent retry is worth it before complaining. */
        if (e.error === 'network' && !retried) {
          retried = true;
          setTimeout(() => { try { start(); } catch (err) {} }, 400);
          return;
        }

        const why =
          (e.error === 'not-allowed' || e.error === 'service-not-allowed')
            ? 'The microphone was blocked. Allow it for this site, then tap me again.'
          : e.error === 'no-speech' ? 'I did not hear anything — try again a bit closer.'
          : e.error === 'network'
            ? 'The speech service is unreachable from this browser. If you are in VS Code’s preview pane or an in-app browser, that is why — open the site in Safari or Chrome. Meanwhile, type below (your keyboard’s 🎤 dictates on device).'
          : e.error === 'audio-capture' ? 'No microphone was found on this device.'
          : 'Listening failed (' + e.error + '). Type it below instead.';

        show('bad', 'Could not listen', why);
        const f = $('[data-voice-fallback]');
        if (f) { f.hidden = false; try { f.focus(); } catch (err) {} }
        hideSoon(14000);
      };
      rec.onend = () => {
        listening = false;
        $('[data-voice-fab]')?.classList.remove('is-live');
        wakeResume();          // hand the microphone back to the wake listener
      };

      try { rec.start(); }
      catch (e) {
        listening = false;
        $('[data-voice-fab]')?.classList.remove('is-live');
        wakeResume();
      }
    }

    function stop() {
      try { rec && rec.stop(); } catch (e) {}
      listening = false;
      $('[data-voice-fab]')?.classList.remove('is-live');
    }

    function init() {
      /* a deliberate tap earns a fresh retry budget */
      $('[data-voice-fab]')?.addEventListener('click', () => { retried = false; wakePaused = true; wakeStop(); start(); });

      /* voices arrive asynchronously in most browsers — the first call is
         usually empty, and onvoiceschanged is the only reliable signal */
      loadVoices();
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
      $('[data-voice-picker]')?.addEventListener('change', (e) => {
        Store.set(VOICE_KEY, e.target.value);
        chosenVoice = VOICES.find(v => v.name === e.target.value) || chosenVoice;
        speak('This is my voice now.');
      });

      /* the wake word: restored from last time, and switched off entirely when
         the tab is hidden — nobody wants a background tab holding their mic */
      const wakeBox = $('[data-voice-wake]');
      if (!SR && wakeBox) wakeBox.closest('.nova__wake')?.setAttribute('hidden', '');
      if (wakeBox) {
        wakeBox.addEventListener('change', () => setWake(wakeBox.checked));
        if (Store.get(WAKE_KEY, false)) setWake(true);
      }
      document.addEventListener('visibilitychange', () => {
        if (!wakeOn) return;
        if (document.hidden) wakeStop();
        else wakeResume();
      });
      $('[data-voice-close]')?.addEventListener('click', () => {
        stop(); const p = panel(); if (p) p.hidden = true;
      });

      $('[data-voice-save]')?.addEventListener('click', (e) => {
        const t = e.currentTarget.dataset.text; if (!t) return;
        addDayTask(localDateKey(new Date()), tidy(t));
        e.currentTarget.hidden = true;
        show('ok', '“' + t + '”', 'Saved to today’s list instead.');
        hideSoon(2800);
      });

      /* typing is the fallback where the browser cannot listen — and the
         fastest way to test the parser without talking */
      const f = $('[data-voice-fallback]');
      if (f) f.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const v = f.value.trim(); if (!v) return;
        f.value = ''; spoken = false; misses = 0; run(v);
      });
    }

    return { init, run, supported };
  })();

  /* ─────────────────  BOOT  ───────────────── */
  function boot() {
    Countdown.init();
    Pomodoro.init();
    Modals.init();
    Goals.init();
    Reminders.init();
    Ideas.init();
    Noticed.render();
    Alerts.init();
    Voice.init();             // Nova — the mic beside the bell
    renderTileActions();      // bottom button rows on every rebuilt tile
    BodyWeight.init();
    ProgressLog.init();
    GymTimer.init();
    Gym.init();
    Tabs.init();

    FinHeatmap.init();
    Photos.initWidget();
    Photos.initPins();
    DayFlow.init();
    Cal.materializeToday();   // auto-plan rules → today's list (dormant until rules exist)

    // Widget manager — home cards init first (home is default visible tab)
    WidgetManager.initHomeCards();
    WidgetManager.initFloatingWidgets();

    // Render home nutrition widgets on load so they show data immediately
    Nutrition.renderMacroWidget();
    Nutrition.renderHeatmap();
    Nutrition.renderSuppWidget();
    Nutrition.renderElecWidget();

    // Sync initial visibility
    WidgetManager.updateVisibility(document.body.dataset.view || 'home');
  }

  // Boot only once the cloud layer has pulled our data into localStorage.
  // If sync.js isn't present, it still fires nv-data-ready in local-only mode.
  const whenDom = (fn) =>
    (document.readyState === 'loading')
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();
  if (window.__nvDataReady) whenDom(boot);
  else window.addEventListener('nv-data-ready', () => whenDom(boot), { once: true });
})();
