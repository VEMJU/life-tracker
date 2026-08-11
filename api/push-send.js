/* ============================================================================
   /api/push-send — the thing that actually reaches your phone.

   Called two ways:
     · by Vercel Cron on a schedule (see vercel.json)
     · by you, manually, with ?test=1 to prove the pipe works

   It reads every stored subscription from Supabase and posts the day's
   notification to each. A subscription that comes back 404/410 is dead (app
   uninstalled, permission revoked) and gets deleted so the list stays clean.

   REQUIRED ENV (Vercel → Settings → Environment Variables):
     VAPID_PUBLIC_KEY        public half of the pair
     VAPID_PRIVATE_KEY       private half — server only
     VAPID_SUBJECT           mailto:you@example.com
     SUPABASE_URL            your project URL
     SUPABASE_SERVICE_KEY    the SERVICE ROLE key (server only, bypasses RLS)
     CRON_SECRET             any random string; blocks strangers hitting this
   ========================================================================== */

import webpush from 'web-push';

/* Returns { rows } or { fail } — never a bare empty array on error. Swallowing
   a failure here is the cruellest possible bug: a bad key would report "no
   subscriptions yet" forever and send you hunting through your phone settings
   for a problem that was never there. */
async function subscriptions() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url) return { fail: 'SUPABASE_URL is not set in Vercel' };
  if (!key) return { fail: 'SUPABASE_SERVICE_KEY is not set in Vercel' };

  /* Secret keys (sb_secret_…) go in `apikey` ONLY. They are not JWTs, so
     Supabase rejects them in an Authorization: Bearer header. It also refuses
     any secret-key request whose User-Agent looks like a browser — a guard
     against these ever being used client-side. Both are why this must stay
     server-side. */
  let r;
  try {
    r = await fetch(`${url}/rest/v1/push_subscriptions?select=*`, {
      headers: { apikey: key },
    });
  } catch (e) {
    return { fail: `could not reach Supabase: ${e.message}` };
  }

  if (r.status === 401 || r.status === 403) {
    return { fail: 'Supabase rejected SUPABASE_SERVICE_KEY (401/403) — copy the secret key again and redeploy' };
  }
  if (r.status === 404) {
    return { fail: 'table push_subscriptions not found — run supabase-push.sql' };
  }
  if (!r.ok) {
    return { fail: `Supabase returned ${r.status}: ${(await r.text()).slice(0, 200)}` };
  }
  return { rows: await r.json() };
}

/* ── READING ONE PERSON'S BOARD ───────────────────────────────────────────
   app_state holds every nv.* key as its own row. We only need two of them,
   so we ask for exactly those rather than dragging the whole board over. */
async function stateFor(userId, keys) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const list = keys.map(encodeURIComponent).join(',');
  try {
    const r = await fetch(
      `${url}/rest/v1/app_state?select=key,data&user_id=eq.${userId}&key=in.(${list})`,
      { headers: { apikey: key } }
    );
    if (!r.ok) return {};
    const out = {};
    for (const row of await r.json()) out[row.key] = row.data;
    return out;
  } catch (e) { return {}; }
}

/* The day the PERSON is living, not the server. Cron fires at 13:00 UTC,
   which is the morning in New York — using the UTC date there would be
   right by luck now and wrong after the clocks change. */
function localToday(tz = 'America/New_York') {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}

function daysUntil(date, today) {
  if (!date) return null;
  const a = new Date(date + 'T00:00:00Z'), b = new Date(today + 'T00:00:00Z');
  return Math.round((a - b) / 86400000);
}

/* ── THE BRIEF ────────────────────────────────────────────────────────────
   What actually needs this person today, in priority order: overdue first,
   then due today, then what is left on the planner. A notification gets one
   line of attention, so it names the most pressing thing and counts the
   rest — never a wall of text nobody reads. */
