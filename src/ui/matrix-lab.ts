/**
 * Laboratorio de matrices compartido por las escenas 6 (ℝ) y 7 (ℂ).
 * Todo el cálculo de referencia sale de core/matrix.ts; aquí solo hay interfaz.
 */
import { h, button, input, field, select } from './dom';
import { renderMath } from './math';
import { Feedback } from './feedback';
import { LabRound } from './lab';
import { panel } from './widgets';
import type { LabId } from '../core/assessment';
import { type Rng, createRng, randInt } from '../core/random';
import { type Complex, c, format, parse, approxEq, mul as cMul } from '../core/complex';
import { type Matrix, add, scale, mul, pow, det, inverse, detSteps, productCellTerms, isSingular, MatrixError } from '../core/matrix';

export type MatrixOp = 'mul' | 'add' | 'scale' | 'pow' | 'det' | 'inv';

const OP_LABELS: Record<MatrixOp, string> = {
  mul: 'Multiplicación (A × B)',
  add: 'Suma (A + B)',
  scale: 'Escalar (k · A)',
  pow: 'Potencia (A²)',
  det: 'Determinante det(A)',
  inv: 'Inversa (A⁻¹)',
};

const TOL = 0.01;

export const matrixTex = (M: Matrix, decimals = 3): string =>
  `\\begin{pmatrix}${M.map((r) => r.map((v) => format(v, decimals)).join(' & ')).join(' \\\\ ')}\\end{pmatrix}`;

export interface MatrixLabOptions {
  labId: LabId;
  complex: boolean;
  roundSize: number;
  /** matrices de ejemplo opcionales (p. ej. compuertas cuánticas) */
  presets?: { label: string; A: Matrix; B?: Matrix; op?: MatrixOp }[];
}

function randomEntry(rng: Rng, complex: boolean): Complex {
  return complex ? c(randInt(rng, -3, 3), randInt(rng, -3, 3)) : c(randInt(rng, -5, 5));
}

function randomMatrix(rng: Rng, n: number, complex: boolean): Matrix {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => randomEntry(rng, complex)));
}

