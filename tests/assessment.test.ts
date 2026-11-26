import { describe, it, expect } from 'vitest';
import { recordRound, formativeFraction, summativeFraction, toGrade, levelOf, buildReport, criterionFractions, type SummativeItem } from '../src/core/assessment';

const perfectItems: SummativeItem[] = ([1, 2, 3, 4, 5, 'circuit'] as const).map((rap) => ({ rap, score: 1 }));

describe('evaluación', () => {
  it('el reintento conserva el mejor desempeño', () => {
    let r = recordRound(undefined, 2, 4);
    r = recordRound(r, 4, 4);
    r = recordRound(r, 1, 4);
    expect(r).toEqual({ attempts: 12, correct: 7, best: 1 });
  });
  it('formativa: laboratorios no realizados cuentan 0', () => {
    expect(formativeFraction({})).toBe(0);
    expect(formativeFraction({ 'e3-algebra': { attempts: 4, correct: 4, best: 1 } })).toBeCloseTo(0.2);
  });
  it('sumativa ponderada 30/30/40 por criterio', () => {
    expect(summativeFraction(perfectItems)).toBeCloseTo(1);
    const onlyQuantum: SummativeItem[] = [{ rap: 5, score: 1 }, { rap: 'circuit', score: 1 }];
    expect(summativeFraction(onlyQuantum)).toBeCloseTo(0.4);
    const f = criterionFractions([{ rap: 1, score: 1 }, { rap: 2, score: 0 }, { rap: 3, score: 0.5 }]);
    expect(f).toEqual({ C1: 0.5, C2: 0.5, C3: 0 });
  });
  it('escala 1.0–5.0 y niveles de la rúbrica', () => {
    expect(toGrade(0)).toBe(1);
    expect(toGrade(1)).toBe(5);
    expect(toGrade(0.5)).toBe(3);
    expect(levelOf(2.9)).toBe('Bajo');
    expect(levelOf(3.0)).toBe('Básico');
    expect(levelOf(4.5)).toBe('Alto');
    expect(levelOf(4.6)).toBe('Superior');
  });
  it('informe final 40/60, insignia, SCORM y confianza', () => {
    const labs = Object.fromEntries(['e3-algebra', 'e4-powers', 'e5-division', 'e6-real-matrix', 'e7-complex-matrix'].map((id) => [id, { attempts: 4, correct: 2, best: 0.5 }]));
    const rep = buildReport(labs, perfectItems, 2, 4);
    expect(rep.formative.fraction).toBeCloseTo(0.5);
    expect(rep.final.fraction).toBeCloseTo(0.4 * 0.5 + 0.6 * 1);
    expect(rep.final.grade).toBe(4.2);
    expect(rep.final.level).toBe('Alto');
    expect(rep.scormScore).toBe(80);
    expect(rep.badge).toBe(true);
    expect(rep.confidence.delta).toBe(2);
    expect(buildReport({}, []).badge).toBe(false);
  });
});
