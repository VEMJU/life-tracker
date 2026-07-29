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

async function subscriptions() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];
  const r = await fetch(`${url}/rest/v1/push_subscriptions?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) return [];
  return r.json();
}

async function dropDead(endpoint) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
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

  const payload = req.query.test
    ? { title: 'Life Tracker', body: 'Push is working. This is a test.', tab: 'home', tag: 'test' }
    : {
        title: 'Today',
        body: 'Open your day — goals, training, and what needs you.',
        tab: 'calendar',
        tag: 'daily',
      };

  const subs = await subscriptions();
  if (!subs.length) return res.status(200).json({ sent: 0, note: 'no subscriptions stored yet' });

  let sent = 0, dead = 0;
  await Promise.all(subs.map(async (s) => {
    const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      sent++;
    } catch (e) {
      /* 404/410 mean the subscription is gone for good */
      if (e.statusCode === 404 || e.statusCode === 410) { await dropDead(s.endpoint); dead++; }
    }
  }));

  return res.status(200).json({ sent, dead, total: subs.length });
}
