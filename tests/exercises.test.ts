import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/random';
import { c, add, sub, mul, div, conj, approxEq, powerOfI } from '../src/core/complex';
import { algebraExercise, diagnoseAlgebra, powerOfIQuestions, divisionExercise, checkDivision, divisionStepOrder, isCorrectOrder } from '../src/core/exercises';

describe('ejercitador algebraico (escena 3)', () => {
  it('genera resultados correctos y operandos sin partes nulas', () => {
    const rng = createRng(42);
    for (let k = 0; k < 200; k++) {
      for (const op of ['add', 'sub', 'mul'] as const) {
        const ex = algebraExercise(rng, op);
        const f = op === 'add' ? add : op === 'sub' ? sub : mul;
        expect(ex.result).toEqual(f(ex.z1, ex.z2));
        expect(ex.z1.re * ex.z1.im * ex.z2.re * ex.z2.im).not.toBe(0);
        expect(ex.steps.length).toBeGreaterThan(2);
      }
    }
  });
  it('es reproducible con la misma semilla', () => {
    expect(algebraExercise(createRng(7), 'mul')).toEqual(algebraExercise(createRng(7), 'mul'));
  });
  it('diagnostica el error del signo de i² (ac + bd)', () => {
    const ex = algebraExercise(createRng(1), 'mul');
    const { re: a, im: b } = ex.z1, { re: cc, im: d } = ex.z2;
    expect(diagnoseAlgebra(ex, ex.result)).toBe('ok');
    expect(diagnoseAlgebra(ex, c(a * cc + b * d, ex.result.im))).toBe('sign-i2');
    expect(diagnoseAlgebra(ex, c(ex.result.re, ex.result.im + 1))).toBe('real-ok-imag-wrong');
    expect(diagnoseAlgebra(ex, c(ex.result.re + 100, ex.result.im + 100))).toBe('wrong');
  });
});

describe('potencias de i (escena 4)', () => {
  it('5 exponentes altos, distintos y con respuesta correcta', () => {
    const qs = powerOfIQuestions(createRng(3), 5);
    expect(qs).toHaveLength(5);
    expect(new Set(qs.map((q) => q.n)).size).toBe(5);
    for (const q of qs) {
      expect(q.n).toBeGreaterThanOrEqual(80);
      expect(q.answerLabel).toBe(powerOfI(q.n).label);
    }
    expect(new Set(qs.map((q) => q.n % 4)).size).toBe(4); // cubre los 4 residuos
  });
});

describe('división (escena 5)', () => {
  it('valores intermedios coherentes', () => {
    const rng = createRng(11);
    for (let k = 0; k < 100; k++) {
      const ex = divisionExercise(rng);
      expect(ex.conjugate).toEqual(conj(ex.denominator));
      expect(ex.realDenominator).toBe(ex.denominator.re ** 2 + ex.denominator.im ** 2);
      expect(approxEq(c(ex.expandedNumerator.re / ex.realDenominator, ex.expandedNumerator.im / ex.realDenominator), div(ex.numerator, ex.denominator))).toBe(true);
    }
  });
  it('revisión con diagnóstico de errores típicos', () => {
    const ex = divisionExercise(createRng(5));
    const good = { conjugate: ex.conjugate, realDenominator: ex.realDenominator, numeratorRe: ex.expandedNumerator.re, numeratorIm: ex.expandedNumerator.im };
    expect(checkDivision(ex, good).allCorrect).toBe(true);
    const sameDen = checkDivision(ex, { ...good, conjugate: ex.denominator });
    expect(sameDen.conjugate).toBe(false);
    expect(sameDen.messages[0]).toMatch(/mismo denominador/);
    const minus = checkDivision(ex, { ...good, realDenominator: ex.denominator.re ** 2 - ex.denominator.im ** 2 });
    if (ex.denominator.im !== 0) expect(minus.messages.join(' ')).toMatch(/c² − d²/);
  });
  it('pasos ordenables', () => {
    const steps = divisionStepOrder(divisionExercise(createRng(2)));
    expect(steps).toHaveLength(4);
    expect(isCorrectOrder(steps.map((s) => s.id))).toBe(true);
    expect(isCorrectOrder([1, 0, 2, 3])).toBe(false);
  });
});
