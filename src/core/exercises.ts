/**
 * Generadores de ejercicios con desglose paso a paso y diagnóstico del error típico.
 * El diagnóstico se basa en los errores del guion (§1): signo de i², estructura del conjugado
 * y potencias de i.
 */
import { type Complex, c, add, sub, mul, conj, abs2, div, format, powerOfI, approxEq } from './complex';
import { type Rng, randInt, randNonZero, shuffle } from './random';

const TOL = 1e-6;

/* ---------------------------- Suma, resta y multiplicación (escena 3) ---------------------------- */

export type AlgebraOp = 'add' | 'sub' | 'mul';

export interface AlgebraExercise {
  op: AlgebraOp;
  z1: Complex;
  z2: Complex;
  result: Complex;
  /** pasos en KaTeX */
  steps: string[];
}

const sgn = (n: number) => (n < 0 ? `(${n})` : String(n));

export function algebraExercise(rng: Rng, op: AlgebraOp): AlgebraExercise {
  const z1 = c(randNonZero(rng, -6, 6), randNonZero(rng, -6, 6));
  const z2 = c(randNonZero(rng, -6, 6), randNonZero(rng, -6, 6));
  const { re: a, im: b } = z1;
  const { re: cc, im: d } = z2;
  if (op === 'add' || op === 'sub') {
    const s = op === 'add' ? '+' : '-';
    const result = op === 'add' ? add(z1, z2) : sub(z1, z2);
    return {
      op, z1, z2, result,
      steps: [
        `\\text{Agrupa reales con reales e imaginarios con imaginarios:}`,
        `(${sgn(a)} ${s} ${sgn(cc)}) + (${sgn(b)} ${s} ${sgn(d)})i`,
        `= ${format(result)}`,
      ],
    };
  }
  const result = mul(z1, z2);
  return {
    op, z1, z2, result,
    steps: [
      `\\text{Propiedad distributiva:}\\; (${format(z1)})(${format(z2)}) = ac + adi + bci + bd\\,i^2`,
      `= ${sgn(a)}\\cdot${sgn(cc)} + ${sgn(a)}\\cdot${sgn(d)}i + ${sgn(b)}\\cdot${sgn(cc)}i + ${sgn(b)}\\cdot${sgn(d)}\\,i^2`,
      `\\text{Como } i^2=-1:\\; \\color{red}{bd\\,i^2 = -(${b * d})}`,
      `\\text{Parte real: } ac - bd = ${a * cc} - (${b * d}) = ${result.re}`,
      `\\text{Parte imaginaria: } ad + bc = ${a * d} + (${b * cc}) = ${result.im}`,
    ],
  };
}

export type AlgebraDiagnosis = 'ok' | 'sign-i2' | 'real-ok-imag-wrong' | 'imag-ok-real-wrong' | 'wrong';

/** Detecta el error número uno del diagnóstico: escribir ac + bd en lugar de ac − bd. */
export function diagnoseAlgebra(ex: AlgebraExercise, answer: Complex): AlgebraDiagnosis {
  const reOk = Math.abs(answer.re - ex.result.re) < TOL;
  const imOk = Math.abs(answer.im - ex.result.im) < TOL;
  if (reOk && imOk) return 'ok';
  if (ex.op === 'mul' && imOk && Math.abs(answer.re - (ex.z1.re * ex.z2.re + ex.z1.im * ex.z2.im)) < TOL) return 'sign-i2';
  if (reOk) return 'real-ok-imag-wrong';
  if (imOk) return 'imag-ok-real-wrong';
  return 'wrong';
}

export const ALGEBRA_FEEDBACK: Record<AlgebraDiagnosis, string> = {
  ok: '¡Correcto!',
  'sign-i2': 'Sumaste bd en la parte real. Recuerda: bd·i² = bd·(−1), así que la parte real es ac − bd.',
  'real-ok-imag-wrong': 'La parte real está bien. Revisa los términos cruzados de la parte imaginaria: ad + bc.',
  'imag-ok-real-wrong': 'La parte imaginaria está bien. Revisa la parte real.',
  wrong: 'Ambas partes tienen errores. Revisa el desglose paso a paso.',
};

/* ---------------------------- Potencias de i (escena 4) ---------------------------- */

export interface PowerOfIQuestion {
  n: number;
  answerLabel: '1' | 'i' | '-1' | '-i';
  explanation: string;
}

