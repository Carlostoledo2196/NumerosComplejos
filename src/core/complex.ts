/**
 * Aritmética en el campo ℂ.
 * Todos los valores son inmutables: { re, im }.
 */
export interface Complex {
  readonly re: number;
  readonly im: number;
}

export const c = (re: number, im = 0): Complex => ({ re, im });
export const ZERO = c(0, 0);
export const ONE = c(1, 0);
export const I = c(0, 1);

export const add = (a: Complex, b: Complex): Complex => c(a.re + b.re, a.im + b.im);
export const sub = (a: Complex, b: Complex): Complex => c(a.re - b.re, a.im - b.im);
export const neg = (a: Complex): Complex => c(-a.re, -a.im);
export const conj = (a: Complex): Complex => c(a.re, -a.im);
export const scale = (a: Complex, k: number): Complex => c(a.re * k, a.im * k);

/** (a + bi)(c + di) = (ac − bd) + (ad + bc)i. El −bd viene de i² = −1. */
export const mul = (a: Complex, b: Complex): Complex =>
  c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);

/** |z|² = z·z̄ = a² + b² */
export const abs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
export const abs = (a: Complex): number => Math.hypot(a.re, a.im);

/** Argumento principal en (−π, π], con el cuadrante correcto (atan2, no tan⁻¹(b/a)). */
export const arg = (a: Complex): number => Math.atan2(a.im, a.re);

/**
 * División por el método del conjugado:
 * (a + bi)/(c + di) = (a + bi)(c − di) / (c² + d²)
 */
export function div(a: Complex, b: Complex): Complex {
  const den = abs2(b);
  if (den === 0) throw new RangeError('División por cero en ℂ');
  const num = mul(a, conj(b));
  return c(num.re / den, num.im / den);
}

export const fromPolar = (r: number, theta: number): Complex =>
  c(r * Math.cos(theta), r * Math.sin(theta));

/** e^{iθ} = cos θ + i sen θ (fórmula de Euler). */
export const expI = (theta: number): Complex => fromPolar(1, theta);

export interface Polar {
  r: number;
  /** radianes, en (−π, π] */
  theta: number;
  /** grados, en [0, 360) para presentación */
  thetaDeg: number;
  /** 0 si está sobre un eje, 1–4 en otro caso */
  quadrant: 0 | 1 | 2 | 3 | 4;
}

export function toPolar(z: Complex): Polar {
  const theta = arg(z);
  const deg = ((theta * 180) / Math.PI + 360) % 360;
  let quadrant: Polar['quadrant'] = 0;
  if (z.re > 0 && z.im > 0) quadrant = 1;
  else if (z.re < 0 && z.im > 0) quadrant = 2;
  else if (z.re < 0 && z.im < 0) quadrant = 3;
  else if (z.re > 0 && z.im < 0) quadrant = 4;
  return { r: abs(z), theta, thetaDeg: Math.abs(deg - 360) < 1e-9 ? 0 : deg, quadrant };
}

/** Potencia entera por exponenciación rápida (exacta para enteros gaussianos pequeños). */
export function powInt(z: Complex, n: number): Complex {
  if (!Number.isInteger(n)) throw new RangeError('powInt: exponente no entero');
  if (n < 0) return div(ONE, powInt(z, -n));
  let result = ONE;
  let base = z;
  let e = n;
  while (e > 0) {
    if (e & 1) result = mul(result, base);
    base = mul(base, base);
    e >>= 1;
  }
  return result;
}

/** Los cuatro valores del ciclo de i: i⁰ = 1, i¹ = i, i² = −1, i³ = −i. */
export const I_CYCLE = [ONE, I, c(-1, 0), c(0, -1)] as const;
export const I_CYCLE_LABELS = ['1', 'i', '-1', '-i'] as const;

export interface IPowerExplanation {
  n: number;
  quotient: number;
  remainder: 0 | 1 | 2 | 3;
  value: Complex;
  label: (typeof I_CYCLE_LABELS)[number];
}

