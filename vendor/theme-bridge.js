/* ============================================================================
   THEME BRIDGE — shared by every embedded tab (map, stocks, peak, vitals…).

   An iframe is its own document: it cannot read the parent app's CSS variables,
   so switching the app to violet used to leave these tabs stubbornly white.
   This listens for the accent the host posts in, writes it into local CSS
   variables, and exposes window.NV_ACCENT so canvas backdrops (the drifting
   crosses) can paint in the same colour.

   Drop this in with:  <script src="vendor/theme-bridge.js"></script>
   Then, in a canvas backdrop, use  window.NV_ACCENT  instead of a hard '#fff'.
   ========================================================================== */
(function () {
  'use strict';

  /* Sensible default until the host answers — the app's own crimson. */
  window.NV_ACCENT = '#E11D38';
  window.NV_ACCENT_RGB = '225, 29, 56';

  function apply(t) {
    if (!t) return;
    var r = document.documentElement.style;
    if (t.accent)      r.setProperty('--accent', t.accent);
    if (t.accentBr)    r.setProperty('--accent-bright', t.accentBr);
    if (t.accentRgb)   r.setProperty('--accent-rgb', t.accentRgb);
    if (t.accentBrRgb) r.setProperty('--accent-br-rgb', t.accentBrRgb);

    /* Tiles were built with their own token names. Map the accent onto all of
       them so a theme change reaches every borrowed stylesheet, whatever it
       happens to call its highlight colour. */
    ['--brand', '--mint', '--mint-ic', '--pos', '--good', '--cu', '--gold', '--c-crimson', '--c-crimson-br']
      .forEach(function (name) { if (t.accentBr) r.setProperty(name, t.accentBr); });

    if (t.accentBr)  window.NV_ACCENT = t.accentBr;
    if (t.accentBrRgb) window.NV_ACCENT_RGB = t.accentBrRgb;

    /* LIGHT MODE. An accent alone was never enough — the host can now invert
       its whole scale, and an iframe that only hears "the accent is cyan"
       stays a black rectangle inside a white app. So the host says which mode
       it is in, and the embedded page pulls in the shared light overrides.

       The stylesheet is added once and left in place; only the attribute
       toggles, so switching back and forth afterwards costs nothing. */
    if (t.mode) {
      var root = document.documentElement;
      if (t.mode === 'light') {
        if (!document.getElementById('nv-daylight-embed')) {
          var link = document.createElement('link');
          link.id = 'nv-daylight-embed';
          link.rel = 'stylesheet';
          link.href = '/theme-daylight-embed.css?v=1';
          document.head.appendChild(link);
        }
        root.setAttribute('data-mode', 'light');
      } else {
        root.removeAttribute('data-mode');
      }
    }

    /* let the page react (repaint a canvas, redraw a chart) */
    window.dispatchEvent(new CustomEvent('nv-theme', { detail: t }));
  }

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (m && m.source === 'nv-host' && m.type === 'theme') apply(m);
  });

  /* Ask immediately — the host may have broadcast before we were listening. */
  try { parent.postMessage({ source: 'nv-embed', type: 'theme:request' }, '*'); } catch (e) {}
})();
