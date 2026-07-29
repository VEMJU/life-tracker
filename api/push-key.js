/* ============================================================================
   /api/push-key — hands the browser our PUBLIC VAPID key.

   VAPID is a keypair that proves a push came from us:
     · PUBLIC  key → safe to give to the browser (that is this endpoint)
     · PRIVATE key → server only, signs each push, never leaves Vercel

   Generate the pair once (see README-PUSH.md) and set both in
   Vercel → Settings → Environment Variables:
     VAPID_PUBLIC_KEY
     VAPID_PRIVATE_KEY
   ========================================================================== */

export default function handler(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(200).json({ error: 'no_key' });
  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).json({ key });
}
