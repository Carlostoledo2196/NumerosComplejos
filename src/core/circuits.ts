/**
 * Reto de programación conceptual de compuertas (cierre de la OVA, RAP 5).
 * El estudiante arma una secuencia de compuertas por bloques. El evaluador simula el circuito
 * y compara el resultado con el estado objetivo, distinguiendo la igualdad exacta de la igualdad
 * salvo fase global.
 */
import { type Qubit, type GateId, KET, runCircuit, sameUpToGlobalPhase, exactlyEqual, circuitMatrix } from './quantum';
import { I, ZERO } from './complex';
import type { Matrix } from './matrix';

export interface CircuitChallenge {
  id: string;
  title: string;
  /** enunciado en LaTeX-compatible (KaTeX) */
  statement: string;
  start: Qubit;
  startLabel: string;
  target: Qubit;
  targetLabel: string;
  allowedGates: GateId[];
  maxGates: number;
  /**
   * true: se exige la misma fase global (sirve para enseñar que Y|0⟩ = i|1⟩ ≠ |1⟩ como vector,
   * aunque representen el mismo estado físico).
   */
  exactPhase: boolean;
  hint: string;
}

export const CIRCUIT_CHALLENGES: readonly CircuitChallenge[] = [
  {
    id: 'flip', title: 'Inversor cuántico',
    statement: 'Lleva el cúbit de $|0\\rangle$ a $|1\\rangle$.',
    start: KET.zero, startLabel: '|0⟩', target: KET.one, targetLabel: '|1⟩',
    allowedGates: ['X', 'Y', 'Z', 'H'], maxGates: 3, exactPhase: false,
    hint: 'Busca la compuerta que intercambia las amplitudes α y β.',
  },
  {
    id: 'superposition', title: 'Superposición equitativa',
    statement: 'Prepara $|+\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + |1\\rangle)$ a partir de $|0\\rangle$.',
    start: KET.zero, startLabel: '|0⟩', target: KET.plus, targetLabel: '|+⟩',
    allowedGates: ['X', 'Y', 'Z', 'H'], maxGates: 3, exactPhase: false,
    hint: 'Hay una compuerta cuya primera columna es (1/√2, 1/√2)ᵀ.',
  },
  {
    id: 'minus', title: 'Superposición con fase negativa',
    statement: 'Prepara $|-\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle - |1\\rangle)$ a partir de $|0\\rangle$.',
    start: KET.zero, startLabel: '|0⟩', target: KET.minus, targetLabel: '|−⟩',
    allowedGates: ['X', 'Y', 'Z', 'H'], maxGates: 3, exactPhase: false,
    hint: 'Necesitas dos compuertas: una crea la superposición y otra cambia el signo de |1⟩. ¿Importa el orden?',
  },
  {
    id: 'plus-i', title: 'Fase compleja',
    statement: 'Prepara $|+i\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + i|1\\rangle)$ a partir de $|0\\rangle$.',
    start: KET.zero, startLabel: '|0⟩', target: KET.plusI, targetLabel: '|+i⟩',
    allowedGates: ['X', 'Z', 'H', 'S'], maxGates: 3, exactPhase: false,
    hint: 'Crea la superposición y luego multiplica la amplitud de |1⟩ por i.',
  },
  {
    id: 'y-phase', title: 'Fase global de Pauli-Y',
    statement: 'Obtén **exactamente** el vector $i|1\\rangle = (0,\\ i)^T$ a partir de $|0\\rangle$.',
    start: KET.zero, startLabel: '|0⟩', target: [ZERO, I], targetLabel: 'i|1⟩',
    allowedGates: ['X', 'Y', 'Z', 'H'], maxGates: 3, exactPhase: true,
    hint: 'X|0⟩ = |1⟩ tiene la fase equivocada. Calcula Y·(1, 0)ᵀ.',
  },
  {
    id: 'plus-to-minus', title: 'Inversión de fase',
    statement: 'Transforma $|+\\rangle$ en $|-\\rangle$ con una sola compuerta.',
    start: KET.plus, startLabel: '|+⟩', target: KET.minus, targetLabel: '|−⟩',
    allowedGates: ['X', 'Y', 'Z', 'H'], maxGates: 1, exactPhase: false,
    hint: '¿Qué compuerta cambia solo el signo de la amplitud de |1⟩?',
  },
];

