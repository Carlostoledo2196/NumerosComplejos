/**
 * Textos de la OVA. Editables por el equipo docente sin tocar la lógica.
 * Las fórmulas usan KaTeX entre $…$ (en línea) o $$…$$ (bloque).
 */

export const COURSE = {
  title: 'Evocación de Números Complejos y Computación Cuántica',
  subject: 'Matemáticas Avanzadas para Ingenieros',
  audience: 'Ingeniería de Sistemas · Quinto semestre',
  lead:
    'Objeto Virtual de Aprendizaje de 60 minutos, diseñado con el modelo DUA y aprendizaje activo, para reactivar el cálculo en $\\mathbb{C}$, las operaciones con matrices complejas y su aplicación a cúbits y compuertas cuánticas.',
  context:
    'Entre 2024 y 2026, en promedio el 80 % de los estudiantes no aprobó el primer corte. Delegar a ciegas los cálculos en $\\mathbb{C}$ a una calculadora limita la modelación en ingeniería. Aquí entrenarás los algoritmos paso a paso, sin calculadora.',
};

export const SCENE1 = {
  question: '¿Por qué un Ingeniero de Sistemas moderno debe dominar los números complejos? Descubre cómo el cálculo complejo impulsa la Segunda Revolución Cuántica.',
  body:
    'En la computación clásica, un bit solo toma dos estados deterministas ($0$ o $1$). En un procesador cuántico, la unidad fundamental es el <strong>cúbit</strong>, cuyo estado vive en un espacio vectorial complejo de dimensión 2: $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$, donde las amplitudes $\\alpha$ y $\\beta$ son números complejos y su fase relativa determina la interferencia cuántica.',
  narration:
    'Bienvenido, futuro ingeniero de sistemas. Durante siglos, los números imaginarios parecieron una abstracción pura. Hoy gobiernan tanto la impedancia en los circuitos eléctricos como la fase de los cúbits en los procesadores cuánticos de nueva generación. Al operar con i, con matrices complejas y con la esfera de Bloch sin depender a ciegas de una calculadora, construyes la base matemática para diseñar algoritmos cuánticos reales.',
  bitCaption: 'Un bit clásico solo puede estar en uno de dos estados discretos: 0 lógico o 1 lógico.',
  qubitCaption: 'Un cúbit puede ocupar cualquier punto de la esfera de Bloch gracias a las amplitudes complejas α y β en superposición.',
};

export interface ChoiceQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  ok: string;
  err: string;
}

export const DIAGNOSTIC: ChoiceQuestion[] = [
  {
    id: 'd1',
    prompt: '¿Cuál es la definición algebraica fundamental de la unidad imaginaria $i$ (o $j$ en ingeniería)?',
    options: ['$i^2 = 1$', '$i^2 = -1$, es decir, $i = \\sqrt{-1}$', '$i = 0$ sobre el eje real'],
    correct: 1,
    ok: 'Exacto: por definición $i^2 = -1$ (o $j^2 = -1$ en ingeniería).',
    err: 'En $\\mathbb{R}$ ningún cuadrado es negativo; en $\\mathbb{C}$ se define $i^2 = -1$.',
  },
  {
    id: 'd2',
    prompt: 'La ecuación $x^2 + 1 = 0$ no tiene solución en $\\mathbb{R}$. ¿Cuál es su conjunto solución en $\\mathbb{C}$?',
    options: ['$x = \\pm 1$', '$x = \\pm i$', 'No tiene solución en $\\mathbb{C}$'],
    correct: 1,
    ok: 'Correcto: $x^2 = -1 \\implies x = \\pm\\sqrt{-1} = \\pm i$.',
    err: 'Si reemplazas $x = 1$ obtienes $1^2 + 1 = 2 \\neq 0$. Las raíces son $x = \\pm i$.',
  },
  {
    id: 'd3',
    prompt: 'Dado $z = -4 + 7i$, ¿cuáles son su parte real $\\operatorname{Re}(z)$ y su parte imaginaria $\\operatorname{Im}(z)$?',
    options: [
      '$\\operatorname{Re}(z) = -4,\\ \\operatorname{Im}(z) = 7$',
      '$\\operatorname{Re}(z) = 7,\\ \\operatorname{Im}(z) = -4$',
      '$\\operatorname{Re}(z) = -4,\\ \\operatorname{Im}(z) = 7i$',
    ],
    correct: 0,
    ok: 'Bien: $\\operatorname{Re}(z) = -4$, y la parte imaginaria es el coeficiente real $b = 7$ (sin la $i$).',
    err: 'En la forma $z = a + bi$, $a = -4$ es la parte real y $b = 7$ es la parte imaginaria (un número real, sin la $i$).',
  },
];

