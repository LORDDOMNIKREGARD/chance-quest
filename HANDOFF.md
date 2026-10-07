# Chance Quest — handoff for a new session

**To continue in a new Claude tab, paste this as your first message:**

> Clone https://github.com/LORDDOMNIKREGARD/chance-quest.git into a folder I choose, run `npm install`, then
> read HANDOFF.md, PLAYTEST.md and CONTENT_ISSUES.md and continue from "What to do next" in HANDOFF.md.

Everything is on GitHub; nothing important lives only in the old tab.

## What this is

A top-down pixel RPG (Vite + Phaser 3, plain JS) that teaches probability from Ross, *A First Course in
Probability* (10th ed.), Ch 1–8. The owner (Pranjal) is a first-year quant-finance student with a midterm on
Ch 1–4 around 21 Oct 2026, who is also learning JavaScript — so code must stay readable and commented.

- Repo: https://github.com/LORDDOMNIKREGARD/chance-quest (public, source on `main`)
- Live game: https://lorddomnikregard.github.io/chance-quest/ (GitHub Pages, `gh-pages` branch)
- The original spec was a long prompt pasted into the first tab. Its rules are summarised below; the full
  list of 146 encounters lives in `content-src/` and `public/content.json`.

## Standing instructions from the owner

1. Build in four milestones and **stop for review after each**: M1 engine + Ch 1, M2 Ch 2–4 (midterm
   content, prioritise polish), M3 Ch 5–8, M4 juice pass.
2. **Push and deploy yourself** when a piece of work is finished and tested: commit, `git push origin main`,
   then `npm run deploy`, then check the live URL serves the new build. Do not hand these steps back.
3. `public/content.json` is the source of truth. **Never change an answer value.** Problems go in `CONTENT_ISSUES.md`.
4. Never copy or scrape text from the Ross textbook (the owner has it as a PDF/Markdown in Downloads — do
   not read from it). Bounties show references only ("Ross Problem 3.29").
5. No quiz screens (no "Question 3 of 10", no A/B/C/D lists, no ✓/✗ stamps, no percentage scores). Answers
   are delivered by doing something in the world. Choices are objects you walk to.
6. Play before you calculate: every encounter has a small hands-on toy.
7. Every probability/expectation phase goes Predict → Run → Compare, and the Run step must *really* simulate
   the process — never derive it from the exact answer.
8. Hoot (owl) gives hints as questions, one at a time, never the answer. Three misses open the Scroll of
   Insight (full solution + pattern) and mark the encounter to return as an Echo.
9. Never time a calculation.
10. Never show `f` or `answer` before the solution is revealed (Grimoire keeps unsolved answers sealed).
11. Files under ~400 lines, split by system. Comment the evaluator and simulation code clearly.
12. Each milestone ends with an updated `PLAYTEST.md` (what to try, known issues, content issues).
13. Keep this file current, so a fresh tab can always pick the work up.

## State of the work (7 Oct 2026)

- **M1 (Ch 1 Tallyburg): done, pushed, live.** Engine, overworld, forge + evaluator, 11 counting toys, Hoot,
  Scroll, Grimoire + Markdown export, Echoes, Bounty Board, Star Shrine, boss, save export/import.
- **M2 (Ch 2–4): done, pushed, live.** Last commit of M2: `33cf743`. Added:
  - `src/systems/sim.js` + `sims/ch2.js, ch3.js, ch4.js`: one honest trial per phase for all 74 encounters
    (90 probability phases, 12 expectation, 3 knob puzzles, 2 by-hand only, 10 with nothing to simulate).
    `tests/unit/sims.test.js` checks each against the stored answer over 30,000 runs and after re-rolls.
  - Predict (`ui/flask.js`) → Run and Compare (`encounters/tallyBoard.js`), wired into `scenes/Encounter.js`.
  - By-hand experiment toy (`encounters/experiment.js`) with dice/card/stone tokens (`tokens.js`); special
    toys in `special.js` (Venn ponds, two-draw well) and `bayes.js` (crowd of 1000, walking tree).
  - `choices` phases as pedestals you walk to (`encounters/pedestals.js`).
  - Regions 2–4 enterable (`BUILT_CHAPTERS = 4` in `encounters/index.js`), each with its own street look.
  - Betting templates cost 3 gold instead of a heart on a miss (`stake: true` in `FLAVOUR`).
- **Tests at hand-off:** 441 unit tests and 2 Playwright tests, all passing, zero console errors.

## What to do next

**The owner has not yet answered this question — ask it first:**
start Milestone 3 (Ch 5–8), or first give the Ch 2–4 templates their own scenes (their midterm chapters)?

Known gaps in M2, biggest first (also in `PLAYTEST.md`):
1. Most Ch 2–4 templates share one by-hand viewer. A duel, a fishing dock, a market stall show outcomes as
   words. The spec wanted per-template interaction: stopwatch window at the dock (Poisson arrivals), a duel
   animated after the forge with the rival getting a free shot on a miss, evidence strings on the detective
   board, an EV meter at the market stall, a roulette wheel / random-walk ledge, a dice histogram.
2. Not played by hand: all 74 new encounters end to end, and the three new boss fights.
3. A very long story (Three Guilds) makes the question box cover the last line of the toy.
4. Pure-algebra phases have a "think it through" placeholder toy.

**M3 (Ch 5–8), when asked:** sims for Ch 5–8 (same pattern; continuous variables need `r.u()`-based
sampling, normals via Box–Muller); the Φ-Scroll (z-table item; normal phases already have a looser
tolerance of 0.006); templates archery-range (bell curve with draggable bounds), bus-stop, forge heat-maps
for joint densities, rendezvous square, mine-tunnel, collector, marching-army (histogram turning
bell-shaped), oracle-tower; the `c6-table` choice phase; final boss "The Law"; set `BUILT_CHAPTERS = 8`.

