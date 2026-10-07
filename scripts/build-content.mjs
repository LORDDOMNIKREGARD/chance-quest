// Merges content-src/ch*.json into public/content.json and rebuilds the bounty list.
// Bounties are derived, not typed: one per Ross end-of-chapter Problem (P) and
// Self-Test (ST), linked to every encounter whose `mirrors` names that ref.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const REGIONS = [
  ['Tallyburg', 'Counting — Ross Ch 1'],
  ['Venn Marshes', 'Axioms of Probability — Ch 2'],
  ['Bayesport', 'Conditional Probability & Independence — Ch 3'],
  ['Fortune Bazaar', 'Discrete Random Variables — Ch 4'],
  ['Bellcurve Peaks', 'Continuous Random Variables — Ch 5'],
  ['Twin Forge', 'Jointly Distributed RVs — Ch 6'],
  ['Indicator Mines', 'Properties of Expectation — Ch 7'],
  ['Citadel of Large Numbers', 'Limit Theorems — Ch 8'],
];
// [problems, self-tests] at the end of each chapter (10th ed.) — 704 in total.
const COUNTS = [[33, 21], [56, 20], [97, 37], [89, 32], [44, 24], [65, 26], [84, 33], [28, 15]];

const encounters = REGIONS.flatMap((_, i) =>
  JSON.parse(readFileSync(`content-src/ch${i + 1}.json`, 'utf8')));

const bounties = COUNTS.flatMap(([p, st], i) => {
  const ch = i + 1;
  const make = (prefix, kind, n) => Array.from({ length: n }, (_, j) => {
    const ref = `${prefix}${ch}.${j + 1}`;
    return { ref, ch, kind, linkedEncounters: encounters.filter(e => e.mirrors.includes(ref)).map(e => e.id) };
  });
  return [...make('P', 'Problem', p), ...make('ST', 'Self-Test', st)];
});

const content = {
  meta: {
    source: "Sheldon Ross, A First Course in Probability, 10th ed. — encounters are ORIGINAL problems mirroring the book's problem archetypes; 'mirrors' gives book problem refs (P = Problem, ST = Self-Test, Ex = Example, TE = Theoretical Exercise).",
  },
  regions: REGIONS.map(([name, subtitle], i) => ({ ch: i + 1, name, subtitle })),
  encounters,
  bounties,
};
mkdirSync('public', { recursive: true });
writeFileSync('public/content.json', JSON.stringify(content));
console.log(`${encounters.length} encounters, ${bounties.length} bounties → public/content.json`);
