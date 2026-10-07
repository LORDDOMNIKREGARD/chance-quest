// Echoes: Leitner spaced repetition. A card sits in box 1–4 and comes back
// after 1, 3, 7 and 21 days. Clean solve → next box; a miss → back to box 1.

export const DAY = 24 * 60 * 60 * 1000;
export const INTERVALS = [1, 3, 7, 21]; // days to wait in box 1, 2, 3, 4

/** A freshly failed encounter: box 1, due tomorrow. */
export const newCard = now => ({ box: 1, due: now + INTERVALS[0] * DAY });

/**
 * Result of facing an Echo. Returns the updated card, or null once it has
 * been solved cleanly out of the last box (the Echo is laid to rest).
 */
export function review(card, clean, now) {
  if (!clean) return newCard(now);
  if (card.box >= INTERVALS.length) return null;
  return { box: card.box + 1, due: now + INTERVALS[card.box] * DAY };
}

export const isDue = (card, now) => card.due <= now;
