/* ============================================================================
   /api/weather — conditions for a coordinate: now, next hours, next days.

   Source: OpenWeather. Deliberately uses only the two FREE endpoints:
     /data/2.5/weather   current conditions
     /data/2.5/forecast  5 days in 3-hour steps (40 entries)

   One Call 3.0 would give true hourly in a single request, but it wants a card
   on file even for the free allowance. Everything below is derived from the
   3-hour steps instead, so this costs nothing and needs no billing setup.

     /api/weather?lat=40.7&lon=-74
       -> { place, now:{...}, hourly:[...6], daily:[...5] }

   Set OPENWEATHER_API_KEY in Vercel -> Environment Variables, then redeploy.
   A 401 from OpenWeather almost always means "key not activated yet" — new
   keys take an hour or two, which looks exactly like a wrong key.
   ========================================================================== */

/* One coarse class per condition, so the client can draw an inline SVG instead
   of pulling OpenWeather's raster icons over the network on every render. */
function kindOf(id) {
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'haze';
  if (id === 800)            return 'clear';
  if (id === 801 || id === 802) return 'partly';
  return 'cloud';
}

const norm = (w, main) => ({
  desc:  w?.description || '',
  kind:  kindOf(w?.id ?? 0),
  tempC: main?.temp != null ? Math.round(main.temp) : null,
});

export default async function handler(req, res) {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'bad_coords' });
  }

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return res.status(200).json({ error: 'no_key' });

  const q = `lat=${lat}&lon=${lon}&units=metric&appid=${key}`;

  try {
    const [cRes, fRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?${q}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?${q}`),
    ]);

    if (!cRes.ok) return res.status(200).json({ error: 'upstream', status: cRes.status });
    const c = await cRes.json();
    if (typeof c.main?.temp !== 'number') return res.status(200).json({ error: 'no_data' });

    const now = {
      ...norm(c.weather?.[0], c.main),
      feelsC:   c.main?.feels_like != null ? Math.round(c.main.feels_like) : null,
      hiC:      c.main?.temp_max   != null ? Math.round(c.main.temp_max)   : null,
      loC:      c.main?.temp_min   != null ? Math.round(c.main.temp_min)   : null,
      wind:     c.wind?.speed != null ? Math.round(c.wind.speed * 3.6) : null,   // m/s -> km/h
      humidity: c.main?.humidity ?? null,
      /* Seconds east of UTC. This is what lets the panel show the LOCAL time of
         a place you are not standing in — the whole point of watching several
         cities at once. */
      tzOffset: typeof c.timezone === 'number' ? c.timezone : 0,
    };

    let hourly = [], daily = [];

    if (fRes.ok) {
      const f = await fRes.json();
      const list = Array.isArray(f.list) ? f.list : [];

      hourly = list.slice(0, 6).map(s => ({ at: s.dt, ...norm(s.weather?.[0], s.main) }));

      /* Group the 3-hour steps into days in the PLACE's local day, not the
         server's. A city eight hours away otherwise gets its days sliced in
         the wrong place, and "tomorrow's high" is quietly the wrong number. */
      const byDay = new Map();
      for (const s of list) {
        const local = new Date((s.dt + now.tzOffset) * 1000);
        const dk = local.toISOString().slice(0, 10);
        const hour = local.getUTCHours();
        if (!byDay.has(dk)) byDay.set(dk, { at: s.dt, hi: -Infinity, lo: Infinity, mid: null, midHour: 99, first: s });
        const d = byDay.get(dk);
        if (s.main?.temp_max != null) d.hi = Math.max(d.hi, s.main.temp_max);
        if (s.main?.temp_min != null) d.lo = Math.min(d.lo, s.main.temp_min);
        /* the step nearest midday stands for how the day looks */
        if (Math.abs(hour - 12) < Math.abs(d.midHour - 12)) { d.mid = s; d.midHour = hour; }
      }

      daily = [...byDay.values()].slice(0, 5).map(d => ({
        at:  d.at,
        hiC: Number.isFinite(d.hi) ? Math.round(d.hi) : null,
        loC: Number.isFinite(d.lo) ? Math.round(d.lo) : null,
        ...norm((d.mid || d.first).weather?.[0], null),
      }));
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({ place: c.name || '', now, hourly, daily });
  } catch (e) {
    return res.status(200).json({ error: 'fetch_failed' });
  }
}
