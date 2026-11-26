/**
 * Escena 2 · Definición del campo ℂ y plano de Argand (RAP 1).
 * Interacciones: ubicar vectores (ratón, toque o teclado) y emparejar formas cartesiana ↔ polar.
 */
import { h, svg, cssVar, button, input, field } from '../ui/dom';
import { renderMath } from '../ui/math';
import { Feedback } from '../ui/feedback';
import { sceneShell, prose, panel } from '../ui/widgets';
import { store } from '../state/store';
import { SCENE2, ARGAND_CHALLENGES, MATCH_PAIRS } from '../content/texts';
import { c, toPolar, format } from '../core/complex';
import type { SceneDef } from './types';

const SIZE = 360, CENTER = 180, UNIT = 30, LIMIT = 5;
const clampSnap = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, Math.round(v * 2) / 2));

function argandPlane(): HTMLElement {
  let a = 1, b = 1, idx = 0, solved = false;
  const plane = svg('svg', {
    viewBox: `0 0 ${SIZE} ${SIZE}`, tabindex: 0, role: 'application',
    'aria-label': 'Plano de Argand. Usa las flechas del teclado para mover el punto de media en media unidad.',
  });
  const inA = input({ type: 'number', step: '0.5', min: -LIMIT, max: LIMIT, value: a, inputmode: 'decimal' });
  const inB = input({ type: 'number', step: '0.5', min: -LIMIT, max: LIMIT, value: b, inputmode: 'decimal' });
  const readout = h('div', { class: 'readout', 'aria-live': 'polite' });
  const prompt = h('p', { class: 'big-expr', style: 'font-family: inherit; font-size: 1.05rem' });
  const counter = h('span', { class: 'chip' });
  const fb = new Feedback();

  const draw = () => {
    const grid = cssVar('--grid'), axis = cssVar('--axis'), muted = cssVar('--text-muted'), text = cssVar('--text');
    const vec = solved ? cssVar('--ok') : cssVar('--vec-1');
    const nodes: SVGElement[] = [];
    for (let i = -LIMIT; i <= LIMIT; i++) {
      const p = CENTER + i * UNIT;
      const isAxis = i === 0;
      nodes.push(svg('line', { x1: p, y1: 20, x2: p, y2: 340, stroke: isAxis ? axis : grid, 'stroke-width': isAxis ? 1.8 : 1 }));
      nodes.push(svg('line', { x1: 20, y1: p, x2: 340, y2: p, stroke: isAxis ? axis : grid, 'stroke-width': isAxis ? 1.8 : 1 }));
      if (i !== 0 && i % 2 === 0) {
        nodes.push(svg('text', { x: p, y: CENTER + 16, 'text-anchor': 'middle', fill: muted, 'font-size': 11 }, String(i)));
        nodes.push(svg('text', { x: CENTER - 8, y: CENTER - i * UNIT + 4, 'text-anchor': 'end', fill: muted, 'font-size': 11 }, `${i}i`));
      }
    }
    const px = CENTER + a * UNIT, py = CENTER - b * UNIT;
    nodes.push(
      svg('text', { x: 342, y: CENTER - 8, 'text-anchor': 'end', fill: text, 'font-size': 12, 'font-weight': 700 }, 'Re'),
      svg('text', { x: CENTER + 8, y: 30, fill: text, 'font-size': 12, 'font-weight': 700 }, 'Im'),
      svg('line', { x1: px, y1: CENTER, x2: px, y2: py, stroke: muted, 'stroke-dasharray': '3 3' }),
      svg('line', { x1: CENTER, y1: py, x2: px, y2: py, stroke: muted, 'stroke-dasharray': '3 3' }),
      svg('line', { x1: CENTER, y1: CENTER, x2: px, y2: py, stroke: vec, 'stroke-width': 3, 'stroke-linecap': 'round' }),
      svg('circle', { cx: px, cy: py, r: 8, fill: vec, stroke: text, 'stroke-width': 1.5 }),
      svg('text', { x: Math.min(300, Math.max(40, px + 12)), y: Math.max(32, py - 12), fill: text, 'font-size': 13, 'font-weight': 700 }, format(c(a, b), 1)),
    );
    plane.replaceChildren(...nodes);
    const p = toPolar(c(a, b));
    readout.textContent = `z = ${format(c(a, b), 1)}   ·   r = ${p.r.toFixed(2)}   ·   θ = ${p.r === 0 ? '—' : p.thetaDeg.toFixed(1) + '°'}   ·   ${p.quadrant ? 'cuadrante ' + ['I', 'II', 'III', 'IV'][p.quadrant - 1] : 'sobre un eje'}`;
  };

  const set = (na: number, nb: number) => {
    a = clampSnap(na);
    b = clampSnap(nb);
    inA.value = String(a);
    inB.value = String(b);
    solved = false;
    draw();
  };

  const fromPointer = (e: PointerEvent) => {
    const r = plane.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SIZE;
    const y = ((e.clientY - r.top) / r.height) * SIZE;
    set((x - CENTER) / UNIT, (CENTER - y) / UNIT);
  };
  plane.addEventListener('pointerdown', (e) => {
    plane.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  plane.addEventListener('pointermove', (e) => {
    if (plane.hasPointerCapture(e.pointerId)) fromPointer(e);
  });
  plane.addEventListener('keydown', (e) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, 0.5], ArrowDown: [0, -0.5] };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    set(a + d[0], b + d[1]);
  });
  inA.addEventListener('input', () => set(Number(inA.value) || 0, b));
  inB.addEventListener('input', () => set(a, Number(inB.value) || 0));

  const loadChallenge = () => {
    const ch = ARGAND_CHALLENGES[idx]!;
    counter.textContent = `Reto ${idx + 1} de ${ARGAND_CHALLENGES.length}${store.get().argandSolved.includes(idx) ? ' · resuelto' : ''}`;
    prompt.innerHTML = ch.prompt;
    renderMath(prompt);
    fb.hide();
    solved = false;
    draw();
  };

  const check = () => {
    const ch = ARGAND_CHALLENGES[idx]!;
    solved = Math.abs(a - ch.a) < 1e-9 && Math.abs(b - ch.b) < 1e-9;
    draw();
    if (solved) {
      store.update((s) => {
        if (!s.argandSolved.includes(idx)) s.argandSolved.push(idx);
      });
      const p = toPolar(c(ch.a, ch.b));
      fb.show('ok', `El vector está en $(${ch.a},\\ ${ch.b})$, con módulo $r = ${p.r.toFixed(2)}$ y argumento $\\theta = ${p.thetaDeg.toFixed(1)}^\\circ$.`);
      counter.textContent = `Reto ${idx + 1} de ${ARGAND_CHALLENGES.length} · resuelto`;
    } else {
      fb.show('err', `Ubicaste $${format(c(a, b), 1)}$. ${ch.hint}`);
    }
  };

  const next = () => {
    idx = (idx + 1) % ARGAND_CHALLENGES.length;
    loadChallenge();
  };

  queueMicrotask(loadChallenge);

  return panel(
    h('p', { class: 'panel__title' }, 'Plano de Argand interactivo', counter),
    prompt,
    h('div', { class: 'canvas-wrap' }, plane),
    readout,
    h('div', { class: 'fields' }, field('Parte real (a)', inA), field('Parte imaginaria (b)', inB)),
    h('div', { class: 'btn-row' }, button('Verificar vector', check, 'btn btn--primary'), button('Siguiente reto', next)),
    fb.el,
  );
}

