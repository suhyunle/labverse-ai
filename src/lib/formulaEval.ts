/**
 * Safe arithmetic evaluator for AI-authored observable formulas.
 *
 * No eval/Function: formulas are tokenised and parsed into an AST, then evaluated against a scope
 * of variable values. Unknown identifiers, unknown functions, bad arity and non-finite results are
 * errors, so a formula either produces a real number or reports exactly what is wrong. Pure, so it
 * runs identically on the server (verification) and in the browser (live telemetry).
 */

export interface CompiledFormula {
  /** The normalised right-hand side that is actually evaluated. */
  source: string;
  /** Variable identifiers the formula reads (constants and function names excluded). */
  identifiers: string[];
  evaluate(scope: Record<string, number>): number;
}

export type CompileResult =
  | { ok: true; formula: CompiledFormula }
  | { ok: false; error: string };

export const FORMULA_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

type Fn = { arity: number | [number, number]; apply: (args: number[]) => number };

export const FORMULA_FUNCTIONS: Record<string, Fn> = {
  sqrt: { arity: 1, apply: ([x]) => Math.sqrt(x) },
  abs: { arity: 1, apply: ([x]) => Math.abs(x) },
  exp: { arity: 1, apply: ([x]) => Math.exp(x) },
  ln: { arity: 1, apply: ([x]) => Math.log(x) },
  log: { arity: 1, apply: ([x]) => Math.log(x) },
  log10: { arity: 1, apply: ([x]) => Math.log10(x) },
  log2: { arity: 1, apply: ([x]) => Math.log2(x) },
  sin: { arity: 1, apply: ([x]) => Math.sin(x) },
  cos: { arity: 1, apply: ([x]) => Math.cos(x) },
  tan: { arity: 1, apply: ([x]) => Math.tan(x) },
  asin: { arity: 1, apply: ([x]) => Math.asin(x) },
  acos: { arity: 1, apply: ([x]) => Math.acos(x) },
  atan: { arity: 1, apply: ([x]) => Math.atan(x) },
  sinh: { arity: 1, apply: ([x]) => Math.sinh(x) },
  cosh: { arity: 1, apply: ([x]) => Math.cosh(x) },
  tanh: { arity: 1, apply: ([x]) => Math.tanh(x) },
  acosh: { arity: 1, apply: ([x]) => Math.acosh(x) },
  floor: { arity: 1, apply: ([x]) => Math.floor(x) },
  ceil: { arity: 1, apply: ([x]) => Math.ceil(x) },
  round: { arity: 1, apply: ([x]) => Math.round(x) },
  sign: { arity: 1, apply: ([x]) => Math.sign(x) },
  pow: { arity: 2, apply: ([x, y]) => Math.pow(x, y) },
  min: { arity: [1, 8], apply: (xs) => Math.min(...xs) },
  max: { arity: [1, 8], apply: (xs) => Math.max(...xs) },
  clamp: { arity: 3, apply: ([x, lo, hi]) => Math.min(Math.max(x, lo), hi) },
};

/**
 * Accepts the LaTeX-flavoured spellings models like to emit and reduces them to plain arithmetic.
 * Also drops a leading "name =" so "T = 2 pi sqrt(L/g)" evaluates as its right-hand side.
 */
