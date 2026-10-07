# Chance Quest

A top-down pixel-art RPG that teaches probability, following Sheldon Ross, *A First Course in Probability*
(10th ed.), Chapters 1–8. Every problem is a situation in the world: a lock to crack, a bench to seat, a
treasure to split. You play with a small version of it first, then forge the exact answer.

**Play it:** https://lorddomnikregard.github.io/chance-quest/

Chapters 1–4 are playable: Tallyburg (counting), Venn Marshes (axioms), Bayesport (conditional probability)
and Fortune Bazaar (discrete random variables). Chapters 5–8 are still to come. See
[PLAYTEST.md](PLAYTEST.md) for what to try.

**Versus:** from the title screen, race a friend online through the same questions against the same clock
(or practise alone). One of you hosts and shares a five-letter code.

Your progress saves itself in your browser. Use Menu → Export save to back it up or move it to another device.

## Run it locally

```bash
npm install
npm run dev
```

| Command | What it does |
|---|---|
| `npm test` | unit tests (evaluator, every content formula, simulations, Echo scheduling) |
| `npm run e2e` | browser tests: smoke tests and a full playthrough of chapters 2–4 |
| `npm run build` | static site in `dist/` |
| `npm run deploy` | build and publish to GitHub Pages (the `gh-pages` branch) |

Built with Vite and Phaser 3 in plain JavaScript; online duels use PeerJS (WebRTC). All art and sound are generated in code.

The encounters are original problems; the game references book problem numbers only and contains no text
from the book.
