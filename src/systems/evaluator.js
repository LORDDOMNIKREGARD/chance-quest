// The Chance Forge's expression language. No eval / Function anywhere.
//
// It works in two steps:
//   1. tokenize("2C(5,2)")  →  [2, C, (, 5, ",", 2, )]
//   2. a recursive-descent parser turns the tokens into a *closure*: a small
//      function `env => number`. Calling it with the variables gives the value.
//      (Closures let `sum(k,0,3,expr)` re-run `expr` once per value of k.)
//
// Grammar, loosest-binding first:
//   expr    := term (('+' | '-') term)*
//   term    := unary (('*' | '/') unary | power)*      ← bare `power` = implicit ×
//   unary   := '-' unary | power
//   power   := postfix ('^' unary)?                    ← right-assoc: 2^3^2 = 2^9
//   postfix := primary '!'*
//   primary := number | name | name '(' args ')' | '(' expr ')'
// `-2^2` is −4 because unary minus sits *above* power in this list.

/** Error with a message that is safe to show the player. */
export class ForgeError extends Error {}
const fail = msg => { throw new ForgeError(msg); };

// Runes the forge tiles show, mapped back to plain ASCII.
const ALIASES = { '×': '*', '·': '*', '÷': '/', '−': '-', '√': 'sqrt', 'Σ': 'sum', 'Φ': 'Phi', 'π': 'pi' };

/** Split text into tokens: numbers, names, and single-character symbols. */
export function tokenize(text) {
  const src = [...text].map(ch => ALIASES[ch] ?? ch).join('');
  const tokens = [];
  const re = /\s*(?:(\d+\.?\d*|\.\d+)|([A-Za-z][A-Za-z0-9]*)|(.))/gy;
  let m;
  while ((m = re.exec(src)) && m[0] !== '') {
    if (m[1] !== undefined) tokens.push({ type: 'num', value: parseFloat(m[1]) });
    else if (m[2] !== undefined) tokens.push({ type: 'name', value: m[2] });
    else if ('+-*/^!(),'.includes(m[3])) tokens.push({ type: m[3] });
    else if (m[3].trim()) fail(`The rune "${m[3]}" is not known to this forge.`);
  }
  return tokens;
}

// ---------- maths helpers ----------

const isInt = x => Math.abs(x - Math.round(x)) < 1e-9;
const needInt = (x, what) => (isInt(x) && x >= 0 ? Math.round(x) : fail(`${what} needs a whole number ≥ 0, not ${x}.`));

