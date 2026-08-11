# Nathan's life tracker

Nathan Vélez's personal life-tracking app. Not a product, not a template — his
board, his data, his goals. Every decision here serves one person.

Live at **https://life-tracker-pt25.vercel.app** · repo `github.com/VEMJU/life-tracker`,
branch `main`. That is the only URL. A second Vercel project and a GitHub Pages
deploy were both retired in July 2026 because they served the same code without
the API keys and looked convincingly real while every live feature silently failed.

---

## The five things that will bite you

**1. Bump the cache-buster or nothing ships.** Every asset is loaded with
`?v=N` in `index.html`. Change `app.js` without bumping `app.js?v=` and the
browser serves the old file forever. The change is live, invisible, and you
will spend an hour debugging code that was never loaded.

**2. Verify the deploy before saying it is live.** `curl` the live `index.html`
and match the cache-buster against what you just wrote. This is not paranoia —
a dead build once hid seven commits, and every one of them was reported as
shipped.

**3. Files are CRLF.** Shell and Node string replacements that match on `\n`
silently no-op — they find nothing, report success, and change nothing. Use the
Edit tool, or `\r?\n` in a regex.

**4. No heredocs for JavaScript.** A bash heredoc ate a `$` and turned
`$$('.pane-slot')` into `$('.pane-slot')`. `$` returns one element or null;
`.forEach` on null threw on the first line of every render and broke split view
entirely — twice, from two different scripts. Edit JS with the Edit tool.

**5. `node --check app.js` after every edit.** It is one second and it catches
the stray bracket you did not see.

---

## Stack

Vanilla HTML / CSS / JS. **No build step, no framework, no bundler.** Tabs are
standalone HTML files embedded as iframes. Serverless functions live in `/api`
and run on Vercel. Vendored libraries only — Three.js, Gridstack, Leaflet — all
under `vendor/` with licences in `CREDITS.md`.

`app.js` is ~10,600 lines and single-file on purpose. Read the section you need
with `sed -n` rather than loading the whole thing.

---

## Secrets — the rule that has no exceptions

Keys live in `.env.local` (gitignored) and Vercel environment variables.
**Never in chat, never in the repo, never in a file that gets committed.** The
Supabase `service_role` key is a master key that bypasses every security rule —
Vercel only.

The same applies to Nathan's transcript and any document about him: it must not
be saved into `D:\life-tracker-fresh`, because that folder pushes to GitHub.

---

## Data

`localStorage` under `nv.*` keys, mirrored to Supabase by `sync.js`. Anything
written to an `nv.*` key must be **JSON**, not a bare string — `sync.js`
JSON-parses everything it mirrors, and one bare string broke every sync until it
was found.

**Seeding is one-way.** `seedGoals()` and `seedHabits()` run only on an empty
board, because re-running them would wipe whatever the owner had done. So a goal
added to those lists later never reaches an existing board. New goals go in
`LATE_GOALS`; edits to existing ones go in `LATE_EDITS`. Both are matched by
title, applied once, and safe to re-run. **To add a goal, add a line — nothing
else.**

Every seed gets its **own** flag. Sharing one means whichever feature ships
first closes the door on the next; that is exactly how the goals stayed
invisible after the habits went out an hour earlier.

---

## Design

The visual language is ported from `d:\vitality reference\tiles-library\` —
**read those files rather than approximating them.** Labels in mono uppercase,
values in italic Instrument Serif, `cardPop` (a 560ms overshoot on `--ease-soft`)
as the signature motion.

Four themes. **Daylight is the one Nathan uses.** It inverts the whole
monochrome ladder rather than swapping an accent, which means any rule that
hardcodes `#fff` or `rgba(255,255,255,…)` breaks on white — white text on white,
or a black slab on a light page. When a tab "looks weird", that is almost always
why. `theme-daylight.css` carries the overrides.

---

## Nova

The assistant. `api/nova.js` holds the model key server-side; nothing in
`app.js` may ever contain one, because everything in `app.js` is public.

The browser pattern-matches first — common commands cost nothing and work
offline. Only what it cannot parse reaches the model. Keep it that way.

**The safety rule, which is structural and not negotiable:** anything that reads
the outside world must not be able to write to it. A model cannot reliably tell
Nathan's instructions from instructions buried in a web page it just read. So
the part that reads has no ability to act, and the part that acts never reads.
Anything that sends, spends, or deletes goes through an approval step.

---

## How Nathan works

He is 17, building this while sorting out school, and he learns by doing. Give
him **one next action**, not a menu. Long documents lose him — lead with the
short version and let the detail sit somewhere he can return to.

He catches real mistakes and he is usually right when he pushes back. When he
reaffirms something after you have raised a concern, that is his decision —
record it and move, do not re-argue it.

**Label what you checked and what you assumed.** He cannot audit you, and he
has asked for this directly.

### The model his goals run on

His idea, and it shapes the whole board: **most goals have two phases.** Get it
right (a goal — it ends) and then keep it (a habit — it does not). The goal
closes the day the habit starts. Sorting a want into "one appointment" versus
"forever" is most of the work.
