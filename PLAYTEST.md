# Chance Quest — playtest notes

**Play:** https://lorddomnikregard.github.io/chance-quest/ · **Code:** https://github.com/LORDDOMNIKREGARD/chance-quest

Milestone 2 is in: Venn Marshes (Ch 2), Bayesport (Ch 3) and Fortune Bazaar (Ch 4) are playable on top of
Tallyburg (Ch 1). That is all 98 encounters of your midterm chapters.

## Run it

| Command | What it does |
|---|---|
| `npm install` | once |
| `npm run dev` | play at http://localhost:5173 |
| `npm test` | 553 unit tests |
| `npm run e2e` | 5 browser tests: 2 smoke tests and a full playthrough of Ch 2, 3 and 4 (builds first; uses installed Edge on Windows; about 2 minutes) |
| `npm run deploy` | build and publish to GitHub Pages |

Keys: WASD/arrows walk · E or Space interact · Enter confirm · H ask Hoot · G Grimoire · M sound · Esc menu/leave.

**To reach Ch 2–4 you must beat each previous boss.** To jump ahead while testing, paste this in the browser
console on the title screen and press Continue (it wipes nothing but boss progress):
`__cq.state.bosses = [1, 2, 3]; __cq.state.where = { scene: 'Overworld' }; localStorage.setItem('chance-quest-save-v1', JSON.stringify(__cq.state)); location.reload()`

## New since Milestone 2: the Ch 2–4 scenes pass (7 Oct) — what to try

The by-hand toy used to show most Ch 2–4 runs as words. Now the latest run is a picture on the left and
your runs so far build a chart on the right.

1. **Histograms that build themselves.** Wherever a run "scores" something (a sum, a count, a waiting time)
   each run drops onto its bar: green = the event happened, pink = it did not, grey = thrown away by the
   condition. Try *Craps in the Cellar* (bars are the first roll), *The Whispered Roll* (everything but one
   bar is grey: that is what conditioning does), *Gate Arrivals*, *The Third Victory*.
2. **The expectation is where the pile balances.** For an average the bars are blue and a gold line marks the
   mean of your runs so far. Try *The Pearl Bet*, *The Red-Bet System*, *Pooled Potions Test*.
3. **The detective's strings.** In detective cases a red string runs from the clue to each suspect, as thick
   as that suspect's share of the runs that count; a suspect the clue rules out goes grey. Try *Three Coins
   in the Box* and *Three Prisoners of the Keep*.
4. **The stopwatch at the gate** (*Gate Arrivals*): the hand sweeps the window and travellers pop up when
   they arrive. **The scribe's page** (*The Scribe's Errors*): 500 letters, slips circled in red.
5. **The duel ground** (all five duel encounters): bouts are pips (green yours, red the rival's), and the last
   blow is fired. After the forge it plays the verdict: a right answer is your clean hit, a wrong one is the
   rival's free shot at you.
6. **The gambler's ledge** (*The Gambler's Ledge*): your gold wanders between the red floor and the green
   goal. **The wheel** (*The Red-Bet System*) spins once per bet.
7. *The Moment Scale* now has an experiment too (a rescaled die with the given mean and variance).

## What was new in Milestone 2 — what to try

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
- 553/553 unit tests; all five browser tests pass with zero console errors.
- **Every one of the 74 Ch 2–4 encounters and all three new boss fights have now been played to the end** by
  `tests/e2e/playthrough.spec.js`: it tries each toy by hand, pours a guess, waits for the Run, forges the
  content's own formula and walks to the choices. All 117 phases were accepted with no mistakes logged.
- The pictures only show what the trial decided (a unit test checks stopwatch, page, ledge, duel and wheel
  against the run they draw).
- By hand in the browser: card, dice and stone experiments, the knob toy, Venn ponds, crowd grid, tree,
  detective pins, flask, run board, compare line, and the pedestal choice.
- Not done by a human: the playthrough above is a script. It proves the game can be finished; it cannot say
  whether a toy *teaches* well. That needs your eyes.

## Not in this milestone

- **Ch 5–8** (Milestone 3): regions are on the map but say they are still being built. That includes the
  Φ-Scroll, the bell-curve archery toy and the final boss "The Law".
- Juice pass (Milestone 4): settings for text size / reduced motion, title polish, credits, something to buy with gold.

## Known issues

- Card hands, urns and the remaining word-only runs (*The Queen's Secret*, *The Bridge Circuit*) are still tokens and
  words with no scene of their own. The market stall's "EV meter" is the gold average line on its histogram,
  not a separate instrument.
- A histogram bar that collects stragglers (20 or more rolls) is labelled with the plain number, not "20+".
- *The Balanced Academy* and the first question of *Reverse Engineering* still have no experiment; their toy
  is "think it through".
- The by-hand toy now stays above the question box even for the longest stories. Only *Pooled Potions Test*
  is long enough for the box to reach the bar labels once the "Gut | runs" line is showing.
- In the small story text at some window sizes an "8" can look like "&" (the pixel font at a non-whole
  scale). It was already so; the forge shows the same story larger.
- The dialogue, forge and panels are HTML over the canvas rather than in-canvas pixel sprites.
- Star Shrine cards are clicked to add, then dragged on the sky.
- The forge accepts an encounter's variable names (e.g. `p*s/(p*s+(1-p)*fp)`).
- Shake and particles ignore the OS "reduce motion" setting until Milestone 4.
- 60 fps on a mid-range laptop has not been measured. 1,000 trials of every simulation take far less than a
  second (tested).
- Content caveats: see `CONTENT_ISSUES.md`.