/** Exponentes altos y distintos, cubriendo los cuatro residuos cuando count ≥ 4. */
export function powerOfIQuestions(rng: Rng, count = 5): PowerOfIQuestion[] {
  const residues = shuffle(rng, [0, 1, 2, 3, 0, 1, 2, 3].slice(0, Math.max(4, count))).slice(0, count);
  const used = new Set<number>();
  return residues.map((r) => {
    let n: number;
    do n = 4 * randInt(rng, 20, 750) + r;
    while (used.has(n));
    used.add(n);
    const p = powerOfI(n);
    return {
      n, answerLabel: p.label,
      explanation: `${n} = 4 \\times ${p.quotient} + ${p.remainder} \\implies i^{${n}} = i^{${p.remainder}} = ${p.label}`,
    };
  });
}

/* ---------------------------- División con conjugado (escena 5) ---------------------------- */

export interface DivisionExercise {
  numerator: Complex;
  denominator: Complex;
  conjugate: Complex;
  /** c² + d² */
  realDenominator: number;
  /** (a + bi)(c − di) antes de dividir */
  expandedNumerator: Complex;
  result: Complex;
  steps: string[];
}

export function divisionExercise(rng: Rng): DivisionExercise {
  const numerator = c(randNonZero(rng, -6, 6), randNonZero(rng, -6, 6));
  const denominator = c(randNonZero(rng, -5, 5), randNonZero(rng, -5, 5));
  const conjugate = conj(denominator);
  const realDenominator = abs2(denominator);
  const expandedNumerator = mul(numerator, conjugate);
  const result = div(numerator, denominator);
  const N = format(numerator), D = format(denominator), Cj = format(conjugate);
  return {
    numerator, denominator, conjugate, realDenominator, expandedNumerator, result,
    steps: [
      `\\text{1. Identifica el conjugado del denominador: } \\overline{${D}} = ${Cj}`,
      `\\text{2. Multiplica numerador y denominador por el conjugado: } \\dfrac{(${N})(${Cj})}{(${D})(${Cj})}`,
      `\\text{3. El denominador queda real: } c^2 + d^2 = ${denominator.re ** 2} + ${denominator.im ** 2} = ${realDenominator}`,
      `\\text{4. Expande el numerador y separa: } \\dfrac{${format(expandedNumerator)}}{${realDenominator}} = ${format(result, 3)}`,
    ],
  };
}

export interface DivisionAnswer {
  conjugate: Complex | null;
  realDenominator: number | null;
  numeratorRe: number | null;
  numeratorIm: number | null;
}

export interface DivisionCheck {
  conjugate: boolean;
  realDenominator: boolean;
  numerator: boolean;
  allCorrect: boolean;
  messages: string[];
}

export function checkDivision(ex: DivisionExercise, ans: DivisionAnswer): DivisionCheck {
  const messages: string[] = [];
  const conjOk = !!ans.conjugate && approxEq(ans.conjugate, ex.conjugate, TOL);
  if (!conjOk) {
    if (ans.conjugate && approxEq(ans.conjugate, ex.denominator, TOL)) messages.push('Escribiste el mismo denominador: el conjugado cambia el signo de la parte imaginaria.');
    else if (ans.conjugate && approxEq(ans.conjugate, c(-ex.denominator.re, ex.denominator.im), TOL)) messages.push('Cambiaste el signo de la parte real. En el conjugado solo cambia el signo de la parte imaginaria.');
    else messages.push(`El conjugado de ${format(ex.denominator)} es ${format(ex.conjugate)}.`);
  }
  const denOk = ans.realDenominator !== null && Math.abs(ans.realDenominator - ex.realDenominator) < TOL;
  if (!denOk) {
    const { re, im } = ex.denominator;
    if (ans.realDenominator !== null && Math.abs(ans.realDenominator - (re * re - im * im)) < TOL) {
      messages.push('Calculaste c² − d². Como (c + di)(c − di) = c² − d²i² = c² + d², los dos cuadrados se suman.');
    } else messages.push('El denominador real es c² + d².');
  }
  const numOk =
    ans.numeratorRe !== null && ans.numeratorIm !== null &&
    Math.abs(ans.numeratorRe - ex.expandedNumerator.re) < TOL && Math.abs(ans.numeratorIm - ex.expandedNumerator.im) < TOL;
  if (!numOk) messages.push('Revisa la expansión del numerador por el conjugado (recuerda que i² = −1).');
  return { conjugate: conjOk, realDenominator: denOk, numerator: numOk, allCorrect: conjOk && denOk && numOk, messages };
}

/** Los cuatro pasos de la división en orden correcto, para la actividad de ordenar. */
export function divisionStepOrder(ex: DivisionExercise): { id: number; text: string }[] {
  return ex.steps.map((text, id) => ({ id, text: text.replace(/^\\text\{\d\. /, '\\text{') }));
}

export const isCorrectOrder = (ids: readonly number[]): boolean => ids.every((v, k) => v === k);
