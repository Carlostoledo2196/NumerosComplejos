import { describe, it, expect } from 'vitest';
import { c, add, sub, mul, div, conj, abs, toPolar, fromPolar, powerOfI, powInt, parse, format, approxEq, I, sqrt } from '../src/core/complex';

describe('aritmética en ℂ', () => {
  it('suma y resta por componentes', () => {
    expect(add(c(3, 2), c(-1, 5))).toEqual(c(2, 7));
    expect(sub(c(3, 2), c(-1, 5))).toEqual(c(4, -3));
  });
  it('multiplicación: (ac − bd) + (ad + bc)i', () => {
    expect(mul(c(2, 3), c(4, -5))).toEqual(c(23, 2)); // 8+15, -10+12
    expect(mul(I, I)).toEqual(c(-1, 0));
  });
  it('división por el conjugado', () => {
    // (3+2i)/(1-4i) = (3+2i)(1+4i)/17 = (-5 + 14i)/17
    expect(approxEq(div(c(3, 2), c(1, -4)), c(-5 / 17, 14 / 17))).toBe(true);
    expect(() => div(c(1), c(0))).toThrow(RangeError);
  });
  it('z·z̄ = |z|²', () => {
    const z = c(-4, 7);
    expect(mul(z, conj(z))).toEqual(c(65, 0));
    expect(abs(c(3, 4))).toBe(5);
  });
});

describe('forma polar (corrección del guion: atan2 y cuadrantes)', () => {
  it.each([
    [c(1, 1), 45, 1],
    [c(-1, 1), 135, 2],
    [c(-1, -1), 225, 3],
    [c(1, -1), 315, 4],
    [c(0, 2), 90, 0],
    [c(-3, 0), 180, 0],
  ])('%o → θ = %d°, cuadrante %d', (z, deg, q) => {
    const p = toPolar(z);
    expect(p.thetaDeg).toBeCloseTo(deg, 9);
    expect(p.quadrant).toBe(q);
  });
  it('tan⁻¹(b/a) daría el cuadrante equivocado para −1 − i; toPolar no', () => {
    expect((Math.atan(-1 / -1) * 180) / Math.PI).toBeCloseTo(45);
    expect(toPolar(c(-1, -1)).thetaDeg).toBeCloseTo(225);
  });
  it('ida y vuelta polar ↔ cartesiana', () => {
    const z = c(-2.5, 1.2);
    const p = toPolar(z);
    expect(approxEq(fromPolar(p.r, p.theta), z)).toBe(true);
  });
});

describe('potencias de i (ciclo módulo 4)', () => {
  it.each([
    [0, '1'], [1, 'i'], [2, '-1'], [3, '-i'], [4, '1'],
    [2607, '-i'], [105, 'i'], [-1, '-i'], [-2, '-1'], [-7, 'i'],
  ])('i^%d = %s', (n, label) => {
    expect(powerOfI(n).label).toBe(label);
  });
  it('coincide con la potencia por multiplicación repetida', () => {
    for (let n = -12; n <= 40; n++) expect(approxEq(powInt(I, n), powerOfI(n).value)).toBe(true);
  });
  it('descomposición n = 4q + r', () => {
    expect(powerOfI(2607)).toMatchObject({ quotient: 651, remainder: 3 });
  });
});

describe('parse: lo que escribe un estudiante', () => {
  it.each([
    ['3', c(3)], ['-2.5', c(-2.5)], ['0,5', c(0.5)],
    ['i', c(0, 1)], ['-i', c(0, -1)], ['+i', c(0, 1)], ['j', c(0, 1)],
    ['2-3i', c(2, -3)], ['2 - 3i', c(2, -3)], ['3i+2', c(2, 3)], ['-4+7j', c(-4, 7)],
    ['1/2', c(0.5)], ['1/2i', c(0, 0.5)], ['i/2', c(0, 0.5)],
    ['1/√2', c(Math.SQRT1_2)], ['√2/2', c(Math.SQRT1_2)], ['-i/sqrt(2)', c(0, -Math.SQRT1_2)],
    ['√2i', c(0, Math.SQRT2)], ['2(1+i)', c(2, 2)], ['i^3', c(0, -1)], ['(1+i)^2', c(0, 2)],
    ['i^-1', c(0, -1)], ['2*i', c(0, 2)], ['3−2i', c(3, -2)], ['sqrt(-4)', c(0, 2)],
    ['0.6 + 0.8i', c(0.6, 0.8)],
  ])('"%s"', (src, expected) => {
    const v = parse(src);
    expect(v).not.toBeNull();
    expect(approxEq(v!, expected)).toBe(true);
  });
  it.each(['', '   ', 'abc', '2+', '(1+i', '1/0', 'i^0.5', '2..3', '2 3'])('rechaza "%s"', (src) => {
    expect(parse(src)).toBeNull();
  });
});

describe('format', () => {
  it.each([
    [c(3, -2), '3 - 2i'], [c(0, 1), 'i'], [c(0, -1), '-i'], [c(5, 0), '5'],
    [c(0, 0), '0'], [c(-0, -0), '0'], [c(Math.SQRT1_2, Math.SQRT1_2), '0.71 + 0.71i'],
    [c(1e-15, 2), '2i'], [c(-1, 1), '-1 + i'],
  ])('%o → "%s"', (z, s) => expect(format(z)).toBe(s));
});

describe('sqrt principal', () => {
  it('√(−1) = i y √(2i) = 1 + i', () => {
    expect(approxEq(sqrt(c(-1)), I)).toBe(true);
    expect(approxEq(sqrt(c(0, 2)), c(1, 1))).toBe(true);
    expect(approxEq(sqrt(c(0, -2)), c(1, -1))).toBe(true);
  });
});