function composeBrief(state, today) {
  const goalsData = state['nv.goals'] || {};
  const goals = Array.isArray(goalsData.goals) ? goalsData.goals : [];
  const shopping = Array.isArray(goalsData.shoppingItems) ? goalsData.shoppingItems : [];

  /* the planner stores an array per day; guard anyway - one stray record in
     this very board is a bare object, and a crash here means silence */
  const rawDay = state[`nv.day.${today}`];
  const day = Array.isArray(rawDay) ? rawDay : rawDay && typeof rawDay === 'object' ? [rawDay] : [];
  const todo = day.filter(t => t && !t.done && t.text);

  const done = (g) => {
    if (!Array.isArray(g.steps) || !g.steps.length) return (g.legacyProgress || 0) >= 100;
    return g.steps.every(s => s.done);
  };
  const live = goals.filter(g => g && !done(g));

  const overdue = [], dueToday = [], dueSoon = [];
  for (const g of live) {
    const d = daysUntil(g.deadline, today);
    if (d === null) continue;
    if (d < 0) overdue.push(g); else if (d === 0) dueToday.push(g); else if (d <= 3) dueSoon.push(g);
  }

  const restock = shopping.filter((it) => {
    if (!it || !it.bought || !it.recurDays || !it.boughtAt) return false;
    const due = new Date(it.boughtAt + 'T00:00:00Z');
    due.setUTCDate(due.getUTCDate() + Number(it.recurDays || 0));
    return due <= new Date(today + 'T00:00:00Z');
  });

  const more = (n) => (n > 1 ? ` (+${n - 1} more)` : '');

  if (overdue.length)  return { title: 'Overdue',   body: `${overdue[0].title}${more(overdue.length)} — past its date.`, tab: 'goals',    tag: 'daily', urgent: true };
  if (dueToday.length) return { title: 'Due today', body: `${dueToday[0].title}${more(dueToday.length)}.`,               tab: 'goals',    tag: 'daily', urgent: true };

  if (todo.length) {
    const extra = dueSoon.length ? ` · ${dueSoon.length} goal${dueSoon.length > 1 ? 's' : ''} due within 3 days` : '';
    return { title: `${todo.length} left today`, body: `${todo[0].text}${more(todo.length)}${extra}`, tab: 'home', tag: 'daily' };
  }
  if (dueSoon.length)  return { title: 'Coming up', body: `${dueSoon[0].title}${more(dueSoon.length)} — due within 3 days.`, tab: 'goals', tag: 'daily' };
  if (restock.length)  return { title: 'Restock',   body: `${restock[0].name || restock[0].text || 'An item'}${more(restock.length)} is due.`, tab: 'goals', tag: 'daily' };

  if (day.length)   return { title: 'All clear', body: 'Everything on today is done. Solid day.', tab: 'home', tag: 'daily' };
  if (!goals.length) return { title: 'Set your day', body: 'No goals yet — add one and this becomes your morning brief.', tab: 'goals', tag: 'daily' };
  return { title: 'Today', body: 'Nothing due. Open your board and pick the day.', tab: 'home', tag: 'daily' };
}

/* ── THE MINUTE-BY-MINUTE BRIEF ───────────────────────────────────────────
   The daily brief answers "what does today look like". This answers "it is
   happening NOW", which is a different question and needs a different clock.

   Vercel's free plan runs cron once a day, so this mode is not driven by
   Vercel. Any scheduler that can make an HTTP request works, and a free
   external one does it every minute. This endpoint does not care who rings
   the bell — only that the secret is right.

   Returns null when nothing is due, and the caller then sends nothing at all.
   That is the whole design: a job firing 1,440 times a day must be silent
   1,438 of them, or it stops being a reminder and becomes a nuisance. */
function composeDue(state, today, nowMin) {
  const rawDay = state[`nv.day.${today}`];
  const day = Array.isArray(rawDay) ? rawDay : rawDay && typeof rawDay === 'object' ? [rawDay] : [];
  if (!day.length) return null;

  /* "16:30" → 990. Unparseable returns null and is skipped — defaulting to
     midnight would fire every untimed task at 00:00. */
  const minutesOf = (t) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
    if (!m) return null;
    const h = +m[1], mi = +m[2];
    return (h > 23 || mi > 59) ? null : h * 60 + mi;
  };

  const LEAD = 10;
  let now = null, soon = null;

  for (const t of day) {
    if (!t || t.done || !t.text) continue;
    const at = minutesOf(t.at);
    if (at === null) continue;
    const gap = at - nowMin;
    /* Two minutes wide on each moment, because a scheduler that promises
       "every minute" drifts by seconds and an exact match would be missed. */
    if (gap <= 0 && gap > -2 && !now) now = t;
    else if (gap <= LEAD && gap > LEAD - 2 && !soon) soon = t;
  }

  if (now)  return { title: 'Now · ' + now.at, body: now.text, tab: 'home', tag: 'due-' + now.at, urgent: true };
  if (soon) return { title: 'In ' + LEAD + ' minutes', body: soon.text + '  ·  ' + soon.at, tab: 'home', tag: 'soon-' + soon.at };
  return null;
}

