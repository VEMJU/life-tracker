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
    skincare:  {eyebrow:'Module',title:'Skincare', desc:'Active ingredient rotation and routine adherence. Module reserved.'},
    nutrition: {eyebrow:'Fuel & Form', title:'Nutrition'},
    finance:   {eyebrow:'Capital & Acquisition', title:'Finance'},
    photos:    {eyebrow:'Visual Archive',           title:'Photos'},
    academics: {eyebrow:'College Prep · Class of 2027', title:'Academics'},
    vision:    {eyebrow:'Module',title:'Vision',   desc:'North-star outcomes and dated milestones. Module reserved.'},
    logs:      {eyebrow:'Daily Vitals · The Ledger', title:'Logs'},
  };
  const REAL_PANELS = ['home','gym','goals','reminders','nutrition','finance','photos','academics','logs'];

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

    return { init, renderWidget, renderAll };
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

    return { init, render };
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

      // drag (mousedown on handle)
      const handle = $('[data-log-drag-handle]', panel);
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
      registry.push({id, el, defaultTabs});
      floatCard(id, el, defaultTabs);
      wireCard(id, el);
    }

    /* ── show/hide cards based on current tab ── */
    function updateVisibility(tab) {
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

    /* ── Macro rings (nutrition tab) ── */
    function renderMacroRings() {
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

    return {init, renderMacroWidget, renderHeatmap, renderSuppWidget, renderElecWidget};
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
      const line = pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
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

    function renderAll(){ seed(); renderSAT(); renderCredits(); renderSubjFilter(); renderSubjects(); renderEssay(); renderRecs(); renderECs(); }

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
        <div class="water-bars">${bars}</div>`;
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

  /* ═══════════════════  TABS  ═══════════════════ */
  const Tabs = (() => {
    const navlinks = () => $$('.navlink');
    const toplinks = () => $$('.topbar__link');

    function showPanel(name) {
      $$('[data-tab-panel]').forEach(p => { p.hidden=true; });
      if (REAL_PANELS.includes(name)) {
        const panel = $(`[data-tab-panel="${name}"]`);
        if (panel) panel.hidden = false;
        if (name==='home')      { Goals.renderWidget(); Workout.render(); }
        if (name==='goals')     Goals.renderAll();
        if (name==='reminders') Reminders.render();
        if (name==='gym')       { Gym.ensureRendered(); ProgressLog.refresh(); WidgetManager.initGymCards(); }
        if (name==='nutrition') Nutrition.init();
        if (name==='finance')   { Finance.init(); FinHeatmap.render(); }
        if (name==='photos')    { Photos.init(); WidgetManager.initPhotoCards(); }
        if (name==='academics') Academics.init();
        if (name==='logs')      Logs.init();
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
    }

    return { init, setActive };
  })();

  /* ─────────────────  BOOT  ───────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    Countdown.init();
    Pomodoro.init();
    Modals.init();
    Goals.init();
    Reminders.init();
    Workout.init();
    BodyWeight.init();
    ProgressLog.init();
    GymTimer.init();
    Gym.init();
    Tabs.init();

    FinHeatmap.init();
    Photos.initWidget();
    Photos.initPins();

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
  });
})();
