/**
 * Banco del reto integrador (escena 10). Dos reactivos por RAP; en cada intento se elige uno por RAP
 * y se barajan las opciones (la respuesta correcta no queda siempre en la misma posición).
 * Cada reactivo se verifica con el núcleo matemático en tests/content.test.ts.
 */
import type { Rap } from '../core/assessment';

export interface QuizItem {
  id: string;
  rap: Rap;
  prompt: string;
  options: string[];
  /** índice de la opción correcta en `options` (antes de barajar) */
  correct: number;
  explain: string;
}

export const FINAL_QUIZ: QuizItem[] = [
  {
    id: 'r1a', rap: 1,
    prompt: '¿Cuál es la forma polar $z = re^{i\\theta}$ de $z = -\\sqrt{3} + i$?',
    options: ['$2e^{i5\\pi/6}$ ($r = 2,\\ \\theta = 150^\\circ$)', '$2e^{i\\pi/6}$ ($r = 2,\\ \\theta = 30^\\circ$)', '$\\sqrt{2}e^{i2\\pi/3}$'],
    correct: 0,
    explain: '$r = \\sqrt{(-\\sqrt3)^2 + 1^2} = 2$. Como $a < 0$ y $b > 0$ (segundo cuadrante), $\\theta = 180^\\circ - 30^\\circ = 150^\\circ = 5\\pi/6$. El distractor $30^\\circ$ es lo que da $\\tan^{-1}(b/a)$ sin corregir el cuadrante.',
  },
  {
    id: 'r1b', rap: 1,
    prompt: '¿Cuál es la forma polar de $z = 2 - 2i$?',
    options: ['$2\\sqrt2\\, e^{-i\\pi/4}$', '$2\\sqrt2\\, e^{i\\pi/4}$', '$2\\, e^{-i\\pi/4}$'],
    correct: 0,
    explain: '$r = \\sqrt{4 + 4} = 2\\sqrt2$ y, en el cuarto cuadrante, $\\theta = -45^\\circ = -\\pi/4$.',
  },
  {
    id: 'r2a', rap: 2,
    prompt: 'Simplifica $\\dfrac{i^{42} + 3i}{1 - i}$ usando la ciclicidad de $i$ y el conjugado:',
    options: ['$-2 + i$', '$1 + 2i$', '$2 - i$'],
    correct: 0,
    explain: '$i^{42} = i^{2} = -1$ (pues $42 = 4\\cdot10 + 2$). Luego $\\dfrac{-1 + 3i}{1 - i}\\cdot\\dfrac{1 + i}{1 + i} = \\dfrac{-1 - i + 3i + 3i^2}{2} = \\dfrac{-4 + 2i}{2} = -2 + i$.',
  },
  {
    id: 'r2b', rap: 2,
    prompt: 'Calcula $(2 + i)(3 - 2i)$:',
    options: ['$8 - i$', '$4 - i$', '$6 - 2i$'],
    correct: 0,
    explain: '$(2)(3) + (2)(-2i) + (i)(3) + (i)(-2i) = 6 - 4i + 3i - 2i^2 = 6 - i + 2 = 8 - i$. El distractor $4 - i$ sale de olvidar que $i^2 = -1$.',
  },
  {
    id: 'r3a', rap: 3,
    prompt: 'Dadas $A = \\begin{pmatrix} i & 1 \\\\ 0 & 2i \\end{pmatrix}$ y $B = \\begin{pmatrix} 2 \\\\ -i \\end{pmatrix}$, ¿cuál es $AB$?',
    options: ['$\\begin{pmatrix} i \\\\ 2 \\end{pmatrix}$', '$\\begin{pmatrix} 3i \\\\ -2 \\end{pmatrix}$', '$\\begin{pmatrix} -i \\\\ 2 \\end{pmatrix}$'],
    correct: 0,
    explain: 'Fila 1: $i(2) + 1(-i) = i$. Fila 2: $0(2) + 2i(-i) = -2i^2 = 2$.',
  },
  {
    id: 'r3b', rap: 3,
    prompt: 'Si $A = \\begin{pmatrix} 1 & i \\\\ -i & 2 \\end{pmatrix}$, ¿cuánto vale $A^2$?',
    options: [
      '$\\begin{pmatrix} 2 & 3i \\\\ -3i & 5 \\end{pmatrix}$',
      '$\\begin{pmatrix} 0 & 3i \\\\ -3i & 3 \\end{pmatrix}$',
      '$\\begin{pmatrix} 1 & -1 \\\\ -1 & 4 \\end{pmatrix}$',
    ],
    correct: 0,
    explain: '$(A^2)_{11} = 1\\cdot1 + i(-i) = 1 + 1 = 2$; $(A^2)_{12} = 1\\cdot i + i\\cdot2 = 3i$; $(A^2)_{21} = -i\\cdot1 + 2(-i) = -3i$; $(A^2)_{22} = (-i)(i) + 4 = 5$. El segundo distractor toma $i(-i) = -1$.',
  },
  {
    id: 'r4a', rap: 4,
    prompt: 'Calcula $\\det\\begin{pmatrix} 1 + i & 2 \\\\ i & 1 - i \\end{pmatrix}$:',
    options: ['$2 - 2i$', '$2 + 2i$', '$-2i$'],
    correct: 0,
    explain: '$(1 + i)(1 - i) - 2(i) = (1 - i^2) - 2i = 2 - 2i$.',
  },
  {
    id: 'r4b', rap: 4,
    prompt: 'Calcula $\\det\\begin{pmatrix} i & 2 \\\\ 1 & -i \\end{pmatrix}$:',
    options: ['$-1$', '$-3$', '$1$'],
    correct: 0,
    explain: '$i(-i) - 2(1) = -i^2 - 2 = 1 - 2 = -1$. El distractor $-3$ sale de tomar $i(-i) = -1$.',
  },
  {
    id: 'r5a', rap: 5,
    prompt: 'Un cúbit está en $|1\\rangle = \\begin{pmatrix} 0 \\\\ 1 \\end{pmatrix}$ y se aplica $Y = \\begin{pmatrix} 0 & -i \\\\ i & 0 \\end{pmatrix}$. ¿Cuál es el estado final?',
    options: ['$-i|0\\rangle$', '$i|0\\rangle$', '$-|1\\rangle$'],
    correct: 0,
    explain: '$Y|1\\rangle = \\begin{pmatrix} 0 & -i \\\\ i & 0 \\end{pmatrix}\\begin{pmatrix} 0 \\\\ 1 \\end{pmatrix} = \\begin{pmatrix} -i \\\\ 0 \\end{pmatrix} = -i|0\\rangle$.',
  },
  {
    id: 'r5b', rap: 5,
    prompt: 'Se aplica $S = \\begin{pmatrix} 1 & 0 \\\\ 0 & i \\end{pmatrix}$ al estado $|+\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + |1\\rangle)$. ¿Qué estado se obtiene?',
    options: ['$\\tfrac{1}{\\sqrt2}(|0\\rangle + i|1\\rangle)$', '$\\tfrac{1}{\\sqrt2}(|0\\rangle - |1\\rangle)$', '$\\tfrac{1}{\\sqrt2}(i|0\\rangle + |1\\rangle)$'],
    correct: 0,
    explain: '$S$ multiplica solo la amplitud de $|1\\rangle$ por $i$: el resultado es $|{+i}\\rangle$, sobre el eje $+Y$ de la esfera de Bloch.',
  },
];
