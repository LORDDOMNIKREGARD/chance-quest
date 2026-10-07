// All sound is synthesised with WebAudio: short beeps for effects and a
// generated chiptune loop per region. No audio files.

let ctx = null;      // created on the first key press / tap (browsers require that)
let muted = false;
let musicTimer = null;

const unlock = () => { ctx ??= new AudioContext(); };
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

/** Play one note: `freq` Hz for `dur` seconds, starting `when` seconds from now. */
function tone(freq, dur, type = 'square', vol = 0.05, when = 0) {
  if (!ctx || muted) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  const t0 = ctx.currentTime + when;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // quick fade = no click
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

// Each effect is a list of [frequency, duration, waveform] played back to back.
const SFX = {
  blip: [[660, 0.05]],
  tick: [[990, 0.04]],
  talk: [[440, 0.03, 'triangle']],
  forge: [[180, 0.06, 'sawtooth'], [360, 0.08, 'triangle']],
  ok: [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2]],
  bad: [[196, 0.12, 'sawtooth'], [139, 0.25, 'sawtooth']],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [659, 0.1], [784, 0.1], [1047, 0.35]],
};

export function sfx(name) {
  let when = 0;
  for (const [freq, dur, type] of SFX[name] ?? []) { tone(freq, dur, type, 0.05, when); when += dur; }
}

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]; // major pentatonic, in semitones
/** Start the looping tune for a chapter (0 or nothing stops it). The chapter picks key and melody. */
export function music(ch = 0) {
  clearInterval(musicTimer);
  if (!ch) return;
  const root = 196 * Math.pow(2, (ch * 2 % 7) / 12);
  let stepNo = 0;
  musicTimer = setInterval(() => {
    const n = stepNo++ % 16;
    const degree = SCALE[(n * (ch + 2) + (n >> 2) * 3) % SCALE.length]; // a fixed pattern per chapter
    if (n % 2 === 0) tone(root * Math.pow(2, degree / 12), 0.2, 'triangle', 0.03);
    if (n % 8 === 0) tone(root / 2, 0.4, 'square', 0.015);
  }, 180);
}

export function setMuted(value) { muted = value; }
