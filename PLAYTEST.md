# Chance Quest — playtest notes

**Play:** https://lorddomnikregard.github.io/chance-quest/ · **Code:** https://github.com/LORDDOMNIKREGARD/chance-quest

Milestone 2 is in: Venn Marshes (Ch 2), Bayesport (Ch 3) and Fortune Bazaar (Ch 4) are playable on top of
Tallyburg (Ch 1). That is all 98 encounters of your midterm chapters.

## Run it

| Command | What it does |
|---|---|
| `npm install` | once |
| `npm run dev` | play at http://localhost:5173 |
| `npm test` | 441 unit tests |
| `npm run e2e` | 2 browser smoke tests (builds first; uses installed Edge on Windows) |
| `npm run deploy` | build and publish to GitHub Pages |

Keys: WASD/arrows walk · E or Space interact · Enter confirm · H ask Hoot · G Grimoire · M sound · Esc menu/leave.

**To reach Ch 2–4 you must beat each previous boss.** To jump ahead while testing, paste this in the browser
console on the title screen and press Continue (it wipes nothing but boss progress):
`__cq.state.bosses = [1, 2, 3]; __cq.state.where = { scene: 'Overworld' }; localStorage.setItem('chance-quest-save-v1', JSON.stringify(__cq.state)); location.reload()`

## What is new in Milestone 2 — what to try

1. **Predict → Run → Compare.** Any probability or expectation question now starts with "Pour your guess":
   set the flask to your gut feeling (no calculating). The game then really plays the situation 2,000 times
   and draws the running average settling down. Only then does the forge open. After a correct forge you see
   gut, runs and exact value on one line. Try *The Trickster's Dice* or *Craps in the Cellar* (Ch 2).
2. **Conditioning you can watch.** In Bayesport the run board says e.g. "2000 counted of 13,412": the runs
   where the condition was false were thrown away. Try *The Friend's Two Cards* — the two phases differ only
   in what she tells you, and the kept fraction is very different.
3. **By-hand experiments.** Before predicting, "once" / "x10" play the situation with real dice, cards and
   stones on screen. In detective cases (*Three Coins in the Box*, *Three Prisoners*) the counted runs are
   pinned under each suspect.
4. **Knob puzzles.** Where the answer is a size rather than a probability (*Moons of Birth*, *The Sock Drawer
   Puzzle*, the double-six question), you turn a knob and try it by hand.
5. **Special toys:** the Venn ponds (click a region in the list to write its share, drop travellers to see
   where they land), the crowd of 1000 at the healer's (turn base rate, hit rate and false-alarm rate), the
   tree you walk (branch weights multiply along the path and stamp the leaf), the two-draw well.
6. **Walk-to choices.** *The Trickster's Dice* and *The Spice Speculator* end with a choice: the options stand
   on pedestals; walk to one and press E.
7. **Betting costs gold.** At card, dice, wheel and market tables a wrong forge takes 3 gold instead of a
   heart (a heart if your purse is empty).
8. **Three bosses:** The Fog Warden, Inspector Prior, The House. Bosses skip the Predict step.
9. Each region has its own street: marsh and ponds, a harbour boardwalk, a sand bazaar.

Everything from Milestone 1 still applies: Hoot's hints, three misses → Scroll of Insight, Grimoire export,
Echoes after 1/3/7/21 days with re-rolled numbers, the Bounty Board (76 / 134 / 121 posters for Ch 2 / 3 / 4),
the Star Shrine, save export/import.

## Verified

- **Every simulation is honest and correct.** The trial for each of the 102 probability and expectation
  phases of Ch 2–4 (90 probabilities, 12 expectations) never sees the answer; a test runs each 30,000 times
  and requires the average to land on the stored answer (and again after Echo re-rolls). All pass.
  Of the other 15 phases, 3 are knob puzzles, 2 are by-hand only, and 10 have nothing to simulate.
- 441/441 unit tests; both browser tests pass with zero console errors. The second one plays a full
  Predict → Run → Compare and a walk-to choice.
- By hand in the browser: card, dice and stone experiments, the knob toy, Venn ponds, crowd grid, tree,
  detective pins, flask, run board, compare line, and the pedestal choice.
- Not played through by hand: every one of the 74 new encounters end to end, and the three new boss fights.

## Not in this milestone

- **Ch 5–8** (Milestone 3): regions are on the map but say they are still being built. That includes the
  Φ-Scroll, the bell-curve archery toy and the final boss "The Law".
- Juice pass (Milestone 4): settings for text size / reduced motion, title polish, credits, something to buy with gold.

## Known issues

- **The by-hand toy is the same viewer for most Ch 2–4 templates.** Dice, cards and stones are drawn properly,
  but a duel, a fishing dock and a market stall all show their outcome as words ("round 2: he hits you")
  rather than as an animated scene. The spec's per-template flourishes (stopwatch at the dock, duel animation
  after the forge, evidence strings on the detective board) are not built.
- A very long story (e.g. *Three Guilds*) makes the question box tall enough to cover the last line of the toy.
- Phases that are pure algebra or a count (*The Moment Scale*, *The Balanced Academy*, the first two Three
  Guilds questions) have no experiment; their toy is just "think it through".
- The dialogue, forge and panels are HTML over the canvas rather than in-canvas pixel sprites.
- Star Shrine cards are clicked to add, then dragged on the sky.
- The forge accepts an encounter's variable names (e.g. `p*s/(p*s+(1-p)*fp)`).
- Shake and particles ignore the OS "reduce motion" setting until Milestone 4.
- 60 fps on a mid-range laptop has not been measured. 1,000 trials of every simulation take far less than a
  second (tested).
- Content caveats: see `CONTENT_ISSUES.md`.
