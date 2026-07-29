/* ============================================================================
   /api/weather — conditions for a coordinate.

   Source: OpenWeather. Free tier, no card required for the current-weather
   endpoint. Get a key at https://openweathermap.org/api — note it can take
   an hour or two to activate after signup, which looks exactly like a bad key.

   Set it as OPENWEATHER_API_KEY in Vercel → Settings → Environment Variables,
   then redeploy.

     /api/weather?lat=40.7&lon=-74   →  { tempC, tempF, feelsC, desc, icon, wind, humidity }

   Useful on Home, and genuinely useful on a run log — it explains why a run
   felt harder than the pace suggests.
   ========================================================================== */

export default async function handler(req, res) {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'bad_coords' });
  }

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return res.status(200).json({ error: 'no_key' });

  try {
    const url = 'https://api.openweathermap.org/data/2.5/weather'
      + `?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
    const r = await fetch(url);
    /* 401 here almost always means "key not activated yet", not "key wrong" */
    if (!r.ok) return res.status(200).json({ error: 'upstream', status: r.status });

    const d = await r.json();
    const tempC = d.main?.temp;
    if (typeof tempC !== 'number') return res.status(200).json({ error: 'no_data' });

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({
      tempC:    Math.round(tempC),
      tempF:    Math.round(tempC * 9 / 5 + 32),
      feelsC:   d.main?.feels_like != null ? Math.round(d.main.feels_like) : null,
      desc:     d.weather?.[0]?.description || '',
      icon:     d.weather?.[0]?.icon || '',
      wind:     d.wind?.speed != null ? Math.round(d.wind.speed * 3.6) : null,  // m/s → km/h
      humidity: d.main?.humidity ?? null,
      place:    d.name || '',
    });
  } catch (e) {
    return res.status(200).json({ error: 'fetch_failed' });
  }
}
