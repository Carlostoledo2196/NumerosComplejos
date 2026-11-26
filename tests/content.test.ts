/**
 * Verifica el contenido docente con el núcleo matemático: si alguien edita un reactivo y deja
 * una clave equivocada, esta prueba falla.
 */
import { describe, it, expect } from 'vitest';
import { c, I, mul, div, add, powerOfI, toPolar, approxEq, neg } from '../src/core/complex';
import { det, mul as mMul, pow, approxEq as mEq } from '../src/core/matrix';
import { applyGate, KET, exactlyEqual } from '../src/core/quantum';
import { FINAL_QUIZ } from '../src/content/final-quiz';
import { DIAGNOSTIC, ARGAND_CHALLENGES, MATCH_PAIRS, MATCH_EXPECTED } from '../src/content/texts';

const deg = (z: ReturnType<typeof c>) => (toPolar(z).theta * 180) / Math.PI;

describe('banco del reto final', () => {
  it('dos reactivos por RAP, ids únicos, 3 opciones y clave válida', () => {
    for (const r of [1, 2, 3, 4, 5]) expect(FINAL_QUIZ.filter((q) => q.rap === r)).toHaveLength(2);
    expect(new Set(FINAL_QUIZ.map((q) => q.id)).size).toBe(FINAL_QUIZ.length);
    for (const q of FINAL_QUIZ) {
      expect(q.options).toHaveLength(3);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(3);
    }
  });

  it('r1a: −√3 + i = 2e^{i150°}', () => {
    const p = toPolar(c(-Math.sqrt(3), 1));
    expect(p.r).toBeCloseTo(2);
    expect(p.thetaDeg).toBeCloseTo(150);
  });
  it('r1b: 2 − 2i = 2√2 e^{−iπ/4}', () => {
    expect(toPolar(c(2, -2)).r).toBeCloseTo(2 * Math.SQRT2);
    expect(deg(c(2, -2))).toBeCloseTo(-45);
  });
  it('r2a: (i^42 + 3i)/(1 − i) = −2 + i', () => {
    expect(approxEq(div(add(powerOfI(42).value, c(0, 3)), c(1, -1)), c(-2, 1))).toBe(true);
  });
  it('r2b: (2 + i)(3 − 2i) = 8 − i', () => {
    expect(mul(c(2, 1), c(3, -2))).toEqual(c(8, -1));
  });
  it('r3a: AB = (i, 2)ᵀ', () => {
    const A = [[I, c(1)], [c(0), c(0, 2)]];
    const B = [[c(2)], [c(0, -1)]];
    expect(mEq(mMul(A, B), [[I], [c(2)]])).toBe(true);
  });
  it('r3b: A² = [[2, 3i], [−3i, 5]]', () => {
    const A = [[c(1), I], [neg(I), c(2)]];
    expect(mEq(pow(A, 2), [[c(2), c(0, 3)], [c(0, -3), c(5)]])).toBe(true);
  });
  it('r4a: det = 2 − 2i', () => {
    expect(approxEq(det([[c(1, 1), c(2)], [I, c(1, -1)]]), c(2, -2))).toBe(true);
  });
  it('r4b: det = −1', () => {
    expect(approxEq(det([[I, c(2)], [c(1), neg(I)]]), c(-1))).toBe(true);
  });
  it('r5a: Y|1⟩ = −i|0⟩', () => {
    expect(exactlyEqual(applyGate('Y', KET.one), [c(0, -1), c(0)])).toBe(true);
  });
  it('r5b: S|+⟩ = |+i⟩', () => {
    expect(exactlyEqual(applyGate('S', KET.plus), KET.plusI)).toBe(true);
  });
});

describe('diagnóstico y escena 2', () => {
  it('claves del diagnóstico', () => {
    expect(DIAGNOSTIC.map((d) => d.correct)).toEqual([1, 1, 0]);
    expect(mul(I, I)).toEqual(c(-1)); // d1
    expect(add(mul(I, I), c(1))).toEqual(c(0)); // d2: i² + 1 = 0
  });
  it('retos de Argand dentro de la cuadrícula [−5, 5] y coherentes con su forma polar', () => {
    for (const ch of ARGAND_CHALLENGES) {
      expect(Math.abs(ch.a)).toBeLessThanOrEqual(5);
      expect(Math.abs(ch.b)).toBeLessThanOrEqual(5);
    }
    expect(toPolar(c(-2, -2)).thetaDeg).toBeCloseTo(225);
    expect(toPolar(c(-2, -2)).r).toBeCloseTo(2 * Math.SQRT2);
  });
  it('pares cartesiana ↔ polar', () => {
    for (const p of MATCH_PAIRS) {
      const exp = MATCH_EXPECTED[p.id]!;
      expect(toPolar(c(p.re, p.im)).r).toBeCloseTo(exp.r);
      expect(deg(c(p.re, p.im))).toBeCloseTo(exp.deg, 1);
    }
  });
});