/* Minutes past midnight where the PERSON is, not where the server is. */
function localMinutes(tz) {
  try {
    const s = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date());
    const m = /^(\d{2}):(\d{2})$/.exec(s);
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  } catch (e) { return null; }
}

async function dropDead(endpoint) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: { apikey: key },       // secret key: apikey header only, never Bearer
  }).catch(() => {});
}

export default async function handler(req, res) {
  /* Vercel Cron sends its own auth header; a manual call must carry the secret */
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const fromCron = auth === `Bearer ${secret}`;
  const fromMe = req.query.secret && req.query.secret === secret;
  if (secret && !fromCron && !fromMe) return res.status(401).json({ error: 'unauthorised' });

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return res.status(200).json({ error: 'no_vapid_keys' });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:you@example.com', pub, priv);

  const got = await subscriptions();
  if (got.fail) return res.status(500).json({ error: got.fail });

  const subs = got.rows || [];
  if (!subs.length) {
    return res.status(200).json({ sent: 0, note: 'Supabase reachable, but no device has subscribed yet' });
  }

  const tz = process.env.USER_TZ || 'America/New_York';
  const today = localToday(tz);
  /* ?due=1 switches from "what does today look like" to "is something
     happening right now". Meant to be called every minute by an external
     scheduler; silent unless a task's time has just arrived. */
  const dueMode = !!req.query.due;
  const nowMin = dueMode ? localMinutes(tz) : null;
  if (dueMode && nowMin === null) {
    return res.status(500).json({ error: `USER_TZ is not a valid timezone: ${tz}` });
  }

  /* One brief per ACCOUNT, not per device — otherwise someone on a phone and
     a laptop pays to have their board read twice and gets two notifications
     that say the same thing. */
  const byUser = new Map();
  for (const s of subs) {
    const id = s.user_id || 'anon';
    if (!byUser.has(id)) byUser.set(id, []);
    byUser.get(id).push(s);
  }

  const briefs = new Map();
  await Promise.all([...byUser.keys()].map(async (id) => {
    if (id === 'anon') {
      /* An anonymous device has no board to read, so it has no times either —
         it gets the generic nudge on the daily run and nothing at all on the
         minute-by-minute one. */
      if (!dueMode) briefs.set(id, { title: 'Today', body: 'Open your board.', tab: 'home', tag: 'daily' });
      return;
    }
    const state = await stateFor(id, ['nv.goals', `nv.day.${today}`]);
    const brief = dueMode ? composeDue(state, today, nowMin) : composeBrief(state, today);
    if (brief) briefs.set(id, brief);
  }));

  /* Nothing due this minute — the overwhelmingly common case. Return before
     touching the push service at all. */
  if (dueMode && !briefs.size) {
    return res.status(200).json({ sent: 0, mode: 'due', today, nowMin, note: 'nothing due' });
  }

  /* ?preview=1 shows what today's brief WOULD say and sends nothing — so it
     can be checked at any hour instead of waiting for 9am. Returns before the
     sending loop, deliberately. */
  if (req.query.preview) {
    return res.status(200).json({ today, sent: 0, briefs: Object.fromEntries(briefs) });
  }

  const testPayload = { title: 'Life Tracker', body: 'Push is working. This is a test.', tab: 'home', tag: 'test' };

  let sent = 0, dead = 0;
  await Promise.all(subs.map(async (s) => {
    const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    const payload = req.query.test ? testPayload : briefs.get(s.user_id || 'anon');
    /* In ?due=1 mode a user with nothing happening has no brief at all.
       Without this guard JSON.stringify(undefined) returns undefined — not a
       string — and the push fails silently for everyone in the same batch. */
    if (!payload) return;
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      sent++;
    } catch (e) {
      /* 404/410 mean the subscription is gone for good */
      if (e.statusCode === 404 || e.statusCode === 410) { await dropDead(s.endpoint); dead++; }
    }
  }));

  return res.status(200).json({ sent, dead, total: subs.length, today });
}
