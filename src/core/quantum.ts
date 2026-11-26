/**
 * Cúbits, compuertas de un cúbit y esfera de Bloch (escenas 8–9, RAP 5).
 * Un estado es el vector columna (α, β)ᵀ ≡ α|0⟩ + β|1⟩ con |α|² + |β|² = 1.
 */
import { type Complex, c, I, ZERO, ONE, abs2, add, conj, mul, scale, neg, expI, abs, arg } from './complex';
import { type Matrix, type Vector, matVec, mul as mMul, identity, vecApproxEq } from './matrix';

export type Qubit = Vector;

const S2 = Math.SQRT1_2;

export const KET = {
  zero: [ONE, ZERO] as Qubit,
  one: [ZERO, ONE] as Qubit,
  plus: [c(S2), c(S2)] as Qubit,
  minus: [c(S2), c(-S2)] as Qubit,
  plusI: [c(S2), c(0, S2)] as Qubit,
  minusI: [c(S2), c(0, -S2)] as Qubit,
} as const;

export type GateId = 'I' | 'X' | 'Y' | 'Z' | 'H' | 'S' | 'T';

export interface Gate {
  id: GateId;
  name: string;
  matrix: Matrix;
  latex: string;
  description: string;
}

export const GATES: Record<GateId, Gate> = {
  I: { id: 'I', name: 'Identidad', matrix: identity(2), latex: 'I=\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}', description: 'No modifica el estado.' },
  X: {
    id: 'X', name: 'Pauli-X (inversor cuántico)',
    matrix: [[ZERO, ONE], [ONE, ZERO]],
    latex: 'X=\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}',
    description: 'Intercambia las amplitudes de |0⟩ y |1⟩ (rotación de π alrededor del eje X).',
  },
  Y: {
    id: 'Y', name: 'Pauli-Y (rotación compleja)',
    matrix: [[ZERO, neg(I)], [I, ZERO]],
    latex: 'Y=\\begin{pmatrix}0&-i\\\\i&0\\end{pmatrix}',
    description: 'Intercambia amplitudes e introduce las fases ±i (rotación de π alrededor del eje Y).',
  },
  Z: {
    id: 'Z', name: 'Pauli-Z (inversión de fase)',
    matrix: [[ONE, ZERO], [ZERO, c(-1)]],
    latex: 'Z=\\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}',
    description: 'Cambia el signo de la amplitud de |1⟩ (rotación de π alrededor del eje Z).',
  },
  H: {
    id: 'H', name: 'Hadamard (superposición)',
    matrix: [[c(S2), c(S2)], [c(S2), c(-S2)]],
    latex: 'H=\\tfrac{1}{\\sqrt{2}}\\begin{pmatrix}1&1\\\\1&-1\\end{pmatrix}',
    description: 'Lleva |0⟩ a |+⟩ y |1⟩ a |−⟩: superposición equitativa.',
  },
  S: {
    id: 'S', name: 'Fase S',
    matrix: [[ONE, ZERO], [ZERO, I]],
    latex: 'S=\\begin{pmatrix}1&0\\\\0&i\\end{pmatrix}',
    description: 'Multiplica la amplitud de |1⟩ por i (rotación de π/2 alrededor del eje Z).',
  },
  T: {
    id: 'T', name: 'Fase T',
    matrix: [[ONE, ZERO], [ZERO, expI(Math.PI / 4)]],
    latex: 'T=\\begin{pmatrix}1&0\\\\0&e^{i\\pi/4}\\end{pmatrix}',
    description: 'Multiplica la amplitud de |1⟩ por e^{iπ/4}.',
  },
};

export const norm2 = (q: Qubit): number => q.reduce((s, a) => s + abs2(a), 0);

export const isNormalized = (q: Qubit, tol = 1e-6): boolean => Math.abs(norm2(q) - 1) <= tol;

export function normalize(q: Qubit): Qubit {
  const n = Math.sqrt(norm2(q));
  if (n === 0) throw new RangeError('El vector nulo no es un estado cuántico');
  return q.map((a) => scale(a, 1 / n));
}

/** Regla de Born: P(|k⟩) = |amplitud_k|². */
export const probabilities = (q: Qubit): number[] => q.map(abs2);

/** Producto interno ⟨u|v⟩ = Σ conj(uₖ)·vₖ */
export const inner = (u: Qubit, v: Qubit): Complex =>
  u.reduce((s, a, k) => add(s, mul(conj(a), v[k] as Complex)), ZERO);

/**
 * Dos estados normalizados representan el mismo estado físico si difieren solo en una fase global e^{iγ},
 * es decir, si |⟨u|v⟩| = 1.
 */
export const sameUpToGlobalPhase = (u: Qubit, v: Qubit, tol = 1e-6): boolean =>
  Math.abs(Math.sqrt(abs2(inner(u, v))) - 1) <= tol;

export const exactlyEqual = (u: Qubit, v: Qubit, tol = 1e-6): boolean => vecApproxEq(u, v, tol);

/** Estado desde los ángulos de Bloch: cos(θ/2)|0⟩ + e^{iφ} sen(θ/2)|1⟩. Ángulos en radianes. */
export const fromBloch = (theta: number, phi: number): Qubit => [c(Math.cos(theta / 2)), scale(expI(phi), Math.sin(theta / 2))];

export interface BlochPoint {
  x: number;
  y: number;
  z: number;
  /** ángulo polar en [0, π] */
  theta: number;
  /** ángulo azimutal en [0, 2π) */
  phi: number;
}

/**
 * Coordenadas en la esfera de Bloch. No dependen de la fase global:
 * x = 2·Re(ᾱβ), y = 2·Im(ᾱβ), z = |α|² − |β|².
 */
export function toBloch(q: Qubit): BlochPoint {
  const [alpha, beta] = normalize(q) as [Complex, Complex];
  const ab = mul(conj(alpha), beta);
  const x = 2 * ab.re;
  const y = 2 * ab.im;
  const z = abs2(alpha) - abs2(beta);
  const theta = Math.acos(Math.max(-1, Math.min(1, z)));
  let phi = Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12 ? 0 : Math.atan2(y, x);
  if (phi < 0) phi += 2 * Math.PI;
  return { x, y, z, theta, phi };
}

/** Quita la fase global para que α sea real y no negativa (forma canónica para mostrar). */
export function canonicalPhase(q: Qubit): Qubit {
  const pivot = abs(q[0] as Complex) > 1e-9 ? (q[0] as Complex) : (q[1] as Complex);
  const phase = expI(-arg(pivot));
  return q.map((a) => mul(phase, a));
}

export const applyGate = (gate: Gate | GateId, q: Qubit): Qubit =>
  matVec(typeof gate === 'string' ? GATES[gate].matrix : gate.matrix, q);

/**
 * Matriz total de un circuito. Las compuertas se listan en orden temporal (G₁ primero),
 * pero el producto se escribe de derecha a izquierda: U = Gₙ···G₂G₁.
 */
export const circuitMatrix = (gates: readonly GateId[]): Matrix =>
  gates.reduce<Matrix>((U, g) => mMul(GATES[g].matrix, U), identity(2));

/** Estados intermedios: [|ψ₀⟩, G₁|ψ₀⟩, G₂G₁|ψ₀⟩, …] */
export function runCircuit(gates: readonly GateId[], start: Qubit): Qubit[] {
  const trace: Qubit[] = [start];
  for (const g of gates) trace.push(applyGate(g, trace[trace.length - 1] as Qubit));
  return trace;
}

