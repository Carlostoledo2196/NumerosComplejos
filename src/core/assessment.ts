/**
 * Modelo de evaluación (docs/PLAN.md §4):
 *   diagnóstica 0 % · formativa 40 % (laboratorios RAP 2–4) · sumativa 60 % (rúbrica C1/C2/C3).
 * Escala colombiana 1.0 – 5.0.
 */

export type Rap = 1 | 2 | 3 | 4 | 5;

/** Laboratorios formativos (escenas 3–7). */
export const FORMATIVE_LABS = ['e3-algebra', 'e4-powers', 'e5-division', 'e6-real-matrix', 'e7-complex-matrix'] as const;
export type LabId = (typeof FORMATIVE_LABS)[number];

export interface LabRecord {
  attempts: number;
  correct: number;
  /** mejor proporción de aciertos en una ronda (0–1); el reintento no castiga */
  best: number;
}

export type LabRecords = Partial<Record<LabId, LabRecord>>;

/** Registra una ronda y conserva el mejor desempeño. */
export function recordRound(rec: LabRecord | undefined, correct: number, total: number): LabRecord {
  const ratio = total > 0 ? correct / total : 0;
  return {
    attempts: (rec?.attempts ?? 0) + total,
    correct: (rec?.correct ?? 0) + correct,
    best: Math.max(rec?.best ?? 0, ratio),
  };
}

/** Fracción formativa (0–1): promedio del mejor desempeño de cada laboratorio; uno no realizado cuenta 0. */
export function formativeFraction(labs: LabRecords): number {
  const sum = FORMATIVE_LABS.reduce((s, id) => s + (labs[id]?.best ?? 0), 0);
  return sum / FORMATIVE_LABS.length;
}

export interface SummativeItem {
  rap: Rap | 'circuit';
  /** 0–1 (se admite crédito parcial) */
  score: number;
}

export const CRITERIA = [
  { id: 'C1', name: 'Evocación y operaciones en ℂ', weight: 0.3, sources: [1, 2] },
  { id: 'C2', name: 'Matrices complejas y determinantes', weight: 0.3, sources: [3, 4] },
  { id: 'C3', name: 'Aplicación en computación cuántica', weight: 0.4, sources: [5, 'circuit'] },
] as const;

export type CriterionId = (typeof CRITERIA)[number]['id'];

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function criterionFractions(items: readonly SummativeItem[]): Record<CriterionId, number> {
  const out = {} as Record<CriterionId, number>;
  for (const cr of CRITERIA) {
    const sources = cr.sources as readonly (Rap | 'circuit')[];
    out[cr.id] = mean(items.filter((it) => sources.includes(it.rap)).map((it) => clamp01(it.score)));
  }
  return out;
}

export function summativeFraction(items: readonly SummativeItem[]): number {
  const f = criterionFractions(items);
  return CRITERIA.reduce((s, cr) => s + cr.weight * f[cr.id], 0);
}

/** Desempeño por RAP (para el gráfico radial). */
export function rapFractions(items: readonly SummativeItem[]): Record<Rap, number> {
  const out = {} as Record<Rap, number>;
  for (const r of [1, 2, 3, 4, 5] as Rap[]) out[r] = mean(items.filter((it) => it.rap === r).map((it) => clamp01(it.score)));
  return out;
}

/** Fracción de logro → nota 1.0–5.0 con un decimal. */
export const toGrade = (fraction: number): number => Math.round((1 + 4 * clamp01(fraction)) * 10) / 10;

export type Level = 'Bajo' | 'Básico' | 'Alto' | 'Superior';

export function levelOf(grade: number): Level {
  if (grade >= 4.6) return 'Superior';
  if (grade >= 4.0) return 'Alto';
  if (grade >= 3.0) return 'Básico';
  return 'Bajo';
}

export const BADGE_MIN_GRADE = 3.0;

export interface FinalReport {
  formative: { fraction: number; grade: number };
  summative: { fraction: number; grade: number; level: Level; criteria: Record<CriterionId, { fraction: number; grade: number; level: Level }> };
  final: { fraction: number; grade: number; level: Level };
  raps: Record<Rap, number>;
  badge: boolean;
  /** 0–100 para cmi.core.score.raw */
  scormScore: number;
  confidence: { before: number | null; after: number | null; delta: number | null };
}

export function buildReport(
  labs: LabRecords,
  items: readonly SummativeItem[],
  confidenceBefore: number | null = null,
  confidenceAfter: number | null = null,
): FinalReport {
  const ff = formativeFraction(labs);
  const sf = summativeFraction(items);
  const cf = criterionFractions(items);
  const finalF = 0.4 * ff + 0.6 * sf;
  const sGrade = toGrade(sf);
  const criteria = Object.fromEntries(
    CRITERIA.map((cr) => {
      const g = toGrade(cf[cr.id]);
      return [cr.id, { fraction: cf[cr.id], grade: g, level: levelOf(g) }];
    }),
  ) as FinalReport['summative']['criteria'];
  const fGrade = toGrade(finalF);
  return {
    formative: { fraction: ff, grade: toGrade(ff) },
    summative: { fraction: sf, grade: sGrade, level: levelOf(sGrade), criteria },
    final: { fraction: finalF, grade: fGrade, level: levelOf(fGrade) },
    raps: rapFractions(items),
    badge: sGrade >= BADGE_MIN_GRADE,
    scormScore: Math.round(finalF * 100),
    confidence: {
      before: confidenceBefore,
      after: confidenceAfter,
      delta: confidenceBefore !== null && confidenceAfter !== null ? confidenceAfter - confidenceBefore : null,
    },
  };
}