export function matrixLab(opts: MatrixLabOptions): HTMLElement {
  const rng = createRng();
  const { complex } = opts;
  let op: MatrixOp = 'mul';
  let n = 2;
  let A: Matrix = randomMatrix(rng, n, complex);
  let B: Matrix = randomMatrix(rng, n, complex);
  let k: Complex = complex ? c(0, 1) : c(2);

  const fb = new Feedback();
  const impossible = new Feedback();
  const round = new LabRound(opts.labId, opts.roundSize, (ok, size) =>
    fb.show('info', `Ronda terminada: ${ok} de ${size} operaciones correctas al primer intento.`, { title: 'Ronda completa' }));

  const editorA = h('div', { class: 'matrix-editor', role: 'group', 'aria-label': 'Matriz A' });
  const editorB = h('div', { class: 'matrix-editor', role: 'group', 'aria-label': 'Matriz B' });
  const editorR = h('div', { class: 'matrix-editor', role: 'group', 'aria-label': 'Tu resultado' });
  const blockB = h('div', { class: 'matrix-block' }, h('span', { class: 'matrix-block__label' }, complex ? 'Matriz B ∈ ℂⁿˣⁿ' : 'Matriz B'), editorB);
  const opSymbol = h('span', { class: 'op-symbol', 'aria-hidden': 'true' });
  const detInput = input({ class: 'input input--mono', placeholder: complex ? 'ej: -2 + 3i' : 'ej: -7' });
  const detField = field(complex ? 'det(A) ∈ ℂ' : 'det(A)', detInput);
  const traceLine = h('p', { class: 'muted', 'aria-live': 'polite' });
  const kInput = input({ class: 'input input--mono', value: format(k) });
  const kField = field(complex ? 'Escalar z' : 'Escalar k', kInput);

  const readCell = (raw: string): Complex | null => {
    const v = parse(raw);
    if (!v) return null;
    return !complex && v.im !== 0 ? null : v;
  };

  const cellInput = (M: Matrix, i: number, j: number, which: 'A' | 'B') => {
    const el = input({ class: 'input', value: format(M[i]![j]!, 3), 'aria-label': `${which} fila ${i + 1} columna ${j + 1}` });
    el.addEventListener('change', () => {
      const v = readCell(el.value);
      el.setAttribute('aria-invalid', String(!v));
      if (v) {
        M[i]![j] = v;
        afterEdit();
      }
    });
    return el;
  };

  const renderEditor = (ed: HTMLElement, M: Matrix, which: 'A' | 'B') => {
    ed.style.gridTemplateColumns = `repeat(${n}, auto)`;
    ed.replaceChildren(...M.flatMap((row, i) => row.map((_, j) => cellInput(M, i, j, which))));
  };

  const expected = (): { mat?: Matrix; scalar?: Complex; error?: string } => {
    try {
      switch (op) {
        case 'add': return { mat: add(A, B) };
        case 'scale': return { mat: scale(A, k) };
        case 'mul': return { mat: mul(A, B) };
        case 'pow': return { mat: pow(A, 2) };
        case 'det': return { scalar: det(A) };
        case 'inv': return { mat: inverse(A) };
      }
    } catch (e) {
      if (e instanceof MatrixError) return { error: e.message };
      throw e;
    }
  };

  /** Resalta en A y B los elementos que intervienen en la celda (i, j) del resultado. */
  const trace = (i: number, j: number) => {
    const cellsA = [...editorA.children] as HTMLElement[];
    const cellsB = [...editorB.children] as HTMLElement[];
    [...cellsA, ...cellsB].forEach((el) => el.classList.remove('is-trace'));
    const idx = (r: number, col: number) => r * n + col;
    if (op === 'mul' || op === 'pow') {
      const right = op === 'pow' ? cellsA : cellsB;
      for (let t = 0; t < n; t++) {
        cellsA[idx(i, t)]?.classList.add('is-trace');
        right[idx(t, j)]?.classList.add('is-trace');
      }
      const terms = productCellTerms(A, op === 'pow' ? A : B, i, j);
      traceLine.innerHTML = `Celda $(${i + 1},${j + 1})$: fila ${i + 1} de $A$ por columna ${j + 1} de $${op === 'pow' ? 'A' : 'B'}$: $${terms.map((t) => `(${format(t.a)})(${format(t.b)})`).join(' + ')}$`;
    } else if (op === 'add' || op === 'scale') {
      cellsA[idx(i, j)]?.classList.add('is-trace');
      if (op === 'add') cellsB[idx(i, j)]?.classList.add('is-trace');
      traceLine.innerHTML = op === 'add'
        ? `Celda $(${i + 1},${j + 1})$: $a_{${i + 1}${j + 1}} + b_{${i + 1}${j + 1}} = (${format(A[i]![j]!)}) + (${format(B[i]![j]!)})$`
        : `Celda $(${i + 1},${j + 1})$: $${format(k)} \\cdot (${format(A[i]![j]!)})$`;
    } else if (op === 'inv') {
      traceLine.innerHTML = `Celda $(${i + 1},${j + 1})$ de $A^{-1}$: cofactor $C_{${j + 1}${i + 1}}$ (¡índices transpuestos!) dividido entre $\\det(A)$.`;
    }
    renderMath(traceLine);
  };

  const renderResult = () => {
    const isDet = op === 'det';
    detField.hidden = !isDet;
    editorR.hidden = isDet;
    if (!isDet) {
      editorR.style.gridTemplateColumns = `repeat(${n}, auto)`;
      editorR.replaceChildren(...Array.from({ length: n * n }, (_, t) => {
        const i = Math.floor(t / n), j = t % n;
        const el = input({ class: 'input', 'aria-label': `Resultado fila ${i + 1} columna ${j + 1}` });
        el.addEventListener('focus', () => trace(i, j));
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); });
        return el;
      }));
    }
    detInput.value = '';
    traceLine.textContent = isDet ? '' : 'Enfoca una celda de tu respuesta para ver qué elementos intervienen.';
  };

  const afterEdit = () => {
    const ex = expected();
    if (ex.error) impossible.show('err', `<strong>Operación imposible.</strong> ${ex.error}`, { title: 'No se puede calcular', sound: false });
    else impossible.hide();
  };

  const renderAll = () => {
    blockB.hidden = !(op === 'mul' || op === 'add');
    kField.hidden = op !== 'scale';
    opSymbol.textContent = op === 'add' ? '+' : op === 'mul' ? '×' : '';
    renderEditor(editorA, A, 'A');
    renderEditor(editorB, B, 'B');
    renderResult();
    fb.hide();
    afterEdit();
  };

  const randomize = () => {
    round.next();
    A = randomMatrix(rng, n, complex);
    B = randomMatrix(rng, n, complex);
    // para la inversa se generan matrices invertibles (la singular se prueba con su botón)
    while (op === 'inv' && isSingular(A)) A = randomMatrix(rng, n, complex);
    renderAll();
  };

  const explainCell = (i: number, j: number, want: Complex): string => {
    if (op === 'mul' || op === 'pow') {
      const terms = productCellTerms(A, op === 'pow' ? A : B, i, j);
      return `$c_{${i + 1}${j + 1}} = ${terms.map((t) => `(${format(t.a)})(${format(t.b)})`).join(' + ')} = ${terms.map((t) => `(${format(t.product)})`).join(' + ')} = ${format(want, 3)}$`;
    }
    return `$c_{${i + 1}${j + 1}} = ${format(want, 3)}$`;
  };

  const verify = () => {
    const ex = expected();
    if (ex.error) {
      fb.show('err', `${ex.error}`, { title: 'Operación imposible' });
      return;
    }
    if (ex.scalar) {
      const v = readCell(detInput.value);
      detInput.setAttribute('aria-invalid', String(!v));
      if (!v) {
        fb.show('err', complex ? 'Escribe el determinante en la forma a + bi (por ejemplo <code>-2+3i</code>).' : 'Escribe un número real.', { title: 'Formato' });
        return;
      }
      const ok = approxEq(v, ex.scalar, TOL);
      round.check(ok);
      const steps = detSteps(A).map((s, t) =>
        `${s.sign > 0 ? '+' : '−'} $a_{1${t + 1}} \\cdot \\det(M_{1${t + 1}}) = (${format(s.element)})(${format(s.minorDet, 3)})$ → $${format(s.contribution, 3)}$`);
      fb.show(ok ? 'ok' : 'err', ok ? `$\\det(A) = ${format(ex.scalar, 3)}$` : `El determinante es $${format(ex.scalar, 3)}$. Expansión por la primera fila:`, { steps: ok ? [] : steps });
      return;
    }
    const want = ex.mat!;
    const cells = [...editorR.children] as HTMLInputElement[];
    const wrong: string[] = [];
    let blank = false;
    cells.forEach((el, t) => {
      const i = Math.floor(t / n), j = t % n;
      const v = readCell(el.value);
      if (!v) blank = true;
      const ok = !!v && approxEq(v, want[i]![j]!, TOL);
      el.classList.toggle('is-ok', ok);
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok && v) wrong.push(explainCell(i, j, want[i]![j]!));
    });
    if (blank && wrong.length === 0) {
      fb.show('err', `Completa todas las celdas${complex ? ' (formato a + bi)' : ''}. Puedes usar decimales o fracciones como <code>-1/2</code>.`, { title: 'Faltan celdas' });
      return;
    }
    const ok = !blank && wrong.length === 0;
    round.check(ok);
    if (ok) fb.show('ok', `$${opLabelTex()} = ${matrixTex(want)}$`);
    else fb.show('err', `${wrong.length} celda(s) con error. Revisa:`, { steps: wrong.slice(0, 4) });
  };

  const opLabelTex = () => ({ mul: 'AB', add: 'A + B', scale: `${format(k)}\\,A`, pow: 'A^2', det: '\\det A', inv: 'A^{-1}' })[op];

  const reveal = () => {
    const ex = expected();
    round.check(false);
    if (ex.error) fb.show('info', ex.error, { title: 'Solución' });
    else if (ex.scalar) fb.show('info', `$\\det(A) = ${format(ex.scalar, 3)}$`, { title: 'Solución', steps: detSteps(A).map((s) => `$${s.sign > 0 ? '+' : '-'}(${format(s.element)})\\cdot(${format(s.minorDet, 3)})$`) });
    else fb.show('info', `$${opLabelTex()} = ${matrixTex(ex.mat!)}$`, { title: 'Solución' });
  };

  kInput.addEventListener('change', () => {
    const v = readCell(kInput.value);
    kInput.setAttribute('aria-invalid', String(!v));
    if (v) k = v;
  });

  const opSel = select(Object.entries(OP_LABELS) as [MatrixOp, string][], (v) => {
    op = v as MatrixOp;
    round.next();
    if (op === 'inv') while (isSingular(A)) A = randomMatrix(rng, n, complex);
    renderAll();
  });
  const dimSel = select([['2', '2 × 2'], ['3', '3 × 3']], (v) => {
    n = Number(v);
    randomize();
  });

  const presetButtons = (opts.presets ?? []).map((p) => button(p.label, () => {
    n = p.A.length;
    dimSel.value = String(n);
    A = p.A.map((r) => [...r]);
    if (p.B) B = p.B.map((r) => [...r]);
    if (p.op) {
      op = p.op;
      opSel.value = p.op;
    }
    round.next();
    renderAll();
  }, 'btn btn--small'));

  const singular = button('Probar una matriz singular', () => {
    op = 'inv';
    opSel.value = 'inv';
    // fila 2 = (1 + i) · fila 1 en ℂ, o 2 · fila 1 en ℝ: det = 0
    const f = complex ? c(1, 1) : c(2);
    const r1 = Array.from({ length: n }, () => randomEntry(rng, complex));
    A = Array.from({ length: n }, (_, i) => (i === 0 ? r1 : i === 1 ? r1.map((v) => cMul(f, v)) : Array.from({ length: n }, () => randomEntry(rng, complex))));
    round.next();
    renderAll();
  }, 'btn btn--small');

  queueMicrotask(renderAll);

  return panel(
    h('p', { class: 'panel__title' }, complex ? 'Laboratorio de matrices en ℂ' : 'Verificador de matrices en ℝ', round.chip),
    h('div', { class: 'fields' }, field('Operación', opSel), field('Dimensión', dimSel), kField),
    h('div', { class: 'btn-row' }, button('Nuevos valores', randomize, 'btn btn--small'), ...presetButtons, singular),
    h('p', { class: 'muted' }, complex ? 'Edita las celdas en formato a + bi (ej: 2-i, 3i, -1, 1/√2).' : 'Puedes editar cualquier celda de A o B.'),
    h('div', { class: 'matrices' },
      h('div', { class: 'matrix-block' }, h('span', { class: 'matrix-block__label' }, complex ? 'Matriz A ∈ ℂⁿˣⁿ' : 'Matriz A'), editorA),
      opSymbol,
      blockB,
    ),
    impossible.el,
    h('div', { class: 'panel panel--outline' },
      h('p', { class: 'panel__title' }, 'Tu resultado'),
      h('div', { class: 'matrix-block' }, editorR),
      detField,
      traceLine,
      h('div', { class: 'btn-row' }, button('Verificar resultado', verify, 'btn btn--primary'), button('Mostrar solución', reveal)),
      fb.el,
    ),
  );
}

