# Models

## christ.glb — Christ of the Abyss

**Source:** https://sketchfab.com/3d-models/christ-of-the-abyss-5ee0395054084a9b959e26fde1e63fe6
**Licence:** CC Attribution — credit the author wherever this ships.

### What was done to it

The download was the whole underwater diorama: statue, seabed, water surface,
light rays, a fish, and 120 drifting particles. On a black stage every one of
those is either invisible or actively wrong, and each carried its own texture
set — so they were most of the file.

Stripped to the statue alone, welded, deduped and Draco-compressed:

| | |
|---|---|
| Original | 12.19 MB |
| Shipped | **4.95 MB** |

Regenerate with `@gltf-transform`: keep any mesh matching `/christ/i`, drop the
rest, then `prune → dedup → weld → draco`. `prune` is what actually reclaims the
space — it sweeps every material, texture and accessor nothing points at any more.

### Adding another model

Drop a `.glb` here and point `FIGURE_URL` in `boot3d.js` at it. If the file is
missing the stage shows the coded cross and hides the toggle — it never fails
closed.
