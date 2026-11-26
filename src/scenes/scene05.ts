/**
 * Escena 5 · Conjugado y división compleja (RAP 2, laboratorio e5-division).
 * Actividad de pasos enlazados (ordenar el algoritmo) y práctica guiada escribiendo el conjugado.
 */
import { h, button, input, field } from '../ui/dom';
import { renderMath, tex } from '../ui/math';
import { Feedback } from '../ui/feedback';
import { LabRound } from '../ui/lab';
import { sceneShell, prose, panel } from '../ui/widgets';
import { store } from '../state/store';
import { createRng, shuffle } from '../core/random';
import { format, parse } from '../core/complex';
import { divisionExercise, divisionStepOrder, checkDivision, isCorrectOrder, type DivisionExercise } from '../core/exercises';
import type { SceneDef } from './types';

const INTRO =
  'Para dividir $\\dfrac{a + bi}{c + di}$ se multiplica numerador y denominador por el <strong>conjugado</strong> del denominador, $\\overline{c + di} = c - di$. Así el denominador se vuelve real: $(c + di)(c - di) = c^2 - d^2 i^2 = c^2 + d^2$.';

function ordering(): HTMLElement {
  const rng = createRng();
  let ex = divisionExercise(rng);
  let order: number[] = [];
  const list = h('ol', { class: 'order-list', 'aria-label': 'Pasos de la división (usa los botones para reordenar)' });
  const title = h('p', {});
  const fb = new Feedback();
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });

  const render = (marks?: boolean[]) => {
    const steps = divisionStepOrder(ex);
    list.replaceChildren(...order.map((id, pos) => {
      const up = button('▲', () => move(pos, -1), 'btn btn--small', { 'aria-label': `Subir el paso de la posición ${pos + 1}`, disabled: pos === 0 });
      const down = button('▼', () => move(pos, 1), 'btn btn--small', { 'aria-label': `Bajar el paso de la posición ${pos + 1}`, disabled: pos === order.length - 1 });
      const cls = marks ? (marks[pos] ? ' is-ok' : ' is-err') : '';
      return h('li', { class: `order-item${cls}` },
        h('span', { class: 'chip' }, String(pos + 1)),
        h('span', { class: 'order-item__text', html: steps[id]!.text }),
        h('span', { class: 'order-item__btns' }, up, down),
      );
    }));
    renderMath(list);
  };

  const move = (pos: number, d: number) => {
    const to = pos + d;
    if (to < 0 || to >= order.length) return;
    [order[pos], order[to]] = [order[to]!, order[pos]!];
    render();
    live.textContent = `Paso movido a la posición ${to + 1}.`;
    (list.children[to]?.querySelector(`button:nth-child(${d < 0 ? 1 : 2})`) as HTMLButtonElement | null)?.focus();
  };

  const load = () => {
    ex = divisionExercise(rng);
    do order = shuffle(rng, [0, 1, 2, 3]);
    while (isCorrectOrder(order));
    title.innerHTML = `Ordena las etapas para dividir ${tex(`\\dfrac{${format(ex.numerator)}}{${format(ex.denominator)}}`)}:`;
    fb.hide();
    render();
  };

  const verify = () => {
    const marks = order.map((id, pos) => id === pos);
    render(marks);
    if (isCorrectOrder(order)) {
      store.update((s) => { s.divOrderDone = true; });
      fb.show('ok', `Secuencia correcta. El resultado es $${format(ex.result, 3)}$.`);
    } else {
      fb.show('err', `${marks.filter(Boolean).length} de 4 pasos están en su lugar. Pista: primero se identifica el conjugado; el denominador se vuelve real antes de separar partes.`);
    }
  };

  queueMicrotask(load);
  return panel(
    h('p', { class: 'panel__title' }, 'Pasos enlazados · Ordena el algoritmo'),
    title,
    list,
    live,
    h('div', { class: 'btn-row' }, button('Verificar secuencia', verify, 'btn btn--primary'), button('Otra división', load)),
    fb.el,
  );
}

function practice(): HTMLElement {
  const rng = createRng();
  let ex: DivisionExercise = divisionExercise(rng);
  const fb = new Feedback();
  const round = new LabRound('e5-division', 2, (ok, n) =>
    fb.show('info', `Ronda terminada: ${ok} de ${n} divisiones correctas al primer intento.`, { title: 'Ronda completa' }));
  const display = h('p', { class: 'big-expr' });
  const conj = input({ class: 'input input--mono', placeholder: 'ej: 2 - 3i' });
  const den = input({ class: 'input input--mono', inputmode: 'decimal' });
  const nre = input({ class: 'input input--mono', inputmode: 'decimal' });
  const nim = input({ class: 'input input--mono', inputmode: 'decimal' });
  const all = [conj, den, nre, nim];

  const show = () => {
    display.innerHTML = tex(`\\dfrac{${format(ex.numerator)}}{${format(ex.denominator)}}`);
    all.forEach((i) => {
      i.value = '';
      i.removeAttribute('aria-invalid');
      i.classList.remove('is-ok');
    });
    fb.hide();
  };

  const real = (el: HTMLInputElement): number | null => {
    const v = parse(el.value);
    return v && v.im === 0 ? v.re : null;
  };

  const check = () => {
    const r = checkDivision(ex, { conjugate: parse(conj.value), realDenominator: real(den), numeratorRe: real(nre), numeratorIm: real(nim) });
    const mark = (el: HTMLInputElement, ok: boolean) => {
      el.setAttribute('aria-invalid', String(!ok));
      el.classList.toggle('is-ok', ok);
    };
    mark(conj, r.conjugate);
    mark(den, r.realDenominator);
    mark(nre, r.numerator);
    mark(nim, r.numerator);
    round.check(r.allCorrect);
    if (r.allCorrect) fb.show('ok', `$\\dfrac{${format(ex.expandedNumerator)}}{${ex.realDenominator}} = ${format(ex.result, 3)}$`, { steps: ex.steps });
    else fb.show('err', r.messages.join('<br>'));
  };

  const next = () => {
    round.next();
    ex = divisionExercise(rng);
    show();
    conj.focus();
  };

  all.forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); }));
  queueMicrotask(show);
  return panel(
    h('p', { class: 'panel__title' }, 'Práctica guiada · Escribe el conjugado', round.chip),
    display,
    h('div', { class: 'fields' },
      field('1. Conjugado del denominador', conj),
      field('2. Denominador real (c² + d²)', den),
      field('3. Numerador: parte real', nre, 'de (a + bi)(c − di)'),
      field('4. Numerador: coeficiente imaginario', nim, 'sin la i'),
    ),
    h('div', { class: 'btn-row' }, button('Comprobar', check, 'btn btn--primary'), button('Otra división', next)),
    fb.el,
  );
}

export const scene05: SceneDef = {
  id: 'e5',
  number: 5,
  title: 'Conjugado y división compleja',
  minutes: 5,
  tag: 'Pasos enlazados y práctica',
  mount() {
    const el = sceneShell('e5', 5, this.title, `${this.tag} · ${this.minutes} min`, prose(INTRO), h('div', { class: 'cols' }, ordering(), practice()));
    renderMath(el);
    return el;
  },
};
