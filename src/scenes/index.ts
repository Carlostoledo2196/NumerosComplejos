/** Registro de módulos y escenas (tiempos según docs/PLAN.md §5). */
import type { ModuleDef } from './types';
import { scene01 } from './scene01';
import { scene02 } from './scene02';
import { scene03 } from './scene03';
import { scene04 } from './scene04';
import { scene05 } from './scene05';
import { scene06 } from './scene06';
import { scene07 } from './scene07';
import { scene08 } from './scene08';
import { scene09 } from './scene09';
import { scene10 } from './scene10';

export const MODULES: ModuleDef[] = [
  {
    id: 'm1', number: 1, minutes: 10,
    title: 'Introducción y evocación del campo complejo ℂ',
    raps: ['RAP 1 · Define ℂ y sus representaciones'],
    intro: 'Define el campo de los números complejos, su unidad imaginaria $i$ ($j$ en ingeniería eléctrica) y el paso entre la forma cartesiana $z = a + bi$ y la forma polar $z = re^{i\\theta}$.',
    scenes: [scene01, scene02],
  },
  {
    id: 'm2', number: 2, minutes: 15,
    title: 'Algoritmos operativos algebraicos en ℂ',
    raps: ['RAP 2 · Aplica algoritmos algebraicos en ℂ'],
    intro: 'Recupera sin calculadora los algoritmos de suma, resta y multiplicación, la ciclicidad de $i^n$ y la división mediante el conjugado del denominador.',
    scenes: [scene03, scene04, scene05],
  },
  {
    id: 'm3', number: 3, minutes: 10,
    title: 'Operaciones con matrices reales y complejas',
    raps: ['RAP 3 · Opera matrices en ℂ', 'RAP 4 · Calcula determinantes en ℂ'],
    intro: 'Refuerza el álgebra matricial con elementos reales y luego generaliza suma, producto por escalar, producto, potencia, determinante e inversa al campo $\\mathbb{C}$.',
    scenes: [scene06, scene07],
  },
  {
    id: 'm4', number: 4, minutes: 10,
    title: 'Aplicación contextualizada en computación cuántica',
    raps: ['RAP 5 · Resuelve aplicaciones cuánticas'],
    intro: 'Conecta los números complejos y las matrices unitarias con la geometría de un cúbit en la esfera de Bloch y con la acción de las compuertas de Pauli ($X, Y, Z$) y Hadamard ($H$).',
    scenes: [scene08, scene09],
  },
  {
    id: 'm5', number: 5, minutes: 15,
    title: 'Evaluación sumativa y cierre',
    raps: ['RAP 1 a RAP 5'],
    intro: 'Transfiere lo evocado a un reto de programación conceptual de compuertas, resuelve el cuestionario integrador, revisa tu informe por competencias y evalúa la OVA.',
    scenes: [scene10],
  },
];
