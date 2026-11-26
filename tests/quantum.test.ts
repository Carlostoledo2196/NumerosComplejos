import { describe, it, expect } from 'vitest';
import { c, I, ZERO, approxEq as cEq } from '../src/core/complex';
import { isUnitary, approxEq, vecApproxEq } from '../src/core/matrix';
import { GATES, KET, applyGate, toBloch, fromBloch, probabilities, sameUpToGlobalPhase, exactlyEqual, circuitMatrix, runCircuit, normalize, canonicalPhase, type GateId } from '../src/core/quantum';

describe('compuertas', () => {
  it('todas son unitarias (U†U = I)', () => {
    for (const g of Object.values(GATES)) expect(isUnitary(g.matrix)).toBe(true);
  });
  it('acciones básicas', () => {
    expect(vecApproxEq(applyGate('X', KET.zero), KET.one)).toBe(true);
    expect(vecApproxEq(applyGate('H', KET.zero), KET.plus)).toBe(true);
    expect(vecApproxEq(applyGate('H', KET.one), KET.minus)).toBe(true);
    expect(vecApproxEq(applyGate('Z', KET.plus), KET.minus)).toBe(true);
    expect(vecApproxEq(applyGate('S', KET.plus), KET.plusI)).toBe(true);
  });
  it('Actividad 2 corregida: Y(α, β)ᵀ = (−iβ, iα)ᵀ', () => {
    const alpha = c(0.6), beta = c(0, 0.8);
    const out = applyGate('Y', [alpha, beta]);
    // −i·0.8i = 0.8 ; i·0.6 = 0.6i
    expect(cEq(out[0]!, c(0.8))).toBe(true);
    expect(cEq(out[1]!, c(0, 0.6))).toBe(true);
  });
  it('Y|0⟩ = i|1⟩: mismo estado físico que |1⟩ pero no el mismo vector', () => {
    const y0 = applyGate('Y', KET.zero);
    expect(vecApproxEq(y0, [ZERO, I])).toBe(true);
    expect(sameUpToGlobalPhase(y0, KET.one)).toBe(true);
    expect(exactlyEqual(y0, KET.one)).toBe(false);
  });
  it('identidades: HZH = X, HXH = Z, S² = Z, XYZ = iI', () => {
    const eq = (a: GateId[], b: GateId[]) => approxEq(circuitMatrix(a), circuitMatrix(b));
    expect(eq(['H', 'Z', 'H'], ['X'])).toBe(true);
    expect(eq(['H', 'X', 'H'], ['Z'])).toBe(true);
    expect(eq(['S', 'S'], ['Z'])).toBe(true);
    // circuitMatrix(['Z','Y','X']) = X·Y·Z
    const xyz = circuitMatrix(['Z', 'Y', 'X']);
    expect(approxEq(xyz, [[I, ZERO], [ZERO, I]])).toBe(true);
  });
  it('el orden temporal del circuito se multiplica de derecha a izquierda', () => {
    const trace = runCircuit(['H', 'Z'], KET.zero);
    expect(vecApproxEq(trace[2]!, KET.minus)).toBe(true);
    expect(vecApproxEq(runCircuit(['Z', 'H'], KET.zero)[2]!, KET.plus)).toBe(true);
  });
});

describe('esfera de Bloch', () => {
  it.each([
    ['|0⟩', KET.zero, [0, 0, 1]], ['|1⟩', KET.one, [0, 0, -1]],
    ['|+⟩', KET.plus, [1, 0, 0]], ['|−⟩', KET.minus, [-1, 0, 0]],
    ['|+i⟩', KET.plusI, [0, 1, 0]], ['|−i⟩', KET.minusI, [0, -1, 0]],
  ])('%s', (_, q, [x, y, z]) => {
    const b = toBloch(q);
    expect(b.x).toBeCloseTo(x!, 9);
    expect(b.y).toBeCloseTo(y!, 9);
    expect(b.z).toBeCloseTo(z!, 9);
  });
  it('no depende de la fase global', () => {
    const q = fromBloch(1.1, 2.3);
    const rotated = q.map((a) => c(a.re * Math.cos(0.7) - a.im * Math.sin(0.7), a.re * Math.sin(0.7) + a.im * Math.cos(0.7)));
    const b1 = toBloch(q), b2 = toBloch(rotated);
    expect(b2.x).toBeCloseTo(b1.x); expect(b2.y).toBeCloseTo(b1.y); expect(b2.z).toBeCloseTo(b1.z);
  });
  it('fromBloch y toBloch son inversas (θ, φ)', () => {
    const b = toBloch(fromBloch((60 * Math.PI) / 180, (90 * Math.PI) / 180));
    expect((b.theta * 180) / Math.PI).toBeCloseTo(60);
    expect((b.phi * 180) / Math.PI).toBeCloseTo(90);
  });
  it('probabilidades del prototipo: θ = 60° → 75 % / 25 %', () => {
    const [p0, p1] = probabilities(fromBloch(Math.PI / 3, Math.PI / 2));
    expect(p0).toBeCloseTo(0.75); expect(p1).toBeCloseTo(0.25);
  });
  it('normaliza y canoniza fases', () => {
    const q = normalize([c(0, 3), c(0, 4)]);
    const can = canonicalPhase(q);
    expect(cEq(can[0]!, c(0.6))).toBe(true);
    expect(cEq(can[1]!, c(0.8))).toBe(true);
  });
});