export type CircuitVerdict = 'exact' | 'global-phase' | 'wrong-phase' | 'wrong' | 'too-long' | 'gate-not-allowed' | 'empty';

export interface CircuitResult {
  verdict: CircuitVerdict;
  correct: boolean;
  trace: Qubit[];
  finalState: Qubit;
  unitary: Matrix;
  /** longitud de la solución más corta, para comentar si la del estudiante es óptima */
  optimalLength: number | null;
  message: string;
}

/** Búsqueda en anchura de la secuencia más corta que resuelve el reto. */
export function shortestSolution(ch: CircuitChallenge): GateId[] | null {
  const ok = (q: Qubit) => (ch.exactPhase ? exactlyEqual(q, ch.target) : sameUpToGlobalPhase(q, ch.target));
  let frontier: { gates: GateId[]; state: Qubit }[] = [{ gates: [], state: ch.start }];
  for (let depth = 0; depth <= ch.maxGates; depth++) {
    for (const node of frontier) if (ok(node.state)) return node.gates;
    if (depth === ch.maxGates) break;
    frontier = frontier.flatMap((node) =>
      ch.allowedGates.map((g) => {
        const gates = [...node.gates, g];
        return { gates, state: runCircuit([g], node.state)[1] as Qubit };
      }),
    );
  }
  return null;
}

export function evaluateCircuit(ch: CircuitChallenge, gates: readonly GateId[]): CircuitResult {
  const optimal = shortestSolution(ch);
  const base = { optimalLength: optimal ? optimal.length : null };
  const trace = runCircuit(gates.filter((g) => ch.allowedGates.includes(g)), ch.start);
  const finalState = trace[trace.length - 1] as Qubit;
  const unitary = circuitMatrix(gates);
  const result = (verdict: CircuitVerdict, correct: boolean, message: string): CircuitResult => ({
    ...base, verdict, correct, trace, finalState, unitary, message,
  });

  if (gates.length === 0) return result('empty', false, 'Agrega al menos una compuerta al circuito.');
  const forbidden = gates.find((g) => !ch.allowedGates.includes(g));
  if (forbidden) return result('gate-not-allowed', false, `La compuerta ${forbidden} no está disponible en este reto.`);
  if (gates.length > ch.maxGates) return result('too-long', false, `Este reto admite como máximo ${ch.maxGates} compuerta(s).`);

  const exact = exactlyEqual(finalState, ch.target);
  const physical = sameUpToGlobalPhase(finalState, ch.target);
  const optimalNote = optimal && gates.length > optimal.length ? ` Existe una solución con ${optimal.length} compuerta(s).` : '';

  if (exact) return result('exact', true, `¡Correcto! Obtuviste ${ch.targetLabel}.${optimalNote}`);
  if (physical && !ch.exactPhase) {
    return result('global-phase', true, `¡Correcto! Tu estado difiere de ${ch.targetLabel} solo en una fase global, que no se puede medir: es el mismo estado físico.${optimalNote}`);
  }
  if (physical && ch.exactPhase) {
    return result('wrong-phase', false, `Casi: obtuviste el mismo estado físico, pero con otra fase global. Este reto exige exactamente ${ch.targetLabel}.`);
  }
  return result('wrong', false, 'El estado final no coincide con el objetivo. Revisa los estados intermedios del circuito.');
}

/** Estado legible para la interfaz de bloques (ayuda a nombrar estados conocidos). */
export const NAMED_STATES: { label: string; state: Qubit }[] = [
  { label: '|0⟩', state: KET.zero },
  { label: '|1⟩', state: KET.one },
  { label: '|+⟩', state: KET.plus },
  { label: '|−⟩', state: KET.minus },
  { label: '|+i⟩', state: KET.plusI },
  { label: '|−i⟩', state: KET.minusI },
];

export function nameState(q: Qubit): string | null {
  return NAMED_STATES.find((n) => sameUpToGlobalPhase(q, n.state))?.label ?? null;
}