export function normalizeExpression(input: string): string {
  let s = String(input ?? '').trim();
  s = s.replace(/\$/g, '');
  // \frac{a}{b} -> (a)/(b); repeat for nesting
  for (let i = 0; i < 5; i++) s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '(($1)/($2))');
  for (let i = 0; i < 3; i++) s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)');
  s = s.replace(/\\(?:left|right|cdot|times|,|;|!|quad|qquad)/g, (m) =>
    m === '\\cdot' || m === '\\times' ? '*' : ' ',
  );
  s = s.replace(/\\text\s*\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\mathrm\s*\{([^{}]*)\}/g, '$1');
  s = s.replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([A-Za-z0-9_.]+)/g, 'sqrt($1)');
  s = s.replace(/[×·∙]/g, '*').replace(/÷/g, '/');
  s = s.replace(/[−–—]/g, '-');
  s = s.replace(/²/g, '^2').replace(/³/g, '^3').replace(/½/g, '0.5');
  s = s.replace(/\\/g, '');
  // keep only the right-hand side of an assignment ("t = ..." / "v_t = ...")
  const parts = s.split('=');
  if (parts.length > 1) s = parts[parts.length - 1];
  return s.replace(/\s+/g, ' ').trim();
}

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') { i++; continue; }
    if (c >= '0' && c <= '9') {
      const m = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new Error(`숫자를 해석할 수 없습니다: ${src.slice(i, i + 8)}`);
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (c === '.') {
      const m = /^\.\d+(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new Error("'.' 위치가 올바르지 않습니다");
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    if ('+-*/^%'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(' || c === '[' || c === '{') { out.push({ t: 'lp' }); i++; continue; }
    if (c === ')' || c === ']' || c === '}') { out.push({ t: 'rp' }); i++; continue; }
    if (c === ',') { out.push({ t: 'comma' }); i++; continue; }
    throw new Error(`허용되지 않은 문자: '${c}'`);
  }
  return out;
}

type Node =
  | { k: 'num'; v: number }
  | { k: 'var'; name: string }
  | { k: 'unary'; op: '-' | '+'; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'call'; name: string; args: Node[] };

/**
 * expr  := term (('+'|'-') term)*
 * term  := unary (('*'|'/'|'%') unary)*   — adjacency ("2 pi r") is an implicit product
 * unary := ('+'|'-') unary | power
 * power := primary ('^' unary)?           — right associative
 */
function parse(tokens: Token[]): Node {
  let p = 0;
  const peek = () => tokens[p];
  const atEnd = () => p >= tokens.length;

  const expr = (): Node => {
    let node = term();
    for (;;) {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
        p++;
        node = { k: 'bin', op: t.v, a: node, b: term() };
      } else return node;
    }
  };

  const term = (): Node => {
    let node = unary();
    for (;;) {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '*' || t.v === '/' || t.v === '%')) {
        p++;
        node = { k: 'bin', op: t.v, a: node, b: unary() };
      } else if (t && (t.t === 'num' || t.t === 'id' || t.t === 'lp')) {
        // implicit multiplication: "2 pi r", "3(x+1)"
        node = { k: 'bin', op: '*', a: node, b: unary() };
      } else return node;
    }
  };

  const unary = (): Node => {
    const t = peek();
    if (t && t.t === 'op' && (t.v === '-' || t.v === '+')) {
      p++;
      return { k: 'unary', op: t.v as '-' | '+', a: unary() };
    }
    return power();
  };

  const power = (): Node => {
    const base = primary();
    const t = peek();
    if (t && t.t === 'op' && t.v === '^') {
      p++;
      return { k: 'bin', op: '^', a: base, b: unary() };
    }
    return base;
  };

  const primary = (): Node => {
    const t = peek();
    if (!t) throw new Error('수식이 중간에 끊겼습니다');
    if (t.t === 'num') { p++; return { k: 'num', v: t.v }; }
    if (t.t === 'id') {
      p++;
      const next = peek();
      if (next && next.t === 'lp') {
        p++;
        const args: Node[] = [];
        if (peek() && peek().t !== 'rp') {
          args.push(expr());
          while (peek() && peek().t === 'comma') { p++; args.push(expr()); }
        }
        if (!peek() || peek().t !== 'rp') throw new Error(`'${t.v}(' 의 닫는 괄호가 없습니다`);
        p++;
        return { k: 'call', name: t.v, args };
      }
      return { k: 'var', name: t.v };
    }
    if (t.t === 'lp') {
      p++;
      const inner = expr();
      if (!peek() || peek().t !== 'rp') throw new Error('닫는 괄호가 없습니다');
      p++;
      return inner;
    }
    throw new Error('수식을 해석할 수 없습니다');
  };

  const node = expr();
  if (!atEnd()) throw new Error('수식 뒤에 해석할 수 없는 내용이 남았습니다');
  return node;
}

function collectIdentifiers(node: Node, out: Set<string>) {
  switch (node.k) {
    case 'var':
      if (!(node.name in FORMULA_CONSTANTS)) out.add(node.name);
      return;
    case 'unary':
      return collectIdentifiers(node.a, out);
    case 'bin':
      collectIdentifiers(node.a, out);
      return collectIdentifiers(node.b, out);
    case 'call':
      node.args.forEach((a) => collectIdentifiers(a, out));
      return;
    default:
      return;
  }
}

function evalNode(node: Node, scope: Record<string, number>): number {
  switch (node.k) {
    case 'num':
      return node.v;
    case 'var': {
      if (node.name in scope) {
        const v = scope[node.name];
        if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`변수 ${node.name}의 값이 유효하지 않습니다`);
        return v;
      }
      if (node.name in FORMULA_CONSTANTS) return FORMULA_CONSTANTS[node.name];
      throw new Error(`정의되지 않은 변수: ${node.name}`);
    }
    case 'unary': {
      const a = evalNode(node.a, scope);
      return node.op === '-' ? -a : a;
    }
    case 'bin': {
      const a = evalNode(node.a, scope);
      const b = evalNode(node.b, scope);
      switch (node.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
          if (b === 0) throw new Error('0으로 나눌 수 없습니다');
          return a / b;
        case '%':
          if (b === 0) throw new Error('0으로 나눌 수 없습니다');
          return a % b;
        case '^': return Math.pow(a, b);
        default: throw new Error(`알 수 없는 연산자: ${node.op}`);
      }
    }
    case 'call': {
      const fn = FORMULA_FUNCTIONS[node.name];
      if (!fn) throw new Error(`허용되지 않은 함수: ${node.name}`);
      const args = node.args.map((a) => evalNode(a, scope));
      const [lo, hi] = Array.isArray(fn.arity) ? fn.arity : [fn.arity, fn.arity];
      if (args.length < lo || args.length > hi) {
        throw new Error(`${node.name}에 인자 ${args.length}개가 전달되었습니다 (${lo}${hi !== lo ? `~${hi}` : ''}개 필요)`);
      }
      return fn.apply(args);
    }
  }
}

/** Parses a formula once so it can be evaluated repeatedly (e.g. every animation frame). */
export function compileFormula(input: string): CompileResult {
  const source = normalizeExpression(input);
  if (!source) return { ok: false, error: '수식이 비어 있습니다' };
  let ast: Node;
  try {
    ast = parse(tokenize(source));
  } catch (err: any) {
    return { ok: false, error: err?.message || '수식을 해석할 수 없습니다' };
  }
  const ids = new Set<string>();
  collectIdentifiers(ast, ids);
  return {
    ok: true,
    formula: {
      source,
      identifiers: [...ids],
      evaluate(scope) {
        const value = evalNode(ast, scope);
        if (!Number.isFinite(value)) throw new Error('결과가 유한한 수가 아닙니다');
        return value;
      },
    },
  };
}

/** One-shot compile + evaluate. */
export function evaluateFormula(
  input: string,
  scope: Record<string, number>,
): { ok: true; value: number } | { ok: false; error: string } {
  const compiled = compileFormula(input);
  if (!compiled.ok) return { ok: false, error: compiled.error };
  try {
    return { ok: true, value: compiled.formula.evaluate(scope) };
  } catch (err: any) {
    return { ok: false, error: err?.message || '수식을 계산할 수 없습니다' };
  }
}

/** Significant-figure-ish formatting so 0.0043 and 125000 both read well in the telemetry HUD. */
export function formatObservableValue(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) return '—';
  if (typeof decimals === 'number' && decimals >= 0 && decimals <= 6) return value.toFixed(decimals);
  const mag = Math.abs(value);
  if (mag === 0) return '0';
  if (mag >= 1e6 || mag < 1e-4) return value.toExponential(2);
  if (mag >= 100) return value.toFixed(1);
  if (mag >= 10) return value.toFixed(2);
  if (mag >= 1) return value.toFixed(3);
  return value.toFixed(4);
}