/** iⁿ por la regla del residuo módulo 4. Admite exponentes negativos: i⁻¹ = −i. */
export function powerOfI(n: number): IPowerExplanation {
  if (!Number.isInteger(n)) throw new RangeError('powerOfI: exponente no entero');
  const remainder = (((n % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  const quotient = (n - remainder) / 4;
  return { n, quotient, remainder, value: I_CYCLE[remainder], label: I_CYCLE_LABELS[remainder] };
}

/** Comparación con tolerancia absoluta en cada componente. */
export function approxEq(a: Complex, b: Complex, tol = 1e-9): boolean {
  return Math.abs(a.re - b.re) <= tol && Math.abs(a.im - b.im) <= tol;
}

/** Elimina el «−0» y el ruido numérico por debajo de eps. */
export function clean(z: Complex, eps = 1e-12): Complex {
  const r = Math.abs(z.re) < eps ? 0 : z.re;
  const i = Math.abs(z.im) < eps ? 0 : z.im;
  return c(r === 0 ? 0 : r, i === 0 ? 0 : i);
}

function fmtNum(n: number, decimals: number): string {
  const rounded = Number(n.toFixed(decimals));
  return String(rounded === 0 ? 0 : rounded);
}

/**
 * Formato legible: "3 - 2i", "-i", "0.71 + 0.71i", "5".
 * `decimals` controla el redondeo; los enteros se muestran sin decimales.
 */
export function format(z: Complex, decimals = 2): string {
  const eps = 0.5 * 10 ** -decimals;
  const re = Math.abs(z.re) < eps ? 0 : z.re;
  const im = Math.abs(z.im) < eps ? 0 : z.im;
  if (im === 0) return fmtNum(re, decimals);
  const absIm = Math.abs(im);
  const imStr = (Number(absIm.toFixed(decimals)) === 1 ? '' : fmtNum(absIm, decimals)) + 'i';
  if (re === 0) return (im < 0 ? '-' : '') + imStr;
  return `${fmtNum(re, decimals)} ${im < 0 ? '-' : '+'} ${imStr}`;
}

/** Igual que format() pero apto para KaTeX. */
export const toLatex = (z: Complex, decimals = 2): string => format(z, decimals).replace(/ /g, '\\,');

/* ------------------------------------------------------------------ */
/* Analizador de expresiones complejas                                */
/* ------------------------------------------------------------------ */
/*
 * Acepta lo que escribe un estudiante: "2-3i", "3i+2", "-i", "1/2", "1/√2",
 * "i/sqrt(2)", "√2/2 i", "2(1+i)", "i^3", "(1+i)^2", "0,5", y j en lugar de i.
 * Gramática:
 *   expr  := term (('+'|'-') term)*
 *   term  := unary (('*'|'/'|implícito) unary)*
 *   unary := ('+'|'-') unary | power
 *   power := atom ('^' unary)?          (exponente entero)
 *   atom  := número | 'i' | 'j' | '(' expr ')' | 'sqrt(' expr ')' | '√' atom
 * La multiplicación implícita tiene la misma precedencia que * y /, de izquierda a derecha:
 * "1/2i" se lee como (1/2)·i, que es lo que suele querer decir el estudiante.
 */

type Token =
  | { t: 'num'; v: number }
  | { t: 'i' }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '^' }
  | { t: '(' }
  | { t: ')' }
  | { t: 'sqrt' };

function tokenize(src: string): Token[] | null {
  // coma decimal solo entre dígitos ("0,5" → "0.5")
  const s = src.replace(/(\d),(\d)/g, '$1.$2').replace(/[·×]/g, '*').replace(/[−–]/g, '-').toLowerCase();
  const out: Token[] = [];
  let k = 0;
  while (k < s.length) {
    const ch = s[k] as string;
    if (/\s/.test(ch)) { k++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(k));
    if (num) {
      // dos números seguidos ("2..3", "2 3") son un error de digitación, no un producto implícito
      if (out[out.length - 1]?.t === 'num') return null;
      out.push({ t: 'num', v: parseFloat(num[0]) });
      k += num[0].length;
      continue;
    }
    if (s.startsWith('sqrt', k)) { out.push({ t: 'sqrt' }); k += 4; continue; }
    if (ch === '√') { out.push({ t: 'sqrt' }); k++; continue; }
    if (ch === 'i' || ch === 'j') { out.push({ t: 'i' }); k++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') { out.push({ t: 'op', v: ch }); k++; continue; }
    if (ch === '(') { out.push({ t: '(' }); k++; continue; }
    if (ch === ')') { out.push({ t: ')' }); k++; continue; }
    return null;
  }
  return out;
}

/** Raíz cuadrada principal en ℂ. */
export function sqrt(z: Complex): Complex {
  const r = abs(z);
  const re = Math.sqrt((r + z.re) / 2);
  const im = Math.sign(z.im || 1) * Math.sqrt(Math.max(0, (r - z.re) / 2));
  return z.im === 0 && z.re >= 0 ? c(Math.sqrt(z.re), 0) : c(re, im);
}

export function parse(input: string): Complex | null {
  const maybe = tokenize(String(input ?? ''));
  if (!maybe || maybe.length === 0) return null;
  const tokens: Token[] = maybe;
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (v: string) => { const tk = peek(); return tk?.t === 'op' && tk.v === v; };
  const startsAtom = () => { const tk = peek(); return !!tk && (tk.t === 'num' || tk.t === 'i' || tk.t === '(' || tk.t === 'sqrt'); };

  function expr(): Complex {
    let v = term();
    while (isOp('+') || isOp('-')) {
      const op = (tokens[p++] as { v: string }).v;
      const r = term();
      v = op === '+' ? add(v, r) : sub(v, r);
    }
    return v;
  }
  function term(): Complex {
    let v = unary();
    for (;;) {
      if (isOp('*')) { p++; v = mul(v, unary()); }
      else if (isOp('/')) { p++; v = div(v, unary()); }
      else if (startsAtom()) { v = mul(v, power()); }
      else return v;
    }
  }
  function unary(): Complex {
    if (isOp('-')) { p++; return neg(unary()); }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power(): Complex {
    const base = atom();
    if (isOp('^')) {
      p++;
      const e = unary();
      if (e.im !== 0 || !Number.isInteger(e.re)) throw new SyntaxError('exponente no entero');
      return powInt(base, e.re);
    }
    return base;
  }
  function atom(): Complex {
    const tk = tokens[p++];
    if (!tk) throw new SyntaxError('fin inesperado');
    if (tk.t === 'num') return c(tk.v);
    if (tk.t === 'i') return I;
    if (tk.t === '(') {
      const v = expr();
      if (tokens[p++]?.t !== ')') throw new SyntaxError('falta )');
      return v;
    }
    // "sqrt(2)" y "√2" aplican la raíz al átomo siguiente: "√2i" = √2 · i
    if (tk.t === 'sqrt') return sqrt(atom());
    throw new SyntaxError('token inesperado');
  }

  try {
    const v = expr();
    if (p !== tokens.length) return null;
    if (!Number.isFinite(v.re) || !Number.isFinite(v.im)) return null;
    return clean(v);
  } catch {
    return null;
  }
}
