/**
 * Matrices con elementos en ℂ (las reales son el caso im = 0).
 * Se usan para las escenas 6–7 (RAP 3 y 4) y para las compuertas cuánticas (RAP 5).
 */
import { type Complex, c, ZERO, ONE, add as cAdd, sub as cSub, mul as cMul, div as cDiv, neg, conj, abs, approxEq as cApprox, format } from './complex';

export type Matrix = Complex[][];
export type Vector = Complex[];

export class MatrixError extends Error {
  constructor(message: string, readonly code: 'dimension' | 'singular' | 'not-square') {
    super(message);
    this.name = 'MatrixError';
  }
}

export const rows = (A: Matrix): number => A.length;
export const cols = (A: Matrix): number => (A[0]?.length ?? 0);
const at = (A: Matrix, i: number, j: number): Complex => (A[i] as Complex[])[j] as Complex;

export function zeros(n: number, m = n): Matrix {
  return Array.from({ length: n }, () => Array.from({ length: m }, () => ZERO));
}

export function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? ONE : ZERO)));
}

/** Convierte una matriz de números reales a Matrix. */
export const fromReal = (A: number[][]): Matrix => A.map((r) => r.map((v) => c(v)));

/** Convierte un vector de números reales o complejos a Vector. */
export const vec = (...v: (number | Complex)[]): Vector => v.map((x) => (typeof x === 'number' ? c(x) : x));

function assertSquare(A: Matrix, op: string): number {
  const n = rows(A);
  if (n === 0 || A.some((r) => r.length !== n)) {
    throw new MatrixError(`${op} solo está definido para matrices cuadradas (la matriz es ${n}×${cols(A)}).`, 'not-square');
  }
  return n;
}

function assertSameShape(A: Matrix, B: Matrix, op: string): void {
  if (rows(A) !== rows(B) || cols(A) !== cols(B)) {
    throw new MatrixError(
      `${op}: las matrices deben tener la misma dimensión (A es ${rows(A)}×${cols(A)}, B es ${rows(B)}×${cols(B)}).`,
      'dimension',
    );
  }
}

export function add(A: Matrix, B: Matrix): Matrix {
  assertSameShape(A, B, 'Suma');
  return A.map((r, i) => r.map((v, j) => cAdd(v, at(B, i, j))));
}

export function sub(A: Matrix, B: Matrix): Matrix {
  assertSameShape(A, B, 'Resta');
  return A.map((r, i) => r.map((v, j) => cSub(v, at(B, i, j))));
}

/** z·A con z ∈ ℂ (o real). */
export function scale(A: Matrix, z: Complex | number): Matrix {
  const k = typeof z === 'number' ? c(z) : z;
  return A.map((r) => r.map((v) => cMul(k, v)));
}

/** (AB)ᵢⱼ = Σₖ AᵢₖBₖⱼ. Exige columnas(A) = filas(B). */
export function mul(A: Matrix, B: Matrix): Matrix {
  if (cols(A) !== rows(B)) {
    throw new MatrixError(
      `Producto AB: el número de columnas de A (${cols(A)}) debe ser igual al número de filas de B (${rows(B)}).`,
      'dimension',
    );
  }
  const m = cols(B);
  return A.map((_, i) =>
    Array.from({ length: m }, (_, j) => {
      let s = ZERO;
      for (let k = 0; k < cols(A); k++) s = cAdd(s, cMul(at(A, i, k), at(B, k, j)));
      return s;
    }),
  );
}

/** Términos AᵢₖBₖⱼ de una celda del producto; la interfaz los usa para dibujar la traza fila-columna. */
export function productCellTerms(A: Matrix, B: Matrix, i: number, j: number): { a: Complex; b: Complex; product: Complex }[] {
  return Array.from({ length: cols(A) }, (_, k) => {
    const a = at(A, i, k);
    const b = at(B, k, j);
    return { a, b, product: cMul(a, b) };
  });
}

export function matVec(A: Matrix, v: Vector): Vector {
  if (cols(A) !== v.length) {
    throw new MatrixError(`Producto matriz-vector: A tiene ${cols(A)} columnas y el vector ${v.length} componentes.`, 'dimension');
  }
  return A.map((r) => r.reduce((s, a, k) => cAdd(s, cMul(a, v[k] as Complex)), ZERO));
}

