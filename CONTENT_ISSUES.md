# Content issues

No answer value was changed. Everything below is about how the content is stored or shown.

## How the content got here

- `probability-quest-content.json` was not on disk, only pasted into the prompt. The 146 encounters were
  transcribed by hand into `content-src/ch1.json` … `ch8.json`. `npm run content` merges them into
  `public/content.json`.
- The unit tests evaluate every `f` with its `vars` and compare against the stored `answer`
  (146 encounters, 215 numeric phases, all within 1e-6 relative). That catches a mistyped formula, variable or
  answer. It does **not** catch a typo in story, hint or solution prose.
- **If you still have the original JSON, drop it over `public/content.json` and run `npm test`.** That removes
  the transcription risk entirely. (Do not run `npm run content` afterwards — it would overwrite it.)
- The 704 bounties are generated, not typed: one per Problem / Self-Test number per chapter, linked to every
  encounter whose `mirrors` names it. Spot-checked against the pasted list (P1.21, P3.94, P4.88, ST4.25, P7.33
  and the chapter counts 54/76/134/121/68/91/117/43).
- The `meta.answersVerified` and `meta.expressionLanguage` notes were not carried over; `meta.source` was.

## Display-only changes

- The pixel font has no "−" (U+2212), so "N−2" showed an almost invisible dash. `loadContent()` swaps it for a
  plain hyphen when the file is loaded. Formulas were ASCII already; no number is affected. The Markdown export
  therefore also shows "-".
- Other symbols the font lacks (→ ≥ ≤ ⇔ ½ ² ₁ √) fall back to a system font. Readable, but thinner than the rest.

## Milestone 2: a second, independent check of Ch 2–4

- Each of the 102 probability and expectation phases in Ch 2–4 now has a simulation that plays the story
  itself (shuffling, rolling, drawing) and knows nothing about `f` or `answer`. 30,000 runs of each agree
  with the stored answer. So for these chapters the answers are confirmed by Monte Carlo as well as by the
  formula check. **No content error was found.**
- `c4-poisson-approx`, phase 1 asks for the *Poisson approximation* (0.18045). Its Run step simulates the
  real 400-ticket lottery, whose true value is the binomial 0.18090, so the simulation lands a hair off the
  asked-for answer by design. The difference (0.0005) is far smaller than simulation noise.
- `c4-typos` is simulated as 500 letters per page, each with a tiny chance of a slip, rather than by sampling
  a Poisson directly. The two differ by about 0.0001.
- Some probability asks do not start with "P(" (both `c2-keys` asks put a sentence first). The game decides
  what gets Predict → Run → Compare from the simulation list, not from the wording, so these are covered.

## Scenes pass (7 Oct): what the new charts and experiments assume

- `c4-moments` gives only E[X] and Var(X). Its by-hand experiment needs *some* X, so it uses a fair die
  shifted and stretched to that mean and variance. The answers hold for every such X; the die is just the toy.
- Histogram bins are chosen per encounter (`bin` in `src/systems/sims`): e.g. craps is binned by the first
  roll, *Race of the Sums* by how many rolls it took. They only change what is drawn, never an answer.
- All 117 phases of Ch 2–4 were forged with their own `f` in the real game (browser test); none was refused.

## Things to know about the content itself

- `c1-lattice`: `R` and `U` vary on an Echo but the well stays at (2 right, 1 up). Always valid for the given
  ranges; just less varied than it could be.
- `c1-towers`: the second ask prints "{n}/{t}" literally, e.g. "exactly 9/3 scouts". Correct, slightly odd to read.
- `c4-third-win`: the story says "{r}rd win", which only reads right while r = 3 (r is not varied, so it holds).
- Encounters with an empty `vary` (e.g. `c1-banner-letters`, `c1-balanced-committee`) return as Echoes with the
  same numbers, so an Echo of those tests recall of the answer more than the method.
- Three encounters have a `choices` phase (`c2-intransitive`, `c4-commodity`, `c6-table`). The first two are
  playable as pedestals you walk to; `c6-table` arrives with Chapter 6.
