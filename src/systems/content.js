// Loads public/content.json and offers small pure helpers around it.
import { evaluate } from './evaluator.js';

/** @type {{regions: any[], encounters: any[], bounties: any[]}} */
export const content = { regions: [], encounters: [], bounties: [] };

export async function loadContent() {
  // The pixel font has no "−" (U+2212), so "N−2" would show a barely visible
  // fallback dash. Show a plain hyphen instead. Display text only: formulas
  // (`f`) are ASCII already and no number is touched.
  const text = await (await fetch('content.json')).text();
  Object.assign(content, JSON.parse(text.replaceAll('−', '-')));
}

export const encById = id => content.encounters.find(e => e.id === id);

/** Compare section strings numerically, so "4.8.1" < "4.10". */
export function compareSec(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

/** A chapter's encounters in section order (stable, so file order breaks ties). */
export const regionEncounters = ch =>
  content.encounters.filter(e => e.ch === ch).sort((a, b) => compareSec(a.sec, b.sec));

export const fmt = v => String(+Number(v).toPrecision(10));

/** Replace {name} placeholders with the encounter's variable values. */
export const fill = (text, vars) =>
  text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(+vars[name].toPrecision(6)) : whole));

/** New variable values for an Echo: each `vary` entry is {min,max} or a list. */
export function reroll(enc, rng = Math.random) {
  const vars = { ...enc.vars };
  for (const [name, rule] of Object.entries(enc.vary ?? {})) {
    vars[name] = Array.isArray(rule)
      ? rule[Math.floor(rng() * rule.length)]
      : rule.min + Math.floor(rng() * (rule.max - rule.min + 1));
  }
  return vars;
}

/** The exact answer of a numeric phase for the given variables. */
export const answerOf = (phase, vars) => evaluate(phase.f, vars);
