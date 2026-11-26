/**
 * Escena 9 · Compuertas cuánticas y matrices complejas (RAP 5, Actividad 2 del guion).
 * Reto de multiplicación matriz-vector: el estudiante calcula U|ψ⟩ a mano y lo verifica en la esfera.
 */
import { h, button, input, field, select } from '../ui/dom';
import { renderMath, tex } from '../ui/math';
import { Feedback } from '../ui/feedback';
import { sceneShell, prose, panel } from '../ui/widgets';
import { BlochView } from '../ui/bloch';
import { matrixTex } from '../ui/matrix-lab';
import { store } from '../state/store';
import { GATES, KET, applyGate, toBloch, exactlyEqual, sameUpToGlobalPhase, type GateId, type Qubit } from '../core/quantum';
import { c, format, parse, approxEq } from '../core/complex';
import { productCellTerms } from '../core/matrix';
import type { SceneDef } from './types';

interface GateChallenge {
  id: string;
  gate: GateId;
  psi: Qubit;
  psiTex: string;
  hint: string;
}

const S2 = Math.SQRT1_2;
const CHALLENGES: GateChallenge[] = [
  { id: 'y-psi', gate: 'Y', psi: [c(0.6), c(0, 0.8)], psiTex: '0.6|0\\rangle + 0.8i|1\\rangle', hint: 'Con $Y(\\alpha, \\beta)^T = (-i\\beta,\\ i\\alpha)^T$: $-i(0.8i) = -0.8i^2 = 0.8$.' },
  { id: 'y-zero', gate: 'Y', psi: KET.zero, psiTex: '|0\\rangle', hint: 'Solo sobrevive la primera columna de $Y$: $(0,\\ i)^T$.' },
  { id: 'h-one', gate: 'H', psi: KET.one, psiTex: '|1\\rangle', hint: 'La segunda columna de $H$ es $\\tfrac{1}{\\sqrt2}(1,\\ -1)^T$. Puedes escribir <code>1/√2</code> o <code>0.707</code>.' },
  { id: 'z-plus-i', gate: 'Z', psi: [c(S2), c(0, S2)], psiTex: '\\tfrac{1}{\\sqrt2}|0\\rangle + \\tfrac{i}{\\sqrt2}|1\\rangle', hint: '$Z$ solo cambia el signo de la amplitud de $|1\\rangle$.' },
  { id: 'x-psi', gate: 'X', psi: [c(0.6), c(0, 0.8)], psiTex: '0.6|0\\rangle + 0.8i|1\\rangle', hint: '$X$ intercambia las amplitudes.' },
];

const TOL = 0.01;

function gateCards(): HTMLElement {
  const ids: GateId[] = ['X', 'Y', 'Z', 'H'];
  const wrap = h('div', { class: 'gates' }, ...ids.map((id) => {
    const g = GATES[id];
    return h('div', { class: 'gate-card' }, h('h4', {}, g.name), h('div', { html: tex(g.latex, true) }), h('p', { class: 'muted' }, g.description));
  }));
  return wrap;
}