function factorial(x) {
  const n = needInt(x, 'Factorial (!)');
  if (n > 170) fail('That factorial is too large for the forge.');
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

/** "n choose k". Multiplies as it goes so C(52,13) never builds a huge factorial. */
function choose(n, k) {
  n = needInt(n, 'C(n,k)'); k = needInt(k, 'C(n,k)');
  if (k > n) return 0;
  k = Math.min(k, n - k);
  let out = 1;
  for (let i = 1; i <= k; i++) out = out * (n - k + i) / i;
  return Math.round(out);
}

/** Ordered picks: n·(n−1)·…·(n−k+1). */
function permute(n, k) {
  n = needInt(n, 'P(n,k)'); k = needInt(k, 'P(n,k)');
  if (k > n) return 0;
  let out = 1;
  for (let i = 0; i < k; i++) out *= n - i;
  return out;
}

/** Multinomial n!/(a!b!…), built as C(n,a)·C(n−a,b)·… */
function multinomial(n, ...parts) {
  const total = parts.reduce((s, p) => s + p, 0);
  if (!isInt(total - n)) fail(`M(n,…): the parts add to ${total}, not ${n}.`);
  let left = n, out = 1;
  for (const p of parts) { out *= choose(left, p); left -= p; }
  return out;
}

/** Standard normal CDF via the series Φ(z) = ½ + φ(z)·(z + z³/3 + z⁵/(3·5) + …). */
export function Phi(z) {
  if (z < -8) return 0;
  if (z > 8) return 1;
  let term = z, sum = z;
  for (let i = 3; Math.abs(term) > 1e-17; i += 2) { term *= z * z / i; sum += term; }
  return 0.5 + sum * Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
}

// Object.create(null) = a dictionary with no inherited keys, so typing
// "constructor" or "toString" at the forge is just an unknown rune.
const dict = entries => Object.assign(Object.create(null), entries);
const CONSTANTS = dict({ e: Math.E, pi: Math.PI });
const FUNCTIONS = dict({
  C: choose, P: permute, M: multinomial, Phi,
  exp: Math.exp, abs: Math.abs, min: Math.min, max: Math.max,
  ln: x => (x > 0 ? Math.log(x) : fail('ln needs a positive number.')),
  sqrt: x => (x >= 0 ? Math.sqrt(x) : fail('√ needs a number ≥ 0.')),
});
const ARITY = { C: 2, P: 2, Phi: 1, exp: 1, abs: 1, ln: 1, sqrt: 1 }; // others take any number

// ---------- parser ----------

/** Compile an expression into a function `env => number`. Throws ForgeError if malformed. */
export function compile(text) {
  const tokens = tokenize(text);
  if (!tokens.length) fail('The anvil is empty.');
  let pos = 0;
  const peek = () => tokens[pos]?.type;
  const take = type => (peek() === type ? tokens[pos++] : null);
  const expect = type => take(type) ?? fail(peek() ? `Expected "${type}" but found "${tokens[pos].value ?? peek()}".` : `Unfinished: expected "${type}".`);
  const startsValue = () => ['num', 'name', '('].includes(peek());

  function expr() {
    let left = term();
    for (let op; (op = take('+') || take('-'));) {
      const a = left, b = term();
      left = op.type === '+' ? env => a(env) + b(env) : env => a(env) - b(env);
    }
    return left;
  }

  function term() {
    let left = unary();
    for (;;) {
      const a = left;
      if (take('*')) { const b = unary(); left = env => a(env) * b(env); }
      else if (take('/')) {
        const b = unary();
        left = env => { const d = b(env); return d === 0 ? fail('Division by zero.') : a(env) / d; };
      }
      else if (startsValue()) { const b = power(); left = env => a(env) * b(env); } // 2C(5,2), 3!3!
      else return left;
    }
  }

  function unary() {
    if (take('-')) { const a = unary(); return env => -a(env); }
    return power();
  }

  function power() {
    const base = postfix();
    if (!take('^')) return base;
    const exponent = unary(); // unary → power again, so ^ chains to the right
    return env => Math.pow(base(env), exponent(env));
  }

  function postfix() {
    let value = primary();
    while (take('!')) { const a = value; value = env => factorial(a(env)); }
    return value;
  }

  function primary() {
    const num = take('num');
    if (num) return () => num.value;
    if (take('(')) { const inner = expr(); expect(')'); return inner; }
    const name = take('name');
    if (!name) fail(peek() ? `"${peek()}" can't go there.` : 'The expression stops too early.');
    const id = name.value;
    if (id === 'sum' && peek() === '(') return summation();
    if (FUNCTIONS[id] && peek() === '(') return call(id);
    return env => (Object.hasOwn(env, id) ? env[id] : CONSTANTS[id] ?? fail(`Unknown rune "${id}".`));
  }

  function call(id) {
    expect('(');
    const args = [expr()];
    while (take(',')) args.push(expr());
    expect(')');
    if (ARITY[id] && args.length !== ARITY[id]) fail(`${id}( ) takes ${ARITY[id]} value${ARITY[id] > 1 ? 's' : ''}.`);
    return env => FUNCTIONS[id](...args.map(a => a(env)));
  }

  // sum(var, from, to, body): body is evaluated lazily, once per value of var.
  function summation() {
    expect('(');
    const variable = expect('name').value; expect(',');
    const from = expr(); expect(',');
    const to = expr(); expect(',');
    const body = expr(); expect(')');
    return env => {
      const lo = Math.round(from(env)), hi = Math.round(to(env));
      if (hi - lo > 100000) fail('That sum has too many terms.');
      let total = 0;
      for (let i = lo; i <= hi; i++) total += body({ ...env, [variable]: i });
      return total;
    };
  }

  const root = expr();
  if (pos < tokens.length) fail(`"${tokens[pos].value ?? peek()}" can't go there.`);
  return root;
}

/** Evaluate `text` with the given variables. Always returns a finite number or throws ForgeError. */
export function evaluate(text, vars = {}) {
  const value = compile(text)(vars);
  if (!Number.isFinite(value)) fail('That does not forge into a finite number.');
  return value;
}

/** Is `mine` close enough to `answer`? tol is {abs} or {rel}. */
export function withinTol(mine, answer, tol) {
  const slack = tol.abs ?? tol.rel * Math.abs(answer);
  return Math.abs(mine - answer) <= slack + 1e-12;
}
