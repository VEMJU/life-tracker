# Sleep tracker — build spec

Build target for the Sleep section. Written to be built from directly, by
Claude Code or Codex, without needing the planning document.

**Scope of this build:** capture sheet, bedtime checklist, consistency chart.
Nothing else. Later phases are listed at the bottom with their unlock
conditions — do not build them early, they render empty and the section looks
finished while showing nothing.

---

## Stack constraints

Same as the rest of the app, no exceptions:

- Vanilla HTML / CSS / JS. No build step, no framework, no bundler.
- **No 3D** in this section. Nothing from `boot3d.js`, no Three.js, no models.
- Files are CRLF. String replacements matching on `\n` silently no-op.
- Bump the `?v=N` cache-buster in `index.html` for every asset touched.
- `node --check app.js` after every edit.
- Colour system: cyan = accent, amber = needs you, green = done. **Nothing
  else may use amber or green.**
- Test mobile CSS against **414px** (iPhone 11), not 390px.

---

## 1 · Data model

One record per night, keyed by wake date.

### Tier 1 — always captured

| Field | Type | Notes |
|---|---|---|
| `inBed` | time | Pre-fill from last night's value; user adjusts |
| `outOfBed` | time | Pre-fill from first phone unlock if available |
| `restedScore` | int 1–10 | Slider |
| `wokeNaturally` | bool | Toggle. Alarm = false |
| `minsToFullyAwake` | int | Minutes until properly awake. Under 30 is normal |
| `afternoonDip` | bool + time | Did energy crash during the day, and roughly when |

### Tier 2 — conditional, only offered when `restedScore <= 6`

Presented as a row of yes/no chips. Tapping **yes** opens that one field for an
exact value. Untapped fields stay closed and store null.

| Chip | Opens | Type |
|---|---|---|
| Slow to fall asleep? | `sleepLatencyMins` | int |
| Woke in the night? | `nightWakes` (count) + `nightWakeMins` | int, int |
| Too hot or cold? | `tempIssue` | enum: hot / cold |
| Something on your mind? | `mindNote` | free text, one line |

### Tier 3 — never typed, pulled from other logs

Read-only joins for the later correlation view. Do not prompt for these.

`lastCaffeineTime` · `screenUseLastHour` · `lastMealTime` ·
`trainedToday` + `trainingTime` · `nappedToday` + `napMins`

> Note: caffeine is currently always null — the user consumes none. Keep the
> field; a pre-workout supplement would reinstate it.

---

## 1b · Storage — read this before writing any persistence code

**Do not invent a storage layer. Do not call Supabase directly.**

The app persists to `localStorage` under `nv.*` keys. `sync.js` patches
`localStorage.setItem` / `removeItem`, queues every write, and mirrors it to
one row in Supabase `public.app_state`, scoped by Row Level Security. On login
it pulls rows back down and fires `nv-data-ready`, which `app.js` waits for
before booting.

So:

- Write sleep records through the existing store helper (`app.js` ~line 241,
  `set(key, val)`), or plain `localStorage.setItem`, using an **`nv.` prefix**.
- Suggested key: `nv.sleep.log` — one object keyed by wake date `YYYY-MM-DD`.
- Checklist state: `nv.sleep.checklist`, same date keying.
- Cross-device sync and cloud backup then happen **for free**. Any other
  storage path silently loses both.
- Never write sleep data to a key without the `nv.` prefix — `sync.js` will not
  see it, and the data will exist on one device only.

## 1c · Backfill and editing

The protocol depends on an unbroken run of nights, so a missed morning must be
recoverable or the dataset develops holes exactly when life gets busy.

- Any past date must be openable and editable, not just today.
- A missed day shows as **absent**, never as a zero — a zero would drag the
  rolling averages and make a skipped log look like a terrible night.
- The consistency chart must render gaps as gaps, not as connected lines across
  missing days.
- Editing a past entry is normal use, not an exception. No warnings, no "are
  you sure."

## 2 · Capture sheet

**Hard requirement: under 20 seconds on a phone, half-awake.**

- All Tier 1 on one screen, no scrolling at 414px.
- Two fields pre-filled, so the real interaction is one slider and one toggle.
- Tier 2 chips appear only on `restedScore <= 6`.
- A good night must cost nothing extra to log. If logging a good night is
  expensive the user stops doing it, and the dataset skews to bad nights only.
- Submit closes the sheet. No summary screen, no score, no streak animation.

### Explicitly not built

**No "sleep score."** Track behaviour and outcome only. A composite score the
user cannot act on invites obsessive checking, which measurably worsens sleep.
This is a deliberate product decision, not an omission.

---

## 3 · Bedtime checklist

Nine items, shown at 22:55. Checked state persists for that night and resets at
wake.

1. Phone is out of the room
2. Amber light only, overheads off
3. Pillow placed — under knees on back, between knees on side
4. Room is cool
5. Screens off or dimmed 90 min ago
6. Mask on hand, nasal strip on *(hide until those items are owned)*
7. Last big drink was an hour ago
8. Head is clear — notes written if not
9. Doors and windows checked

**Design rule:** an unchecked box is **not** a failure state. No red, no score,
no percentage. This is a memory aid, not a discipline test — the moment it
reads as a grade it stops being opened.

Store checklist state per night; it is a variable in the protocol, so an
unconfirmed item means that night's data can't attribute cause.

---

## 4 · Consistency chart — the primary readout

The main chart for this section. Consistency is the goal, so consistency is
what gets the largest visual.

- **X axis:** date, most recent right.
- **Y axis:** wake time.
- **Target band:** shaded region ±30 minutes around 08:00. Use the cyan token
  at low opacity.
- **Points:** one per night. Inside the band reads as on-target; outside is the
  signal. Do not colour points red — outside the band is information, not
  failure.
- **Emphasise the most recent point** — larger dot, or a label.
- Horizontal scroll inside its own container past ~21 days. The page body must
  never scroll sideways.

---

## 5 · Later phases — do not build yet

| Build | Unlock condition |
|---|---|
| Progress-to-done counter | 14 days of data. Consecutive days meeting all three done-conditions, out of 21 |
| Rested + inertia readouts | 14 days of data. **Two small charts sharing an x-axis** — not a dual-axis chart, those are easy to misread |
| Correlation view | Sleep **and** food/training logs, ~2 weeks each. Food logging does not exist yet |

---

## 5b · Where it lives

Sleep is a **section inside the Body tab**, not a new top-level tab.

- Rename the existing Gym tab to **Body**; Gym becomes a section within it.
- Sections are show/hide `<div>`s **inside the one tab file** — not new HTML
  files and not new iframes. Every new tab file is another iframe to load.
- Tabs mirror the goal batches: Body, Mirror, Mind, Soul, Build, Life. Add a
  tab only when that batch has planned content — do not create empty ones.

If the Body rename is deferred, build Sleep as a standalone section first and
fold it in later; the internal structure does not change either way.

## 6 · Notification hooks

The assistant layer is not built yet, but leave the seams:

- `08:05` — prompt to log last night. If unanswered after an hour, prompt once
  more, then stop. Repeated nagging gets notifications muted entirely.
- `22:55` — prompt for the bedtime checklist.
- **Silence between 22:00 and 08:00.** No notifications overnight, no
  exceptions.

---

*Spec version 1 · derived from Sleep Protocol 01. The planning document is kept
outside this repo by design — see `docs/specs/README.md`.*