export const SCENE2 = {
  body:
    'El campo $\\mathbb{C}$ extiende a $\\mathbb{R}$ con la unidad imaginaria $i$, tal que $i^2 = -1$, y permite resolver ecuaciones como $x^2 + 1 = 0$. Todo complejo $z = a + bi$ es un vector en el plano de Argand (eje horizontal $\\operatorname{Re}$, eje vertical $\\operatorname{Im}$) y tiene forma polar $z = r e^{i\\theta}$, con $r = \\sqrt{a^2 + b^2}$ y $\\theta = \\operatorname{atan2}(b, a)$.',
  quadrantNote:
    '<strong>Cuidado con el cuadrante:</strong> $\\tan^{-1}(b/a)$ solo da ángulos entre $-90^\\circ$ y $90^\\circ$. Para $z = -1 - i$ daría $45^\\circ$, pero el ángulo correcto es $225^\\circ$ (tercer cuadrante). Si $a < 0$, suma $180^\\circ$.',
};

export interface ArgandChallenge {
  prompt: string;
  a: number;
  b: number;
  hint: string;
}

export const ARGAND_CHALLENGES: ArgandChallenge[] = [
  { prompt: 'Ubica el vector $z_1 = 3 + 2i$.', a: 3, b: 2, hint: 'Parte real $a = 3$ hacia la derecha y parte imaginaria $b = 2$ hacia arriba.' },
  { prompt: 'Ubica $z_2 = -4 + 3i$ (segundo cuadrante).', a: -4, b: 3, hint: 'Parte real $a = -4$ hacia la izquierda y $b = 3$ hacia arriba; su módulo es $r = 5$.' },
  {
    prompt: 'Ubica el complejo cuya forma polar es $r = 4,\\ \\theta = -90^\\circ$, es decir, $4e^{-i\\pi/2}$.',
    a: 0, b: -4,
    hint: '$a = 4\\cos(-90^\\circ) = 0$ y $b = 4\\sin(-90^\\circ) = -4$, luego $z = -4i$.',
  },
  {
    prompt: 'Ubica el complejo $2\\sqrt{2}\\, e^{i\\,225^\\circ}$ (tercer cuadrante).',
    a: -2, b: -2,
    hint: '$a = 2\\sqrt2\\cos 225^\\circ = -2$ y $b = 2\\sqrt2\\sin 225^\\circ = -2$.',
  },
];

export interface MatchPair {
  id: number;
  re: number;
  im: number;
  left: string;
  right: string;
}

/** Pares cartesiana ↔ polar. Los valores re/im permiten verificar el contenido en las pruebas. */
export const MATCH_PAIRS: MatchPair[] = [
  { id: 0, re: 1, im: 1, left: '$1 + i$', right: '$\\sqrt{2}\\, e^{i\\pi/4}$ ($r = \\sqrt2,\\ \\theta = 45^\\circ$)' },
  { id: 1, re: 0, im: 3, left: '$3i$', right: '$3\\, e^{i\\pi/2}$ ($r = 3,\\ \\theta = 90^\\circ$)' },
  { id: 2, re: -2, im: 0, left: '$-2$', right: '$2\\, e^{i\\pi}$ ($r = 2,\\ \\theta = 180^\\circ$)' },
  { id: 3, re: 3, im: -4, left: '$3 - 4i$', right: '$5\\, e^{-i\\,53.13^\\circ}$ ($r = 5,\\ \\theta \\approx -53.13^\\circ$)' },
];

/** Ángulo esperado (grados) de cada par, para las pruebas de contenido. */
export const MATCH_EXPECTED: Record<number, { r: number; deg: number }> = {
  0: { r: Math.SQRT2, deg: 45 },
  1: { r: 3, deg: 90 },
  2: { r: 2, deg: 180 },
  3: { r: 5, deg: -53.13 },
};
