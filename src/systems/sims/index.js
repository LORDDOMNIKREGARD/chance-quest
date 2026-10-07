// Looks up the experiment for one phase of one encounter.
import ch2 from './ch2.js';
import ch3 from './ch3.js';
import ch4 from './ch4.js';

export const SIMS = { ...ch2, ...ch3, ...ch4 };

/** The experiment for phase `index` of `enc`, or null if that phase has nothing to simulate. */
export const simFor = (enc, index) => SIMS[enc.id]?.[index] ?? null;
