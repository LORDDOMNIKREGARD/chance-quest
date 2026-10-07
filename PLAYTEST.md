# Chance Quest — Milestone 1 playtest

Engine + Tallyburg (Ross Ch 1) playable from title screen to boss.

## Run it

| Command | What it does |
|---|---|
| `npm install` | once |
| `npm run dev` | play at http://localhost:5173 |
| `npm test` | 297 unit tests (evaluator, every content formula, re-rolls, Grimoire export, Leitner) |
| `npm run e2e` | browser smoke test (builds first; uses installed Edge on Windows) |
| `npm run build` | static `dist/` for GitHub Pages / Vercel |
| `npm run content` | rebuild `public/content.json` from `content-src/` |

Keys: WASD/arrows walk · E or Space interact · Enter confirm/forge · H ask Hoot · G Grimoire · M sound · Esc menu/leave.
On a phone (landscape) a d-pad and an A button appear while walking.

## What to try

1. **New Game**, walk right into Tallyburg. The street is 4½ screens: tavern, shrine, 24 villagers, the boss.
2. **The Gate Seal** (third stop). Click the toy's dials and watch "codes tried" climb to 9 before you calculate.
   Forge `26^2*10^3` — the key flies, the door opens. Then phase two.
3. **The forge**: type or tap. Try `10!/(3!3!2!)`, `2C(5,2)`, `M(12,3,4,5)`, then something broken like `C(3`
   to see the metal crack and say why.
4. **Drag toys**: The Banner Weaver (swap the two N's of ANNA: "twins"), The Feast Bench (turn Glue on: 24 → 12),
   The Guild Library (split a subject and it refuses to count).
5. **Get one wrong on purpose**, three times. You lose hearts, the third miss unrolls the Scroll of Insight, and
   the Grimoire (G) lists what you forged. The correct answer stays sealed until you have solved it or seen the Scroll.
6. **Grimoire → Export Markdown.**
7. **Ask Hoot** (H): hints come one at a time, as questions. Using one marks the encounter for an Echo.
8. **Tavern board**: 54 posters for Ch 1. Blue = you cleared an encounter that mirrors it. Open one, solve it in
   the book, mark yourself. A miss becomes a Book Echo and a Grimoire entry.
9. **Star Shrine**: after earning a few Pattern Cards, add them as stars, drag them, click one star then another
   and name the arrow. Export PNG.
10. **Boss — The Tallymaster** (far right): three boss encounters back to back with fresh numbers, 5 HP.
    Winning unlocks Venn Marshes on the map.
11. **Echoes**: a failed or hinted encounter returns as a ghost on the road below its owner after 1 day
    (then 3, 7, 21), with re-rolled numbers. To see one now, run this in the browser console and re-enter town:
    `__cq.state.echoes['c1-gate-seal'] = { box: 1, due: 0 }`
12. **Menu → Export save / Import save.**

## Verified in this milestone

- Unit: 297/297. Every `f` in the content evaluates to its stored `answer`; 50 re-rolls of each of the 53 varied
  encounters stay finite, and probabilities stay in [0, 1].
- Smoke test passes with zero console errors: new game → walk into Tallyburg → The Gate Seal → `26^2*10^3`
  opens the gate → wrong forge elsewhere → Grimoire entry → Markdown export.
- By hand in the browser: all 11 Chapter 1 toys, the forge, three-misses → Scroll, the Grimoire tabs, a missed
  book bounty, shrine linking, a full boss fight through to the unlock, and one Echo (re-rolled, rescheduled).

## Not in this milestone (by design)

- **Predict → Run → Compare and `src/systems/sim.js`.** Chapter 1 is pure counting, so it has no probability
  phase to predict or simulate. This is the first thing Milestone 2 builds, since Ch 2–4 depend on it.
- **`choices` phases** as objects you walk to (first needed in Ch 2).
- **Regions 2–8**: on the map and lockable/unlockable, but entering one says it is still being built.
  Their 16 other scene templates fall back to a plain pedestal.
- **Φ-Scroll** (z-table item): arrives with Ch 5.
- **Gold has nothing to buy yet** (cosmetics, hint refills). Hoot's hints are free and unlimited.
- Juice pass: per-region look, title polish, settings for text size / reduced motion, credits (M4).

## Known issues

- Dialogue, forge, Grimoire, board and shrine are HTML drawn over the canvas, styled as pixel UI, not Phaser
  9-slice sprites. It keeps long text sharp and readable at every zoom; say if you want them in-canvas.
- Star Shrine: cards are added by clicking them in the list and then dragged on the sky, not dragged out of the list.
- Scores, hearts and the answer check are honest, but the forge accepts an encounter's variable names
  (e.g. `26^L*10^D`). Harmless, just undocumented in-game.
- Toys are fixed tiny versions (3×3 seal, 4 heroes, 5 coins…); they do not resize with an Echo's numbers.
- The shake and particle effects ignore the OS "reduce motion" setting until M4.
- Walking is single-point collision; you can clip a few pixels into the forest edge on the world map.
- The same four house colours repeat along the street; regions do not have their own look yet.
- Content caveats (hand-transcribed JSON, the "−" glyph): see `CONTENT_ISSUES.md`.
