# Chance Quest

A top-down pixel-art RPG that teaches probability, following Sheldon Ross, *A First Course in Probability*
(10th ed.), Chapters 1–8. Every problem is a situation in the world: a lock to crack, a bench to seat, a
treasure to split. You play with a small version of it first, then forge the exact answer.

**Play it:** https://lorddomnikregard.github.io/chance-quest/

Milestone 1 is playable: the engine and Tallyburg (Chapter 1, counting). See [PLAYTEST.md](PLAYTEST.md) for
what to try and what is still to come.

## Run it locally

```bash
npm install
npm run dev
```

| Command | What it does |
|---|---|
| `npm test` | unit tests (evaluator, every content formula, Echo scheduling) |
| `npm run e2e` | browser smoke test |
| `npm run build` | static site in `dist/` |
| `npm run deploy` | build and publish to GitHub Pages (the `gh-pages` branch) |

Built with Vite and Phaser 3 in plain JavaScript. All art and sound are generated in code.

The encounters are original problems; the game references book problem numbers only and contains no text
from the book.
