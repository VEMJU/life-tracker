# Credits

Third-party work used in this app, and the terms it came with.

## 3D models

**Christ of the Abyss**
[sketchfab.com/3d-models/christ-of-the-abyss-5ee0395054084a9b959e26fde1e63fe6](https://sketchfab.com/3d-models/christ-of-the-abyss-5ee0395054084a9b959e26fde1e63fe6)
**CC Attribution (CC BY)** — free to use commercially and privately, on the
condition that the author is credited. That credit also appears on the boot
screen itself whenever the figure is on display.

Modified: stripped from the original underwater diorama to the statue alone,
then welded, deduped and Draco-compressed (12.19 MB → 4.95 MB). See
`models/README.md` for exactly what was removed and how to redo it.

The Orthodox cross on the same screen is **not** third-party — it is generated
in code in `boot3d.js` and carries no licence.

## Libraries

| | | |
|---|---|---|
| **Three.js** r160 | MIT | vendored in `vendor/three/` |
| **Gridstack.js** 13.0.2 | MIT | vendored in `vendor/gridstack-*` |
| **Leaflet** | BSD-2-Clause | vendored in `vendor/` |
| **Supabase JS** 2.58 | MIT | CDN |

Libraries are vendored rather than hot-linked so a CDN having a bad day cannot
take the app down, and so a version can never change underneath it.

## Fonts

Loaded from Google Fonts under the SIL Open Font License.