**M4:** juice pass — particles, music polish, title screen, credits, settings (text size, reduced motion,
mute), something to spend gold on (cosmetics, hint refills).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | play locally at http://localhost:5173 |
| `npm test` | unit tests (evaluator, every content formula, sims vs answers, Echo scheduling) |
| `npm run e2e` | Playwright smoke tests; builds first; uses installed Edge on Windows |
| `npm run build` | static `dist/` |
| `npm run deploy` | build and force-push `dist/` to `gh-pages` |
| `npm run content` | rebuild `public/content.json` from `content-src/ch1..8.json` (bounties are generated) |

## Map of the code

- `src/main.js` — Phaser game at 320×180, integer zoom; sets CSS `--u` (one game pixel) for the HTML layer.
- `src/scenes/` — `Boot`, `Title`, `Overworld` (one-screen map, 8 gates), `Region` (one long street per
  chapter; `LOOK` sets its tiles), `Encounter` (plays every encounter; modes normal / echo / boss),
  `walker.js` (hero movement).
- `src/encounters/` — toys. `index.js` routes an encounter to its toy (`buildToy`) and holds `FLAVOUR`,
  `BOSSES`, `BUILT_CHAPTERS`. `kit.js` is the toolbox every toy is built from. Ch 1 toys: `rows.js`,
  `counting.js`, `grouping.js`, `arrange.js`. A toy returns `{ icon, target, ok? }`.
- `src/systems/` — `evaluator.js` (forge expression language, no eval), `content.js`, `save.js`
  (localStorage, `window.__cq` debug handle), `srs.js` (Leitner 1/3/7/21 days), `grimoire.js`, `input.js`
  (held directions + an action-handler stack), `sim.js` + `sims/`.
- `src/ui/` — HTML layer over the canvas: `dialogue.js` (`say`, `choose`, `askValue`, `showScroll`),
  `forge.js`, `flask.js`, `hud.js`, `grimoire.js`, `bounty.js`, `shrine.js`, `style.css`, `dom.js`.
- `src/art/` — sprites as string grids (PICO-8 palette), baked to textures at boot. `src/audio/sfx.js` — WebAudio.

How a simulation is declared (`sims/chN.js`): one entry per phase, `P(trial)` probability, `E(lo, hi, trial)`
expectation, `K(name, min, max, trial)` knob puzzle, `T(trial)` by-hand only, `null` nothing to simulate.
A trial is `(vars, rng) => ({ x, show, group })`; `x: null` means "condition not met, discard".

## Decisions made along the way (and why)

- **HTML over the canvas** for dialogue, forge, Grimoire, board, shrine: long text stays sharp at any zoom and
  the browser tests can click real buttons. The owner was told; they have not objected.
- **Hearts start at 5**, not 3, so the third miss opens the Scroll before you can faint.
- **Grimoire answers are sealed** until solved or the Scroll is opened — also in the Markdown export.
- **The story stays on screen** in the question box and the forge, because its numbers are needed.
- **The flask starts empty**: any other default is a hint (the midpoint was once exactly the answer).
- **Bosses skip Predict → Run → Compare** to keep fights moving; they use re-rolled numbers.
- **Deploy is a script, not a GitHub Action**: fewer moving parts. Pushing `main` does not redeploy.
- **Playwright drives installed Edge on Windows** instead of downloading Chromium (`PW_CHANNEL` overrides).

## Things that will save you time

- **Players' saves** live in each player's browser (localStorage key `chance-quest-save-v1`); no accounts,
  nothing sent to GitHub. Menu → Export save / Import Save moves a save between devices. New fields must have
  defaults in `fresh()` in `save.js` so old saves keep loading.
- **Skip ahead while testing** (browser console on the title screen, then Continue):
  `__cq.state.bosses = [1, 2, 3]; __cq.state.where = { scene: 'Overworld' }; localStorage.setItem('chance-quest-save-v1', JSON.stringify(__cq.state)); location.reload()`
- **The content JSON was hand-transcribed** from the owner's prompt (the file was never on disk). Tests verify
  every formula against its answer, and Ch 2–4 by Monte Carlo too, but not prose typos. If the owner supplies
  the original `probability-quest-content.json`, drop it over `public/content.json` and run `npm test`.
- The pixel font has no "−" (U+2212); `loadContent()` swaps it for "-" at load. Display only.
- **Windows path length:** if the checkout sits under a very deep folder, run `git config core.longpaths true`
  or `git add` fails with "Filename too long".
- **GitHub access on the owner's machine:** git pushes work through Git Credential Manager (account
  `LORDDOMNIKREGARD`). The `gh` CLI is installed (`C:\Program Files\GitHub CLI\gh.exe`) but was **not logged
  in** at hand-off; check with `gh auth status`. The owner has to run `gh auth login` once.
- **Do not edit a source file in two steps while the dev server is watched by an open page**: a half-edited
  file gives Vite a parse error and the page ends up in a confusing half-loaded state. Reload after editing.
- **Testing in a hidden browser pane:** when the preview pane is hidden, `requestAnimationFrame` stops and the
  game sits on the Boot scene. Drive it by calling `__cq.game.step(performance.now(), 16)` in a loop.
- In debug helpers, take encounter objects from the running game (`Region.things`), not from a raw
  `fetch('content.json')`, or the minus-sign fix is bypassed.
- Screen budget in an encounter: HUD is y 0–11, toys use x 50–310 and y 28–~104, the question box grows up
  from the bottom (a long story can reach y ≈ 103).
- Phaser text is 8 px Press Start 2P: 8 px per character, so a toy line starting at x = 56 fits about 32 characters.
