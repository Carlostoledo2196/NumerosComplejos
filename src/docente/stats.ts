/**
 * Cálculos del panel docente (puros, sin Firebase ni DOM).
 */
import type { Summary } from '../platform/model';
import type { Level } from '../core/assessment';

export interface Row {
  uid: string;
  nombre: string;
  codigo: string;
  grupo: string;
  email: string;
  creado: Date | null;
  ultimoAcceso: Date | null;
  actualizado: Date | null;
  resumen: Summary | null;
}

export const LEVELS: Level[] = ['Bajo', 'Básico', 'Alto', 'Superior'];
export const MODULE_LABELS: Record<string, string> = { m1: 'M1 · Campo ℂ', m2: 'M2 · Álgebra en ℂ', m3: 'M3 · Matrices', m4: 'M4 · Cúbits', m5: 'M5 · Cierre' };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filterRows(rows: Row[], f: { grupo?: string; q?: string }): Row[] {
  const q = norm(f.q?.trim() ?? '');
  return rows.filter((r) =>
    (!f.grupo || r.grupo === f.grupo) &&
    (!q || norm(r.nombre).includes(q) || r.codigo.toLowerCase().includes(q) || r.email.includes(q)));
}

export const groupsOf = (rows: Row[]): string[] => [...new Set(rows.map((r) => r.grupo))].sort((a, b) => a.localeCompare(b, 'es'));

const started = (r: Row) => !!r.resumen && (r.resumen.modulosCompletados > 0 || r.resumen.labsIniciados > 0 || r.resumen.confianzaInicial !== null);
const graded = (r: Row) => !!r.resumen?.retoCalificado && r.resumen.notaFinal !== null;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface Kpis {
  registrados: number;
  iniciaron: number;
  completaron: number;
  promedioFinal: number | null;
  promedioFormativa: number | null;
  insignias: number;
}

export function kpis(rows: Row[]): Kpis {
  const done = rows.filter(graded);
  return {
    registrados: rows.length,
    iniciaron: rows.filter(started).length,
    completaron: done.length,
    promedioFinal: mean(done.map((r) => r.resumen!.notaFinal!)),
    promedioFormativa: mean(rows.filter(started).map((r) => r.resumen!.formativa)),
    insignias: rows.filter((r) => r.resumen?.insignia).length,
  };
}

export function levelDistribution(rows: Row[]): Record<Level, number> {
  const out = { Bajo: 0, Básico: 0, Alto: 0, Superior: 0 } as Record<Level, number>;
  for (const r of rows) if (graded(r) && r.resumen!.nivel) out[r.resumen!.nivel]++;
  return out;
}

/** Promedio de logro por RAP (0–1) entre quienes calificaron el reto integrador. */
export function rapAverages(rows: Row[]): Record<'1' | '2' | '3' | '4' | '5', number | null> {
  const done = rows.filter((r) => graded(r) && r.resumen!.raps);
  const out = {} as Record<'1' | '2' | '3' | '4' | '5', number | null>;
  for (const k of ['1', '2', '3', '4', '5'] as const) out[k] = mean(done.map((r) => r.resumen!.raps![k]));
  return out;
}

/** Proporción de estudiantes (0–1) que completó cada módulo. */
export function moduleCompletion(rows: Row[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of Object.keys(MODULE_LABELS)) out[m] = rows.length ? rows.filter((r) => r.resumen?.modulos.includes(m as never)).length / rows.length : 0;
  return out;
}

export type SortKey = 'nombre' | 'codigo' | 'grupo' | 'modulos' | 'formativa' | 'sumativa' | 'notaFinal' | 'ultimoAcceso';

const sortValue = (r: Row, k: SortKey): string | number => {
  switch (k) {
    case 'nombre': return norm(r.nombre);
    case 'codigo': return r.codigo;
    case 'grupo': return norm(r.grupo);
    case 'modulos': return r.resumen?.modulosCompletados ?? -1;
    case 'formativa': return r.resumen?.formativa ?? -1;
    case 'sumativa': return r.resumen?.sumativa ?? -1;
    case 'notaFinal': return r.resumen?.notaFinal ?? -1;
    case 'ultimoAcceso': return r.ultimoAcceso?.getTime() ?? -1;
  }
};

export function sortRows(rows: Row[], key: SortKey, dir: 'asc' | 'desc'): Row[] {
  const s = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key), vb = sortValue(b, key);
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
    return c !== 0 ? s * c : norm(a.nombre).localeCompare(norm(b.nombre), 'es');
  });
}

/* ------------------------------ Exportación ------------------------------ */

/** Número con coma decimal (Excel en español) o vacío. */
const num = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? '' : v.toFixed(d).replace('.', ','));
const pct = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(Math.round(v * 100)));
const date = (d: Date | null) => (d ? d.toISOString().replace('T', ' ').slice(0, 16) : '');
const cell = (v: string) => (/[";\n\r]/.test(v) || /^[=+\-@]/.test(v) ? `"${(/^[=+\-@]/.test(v) ? "'" : '') + v.replace(/"/g, '""')}"` : v);

/**
 * CSV con separador «;» y coma decimal, para abrir directo en Excel en español.
 * Las celdas que empiezan por = + - @ se neutralizan (evita inyección de fórmulas).
 */
export function toCSV(rows: Row[]): string {
  const head = [
    'Nombre', 'Código', 'Grupo', 'Correo', 'Registro', 'Último acceso', 'Módulos completados',
    'Nota formativa', 'Nota sumativa', 'Nota final', 'Nivel', 'Insignia',
    'RAP 1 %', 'RAP 2 %', 'RAP 3 %', 'RAP 4 %', 'RAP 5 %', 'Circuitos resueltos',
    'Lab álgebra %', 'Lab potencias %', 'Lab división %', 'Lab matrices ℝ %', 'Lab matrices ℂ %',
    'Confianza inicial', 'Confianza final', 'Claridad (encuesta)', 'Preparación (encuesta)', 'Comentario',
  ];
  const lines = rows.map((r) => {
    const s = r.resumen;
    return [
      r.nombre, r.codigo, r.grupo, r.email, date(r.creado), date(r.ultimoAcceso), s ? String(s.modulosCompletados) : '0',
      num(s?.formativa), num(s?.sumativa), num(s?.notaFinal), s?.nivel ?? '', s?.insignia ? 'Sí' : 'No',
      pct(s?.raps?.['1']), pct(s?.raps?.['2']), pct(s?.raps?.['3']), pct(s?.raps?.['4']), pct(s?.raps?.['5']), s ? String(s.circuitos) : '',
      pct(s?.labs['e3-algebra']), pct(s?.labs['e4-powers']), pct(s?.labs['e5-division']), pct(s?.labs['e6-real-matrix']), pct(s?.labs['e7-complex-matrix']),
      s?.confianzaInicial?.toString() ?? '', s?.confianzaFinal?.toString() ?? '', s?.encuesta.clarity ?? '', s?.encuesta.transfer ?? '', s?.encuesta.comment ?? '',
    ].map(cell).join(';');
  });
  return '﻿' + [head.join(';'), ...lines].join('\r\n');
}
