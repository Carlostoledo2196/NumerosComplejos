/**
 * Escena 3 · Suma, resta y multiplicación compleja (RAP 2, laboratorio formativo e3-algebra).
 * Ronda de 4 ejercicios aleatorios; diagnóstico del error del signo de i².
 */
import { h, button, input, field, select } from '../ui/dom';
import { renderMath } from '../ui/math';
import { Feedback } from '../ui/feedback';
import { LabRound } from '../ui/lab';
import { sceneShell, prose, panel } from '../ui/widgets';
import { createRng } from '../core/random';
import { format, parse } from '../core/complex';
import { algebraExercise, diagnoseAlgebra, ALGEBRA_FEEDBACK, type AlgebraExercise, type AlgebraOp } from '../core/exercises';
import type { SceneDef } from './types';

const EXPLANATION = `
<p>Para sumar o restar $(a + bi) \\pm (c + di)$ se agrupan las partes reales entre sí y las imaginarias entre sí:</p>
$$(a \\pm c) + (b \\pm d)\\,i$$
<p>Para multiplicar se aplica la propiedad distributiva:</p>
$$(a + bi)(c + di) = ac + adi + bci + bd\\,i^2$$
<p>Como $i^2 = -1$, el último término cambia de signo:</p>
$$(a + bi)(c + di) = (ac \\;\\textcolor{#ea580c}{\\boldsymbol{-\\, bd}}) + (ad + bc)\\,i$$
<div class="callout"><strong>Alerta diagnóstica:</strong> el término <span class="hl">−bd</span>, que viene de $i^2 = -1$, es la causa número uno de error en el primer parcial. Verifica siempre el signo de $b \\cdot d \\cdot i^2$.</div>
`;

const SYMBOL: Record<AlgebraOp, string> = { add: '+', sub: '-', mul: '\\cdot' };
const LABELS: Record<AlgebraOp, [string, string]> = {
  mul: ['Parte real (ac − bd)', 'Coeficiente imaginario (ad + bc)'],
  add: ['Parte real (a + c)', 'Coeficiente imaginario (b + d)'],
  sub: ['Parte real (a − c)', 'Coeficiente imaginario (b − d)'],
};

function exerciser(): HTMLElement {
  const rng = createRng();
  let op: AlgebraOp = 'mul';
  let ex: AlgebraExercise = algebraExercise(rng, op);
  const fb = new Feedback();
  const round = new LabRound('e3-algebra', 4, (ok, n) =>
    fb.show('info', `Ronda terminada: ${ok} de ${n} ejercicios correctos al primer intento. Tu mejor ronda cuenta para la nota formativa.`, { title: 'Ronda completa' }));
  const display = h('p', { class: 'big-expr', 'aria-live': 'polite' });
  const re = input({ inputmode: 'decimal', class: 'input input--mono' });
  const im = input({ inputmode: 'decimal', class: 'input input--mono' });
  const reField = field(LABELS.mul[0], re);
  const imField = field(LABELS.mul[1], im, 'Solo el número, sin la i');

  const show = () => {
    display.innerHTML = `$(${format(ex.z1)})\\;${SYMBOL[op]}\\;(${format(ex.z2)})$`;
    renderMath(display);
    reField.firstChild!.textContent = LABELS[op][0];
    imField.firstChild!.textContent = LABELS[op][1];
    re.value = '';
    im.value = '';
    re.removeAttribute('aria-invalid');
    im.removeAttribute('aria-invalid');
    fb.hide();
  };

  const fresh = () => {
    round.next();
    ex = algebraExercise(rng, op);
    show();
    re.focus();
  };

  const check = () => {
    const r = parse(re.value), i = parse(im.value);
    re.setAttribute('aria-invalid', String(!r || r.im !== 0));
    im.setAttribute('aria-invalid', String(!i || i.im !== 0));
    if (!r || !i || r.im !== 0 || i.im !== 0) {
      fb.show('err', 'Escribe un número real en cada campo (por ejemplo <code>-7</code> o <code>12</code>). En el coeficiente imaginario no incluyas la $i$.', { title: 'Formato' });
      return;
    }
    const d = diagnoseAlgebra(ex, { re: r.re, im: i.re });
    round.check(d === 'ok');
    if (d === 'ok') fb.show('ok', `$${format(ex.result)}$. ${ALGEBRA_FEEDBACK.ok}`, { steps: ex.steps });
    else fb.show('err', ALGEBRA_FEEDBACK[d], { steps: ex.steps, title: d === 'sign-i2' ? 'Error de signo en i²' : 'Revisa' });
  };

  [re, im].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); }));
  const opSel = select([['mul', 'Multiplicación (a + bi)(c + di)'], ['add', 'Suma (a + bi) + (c + di)'], ['sub', 'Resta (a + bi) − (c + di)']], (v) => {
    op = v as AlgebraOp;
    fresh();
  });

  queueMicrotask(show);
  return panel(
    h('p', { class: 'panel__title' }, 'Ejercitador dinámico (sin calculadora)', round.chip),
    field('Tipo de operación', opSel),
    display,
    h('div', { class: 'fields' }, reField, imField),
    h('div', { class: 'btn-row' }, button('Verificar', check, 'btn btn--primary'), button('Nuevo ejercicio', fresh)),
    fb.el,
  );
}

export const scene03: SceneDef = {
  id: 'e3',
  number: 3,
  title: 'Suma, resta y multiplicación compleja',
  minutes: 5,
  tag: 'Ejercitador dinámico',
  mount() {
    return sceneShell('e3', 3, this.title, `${this.tag} · ${this.minutes} min`,
      h('div', { class: 'cols' }, panel('Explicación algorítmica paso a paso', prose(EXPLANATION)), exerciser()),
    );
  },
};
