// Registry: which toy and which flavour each `scene` value from content.json gets.
import { seating, shelf, tiles } from './rows.js';
import { lock, wheel, guildHall, lattice } from './counting.js';
import { chests, banner, cardTable, expand } from './grouping.js';
import { experiment } from './experiment.js';
import { venn, sampleSpace } from './special.js';
import { crowd, hasCrowd, tree, hasTree } from './bayes.js';
import { simFor } from '../systems/sims/index.js';

// Chapter 1 is pure counting: every template there has a hand-countable toy.
const COUNTING_TOYS = {
  lock, wheel, seating, shelf, tiles, lattice, chests, banner,
  'guild-hall': guildHall, 'card-table': cardTable, forge: expand,
};

// Nothing to try by hand (a pure algebra step, or a chapter not built yet).
const plain = k => {
  k.text(56, 30, 'Think it through, then forge.');
  return { icon: 'scroll', target: k.img(260, 80, 'chest').setScale(2) };
};

/**
 * Build the toy for one phase. Returns { icon, target, ok?, bad? }:
 * the forged thing flies to `target`, then ok() or bad() lets the toy react.
 * From Chapter 2 on, the default toy is the phase's own experiment run by
 * hand; a few templates have something more specific.
 */
export function buildToy(k, enc, vars, phaseIndex) {
  if (enc.ch === 1) return (COUNTING_TOYS[enc.scene] ?? plain)(k, enc, vars, phaseIndex);
  if (enc.scene === 'venn-pond') return venn(k, enc, vars);
  if (hasCrowd(enc)) return crowd(k, enc, vars);
  if (hasTree(enc)) return tree(k, enc, vars);
  const sim = simFor(enc, phaseIndex);
  if (sim) return experiment(k, vars, sim, FLAVOUR[enc.scene].stake ? 'coin' : 'scroll');
  if (enc.id === 'c2-sample-space') return sampleSpace(k, enc, vars, phaseIndex);
  return plain(k);
}

// Who owns each template, and how the world reacts to a right / wrong forge.
// `stake: true` = you are betting: a wrong forge costs gold rather than a heart.
export const FLAVOUR = {
  lock: { npc: 'Locksmith', ok: 'The lock clicks open!', bad: 'The lock spits sparks!' },
  shelf: { npc: 'Librarian', ok: 'The shelf locks into place.', bad: 'Books tumble to the floor!' },
  seating: { npc: 'Steward', ok: 'Everyone takes their place.', bad: 'The crowd grumbles!' },
  tiles: { npc: 'Weaver', ok: 'The banner unfurls!', bad: 'The thread snaps!' },
  'guild-hall': { npc: 'Guildmaster', ok: 'The council stamps the decree.', bad: 'The council throws it out!' },
  lattice: { npc: 'Cartographer', ok: 'The castle gate opens.', bad: 'A dead end!' },
  chests: { npc: 'Treasurer', ok: 'The chests lock. Loot secured!', bad: 'A chest bites your fingers!' },
  banner: { npc: 'Sergeant', ok: 'The squads march off.', bad: 'The recruits trip over each other!' },
  'card-table': { npc: 'Dealer', ok: 'The table pays out.', bad: 'The dealer rakes in your bet!', stake: true },
  'dice-table': { npc: 'Dicer', ok: 'The dice fall your way.', bad: 'Snake eyes. You lose the pot!', stake: true },
  'urn-well': { npc: 'Well Spirit', ok: 'The spirit grants your wish.', bad: 'The well goes dark.' },
  'venn-pond': { npc: 'Marsh Sage', ok: 'The fog clears.', bad: 'The fog thickens!' },
  'duel-arena': { npc: 'Rival', ok: 'A clean hit!', bad: 'Your rival gets a free shot!' },
  clinic: { npc: 'Healer', ok: 'The diagnosis holds.', bad: 'A villager is mistreated!' },
  'detective-board': { npc: 'Detective', ok: 'The right suspect is arrested.', bad: 'The culprit slips away!' },
  tree: { npc: 'Pathfinder', ok: 'The lantern lights the branch.', bad: 'The lantern gutters out.' },
  wheel: { npc: 'Croupier', ok: 'Your bankroll grows.', bad: 'The house takes your coin!', stake: true },
  'market-stall': { npc: 'Merchant', ok: 'A tidy profit.', bad: 'You are fleeced!', stake: true },
  'fishing-dock': { npc: 'Angler', ok: 'A fine catch.', bad: 'The line snaps!' },
  'archery-range': { npc: 'Ranger', ok: 'Bullseye!', bad: 'The arrow goes wide!' },
  'bus-stop': { npc: 'Coachman', ok: 'The coach arrives.', bad: 'The coach rolls past!' },
  forge: { npc: 'Rune-smith', ok: 'The rune glows true.', bad: 'The rune cracks!' },
  rendezvous: { npc: 'Spymaster', ok: 'The spies meet.', bad: 'They miss each other!' },
  'mine-tunnel': { npc: 'Foreman', ok: 'Daylight ahead!', bad: 'The tunnel loops back!' },
  collector: { npc: 'Collector', ok: 'The collection is complete.', bad: 'A duplicate. Again!' },
  'marching-army': { npc: 'General', ok: 'The wall breaks!', bad: 'The line wavers!' },
  'oracle-tower': { npc: 'Oracle', ok: 'The next floor is revealed.', bad: 'The stairs vanish!' },
};

// The final boss of each region, in chapter order.
export const BOSSES = [
  'The Tallymaster', 'The Fog Warden', 'Inspector Prior', 'The House',
  'Old Bellcurve', 'The Twin Smiths', 'The Deep Collector', 'The Law',
];

/** Chapters whose regions can be entered so far. */
export const BUILT_CHAPTERS = 4;
