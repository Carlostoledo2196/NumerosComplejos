/**
 * Escena 1 · Reto cuántico e importancia en ingeniería (Inicio, 5 min).
 * Sustituye el video del guion por una animación programada (decisión D4) con locución y transcripción.
 */
import { h, svg, cssVar, button } from '../ui/dom';
import { speak, canSpeak, play } from '../ui/audio';
import { sceneShell, prose, panel, choiceQuestion } from '../ui/widgets';
import { store } from '../state/store';
import { SCENE1, DIAGNOSTIC } from '../content/texts';
import { fromBloch, toBloch, probabilities } from '../core/quantum';
import { format } from '../core/complex';
import type { SceneDef } from './types';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Comparador bit vs. cúbit. En modo cúbit, el estado recorre la esfera y se muestran α y β en vivo. */
function comparator(): HTMLElement {
  const W = 420, H = 230, CX = 115, CY = 115, R = 80;
  const box = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-labelledby': 'cmp-desc' });
  const caption = h('p', { id: 'cmp-desc', class: 'muted', 'aria-live': 'polite' });
  const readout = h('p', { class: 'readout', 'aria-hidden': 'true' });
  let mode: 'bit' | 'qubit' = 'bit';
  let raf = 0;
  let t = 0;

  const drawBit = () => {
    const line = cssVar('--border-strong'), primary = cssVar('--primary'), text = cssVar('--text'), muted = cssVar('--text-muted');
    const bit = Math.floor(t / 90) % 2; // alterna 0/1 de forma discreta
    box.replaceChildren(
      svg('rect', { x: 35, y: 15, width: 160, height: 200, rx: 10, fill: 'none', stroke: line, 'stroke-dasharray': '4 4' }),
      svg('circle', { cx: CX, cy: 60, r: 22, fill: bit === 0 ? primary : 'none', 'fill-opacity': 0.25, stroke: bit === 0 ? primary : line, 'stroke-width': 2 }),
      svg('text', { x: CX, y: 66, 'text-anchor': 'middle', fill: text, 'font-size': 18, 'font-weight': 700 }, '0'),
      svg('circle', { cx: CX, cy: 165, r: 22, fill: bit === 1 ? primary : 'none', 'fill-opacity': 0.25, stroke: bit === 1 ? primary : line, 'stroke-width': 2 }),
      svg('text', { x: CX, y: 171, 'text-anchor': 'middle', fill: text, 'font-size': 18, 'font-weight': 700 }, '1'),
      svg('text', { x: 310, y: 95, 'text-anchor': 'middle', fill: text, 'font-size': 15, 'font-weight': 700 }, 'Bit clásico'),
      svg('text', { x: 310, y: 120, 'text-anchor': 'middle', fill: muted, 'font-size': 13 }, 'Solo 0 o 1 en cada instante.'),
      svg('text', { x: 310, y: 140, 'text-anchor': 'middle', fill: muted, 'font-size': 13 }, 'Estado determinista, sin fase.'),
    );
    readout.textContent = `Estado actual: ${bit}`;
  };

  const drawQubit = () => {
    const line = cssVar('--border-strong'), grid = cssVar('--grid'), primary = cssVar('--primary'), accent = cssVar('--vec-2'), text = cssVar('--text'), muted = cssVar('--text-muted');
    // trayectoria didáctica: θ oscila entre 0 y π, φ gira
    const theta = (Math.PI / 2) * (1 - Math.cos(t / 120));
    const phi = (t / 60) % (2 * Math.PI);
    const q = fromBloch(theta, phi);
    const b = toBloch(q);
    // proyección simple: x hacia la derecha-abajo, y a la derecha, z arriba
    const px = CX + R * (b.y * 0.95 - b.x * 0.35);
    const py = CY - R * (b.z * 0.92 - b.x * 0.25);
    box.replaceChildren(
      svg('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: primary, 'stroke-width': 1.6 }),
      svg('ellipse', { cx: CX, cy: CY, rx: R, ry: R * 0.3, fill: 'none', stroke: line, 'stroke-dasharray': '4 3' }),
      svg('line', { x1: CX, y1: CY - R - 8, x2: CX, y2: CY + R + 8, stroke: grid }),
      svg('text', { x: CX, y: CY - R - 12, 'text-anchor': 'middle', fill: text, 'font-size': 13 }, '|0⟩'),
      svg('text', { x: CX, y: CY + R + 22, 'text-anchor': 'middle', fill: muted, 'font-size': 13 }, '|1⟩'),
      svg('line', { x1: CX, y1: CY, x2: px, y2: py, stroke: accent, 'stroke-width': 3, 'stroke-linecap': 'round' }),
      svg('circle', { cx: px, cy: py, r: 6, fill: accent }),
      svg('text', { x: 320, y: 70, 'text-anchor': 'middle', fill: text, 'font-size': 15, 'font-weight': 700 }, '|ψ⟩ = α|0⟩ + β|1⟩'),
      svg('text', { x: 320, y: 98, 'text-anchor': 'middle', fill: primary, 'font-size': 13 }, 'α, β ∈ ℂ  y  |α|² + |β|² = 1'),
      svg('text', { x: 320, y: 126, 'text-anchor': 'middle', fill: muted, 'font-size': 13 }, 'Superposición + fase e^{iφ}'),
      svg('text', { x: 320, y: 146, 'text-anchor': 'middle', fill: muted, 'font-size': 13 }, 'Se transforma con matrices en ℂ'),
    );
    const [p0] = probabilities(q);
    readout.textContent = `α = ${format(q[0]!, 2)}   β = ${format(q[1]!, 2)}   P(0) = ${Math.round((p0 ?? 0) * 100)} %`;
  };

  const frame = () => {
    t += 1;
    (mode === 'bit' ? drawBit : drawQubit)();
    raf = requestAnimationFrame(frame);
  };

  const setMode = (m: 'bit' | 'qubit') => {
    mode = m;
    bBit.setAttribute('aria-pressed', String(m === 'bit'));
    bQ.setAttribute('aria-pressed', String(m === 'qubit'));
    caption.textContent = m === 'bit' ? SCENE1.bitCaption : SCENE1.qubitCaption;
    cancelAnimationFrame(raf);
    if (reducedMotion()) {
      t = 150; // cuadro fijo representativo
      (m === 'bit' ? drawBit : drawQubit)();
    } else frame();
  };

  const bBit = button('Bit clásico', () => setMode('bit'), 'btn btn--small');
  const bQ = button('Cúbit en superposición', () => setMode('qubit'), 'btn btn--small');
  const wrap = panel(
    h('p', { class: 'panel__title' }, 'Animación · Bit vs. cúbit', h('span', { class: 'btn-row' }, bBit, bQ)),
    h('div', { class: 'canvas-wrap canvas-wrap--short' }, box),
    readout,
    caption,
  );
  // arrancar cuando el panel ya está en el documento (para leer las variables CSS del tema)
  queueMicrotask(() => setMode('bit'));
  // pausar la animación fuera de pantalla para no consumir batería
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (!entry.isIntersecting) cancelAnimationFrame(raf);
      else setMode(mode);
    }).observe(wrap);
  }
  return wrap;
}