/** Aⁿ para n entero; n = 0 da la identidad y n < 0 usa la inversa. */
export function pow(A: Matrix, n: number): Matrix {
  const size = assertSquare(A, 'La potencia');
  if (!Number.isInteger(n)) throw new RangeError('pow: exponente no entero');
  if (n < 0) return pow(inverse(A), -n);
  let result = identity(size);
  let base = A;
  let e = n;
  while (e > 0) {
    if (e & 1) result = mul(result, base);
    base = mul(base, base);
    e >>= 1;
  }
  return result;
}

export const transpose = (A: Matrix): Matrix => Array.from({ length: cols(A) }, (_, j) => A.map((r) => r[j] as Complex));

/** A† (transpuesta conjugada), clave para la unitariedad de las compuertas. */
export const dagger = (A: Matrix): Matrix => transpose(A).map((r) => r.map(conj));

/** Submatriz que resulta de eliminar la fila i y la columna j. */
export function minorMatrix(A: Matrix, i: number, j: number): Matrix {
  return A.filter((_, r) => r !== i).map((row) => row.filter((_, k) => k !== j));
}

/** Determinante por expansión de cofactores en la primera fila (exacto para las dimensiones de la OVA). */
export function det(A: Matrix): Complex {
  const n = assertSquare(A, 'El determinante');
  if (n === 1) return at(A, 0, 0);
  if (n === 2) return cSub(cMul(at(A, 0, 0), at(A, 1, 1)), cMul(at(A, 0, 1), at(A, 1, 0)));
  let s = ZERO;
  for (let j = 0; j < n; j++) {
    const term = cMul(at(A, 0, j), det(minorMatrix(A, 0, j)));
    s = j % 2 === 0 ? cAdd(s, term) : cSub(s, term);
  }
  return s;
}

export interface DetStep {
  /** elemento a₁ⱼ */
  element: Complex;
  sign: 1 | -1;
  minor: Matrix;
  minorDet: Complex;
  /** sign · a₁ⱼ · det(M₁ⱼ) */
  contribution: Complex;
}

/** Desglose de la expansión por la primera fila, para la retroalimentación paso a paso. */
export function detSteps(A: Matrix): DetStep[] {
  const n = assertSquare(A, 'El determinante');
  if (n < 2) return [];
  return Array.from({ length: n }, (_, j) => {
    const sign: 1 | -1 = j % 2 === 0 ? 1 : -1;
    const minor = minorMatrix(A, 0, j);
    const minorDet = det(minor);
    const contrib = cMul(at(A, 0, j), minorDet);
    return { element: at(A, 0, j), sign, minor, minorDet, contribution: sign === 1 ? contrib : neg(contrib) };
  });
}

export const cofactor = (A: Matrix, i: number, j: number): Complex => {
  const m = det(minorMatrix(A, i, j));
  return (i + j) % 2 === 0 ? m : neg(m);
};

/** Matriz adjunta: transpuesta de la matriz de cofactores. */
export function adjugate(A: Matrix): Matrix {
  const n = assertSquare(A, 'La adjunta');
  if (n === 1) return [[ONE]];
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cofactor(A, j, i)));
}

export const isSingular = (A: Matrix, eps = 1e-10): boolean => abs(det(A)) < eps;

/** A⁻¹ = adj(A) / det(A). Lanza MatrixError('singular') si det(A) = 0. */
export function inverse(A: Matrix): Matrix {
  assertSquare(A, 'La inversa');
  const d = det(A);
  if (abs(d) < 1e-10) {
    throw new MatrixError('det(A) = 0: la matriz es singular y no tiene inversa. Cambia alguna componente para que det(A) ≠ 0.', 'singular');
  }
  return adjugate(A).map((r) => r.map((v) => cDiv(v, d)));
}

export function approxEq(A: Matrix, B: Matrix, tol = 1e-9): boolean {
  return rows(A) === rows(B) && cols(A) === cols(B) && A.every((r, i) => r.every((v, j) => cApprox(v, at(B, i, j), tol)));
}

export const vecApproxEq = (u: Vector, v: Vector, tol = 1e-9): boolean =>
  u.length === v.length && u.every((x, k) => cApprox(x, v[k] as Complex, tol));

/** U es unitaria si U†U = I. Todas las compuertas cuánticas lo son. */
export const isUnitary = (U: Matrix, tol = 1e-9): boolean => approxEq(mul(dagger(U), U), identity(rows(U)), tol);

export const formatMatrix = (A: Matrix, decimals = 2): string[][] => A.map((r) => r.map((v) => format(v, decimals)));
