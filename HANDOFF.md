# Chance Quest — handoff for a new session

Paste this to a new Claude tab: **"Read HANDOFF.md, PLAYTEST.md and CONTENT_ISSUES.md in this repo, then continue."**
If the new tab has no copy of the code, clone it first: `git clone https://github.com/LORDDOMNIKREGARD/chance-quest.git`

## What this is

A top-down pixel RPG (Vite + Phaser 3, plain JS) that teaches probability from Ross, *A First Course in
Probability* (10th ed.), Ch 1–8. The owner is a first-year quant-finance student with a midterm on Ch 1–4
around 21 Oct 2026, who is also learning JavaScript — so code must stay readable and commented.

- Repo: https://github.com/LORDDOMNIKREGARD/chance-quest (public, source on `main`)
- Live game: https://lorddomnikregard.github.io/chance-quest/ (GitHub Pages, `gh-pages` branch)

## Standing instructions from the owner

1. Build in four milestones and **stop for review after each**: M1 engine + Ch 1, M2 Ch 2–4 (midterm
   content, prioritise polish), M3 Ch 5–8, M4 juice pass.
2. **Push and deploy yourself** when a piece of work is finished and tested: commit, `git push origin main`,
   then `npm run deploy`, then check the live URL loads. Do not hand these steps back.
3. `public/content.json` is the source of truth. **Never change an answer value.** Problems go in `CONTENT_ISSUES.md`.
4. Never copy or scrape text from the Ross textbook. Bounties show references only ("Ross Problem 3.29").
5. No quiz screens (no "Question 3 of 10", no A/B/C/D lists, no ✓/✗ stamps). Answers are delivered by doing
   something in the world. Choices are objects you walk to.
6. Every probability/expectation phase goes Predict → Run → Compare, and the Run step must *really* simulate
   the process — never derive it from the exact answer.
7. Hoot (owl) gives hints as questions, one at a time, never the answer. Three misses open the Scroll of Insight.
8. Files under ~400 lines, split by system. Each milestone ends with an updated `PLAYTEST.md`.

## State of the work

- **M1 (Ch 1): done, pushed, live.**
- **M2 (Ch 2–4): done, pushed, live** (7 Oct 2026). **Waiting for the owner's review before starting M3.**
  Known gaps are listed in `PLAYTEST.md` under "Known issues" — the biggest is that most Ch 2–4 templates
  share one by-hand viewer instead of each having its own animated scene. What M2 added:
  - `src/systems/sim.js` + `src/systems/sims/ch2.js, ch3.js, ch4.js`: one honest trial per phase for all 74
    encounters of Ch 2–4. `tests/unit/sims.test.js` checks every one against the stored answer (30,000 runs).
  - By-hand experiment toy (`encounters/experiment.js`), token renderer (`tokens.js`), special toys
    (`special.js`: Venn ponds, two-draw well; `bayes.js`: crowd of 1000, walking tree).
  - Predict (`ui/flask.js`) → Run and Compare (`encounters/tallyBoard.js`), wired into `scenes/Encounter.js`.
  - `choices` phases as pedestals you walk to (`encounters/pedestals.js`).
  - Regions 2–4 enterable (`BUILT_CHAPTERS = 4` in `encounters/index.js`), each with its own street look.
  - Betting templates cost gold instead of a heart on a miss (`stake: true` in `FLAVOUR`).
  - A second Playwright test covering Predict → Run → Compare and a walk-to choice.
  - Not played by hand: all 74 new encounters end to end, and the three new boss fights.
- **M3 (Ch 5–8):** not started. Needs sims for Ch 5–8, the Φ-Scroll (z-table item), the remaining templates
  (archery-range with a bell curve, bus-stop, forge heat-maps, rendezvous, mine-tunnel, collector,
  marching-army, oracle-tower), the final boss "The Law", and the `c6-table` choice phase.
- **M4:** juice pass — particles, per-region music polish, title screen, credits, settings (text size,
  reduced motion, mute), something to spend gold on.

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
  chapter), `Encounter` (plays every encounter; modes normal / echo / boss), `walker.js` (hero movement).
- `src/encounters/` — toys. `index.js` routes an encounter to its toy and holds `FLAVOUR` and `BOSSES`.
  `kit.js` is the toolbox every toy is built from. Ch 1 toys: `rows.js`, `counting.js`, `grouping.js`, `arrange.js`.
- `src/systems/` — `evaluator.js` (forge expression language, no eval), `content.js`, `save.js`
  (localStorage, `window.__cq` debug handle), `srs.js` (Leitner 1/3/7/21 days), `grimoire.js`, `input.js`,
  `sim.js` + `sims/`.
- `src/ui/` — HTML layer over the canvas: `dialogue.js`, `forge.js`, `flask.js`, `hud.js`, `grimoire.js`,
  `bounty.js`, `shrine.js`, `style.css`, `dom.js`.
- `src/art/` — sprites as string grids (PICO-8 palette), baked to textures at boot. `src/audio/sfx.js` — WebAudio.

## Things that will save you time

- **Players' saves** live in each player's browser (localStorage key `chance-quest-save-v1`). New fields
  must have defaults in `fresh()` in `save.js` so old saves keep loading.
- **The content JSON was hand-transcribed** from the owner's prompt (the file was never on disk). Tests verify
  every formula against its answer, but not prose typos.
- The pixel font has no "−" (U+2212); `loadContent()` swaps it for "-" at load. Display only.
- **Windows path length:** this checkout may sit under a very deep folder. Run `git config core.longpaths true`
  in any fresh clone here or `git add` fails with "Filename too long".
- **GitHub access on the owner's machine:** git pushes work through Git Credential Manager (account
  `LORDDOMNIKREGARD`). The `gh` CLI is installed (`C:\Program Files\GitHub CLI\gh.exe`) but **not logged in**;
  the owner has to run `gh auth login` once before `gh` can create repos or change settings.
- **Testing in a hidden browser pane:** when the preview pane is hidden, `requestAnimationFrame` stops and the
  game sits on the Boot scene. Drive it by calling `__cq.game.step(performance.now(), 16)` in a loop.
- In debug helpers, take encounter objects from the running game (`Region.things`), not from a raw
  `fetch('content.json')`, or the minus-sign fix is bypassed.
- Screen budget in an encounter: HUD is y 0–11, toys use x 50–310 and y 28–~104, the question box grows up
  from the bottom (a long story can reach y ≈ 103).
- Phaser text is 8 px Press Start 2P: 8 px per character, so a toy line starting at x = 56 fits about 32 characters.
