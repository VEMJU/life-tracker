/* ============================================================================
   /api/quote — the key-holder.

   WHY THIS FILE EXISTS
   A static site cannot keep a secret. Anything the browser sends, a visitor can
   read: open DevTools, look at the network tab, there is your key. So the key
   never goes in the page. It lives on the server, in an environment variable,
   and the browser asks THIS function for a price instead of asking Finnhub.

       browser  →  /api/quote?symbol=AAPL  →  [key added here]  →  Finnhub
                ←        just a number     ←

   This runs on Vercel automatically — any file in /api becomes an endpoint.
   On GitHub Pages there is no server, so this does not run and the Stocks tab
   simply falls back to entering prices by hand. That is the honest trade:
   live prices need Vercel.

   SET THE KEY
     Local  → .env.local at the repo root:  FINNHUB_API_KEY=xxxxxxxx
     Live   → Vercel → Project → Settings → Environment Variables
   Never in the code, never in a commit.
   ========================================================================== */

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').trim().toUpperCase();

  /* only letters, dots and dashes — a ticker, not a URL someone smuggled in */
  if (!symbol || !/^[A-Z.\-]{1,12}$/.test(symbol)) {
    return res.status(400).json({ error: 'bad_symbol' });
  }

  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    /* no key configured: say so plainly so the tile can fall back to manual */
    return res.status(200).json({ error: 'no_key' });
  }

  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`
    );
    /* Pass the upstream status through. 401/403 = the key is wrong or revoked,
       429 = rate limited. Without this the failure is indistinguishable. */
    if (!r.ok) return res.status(200).json({ error: 'upstream', status: r.status });

    const q = await r.json();
    /* Finnhub: c = current, d = change, dp = percent change, pc = prev close.
       An unknown ticker comes back as all zeroes rather than an error. */
    if (!q || typeof q.c !== 'number' || q.c === 0) {
      return res.status(200).json({ error: 'unknown_symbol' });
    }

    /* cache at the edge: prices move, but not 40 times a minute, and the free
       tier has a rate limit worth respecting */
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).json({
      symbol,
      price: q.c,
      change: q.d ?? null,
      changePct: q.dp ?? null,
      prevClose: q.pc ?? null,
    });
  } catch (e) {
    return res.status(200).json({ error: 'fetch_failed' });
  }
}
