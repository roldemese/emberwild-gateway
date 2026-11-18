# Performance budget

The gates stay up. Weather, particles, shadows, and painting size come down first.

| Setting | Pixels | Shadows | Particles | Water motion | Stars | Painting size | Far cabins |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Low | 1× | off | 0 | off | off | 48 px | only the near ones, the gate stone stays |
| Medium | 1.5× | near | 48 | on | on | 128 px | built |
| High | capped at 2× | near | 140 | on | on | 256–512 px | built |

- Pixel ratio never goes above 2.
- Real-time shadows stay off for the wilds and the lagoon, and off entirely on Low.
- Estate posts and fire-rune blazes are instanced and share one rune texture.
- Gallery paintings start small and sharpen up close.
- Ship masts and sails are skipped on Low. Hulls, decks, and brows stay, because they are the landmarks. Planks, guns, and hatches are instanced.
- Six hundred avatars are a nearby subset from the presence server, and flat stand-ins past 25 m.
- If the frame rate stays under 24, Auto drops one quality step. At 24 or above it stays. A zero reading is ignored. Portals are not removed.
- Authoring the world from the seat roll stays under 1 second.
- The built view stays under 900 KB, and under 220 KB gzipped.
- A phone or a narrow window starts on Low. The waiting-room porch is a small scene.
- `prefers-reduced-motion` stops the hearth flare, the star flare, and the water bob.
- Sound starts muted. The choice sticks in local storage. Volume falls with distance.

The plain path at `/plain.html` does not start WebGL at all.
