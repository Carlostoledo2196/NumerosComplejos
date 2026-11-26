/**
 * Escena 4 · Potencias de la unidad imaginaria i y ciclicidad (RAP 2, laboratorio e4-powers).
 * Rueda cíclica de período 4 y juego de velocidad (10 s por pregunta, con modo DUA sin límite).
 */
import { h, svg, cssVar, button, input, field } from '../ui/dom';
import { tex } from '../ui/math';
import { Feedback } from '../ui/feedback';
import { play } from '../ui/audio';
import { sceneShell, prose, panel, toggle } from '../ui/widgets';
import { store } from '../state/store';
import { createRng } from '../core/random';
import { powerOfI, I_CYCLE_LABELS } from '../core/complex';
import { powerOfIQuestions, type PowerOfIQuestion } from '../core/exercises';
import type { SceneDef } from './types';

const INTRO =
  'Las potencias de $i$ se repiten cada 4: $i^0 = 1$, $i^1 = i$, $i^2 = -1$, $i^3 = -i$, $i^4 = 1$, … Para calcular $i^n$ divide $n$ entre 4: si $n = 4q + r$, entonces $i^n = (i^4)^q \\cdot i^r = i^r$. Solo importa el residuo $r = n \\bmod 4$.';

function wheel(): HTMLElement {
  const W = 300, C = 150, R = 86;
  const pic = svg('svg', { viewBox: `0 0 ${W} ${W}`, class: 'wheel', role: 'img', 'aria-label': 'Rueda cíclica de las potencias de i' });
  const exp = input({ type: 'number', step: '1', value: 2607, inputmode: 'numeric', class: 'input input--mono' });
  const out = h('div', { 'aria-live': 'polite' });

  const draw = (active: number) => {
    const grid = cssVar('--border-strong'), text = cssVar('--text'), primary = cssVar('--primary'), onP = cssVar('--on-primary');
    // posiciones en el plano complejo: 1 a la derecha, i arriba, −1 izquierda, −i abajo
    const pos = [[C + R, C], [C, C - R], [C - R, C], [C, C + R]] as const;
    const nodes: SVGElement[] = [
      svg('circle', { cx: C, cy: C, r: R, fill: 'none', stroke: grid, 'stroke-dasharray': '5 4' }),
      svg('path', { d: `M ${C + R * 0.7} ${C - R * 0.7} A ${R} ${R} 0 0 0 ${C - R * 0.7} ${C - R * 0.7}`, fill: 'none', stroke: grid }),
      svg('text', { x: C, y: C + 5, 'text-anchor': 'middle', fill: text, 'font-size': 13 }, '× i  ↺'),
    ];
    pos.forEach(([x, y], k) => {
      const on = k === active;
      nodes.push(svg('circle', { cx: x, cy: y, r: 24, fill: on ? primary : cssVar('--surface'), stroke: primary, 'stroke-width': 2 }));
      nodes.push(svg('text', { x, y: y + 6, 'text-anchor': 'middle', fill: on ? onP : text, 'font-size': 16, 'font-weight': 700 }, I_CYCLE_LABELS[k]!));
      // etiqueta del residuo hacia afuera de la rueda, en la dirección del nodo
      const dir = [[1, 0], [0, -1], [-1, 0], [0, 1]][k]!;
      const lx = C + dir[0]! * (R + 40), ly = C + dir[1]! * (R + 40) + 4;
      nodes.push(svg('text', { x: lx, y: ly, 'text-anchor': 'middle', fill: cssVar('--text-muted'), 'font-size': 12 }, `r = ${k}`));
    });
    pic.replaceChildren(...nodes);
  };

  const update = () => {
    const n = Number(exp.value);
    if (!Number.isInteger(n)) {
      out.textContent = 'Escribe un exponente entero (puede ser negativo).';
      return;
    }
    const p = powerOfI(n);
    draw(p.remainder);
    // dos líneas: cabe en pantallas de teléfono sin scroll
    out.innerHTML = tex(`\\begin{gathered} ${n} = 4 \\times (${p.quotient}) + ${p.remainder} \\\\ \\implies i^{${n}} = i^{${p.remainder}} = ${p.label} \\end{gathered}`, true);
  };
  exp.addEventListener('input', update);
  queueMicrotask(update);

  return panel('Rueda cíclica de período 4', pic, field('Prueba un exponente n', exp, 'También funciona con exponentes negativos: i⁻¹ = −i'), out);
}

