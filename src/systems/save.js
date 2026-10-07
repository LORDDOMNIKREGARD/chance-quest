// The player's whole journey lives in one plain object, `state`, mirrored
// to localStorage. Everything is wrapped in try/catch: private-browsing
// modes can throw on any storage access.
const KEY = 'chance-quest-save-v1';

export const fresh = () => ({
  v: 1,
  hearts: 5, xp: 0, gold: 0,
  solved: {},    // encounter id → { clean, t }
  revealed: {},  // encounter id → true once its answer may be shown (solved or Scroll opened)
  cards: [],     // encounter ids whose Pattern Card is owned
  echoes: {},    // encounter id or "book:<ref>" → Leitner card { box, due }
  mistakes: [],  // Grimoire of Blunders
  bounties: {},  // book ref → { r: 'ok' | 'miss', t }
  bosses: [],    // chapters whose boss is beaten
  shrine: {},    // chapter → { date, stars, links }
  mute: false,
  where: { scene: 'Overworld' },
});

export const state = fresh();

/** Debug/test handle, also handy in the browser console: window.__cq */
export const cq = (globalThis.__cq = { state, scene: 'Boot', near: null, event: null });

export function hasSave() {
  try { return localStorage.getItem(KEY) !== null; } catch { return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(state, fresh(), JSON.parse(raw));
  } catch { /* a corrupt or blocked save just means a fresh start */ }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* play on without saving */ }
}

export function reset() { Object.assign(state, fresh()); save(); }

/** Replace the journey with an imported one. Throws if the text is not a save. */
export function importSave(text) {
  const data = JSON.parse(text);
  if (data?.v !== 1 || !data.solved) throw new Error('not a Chance Quest save');
  Object.assign(state, fresh(), data);
  save();
}

export const level = () => 1 + Math.floor(state.xp / 100);
// Five to start: three wrong forges open the Scroll of Insight before you can faint.
export const maxHearts = () => Math.min(10, 5 + Math.floor((level() - 1) / 2));

/** Add XP; returns true when that crossed into a new level (which refills hearts). */
export function addXp(amount) {
  const before = level();
  state.xp += amount;
  if (level() === before) return false;
  state.hearts = maxHearts();
  return true;
}