function challenge(): HTMLElement {
  let ch = CHALLENGES[0]!;
  const view = new BlochView();
  const fb = new Feedback();
  const eq = h('div', {});
  const a = input({ class: 'input input--mono', placeholder: 'ej: 0.8, 1/√2, -i' });
  const b = input({ class: 'input input--mono', placeholder: 'ej: 0.6i, -0.707' });
  const chip = h('span', { class: 'chip' });

  const paintChip = () => {
    const n = store.get().gatesSolved.length;
    chip.textContent = `Retos verificados: ${n} / ${CHALLENGES.length}`;
  };

  const load = () => {
    const g = GATES[ch.gate];
    eq.innerHTML = tex(`${ch.gate}\\,|\\psi\\rangle = ${matrixTex(g.matrix)} \\begin{pmatrix} ${format(ch.psi[0]!, 3)} \\\\ ${format(ch.psi[1]!, 3)} \\end{pmatrix} = \\begin{pmatrix} \\alpha' \\\\ \\beta' \\end{pmatrix}`, true);
    a.value = '';
    b.value = '';
    [a, b].forEach((el) => { el.removeAttribute('aria-invalid'); el.classList.remove('is-ok'); });
    fb.hide();
    view.set([{ point: toBloch(ch.psi), label: '|ψ⟩', colorVar: '--vec-1' }]);
  };

  const verify = () => {
    const ua = parse(a.value), ub = parse(b.value);
    if (!ua || !ub) {
      fb.show('err', 'Escribe ambas amplitudes como números complejos: <code>0.8</code>, <code>-0.6i</code>, <code>1/√2</code>, <code>-i/√2</code>…', { title: 'Formato' });
      return;
    }
    const want = applyGate(ch.gate, ch.psi);
    const user: Qubit = [ua, ub];
    const okA = approxEq(ua, want[0]!, TOL), okB = approxEq(ub, want[1]!, TOL);
    a.classList.toggle('is-ok', okA); a.setAttribute('aria-invalid', String(!okA));
    b.classList.toggle('is-ok', okB); b.setAttribute('aria-invalid', String(!okB));
    view.set([
      { point: toBloch(ch.psi), label: '|ψ⟩', colorVar: '--vec-1' },
      { point: toBloch(want), label: `${ch.gate}|ψ⟩`, colorVar: '--vec-2' },
    ]);
    const rows = [0, 1].map((r) => {
      const terms = productCellTerms(GATES[ch.gate].matrix, ch.psi.map((z) => [z]), r, 0);
      return `${r === 0 ? "$\\alpha'" : "$\\beta'"} = ${terms.map((t) => `(${format(t.a, 3)})(${format(t.b, 3)})`).join(' + ')} = ${format(want[r]!, 3)}$`;
    });
    if (okA && okB) {
      store.update((s) => { if (!s.gatesSolved.includes(ch.id)) s.gatesSolved.push(ch.id); });
      paintChip();
      fb.show('ok', `$${ch.gate}|\\psi\\rangle = ${format(want[0]!, 3)}\\,|0\\rangle + (${format(want[1]!, 3)})\\,|1\\rangle$. En la esfera, el vector naranja es el estado transformado.`, { steps: rows });
    } else if (sameUpToGlobalPhase(user, want, 0.02) && !exactlyEqual(user, want, TOL)) {
      fb.show('err', 'Tu vector representa el mismo estado físico, pero con otra fase global: como vector no es igual a $U|\\psi\\rangle$. Revisa los factores $\\pm i$.', { steps: rows, title: 'Casi' });
    } else {
      fb.show('err', `${!okA && !okB ? 'Ninguna amplitud coincide.' : !okA ? "Revisa $\\alpha'$." : "Revisa $\\beta'$."} ${ch.hint}`, { steps: rows });
    }
  };

  const sel = select(CHALLENGES.map((x, k) => [x.id, `Reto ${k + 1}: ${x.gate} sobre ${x.psiTex.replace(/\\tfrac\{1\}\{\\sqrt2\}/g, '(1/√2)').replace(/\\tfrac\{i\}\{\\sqrt2\}/g, '(i/√2)').replace(/\\rangle/g, '⟩')}`]), (v) => {
    ch = CHALLENGES.find((x) => x.id === v)!;
    load();
  });
  [a, b].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); }));

  queueMicrotask(() => {
    load();
    paintChip();
    renderMath(eq);
  });

  return h('div', { class: 'cols' },
    panel(
      h('p', { class: 'panel__title' }, 'Actividad 2 · Reto de transformación cuántica', chip),
      field('Escenario', sel),
      eq,
      h('div', { class: 'fields' }, field("Nueva amplitud α'", a), field("Nueva amplitud β'", b)),
      h('div', { class: 'btn-row' }, button('Aplicar y verificar', verify, 'btn btn--primary')),
      fb.el,
    ),
    panel('Transformación en la esfera de Bloch', view.el, h('p', { class: 'muted' }, 'Azul: estado inicial |ψ⟩ · Naranja: estado transformado U|ψ⟩')),
  );
}

export const scene09: SceneDef = {
  id: 'e9',
  number: 9,
  title: 'Compuertas cuánticas y matrices complejas',
  minutes: 5,
  tag: 'Reto matriz–vector',
  mount() {
    return sceneShell('e9', 9, this.title, `${this.tag} · ${this.minutes} min`,
      prose('Cada compuerta de un cúbit es una matriz compleja unitaria $U$ ($U^\\dagger U = I$). Aplicarla es multiplicar la matriz por el vector de amplitudes. Por ejemplo, para Pauli-Y: $$Y\\begin{pmatrix}\\alpha\\\\ \\beta\\end{pmatrix} = \\begin{pmatrix}0 & -i\\\\ i & 0\\end{pmatrix}\\begin{pmatrix}\\alpha\\\\ \\beta\\end{pmatrix} = \\begin{pmatrix}-i\\beta\\\\ i\\alpha\\end{pmatrix}$$'),
      gateCards(),
      challenge(),
    );
  },
};
