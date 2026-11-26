import { describe, it, expect } from 'vitest';
import { kpis, levelDistribution, rapAverages, moduleCompletion, filterRows, sortRows, groupsOf, toCSV, type Row } from '../src/docente/stats';
import { buildSummary, validateProfile, authErrorMessage } from '../src/platform/model';
import { defaultState } from '../src/state/store';
import { selectQuiz } from '../src/state/report';

function gradedState(correct: number) {
  const s = defaultState();
  s.finalSeed = 3;
  selectQuiz(3).forEach(({ item }, k) => { s.finalAnswers[item.id] = k < correct ? item.correct : (item.correct + 1) % 3; });
  s.finalGraded = true;
  s.circuitsSolved = ['flip', 'minus', 'plus-i'];
  s.labs = { 'e3-algebra': { attempts: 4, correct: 4, best: 1 } };
  s.confidenceBefore = 2;
  s.confidenceAfter = 4;
  return s;
}

const row = (over: Partial<Row>): Row => ({
  uid: 'u', nombre: 'Ana Pérez', codigo: '2026001', grupo: 'Grupo 1', email: 'ana@x.co',
  creado: new Date('2026-11-01T10:00:00Z'), ultimoAcceso: new Date('2026-11-02T10:00:00Z'), actualizado: null, resumen: null, ...over,
});

describe('resumen que guarda el estudiante', () => {
  it('sin calificar: nota final nula, formativa calculada', () => {
    const s = defaultState();
    s.labs = { 'e3-algebra': { attempts: 4, correct: 2, best: 0.5 } };
    const r = buildSummary(s);
    expect(r.notaFinal).toBeNull();
    expect(r.nivel).toBeNull();
    expect(r.formativa).toBe(1.4); // 1 + 4 · (0.5 / 5)
    expect(r.labsIniciados).toBeCloseTo(0.2);
    expect(r.labs['e3-algebra']).toBe(0.5);
  });
  it('calificado: nota, nivel, criterios, RAP e insignia', () => {
    const r = buildSummary(gradedState(5));
    expect(r.retoCalificado).toBe(true);
    expect(r.sumativa).toBe(5);
    expect(r.notaFinal).toBe(3.7); // 0.4 · 0.2 + 0.6 · 1 = 0.68 → 1 + 2.72
    expect(r.criterios).toEqual({ C1: 5, C2: 5, C3: 5 });
    expect(r.raps).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
    expect(r.insignia).toBe(true);
    expect(r.confianzaFinal).toBe(4);
  });
  it('es serializable para Firestore (sin undefined)', () => {
    const r = buildSummary(gradedState(2));
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});

describe('validación del registro', () => {
  it('normaliza y acepta un perfil válido', () => {
    const v = validateProfile({ nombre: '  Ana   María Pérez ', codigo: ' 2026 001 ', grupo: ' Grupo 1 ', email: 'Ana@Unilibre.EDU.co ' });
    expect(v).toEqual({ ok: true, value: { nombre: 'Ana María Pérez', codigo: '2026001', grupo: 'Grupo 1', email: 'ana@unilibre.edu.co' } });
  });
  it('rechaza nombre sin apellido, código inválido, grupo vacío y correo mal formado', () => {
    const v = validateProfile({ nombre: 'Ana', codigo: 'a!', grupo: '', email: 'ana@' });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(Object.keys(v.errors).sort()).toEqual(['codigo', 'email', 'grupo', 'nombre']);
  });
  it('mensajes de error en español', () => {
    expect(authErrorMessage('auth/email-already-in-use')).toMatch(/Ya existe una cuenta/);
    expect(authErrorMessage('auth/desconocido')).toMatch(/Intenta de nuevo/);
  });
});

describe('estadísticas del panel docente', () => {
  const rows: Row[] = [
    row({ uid: 'a', nombre: 'Ana Pérez', grupo: 'Grupo 1', resumen: buildSummary(gradedState(5)) }),
    row({ uid: 'b', nombre: 'Bruno Díaz', codigo: '2026002', grupo: 'Grupo 2', resumen: buildSummary(gradedState(2)) }),
    row({ uid: 'c', nombre: 'Camila Ñúñez', codigo: '2026003', grupo: 'Grupo 1', resumen: buildSummary(defaultState()), ultimoAcceso: null }),
    row({ uid: 'd', nombre: 'Diego Ruiz', codigo: '2026004', grupo: 'Grupo 2', resumen: null }),
  ];

  it('indicadores', () => {
    const k = kpis(rows);
    expect(k.registrados).toBe(4);
    expect(k.iniciaron).toBe(2); // c no tiene actividad; d no tiene resumen
    expect(k.completaron).toBe(2);
    expect(k.insignias).toBe(2);
    expect(k.promedioFinal).toBeCloseTo((rows[0]!.resumen!.notaFinal! + rows[1]!.resumen!.notaFinal!) / 2);
  });
  it('distribución por nivel y promedios por RAP solo con quienes calificaron', () => {
    const d = levelDistribution(rows);
    expect(Object.values(d).reduce((a, b) => a + b, 0)).toBe(2);
    const raps = rapAverages(rows);
    expect(raps['1']).toBeCloseTo(1);
    expect(raps['5']).toBeCloseTo(0.5);
    expect(rapAverages([])['1']).toBeNull();
  });
  it('módulos completados', () => {
    const m = moduleCompletion(rows);
    expect(m.m5).toBeCloseTo(0.5);
    expect(m.m1).toBe(0);
  });
  it('filtros por grupo y búsqueda sin tildes', () => {
    expect(filterRows(rows, { grupo: 'Grupo 1' }).map((r) => r.uid)).toEqual(['a', 'c']);
    expect(filterRows(rows, { q: 'nunez' }).map((r) => r.uid)).toEqual(['c']);
    expect(filterRows(rows, { q: '2026002' }).map((r) => r.uid)).toEqual(['b']);
    expect(groupsOf(rows)).toEqual(['Grupo 1', 'Grupo 2']);
  });
  it('ordenamiento (los sin dato van al final en descendente)', () => {
    expect(sortRows(rows, 'notaFinal', 'desc').map((r) => r.uid).slice(0, 2)).toEqual(['a', 'b']);
    expect(sortRows(rows, 'nombre', 'asc').map((r) => r.uid)).toEqual(['a', 'b', 'c', 'd']);
    expect(sortRows(rows, 'ultimoAcceso', 'asc')[0]!.uid).toBe('c');
  });
  it('CSV para Excel en español: BOM, «;», coma decimal y sin inyección de fórmulas', () => {
    const csv = toCSV([...rows, row({ uid: 'e', nombre: '=HYPERLINK("x")', resumen: null })]);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines).toHaveLength(6);
    expect(lines[0]!.split(';')[0]).toBe('Nombre');
    expect(lines[1]).toMatch(/;5,0;3,7;Básico;Sí;/);
    expect(lines[5]!.startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
  });
});