function matching(): HTMLElement {
  const rightOrder = [2, 0, 3, 1];
  let selected: number | null = null;
  const matched = new Set<number>(store.get().matchedPairs);
  const left = h('div', { class: 'options', role: 'group', 'aria-label': 'Formas cartesianas' });
  const right = h('div', { class: 'options', role: 'group', 'aria-label': 'Formas polares' });
  const chip = h('span', { class: 'chip' });
  const fb = new Feedback();

  const render = () => {
    left.replaceChildren(...MATCH_PAIRS.map((p) => {
      const done = matched.has(p.id);
      const b = h('button', { type: 'button', class: `option${done ? ' is-ok' : ''}`, 'aria-pressed': String(selected === p.id), disabled: done }, h('span', { html: p.left }));
      b.addEventListener('click', () => {
        selected = p.id;
        render();
        right.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
      });
      return b;
    }));
    right.replaceChildren(...rightOrder.map((id) => {
      const p = MATCH_PAIRS[id]!;
      const done = matched.has(p.id);
      const b = h('button', { type: 'button', class: `option${done ? ' is-ok' : ''}`, disabled: done }, h('span', { html: p.right }));
      b.addEventListener('click', () => pick(p.id));
      return b;
    }));
    renderMath(left);
    renderMath(right);
    chip.textContent = `Emparejados: ${matched.size} / ${MATCH_PAIRS.length}`;
  };

  const pick = (id: number) => {
    if (selected === null) {
      fb.show('info', 'Selecciona primero una forma cartesiana en la columna izquierda.');
      return;
    }
    if (selected === id) {
      matched.add(id);
      store.update((s) => { s.matchedPairs = [...matched]; });
      const p = MATCH_PAIRS[id]!;
      const pol = toPolar(c(p.re, p.im));
      fb.show('ok', `Par correcto: $r = \\sqrt{${p.re}^2 + (${p.im})^2} = ${pol.r.toFixed(2)}$.`);
    } else {
      fb.show('err', 'No coinciden. Calcula el módulo $r = \\sqrt{a^2 + b^2}$ y verifica el cuadrante del ángulo $\\theta$.');
    }
    selected = null;
    render();
  };

  render();
  return panel(
    h('p', { class: 'panel__title' }, 'Emparejamiento cartesiana ↔ polar', chip),
    h('p', { class: 'muted' }, 'Selecciona una forma cartesiana (izquierda) y luego su forma polar equivalente (derecha).'),
    h('div', { class: 'match' }, left, right),
    h('div', { class: 'btn-row' }, button('Reiniciar pares', () => {
      matched.clear();
      selected = null;
      store.update((s) => { s.matchedPairs = []; });
      fb.hide();
      render();
    }, 'btn btn--small')),
    fb.el,
  );
}

export const scene02: SceneDef = {
  id: 'e2',
  number: 2,
  title: 'Definición del campo ℂ y plano de Argand',
  minutes: 5,
  tag: 'Forma cartesiana y polar',
  mount() {
    return sceneShell('e2', 2, this.title, `${this.tag} · ${this.minutes} min`,
      prose(SCENE2.body),
      prose(SCENE2.quadrantNote, 'callout'),
      h('div', { class: 'cols' }, argandPlane(), matching()),
    );
  },
};
