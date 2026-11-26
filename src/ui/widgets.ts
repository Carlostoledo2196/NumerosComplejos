/** Componentes reutilizables entre escenas. */
import { h, button } from './dom';
import { renderMath } from './math';
import { Feedback } from './feedback';
import type { ChoiceQuestion } from '../content/texts';

/** Contenedor estándar de una escena. */
export function sceneShell(id: string, number: number, title: string, meta: string, ...body: (Node | null)[]): HTMLElement {
  const headingId = `${id}-title`;
  const el = h(
    'section',
    { class: 'scene', id, 'aria-labelledby': headingId },
    h('header', { class: 'scene__head' }, h('h3', { id: headingId }, `Escena ${number} · ${title}`), h('span', { class: 'chip chip--muted' }, meta)),
    ...body,
  );
  return el;
}

/** Bloque de texto con fórmulas. */
export function prose(markup: string, cls = ''): HTMLElement {
  const el = h('div', { class: cls, html: markup });
  renderMath(el);
  return el;
}

export function panel(title: string | Node, ...children: (Node | null)[]): HTMLElement {
  return h('div', { class: 'panel' }, typeof title === 'string' ? h('p', { class: 'panel__title' }, title) : title, ...children);
}

/**
 * Pregunta de selección múltiple con retroalimentación inmediata.
 * `order` permite barajar las opciones manteniendo el índice original.
 */
export function choiceQuestion(
  q: Pick<ChoiceQuestion, 'prompt' | 'options' | 'correct' | 'ok' | 'err'>,
  label: string,
  onAnswer: (optionIndex: number, correct: boolean) => void,
  opts: {
    order?: number[];
    selected?: number | null;
    reveal?: boolean;
    /** true: al elegir solo se marca la opción (sin acierto/error ni sonido); se revela al calificar */
    deferred?: boolean;
  } = {},
): HTMLElement {
  const order = opts.order ?? q.options.map((_, i) => i);
  const fb = new Feedback();
  const group = h('div', { class: 'options', role: 'group', 'aria-label': label });
  const buttons = new Map<number, HTMLButtonElement>();

  const paint = (selected: number | null, reveal: boolean) => {
    for (const [idx, b] of buttons) {
      b.setAttribute('aria-pressed', String(idx === selected));
      b.classList.toggle('is-ok', reveal && idx === q.correct && idx === selected);
      b.classList.toggle('is-err', reveal && idx === selected && idx !== q.correct);
    }
  };

  order.forEach((idx, pos) => {
    const b = h('button', { type: 'button', class: 'option' }, h('span', { class: 'option__mark', 'aria-hidden': 'true' }, String.fromCharCode(65 + pos) + '.'), h('span', { html: q.options[idx] ?? '' }));
    b.addEventListener('click', () => {
      const ok = idx === q.correct;
      if (opts.deferred) {
        paint(idx, false);
        fb.hide();
      } else {
        paint(idx, true);
        fb.show(ok ? 'ok' : 'err', ok ? q.ok : q.err);
      }
      onAnswer(idx, ok);
    });
    buttons.set(idx, b);
    group.append(b);
  });

  const wrap = h('div', { class: 'panel panel--outline' }, h('p', { class: 'panel__title' }, label), h('div', { html: q.prompt }), group, fb.el);
  renderMath(wrap);
  if (opts.selected !== undefined && opts.selected !== null) {
    paint(opts.selected, opts.reveal ?? true);
    if (opts.reveal ?? true) fb.show(opts.selected === q.correct ? 'ok' : 'err', opts.selected === q.correct ? q.ok : q.err, { sound: false });
  }
  return wrap;
}

/** Botón conmutador accesible (aria-pressed). */
export function toggle(label: string, pressed: boolean, onToggle: (next: boolean) => void, cls = 'btn'): HTMLButtonElement {
  const b = button(label, () => {
    const next = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(next));
    onToggle(next);
  }, cls, { 'aria-pressed': String(pressed) });
  return b;
}
