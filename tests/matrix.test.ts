import { describe, it, expect } from 'vitest';
import { c, I, approxEq as cEq } from '../src/core/complex';
import { fromReal, add, scale, mul, pow, det, detSteps, inverse, identity, approxEq, MatrixError, dagger, isUnitary, matVec, vec, productCellTerms, isSingular, transpose } from '../src/core/matrix';

describe('matrices reales (escena 6)', () => {
  const A = fromReal([[1, 2], [3, 4]]);
  const B = fromReal([[0, 1], [-1, 2]]);
  it('suma, escalar, producto y potencia', () => {
    expect(approxEq(add(A, B), fromReal([[1, 3], [2, 6]]))).toBe(true);
    expect(approxEq(scale(A, -2), fromReal([[-2, -4], [-6, -8]]))).toBe(true);
    expect(approxEq(mul(A, B), fromReal([[-2, 5], [-4, 11]]))).toBe(true);
    expect(approxEq(pow(A, 2), fromReal([[7, 10], [15, 22]]))).toBe(true);
    expect(approxEq(pow(A, 0), identity(2))).toBe(true);
  });
  it('el producto no es conmutativo', () => {
    expect(approxEq(mul(A, B), mul(B, A))).toBe(false);
  });
  it('determinantes 2×2 y 3×3', () => {
    expect(det(A)).toEqual(c(-2));
    const M = fromReal([[2, -1, 0], [1, 3, 4], [0, 5, -2]]);
    // 2(−6−20) − (−1)(−2−0) + 0 = −52 − 2 = −54
    expect(cEq(det(M), c(-54))).toBe(true);
    const steps = detSteps(M);
    expect(steps.map((s) => s.sign)).toEqual([1, -1, 1]);
    expect(cEq(steps.reduce((s, x) => c(s.re + x.contribution.re, s.im + x.contribution.im), c(0)), c(-54))).toBe(true);
  });
  it('inversa: A·A⁻¹ = I (2×2 y 3×3)', () => {
    expect(approxEq(mul(A, inverse(A)), identity(2))).toBe(true);
    expect(approxEq(inverse(A), fromReal([[-2, 1], [1.5, -0.5]]))).toBe(true);
    const M = fromReal([[2, -1, 0], [1, 3, 4], [0, 5, -2]]);
    expect(approxEq(mul(M, inverse(M)), identity(3))).toBe(true);
  });
  it('matriz singular: sin inversa y con mensaje para el estudiante', () => {
    const S = fromReal([[1, 2], [2, 4]]);
    expect(isSingular(S)).toBe(true);
    expect(() => inverse(S)).toThrow(MatrixError);
    try { inverse(S); } catch (e) { expect((e as MatrixError).code).toBe('singular'); }
  });
  it('errores de dimensión', () => {
    const R = fromReal([[1, 2, 3]]);
    expect(() => add(A, R)).toThrow(/misma dimensión/);
    expect(() => mul(A, R)).toThrow(/columnas de A/);
    expect(() => det(R)).toThrow(/cuadradas/);
    expect(mul(R, transpose(R))).toEqual([[c(14)]]);
  });
  it('términos de una celda del producto (traza fila-columna)', () => {
    const t = productCellTerms(A, B, 1, 1); // fila 2 de A · columna 2 de B = 3·1 + 4·2
    expect(t.map((x) => x.product.re)).toEqual([3, 8]);
  });
});

describe('matrices complejas (escena 7)', () => {
  const A = [[c(1, 1), c(2)], [I, c(3, -1)]];
  it('determinante en ℂ', () => {
    // (1+i)(3−i) − 2i = (3 − i + 3i + 1) − 2i = 4
    expect(cEq(det(A), c(4, 0))).toBe(true);
  });
  it('escalar complejo e inversa', () => {
    expect(approxEq(scale(A, I), [[c(-1, 1), c(0, 2)], [c(-1), c(1, 3)]])).toBe(true);
    expect(approxEq(mul(A, inverse(A)), identity(2))).toBe(true);
    expect(approxEq(mul(inverse(A), A), identity(2))).toBe(true);
  });
  it('determinante 3×3 complejo coincide con la regla de Sarrus', () => {
    const M = [[c(1, 1), c(0, 2), c(1)], [c(2), c(1, -1), I], [c(0, -1), c(3), c(2, 2)]];
    const g = (i: number, j: number) => M[i]![j]!;
    const m = (...z: ReturnType<typeof c>[]) => z.reduce((a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re));
    const plus = [m(g(0, 0), g(1, 1), g(2, 2)), m(g(0, 1), g(1, 2), g(2, 0)), m(g(0, 2), g(1, 0), g(2, 1))];
    const minus = [m(g(0, 2), g(1, 1), g(2, 0)), m(g(0, 0), g(1, 2), g(2, 1)), m(g(0, 1), g(1, 0), g(2, 2))];
    const sum = (zs: typeof plus) => zs.reduce((a, b) => c(a.re + b.re, a.im + b.im));
    const sarrus = c(sum(plus).re - sum(minus).re, sum(plus).im - sum(minus).im);
    expect(cEq(det(M), sarrus)).toBe(true);
    expect(approxEq(mul(M, inverse(M)), identity(3))).toBe(true);
  });
  it('potencia negativa usa la inversa', () => {
    expect(approxEq(mul(pow(A, -2), pow(A, 2)), identity(2))).toBe(true);
  });
  it('daga y unitariedad', () => {
    expect(approxEq(dagger(A), [[c(1, -1), c(0, -1)], [c(2), c(3, 1)]])).toBe(true);
    expect(isUnitary(A)).toBe(false);
  });
  it('matriz por vector', () => {
    expect(matVec(A, vec(1, I)).map((z) => [z.re, z.im])).toEqual([[1, 3], [1, 4]]);
  });
});
