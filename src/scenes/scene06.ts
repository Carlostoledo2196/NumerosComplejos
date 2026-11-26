/**
 * Escena 6 · Evocación de matrices con elementos reales (RAP 3–4, laboratorio e6-real-matrix).
 */
import { h } from '../ui/dom';
import { sceneShell, prose, panel } from '../ui/widgets';
import { matrixLab } from '../ui/matrix-lab';
import type { SceneDef } from './types';

const RECALL = `
<ul>
  <li><strong>Suma</strong> (misma dimensión): $(A + B)_{ij} = a_{ij} + b_{ij}$.</li>
  <li><strong>Escalar</strong>: $(kA)_{ij} = k\\,a_{ij}$.</li>
  <li><strong>Producto</strong> (columnas de $A$ = filas de $B$): $(AB)_{ij} = \\sum_k a_{ik}\\,b_{kj}$, fila de $A$ por columna de $B$. En general $AB \\neq BA$.</li>
  <li><strong>Potencia</strong>: $A^2 = A \\cdot A$ (solo matrices cuadradas).</li>
  <li><strong>Determinante</strong> $2\\times2$: $\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc$. En $3\\times3$ se expande por cofactores de la primera fila.</li>
  <li><strong>Inversa</strong>: $A^{-1} = \\dfrac{1}{\\det A}\\,\\operatorname{adj}(A)$; existe solo si $\\det A \\neq 0$.</li>
</ul>`;

export const scene06: SceneDef = {
  id: 'e6',
  number: 6,
  title: 'Evocación de matrices con elementos reales',
  minutes: 5,
  tag: 'Verificador con traza fila-columna',
  mount() {
    return sceneShell('e6', 6, this.title, `${this.tag} · ${this.minutes} min`,
      h('div', { class: 'cols cols--wide-left' },
        matrixLab({ labId: 'e6-real-matrix', complex: false, roundSize: 3 }),
        panel('Recuerda los algoritmos', prose(RECALL)),
      ),
    );
  },
};
