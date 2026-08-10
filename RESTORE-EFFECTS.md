# Restoring the effects on better hardware

Everything stripped for performance is recoverable. Two kinds, two ways back.

## 1 · One switch — the reversible things

Run in the console:

```js
nvLite(false)
```

Brings back immediately:

- the drifting cross backdrop, animating again instead of painted once
- the cursor glow that trails the pointer
- the grain/noise layer
- every perpetual animation — breathing dots, pulsing seals, drifting dashes
- the staggered card entrances

It sticks. Nothing else to do.

**But note:** the app measures its own frame rate on first run and turns lite
mode back on if the machine looks slow. On a fast machine it will not — the
check only ever switches lite ON, never off, so your choice holds.

## 2 · One revert — the frosted glass

The 67 `backdrop-filter` declarations were **deleted from the stylesheet**, not
disabled, so no switch brings them back. They are in git.

Measured on the old laptop: twenty blurred panels cost **34fps** on a machine
whose empty-page baseline was a clean 60. On a 4070 that cost is nothing.

To restore, find the last commit before they were removed:

```bash
git log -S'backdrop-filter: blur(var(--glass-blur))' -- style.css
```

Then either revert the removal commit, or ask me and I will reinstate them —
better, behind a `.rich` class, so it becomes a switch like lite mode rather
than an all-or-nothing edit.

## 3 · The boot stage

`boot3d.js` tunes itself: it measures sixty frames and sheds resolution, then
shadows, then half the sparks if it cannot hold up. On fast hardware it will
simply never step down, so nothing needs changing.

Raise these by hand if you want more than the defaults:

| | current | on a 4070 |
|---|---|---|
| `setPixelRatio` cap | 1.5 | 2 |
| shadow map | 512 | 2048 |
| `SPARKS` | 260 | 450+ |

And the **background shader** from the original reference — the liquid-bronze
wave — was never built. It is the most expensive piece of that design and was
held back deliberately. On the new machine, ask for it.
