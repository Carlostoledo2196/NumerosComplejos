/**
 * Funciones puras del reto final: selección de reactivos, ítems sumativos e informe exportable.
 */
import { createRng, pick, shuffle } from '../core/random';
import { buildReport, CRITERIA, type FinalReport, type Rap, type SummativeItem } from '../core/assessment';
import { CIRCUIT_CHALLENGES } from '../core/circuits';
import { FINAL_QUIZ, type QuizItem } from '../content/final-quiz';
import type { OvaState } from './store';

export interface QuizSlot {
  item: QuizItem;
  /** orden de presentación: índices de las opciones originales */
  order: number[];
}

/** Un reactivo por RAP (1 → 5) y opciones barajadas, de forma determinista según la semilla. */
export function selectQuiz(seed: number): QuizSlot[] {
  const rng = createRng(seed);
  return ([1, 2, 3, 4, 5] as Rap[]).map((rap) => {
    const item = pick(rng, FINAL_QUIZ.filter((q) => q.rap === rap));
    return { item, order: shuffle(rng, item.options.map((_, i) => i)) };
  });
}

/** El reto de circuitos aporta al criterio C3: se pide resolver al menos este número de retos. */
export const CIRCUITS_REQUIRED = 3;

export function summativeItems(s: Readonly<OvaState>): SummativeItem[] {
  if (!s.finalGraded) return [];
  const items: SummativeItem[] = selectQuiz(s.finalSeed).map(({ item }) => ({
    rap: item.rap,
    score: s.finalAnswers[item.id] === item.correct ? 1 : 0,
  }));
  const solved = s.circuitsSolved.filter((id) => CIRCUIT_CHALLENGES.some((c) => c.id === id)).length;
  items.push({ rap: 'circuit', score: Math.min(1, solved / CIRCUITS_REQUIRED) });
  return items;
}

export const reportFor = (s: Readonly<OvaState>): FinalReport =>
  buildReport(s.labs, summativeItems(s), s.confidenceBefore, s.confidenceAfter);

const pct = (f: number) => `${Math.round(f * 100)} %`;

/** Informe de texto plano para descargar o entregar en la plataforma institucional. */
export function reportText(s: Readonly<OvaState>, now = new Date()): string {
  const r = reportFor(s);
  const lines = [
    'OVA · Evocación de Números Complejos y Computación Cuántica',
    `Informe generado: ${now.toLocaleString('es-CO')}`,
    '',
    `NOTA FINAL: ${r.final.grade.toFixed(1)} / 5.0 (${r.final.level})`,
    `  Formativa (40 %): ${r.formative.grade.toFixed(1)}  ·  logro ${pct(r.formative.fraction)}`,
    `  Sumativa  (60 %): ${r.summative.grade.toFixed(1)}  ·  logro ${pct(r.summative.fraction)}`,
    '',
    'Rúbrica analítica (sumativa):',
    ...CRITERIA.map((c) => `  ${c.id} ${c.name} (${c.weight * 100} %): ${r.summative.criteria[c.id].grade.toFixed(1)} · ${r.summative.criteria[c.id].level}`),
    '',
    'Desempeño por RAP (reto integrador):',
    ...([1, 2, 3, 4, 5] as Rap[]).map((k) => `  RAP ${k}: ${pct(r.raps[k])}`),
    `  Retos de circuitos resueltos: ${s.circuitsSolved.length} (se requieren ${CIRCUITS_REQUIRED})`,
    '',
    'Laboratorios formativos (mejor ronda):',
    ...Object.entries(s.labs).map(([id, l]) => `  ${id}: ${pct(l?.best ?? 0)} · ${l?.attempts ?? 0} ejercicios intentados`),
    '',
    `Confianza inicial: ${s.confidenceBefore ?? '—'} / 5 · Confianza final: ${s.confidenceAfter ?? '—'} / 5`,
    `Insignia digital de evocación matemática cuántica: ${r.badge ? 'OBTENIDA' : 'pendiente'}`,
    '',
    'Autoevaluación DUA:',
    `  Claridad: ${s.survey.clarity || '—'}`,
    `  Preparación sin calculadora: ${s.survey.transfer || '—'}`,
    `  Comentario: ${s.survey.comment || '—'}`,
  ];
  return lines.join('\n');
}
