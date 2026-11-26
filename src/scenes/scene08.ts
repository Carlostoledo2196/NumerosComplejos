/**
 * Escena 8 · Representación de cúbits y la esfera de Bloch (RAP 5).
 * Deslizadores de θ y φ; amplitudes complejas, probabilidades y coordenadas en vivo (todo desde core/quantum).
 */
import { h, button, input, field } from '../ui/dom';
import { sceneShell, prose, panel } from '../ui/widgets';
import { BlochView } from '../ui/bloch';
import { store } from '../state/store';
import { fromBloch, toBloch, probabilities } from '../core/quantum';
import { format } from '../core/complex';
import type { SceneDef } from './types';

const INTRO =
  'Un cúbit puro se escribe $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle = \\cos\\tfrac{\\theta}{2}\\,|0\\rangle + e^{i\\varphi}\\sin\\tfrac{\\theta}{2}\\,|1\\rangle$. La amplitud $\\beta$ lleva la fase compleja $e^{i\\varphi} = \\cos\\varphi + i\\sin\\varphi$. Ajusta $\\theta$ y $\\varphi$ y observa cómo se mueve el vector de estado (arrastra la esfera para rotar la vista).';

const PRESETS: [string, number, number][] = [
  ['|0⟩', 0, 0], ['|1⟩', 180, 0], ['|+⟩', 90, 0], ['|−⟩', 90, 180], ['|+i⟩', 90, 90], ['|−i⟩', 90, 270],
];

export const scene08: SceneDef = {
  id: 'e8',
  number: 8,
  title: 'Representación de cúbits y la esfera de Bloch',
  minutes: 5,
  tag: 'Simulador 3D interactivo',
  mount() {
    let theta = 60, phi = 90;
    const view = new BlochView();
    const thetaRange = input({ type: 'range', min: 0, max: 180, step: 1, value: theta, class: '' });
    const phiRange = input({ type: 'range', min: 0, max: 360, step: 1, value: phi, class: '' });
    const thetaNum = input({ type: 'number', min: 0, max: 180, value: theta, class: 'input input--mono', 'aria-label': 'θ en grados' });
    const phiNum = input({ type: 'number', min: 0, max: 360, value: phi, class: 'input input--mono', 'aria-label': 'φ en grados' });
    const out = h('div', { class: 'readout', 'aria-live': 'polite', style: 'display: grid; gap: 0.25rem' });

    const update = () => {
      thetaRange.value = thetaNum.value = String(theta);
      phiRange.value = phiNum.value = String(phi);
      const q = fromBloch((theta * Math.PI) / 180, (phi * Math.PI) / 180);
      const b = toBloch(q);
      const [p0, p1] = probabilities(q) as [number, number];
      view.set([{ point: b, label: '|ψ⟩', colorVar: '--vec-2' }]);
      out.replaceChildren(
        h('span', {}, `α = ${format(q[0]!, 3)}`),
        h('span', {}, `β = ${format(q[1]!, 3)}`),
        h('span', {}, `P(|0⟩) = |α|² = ${(p0 * 100).toFixed(1)} %`),
        h('span', {}, `P(|1⟩) = |β|² = ${(p1 * 100).toFixed(1)} %`),
        h('span', {}, `Coordenadas de Bloch (x, y, z) = (${b.x.toFixed(2)}, ${b.y.toFixed(2)}, ${b.z.toFixed(2)})`),
      );
      if (!store.get().blochExplored && (theta !== 60 || phi !== 90)) store.update((s) => { s.blochExplored = true; });
    };

    const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v) || 0));
    thetaRange.addEventListener('input', () => { theta = clamp(Number(thetaRange.value), 180); update(); });
    phiRange.addEventListener('input', () => { phi = clamp(Number(phiRange.value), 360); update(); });
    thetaNum.addEventListener('change', () => { theta = clamp(Number(thetaNum.value), 180); update(); });
    phiNum.addEventListener('change', () => { phi = clamp(Number(phiNum.value), 360); update(); });
    thetaRange.setAttribute('aria-label', 'Ángulo polar θ, de 0 a 180 grados');
    phiRange.setAttribute('aria-label', 'Fase azimutal φ, de 0 a 360 grados');

    const presets = h('div', { class: 'btn-row', role: 'group', 'aria-label': 'Estados notables' },
      ...PRESETS.map(([lbl, t, p]) => button(lbl, () => { theta = t; phi = p; update(); }, 'btn btn--small')),
      button('Restablecer vista', () => view.resetCamera(), 'btn btn--small'),
    );

    queueMicrotask(update);
    return sceneShell('e8', 8, this.title, `${this.tag} · ${this.minutes} min`,
      prose(INTRO),
      h('div', { class: 'cols' },
        panel('Esfera de Bloch (arrastra o usa las flechas para rotar)', view.el, presets),
        panel('Parámetros del estado cuántico',
          field('Ángulo polar θ (0° a 180°)', thetaRange), thetaNum,
          field('Fase azimutal φ (0° a 360°)', phiRange), phiNum,
          out,
          prose('<p class="muted">Observa: cambiar $\\varphi$ no altera las probabilidades $|\\alpha|^2$ y $|\\beta|^2$, solo la fase relativa. Por eso el vector gira alrededor del eje $z$.</p>'),
        ),
      ),
    );
  },
};
