/**
 * Escena 7 · Matrices y determinantes con elementos imaginarios o complejos (RAP 3–4, laboratorio e7-complex-matrix).
 */
import { h } from '../ui/dom';
import { sceneShell, prose, panel } from '../ui/widgets';
import { matrixLab } from '../ui/matrix-lab';
import { GATES } from '../core/quantum';
import { c } from '../core/complex';
import type { SceneDef } from './types';

const RECALL = `
<p>Los algoritmos son <strong>los mismos</strong> que en $\\mathbb{R}$; lo único nuevo es que cada producto de entradas es un producto de complejos:</p>
$$(a + bi)(c + di) = (ac - bd) + (ad + bc)\\,i$$
<div class="callout">En un determinante complejo aparecen términos como $i \\cdot i = i^2 = -1$ y $i\\cdot(-i) = -i^2 = +1$. Son la fuente más común de error de signo.</div>
<p>Las <strong>compuertas cuánticas</strong> son matrices complejas $2\\times2$. Prueba el preset «Pauli-Y y Hadamard» con la operación producto: $YH$ es otra matriz unitaria.</p>`;

export const scene07: SceneDef = {
  id: 'e7',
  number: 7,
  title: 'Matrices y determinantes con elementos complejos',
  minutes: 5,
  tag: 'Laboratorio complejo',
  mount() {
    return sceneShell('e7', 7, this.title, `${this.tag} · ${this.minutes} min`,
      h('div', { class: 'cols cols--wide-left' },
        matrixLab({
          labId: 'e7-complex-matrix',
          complex: true,
          roundSize: 3,
          presets: [
            { label: 'Preset cuántico: Pauli-Y y Hadamard', A: GATES.Y.matrix, B: GATES.H.matrix, op: 'mul' },
            { label: 'Preset: det con i·i', A: [[c(1, 1), c(0, 2)], [c(0, 1), c(1, -1)]], op: 'det' },
          ],
        }),
        panel('Qué cambia en ℂ', prose(RECALL)),
      ),
    );
  },
};
