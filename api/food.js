/* ============================================================================
   /api/food — search a food, get its macros.

   Source: USDA FoodData Central. Free, no billing, no card. Get a key at
   https://fdc.nal.usda.gov/api-key-signup.html — it arrives by email instantly.

   Set it as FDC_API_KEY in Vercel → Settings → Environment Variables, then
   redeploy. Same shape as /api/quote: the key lives here, never in the page.

     /api/food?q=greek yogurt   →  { items: [{ name, brand, kcal, protein, carbs, fat, serving }] }

   Without a key it returns { error: 'no_key' } so the caller can fall back to
   manual entry instead of breaking.
   ========================================================================== */

const NUTRIENT = {
  kcal:    [1008, 2047, 2048],   // energy, in preference order
  protein: [1003],
  carbs:   [1005],
  fat:     [1004],
};

function pick(nutrients, ids) {
  for (const id of ids) {
    const hit = nutrients.find(n => n.nutrientId === id || n.nutrientNumber === String(id));
    if (hit && typeof hit.value === 'number') return Math.round(hit.value * 10) / 10;
  }
  return null;
}

export default async function handler(req, res) {
  const q = String(req.query.q || '').trim();
  if (!q || q.length > 80) return res.status(400).json({ error: 'bad_query' });

  const key = process.env.FDC_API_KEY;
  if (!key) return res.status(200).json({ error: 'no_key' });

  try {
    const r = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
      body: JSON.stringify({
        query: q,
        pageSize: 8,
        /* branded first: people search for what is in the cupboard, not a
           laboratory reference sample */
        dataType: ['Branded', 'SR Legacy', 'Foundation'],
      }),
    });
    if (!r.ok) return res.status(200).json({ error: 'upstream', status: r.status });

    const data = await r.json();
    const items = (data.foods || []).map(f => {
      const n = f.foodNutrients || [];
      return {
        name:    f.description || '',
        brand:   f.brandName || f.brandOwner || '',
        serving: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || ''}` : '100g',
        kcal:    pick(n, NUTRIENT.kcal),
        protein: pick(n, NUTRIENT.protein),
        carbs:   pick(n, NUTRIENT.carbs),
        fat:     pick(n, NUTRIENT.fat),
      };
    }).filter(x => x.kcal != null);

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(200).json({ error: 'fetch_failed' });
  }
}