function narration(): HTMLElement {
  const transcript = h('div', { class: 'panel panel--outline', hidden: true });
  transcript.append(h('p', { class: 'panel__title' }, 'Transcripción de la locución'), h('p', {}, `«${SCENE1.narration}»`));
  let stop: (() => void) | null = null;
  const listen = button('▶ Escuchar locución', () => {
    if (stop) {
      stop();
      return;
    }
    if (!canSpeak()) {
      transcript.hidden = false;
      return;
    }
    listen.textContent = '■ Detener locución';
    stop = speak(SCENE1.narration, () => {
      listen.textContent = '▶ Escuchar locución';
      stop = null;
    });
  }, 'btn');
  const sub = button('Mostrar transcripción', () => {
    transcript.hidden = !transcript.hidden;
    sub.textContent = transcript.hidden ? 'Mostrar transcripción' : 'Ocultar transcripción';
  }, 'btn');
  return h('div', { class: 'panel' }, h('p', { class: 'panel__title' }, 'Recurso multimedia accesible (DUA 1)'), h('div', { class: 'btn-row' }, listen, sub), transcript);
}

function confidenceAndDiagnostic(): HTMLElement {
  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const scale = h('div', { class: 'scale', role: 'group', 'aria-label': 'Nivel de confianza del 1 (muy bajo) al 5 (alto)' });
  const paint = () => {
    const v = store.get().confidenceBefore;
    scale.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(v === i + 1)));
    status.textContent = v ? `Confianza inicial registrada: ${v} / 5. La compararemos con tu confianza al final.` : 'Aún no seleccionas tu nivel de confianza inicial.';
  };
  for (let i = 1; i <= 5; i++) {
    scale.append(button(String(i), () => {
      store.update((s) => { s.confidenceBefore = i; });
      play('ok');
      paint();
    }, 'btn', { 'aria-pressed': 'false' }));
  }
  paint();

  const questions = h('div', { class: 'cols' });
  const s = store.get();
  DIAGNOSTIC.forEach((q, k) => {
    questions.append(
      choiceQuestion(q, `Diagnóstico ${k + 1} de ${DIAGNOSTIC.length}`, (idx) => store.update((st) => { st.diagnostic[q.id] = idx; }), {
        selected: s.diagnostic[q.id] ?? null,
      }),
    );
  });
  const diag = h('div', { hidden: Object.keys(s.diagnostic).length === 0, class: 'panel panel--outline' },
    h('p', { class: 'panel__title' }, 'Diagnóstico rápido (sin nota)'),
    questions,
  );
  const start = button('Iniciar desafío de evocación', () => {
    diag.hidden = false;
    start.hidden = true;
    diag.querySelector<HTMLButtonElement>('button.option')?.focus();
  }, 'btn btn--primary');
  start.hidden = !diag.hidden;

  return h('div', { class: 'panel' },
    h('p', { class: 'panel__title' }, 'Interacción · Desafío de evocación (0 % de la nota)'),
    h('p', {}, '1. Selecciona tu nivel de confianza en números complejos (1 = muy bajo, 5 = alto):'),
    scale,
    status,
    start,
    diag,
  );
}

export const scene01: SceneDef = {
  id: 'e1',
  number: 1,
  title: 'Reto cuántico e importancia en ingeniería',
  minutes: 5,
  tag: 'Inicio',
  mount() {
    const intro = h('div', { class: 'cols cols--wide-left' },
      h('div', { class: 'panel panel--outline' },
        h('blockquote', { class: 'quote' }, `«${SCENE1.question}»`),
        prose(SCENE1.body),
      ),
      narration(),
    );
    return sceneShell('e1', 1, this.title, `${this.tag} · ${this.minutes} min`, intro, comparator(), confidenceAndDiagnostic());
  },
};