function speedGame(): HTMLElement {
  const rng = createRng();
  const SECONDS = 10;
  let qs: PowerOfIQuestion[] = [];
  let k = 0, score = 0, left = SECONDS, timer = 0;
  let untimed = false;
  let open = false; // hay una pregunta esperando respuesta
  const fb = new Feedback();
  const status = h('p', { class: 'readout', 'aria-live': 'polite' });
  const prompt = h('p', { class: 'big-expr' });
  const answers = h('div', { class: 'btn-row', role: 'group', 'aria-label': 'Respuestas posibles' });
  const play_ = h('div', { hidden: true, class: 'panel panel--outline' }, prompt, answers, status);
  const start = button('Iniciar prueba de velocidad (5 retos)', () => begin(), 'btn btn--primary');

  const stopTimer = () => window.clearInterval(timer);
  const paintStatus = () => {
    status.textContent = `Pregunta ${k + 1} de ${qs.length}   ·   aciertos ${score}   ·   ${untimed ? 'sin límite de tiempo' : `tiempo ${left} s`}`;
  };

  const ask = () => {
    const q = qs[k]!;
    prompt.innerHTML = tex(`i^{${q.n}} = \\;?`);
    left = SECONDS;
    paintStatus();
    answers.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = false));
    open = true;
    stopTimer();
    if (!untimed) {
      timer = window.setInterval(() => {
        left--;
        paintStatus();
        if (left <= 0) answer(null);
      }, 1000);
    }
  };

  const answer = (label: string | null) => {
    if (!open) return;
    open = false;
    stopTimer();
    const q = qs[k]!;
    const ok = label === q.answerLabel;
    if (ok) score++;
    answers.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
    fb.show(ok ? 'ok' : 'err', `$${q.explanation}$`, { title: ok ? '¡Correcto!' : label === null ? 'Se acabó el tiempo' : 'Revisa' });
    window.setTimeout(() => {
      k++;
      if (k < qs.length) ask();
      else finish();
    }, untimed ? 1800 : 1400);
  };

  const finish = () => {
    store.recordLab('e4-powers', score, qs.length);
    play_.hidden = true;
    start.hidden = false;
    start.textContent = 'Intentar otra ronda';
    const best = Math.round((store.get().labs['e4-powers']?.best ?? 0) * 100);
    fb.show(score >= 4 ? 'ok' : 'info', `Obtuviste ${score} de ${qs.length}. Tu mejor ronda: ${best} %.`, { title: 'Prueba terminada', sound: false });
    if (score >= 4) play('ok');
  };

  const begin = () => {
    qs = powerOfIQuestions(rng, 5);
    k = 0;
    score = 0;
    fb.hide();
    start.hidden = true;
    play_.hidden = false;
    ask();
    (answers.querySelector('button') as HTMLButtonElement | null)?.focus();
  };

  for (const lbl of I_CYCLE_LABELS) {
    const b = h('button', { type: 'button', class: 'btn', style: 'min-width: 4rem', html: tex(lbl) });
    b.addEventListener('click', () => answer(lbl));
    answers.append(b);
  }

  const untimedBtn = toggle('Modo DUA sin límite de tiempo', false, (v) => {
    untimed = v;
    if (!open) return;
    if (untimed) {
      stopTimer();
      paintStatus();
    } else ask();
  }, 'btn btn--small');

  return panel(
    h('p', { class: 'panel__title' }, 'Juego de velocidad de evocación', untimedBtn),
    h('p', { class: 'muted' }, 'Calcula potencias altas de i aplicando n mod 4, en menos de 10 segundos por pregunta.'),
    start,
    play_,
    fb.el,
  );
}

export const scene04: SceneDef = {
  id: 'e4',
  number: 4,
  title: 'Potencias de la unidad imaginaria i y ciclicidad',
  minutes: 5,
  tag: 'Rueda cíclica y juego de velocidad',
  mount() {
    return sceneShell('e4', 4, this.title, `${this.tag} · ${this.minutes} min`, prose(INTRO), h('div', { class: 'cols' }, wheel(), speedGame()));
  },
};
