import { describe, it, expect } from 'vitest';
import { CIRCUIT_CHALLENGES, evaluateCircuit, shortestSolution, nameState } from '../src/core/circuits';
import { KET } from '../src/core/quantum';

const byId = (id: string) => CIRCUIT_CHALLENGES.find((c) => c.id === id)!;

describe('reto de circuitos', () => {
  it('todos los retos tienen solución dentro del máximo de compuertas', () => {
    for (const ch of CIRCUIT_CHALLENGES) {
      const sol = shortestSolution(ch);
      expect(sol, ch.id).not.toBeNull();
      expect(evaluateCircuit(ch, sol!).correct, ch.id).toBe(true);
    }
  });
  it('soluciones óptimas esperadas', () => {
    expect(shortestSolution(byId('flip'))!.length).toBe(1);
    expect(shortestSolution(byId('minus'))!.length).toBe(2);
    expect(shortestSolution(byId('plus-i'))).toEqual(['H', 'S']);
    expect(shortestSolution(byId('y-phase'))).toEqual(['Y']);
  });
  it('|−⟩: el orden importa (H luego Z sí; Z luego H no)', () => {
    expect(evaluateCircuit(byId('minus'), ['H', 'Z']).verdict).toBe('exact');
    expect(evaluateCircuit(byId('minus'), ['Z', 'H']).verdict).toBe('wrong');
    expect(evaluateCircuit(byId('minus'), ['X', 'H']).correct).toBe(true);
  });
  it('fase global aceptada cuando el reto no exige fase exacta', () => {
    const r = evaluateCircuit(byId('flip'), ['Y']); // i|1⟩
    expect(r.verdict).toBe('global-phase');
    expect(r.correct).toBe(true);
  });
  it('fase global rechazada en el reto de fase exacta', () => {
    const r = evaluateCircuit(byId('y-phase'), ['X']);
    expect(r.verdict).toBe('wrong-phase');
    expect(r.correct).toBe(false);
  });
  it('validaciones: vacío, compuerta no permitida, demasiado largo', () => {
    expect(evaluateCircuit(byId('flip'), []).verdict).toBe('empty');
    expect(evaluateCircuit(byId('plus-i'), ['Y']).verdict).toBe('gate-not-allowed');
    expect(evaluateCircuit(byId('plus-to-minus'), ['H', 'X']).verdict).toBe('too-long');
  });
  it('señala cuando hay una solución más corta', () => {
    const r = evaluateCircuit(byId('flip'), ['H', 'Z', 'H']);
    expect(r.correct).toBe(true);
    expect(r.message).toMatch(/1 compuerta/);
  });
  it('traza de estados intermedios', () => {
    const r = evaluateCircuit(byId('minus'), ['H', 'Z']);
    expect(r.trace.map(nameState)).toEqual(['|0⟩', '|+⟩', '|−⟩']);
    expect(nameState(KET.minusI)).toBe('|−i⟩');
  });
});
