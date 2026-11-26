/**
 * Tablero de resultados del docente: filtros, indicadores, distribución por nivel,
 * desempeño por RAP, módulos completados, tabla de estudiantes y ficha individual.
 * Se actualiza en vivo con Firestore.
 */
import { h, button, input, field, select } from '../ui/dom';
import type { StudentRow } from '../platform/cloud';
import { CRITERIA } from '../core/assessment';
import {
  type Row, type SortKey, LEVELS, MODULE_LABELS, filterRows, groupsOf, kpis, levelDistribution,
  rapAverages, moduleCompletion, sortRows, toCSV,
} from './stats';

type Watch = (cb: (rows: StudentRow[]) => void, onError: (e: Error) => void) => () => void;

const toDate = (t: unknown): Date | null =>
  t && typeof t === 'object' && 'toDate' in t ? (t as { toDate(): Date }).toDate() : null;

export const toRow = (s: StudentRow): Row => ({
  uid: s.uid,
  nombre: s.perfil?.nombre ?? '(sin nombre)',
  codigo: s.perfil?.codigo ?? '',
  grupo: s.perfil?.grupo ?? '',
  email: s.perfil?.email ?? '',
  creado: toDate(s.creado),
  ultimoAcceso: toDate(s.ultimoAcceso),
  actualizado: toDate(s.actualizado),
  resumen: s.resumen ?? null,
});

const fmtGrade = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toFixed(1));
const fmtDate = (d: Date | null) =>
  d ? d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/* ------------------------------ Piezas visuales ------------------------------ */

function statTile(value: string, label: string, sub?: string): HTMLElement {
  return h('div', { class: 'stat' }, h('span', { class: 'stat__value' }, value), h('span', { class: 'stat__label' }, label), sub ? h('span', { class: 'stat__sub' }, sub) : null);
}

/** Lista de medidores: nombre, barra (un solo tono) y cifra; legible sin depender del color. */
function meters(rows: [string, number | null, string?][]): HTMLElement {
  return h('ul', { class: 'meters' }, ...rows.map(([name, f, note]) => {
    const p = f === null ? 0 : Math.round(f * 100);
    return h('li', { class: 'meter', title: note ?? `${name}: ${f === null ? 'sin datos' : p + ' %'}` },
      h('span', { class: 'meter__name' }, name),
      h('span', { class: 'meter__track', role: 'img', 'aria-label': `${name}: ${f === null ? 'sin datos' : p + ' %'}` }, h('span', { class: 'meter__fill', style: `width: ${p}%` })),
      h('span', { class: 'meter__value' }, f === null ? '—' : `${p} %`),
    );
  }));
}

/** Barras horizontales en el orden natural de los niveles, con el conteo impreso. */
function levelBars(dist: Record<string, number>): HTMLElement {
  const max = Math.max(1, ...Object.values(dist));
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  return h('ul', { class: 'meters' }, ...LEVELS.map((lv) => {
    const n = dist[lv] ?? 0;
    const share = total ? Math.round((n / total) * 100) : 0;
    return h('li', { class: 'meter', title: `${lv}: ${n} estudiante(s), ${share} %` },
      h('span', { class: 'meter__name' }, lv),
      h('span', { class: 'meter__track', role: 'img', 'aria-label': `${lv}: ${n} estudiantes` }, h('span', { class: 'meter__fill', style: `width: ${(n / max) * 100}%` })),
      h('span', { class: 'meter__value' }, String(n)),
    );
  }));
}

function detail(r: Row): HTMLElement {
  const s = r.resumen;
  const labNames: [string, string][] = [['e3-algebra', 'Álgebra (E3)'], ['e4-powers', 'Potencias de i (E4)'], ['e5-division', 'División (E5)'], ['e6-real-matrix', 'Matrices en ℝ (E6)'], ['e7-complex-matrix', 'Matrices en ℂ (E7)']];
  return h('div', { class: 'dash-detail' },
    h('p', { class: 'muted' }, `${r.codigo} · ${r.grupo} · ${r.email}`),
    h('p', {}, `Registro: ${fmtDate(r.creado)} · Último acceso: ${fmtDate(r.ultimoAcceso)} · Última actividad guardada: ${fmtDate(r.actualizado)}`),
    !s ? h('p', { class: 'muted' }, 'Todavía no tiene actividad guardada.') : h('div', { class: 'cols' },
      h('div', { class: 'panel' },
        h('p', { class: 'panel__title' }, 'Notas'),
        h('p', {}, h('span', { class: 'grade' }, fmtGrade(s.notaFinal)), ` / 5.0 ${s.nivel ? '· ' + s.nivel : '· reto sin calificar'}`),
        h('div', { class: 'table-wrap' }, h('table', {},
          h('tbody', {},
            h('tr', {}, h('th', { scope: 'row' }, 'Formativa (40 %)'), h('td', {}, fmtGrade(s.formativa))),
            h('tr', {}, h('th', { scope: 'row' }, 'Sumativa (60 %)'), h('td', {}, fmtGrade(s.sumativa))),
            ...CRITERIA.map((c) => h('tr', {}, h('th', { scope: 'row' }, `${c.id} · ${c.name}`), h('td', {}, fmtGrade(s.criterios?.[c.id])))),
          ))),
        h('p', {}, `Módulos completados: ${s.modulosCompletados} / 5 · Circuitos resueltos: ${s.circuitos} · Insignia: ${s.insignia ? 'sí' : 'no'}`),
        h('p', {}, `Confianza: ${s.confianzaInicial ?? '—'} → ${s.confianzaFinal ?? '—'} / 5`),
      ),
      h('div', { class: 'panel' },
        h('p', { class: 'panel__title' }, 'Laboratorios formativos (mejor ronda)'),
        meters(labNames.map(([id, name]) => [name, s.labs[id] ?? 0])),
        h('p', { class: 'panel__title' }, 'Reto integrador por RAP'),
        meters((['1', '2', '3', '4', '5'] as const).map((k) => [`RAP ${k}`, s.raps ? s.raps[k] : null])),
      ),
    ),
    s ? h('div', { class: 'panel panel--outline' },
      h('p', { class: 'panel__title' }, 'Autoevaluación DUA'),
      h('p', {}, `Claridad: ${s.encuesta.clarity || '—'}`),
      h('p', {}, `Preparación sin calculadora: ${s.encuesta.transfer || '—'}`),
      h('p', {}, 'Comentario: ', h('em', {}, s.encuesta.comment || '—')),
    ) : null,
  );
}

/* ------------------------------ Tablero ------------------------------ */

export function mountDashboard(container: HTMLElement, watch: Watch): () => void {
  let all: Row[] = [];
  let grupo = '';
  let q = '';
  let sortKey: SortKey = 'nombre';
  let sortDir: 'asc' | 'desc' = 'asc';

  const status = h('p', { class: 'muted', 'aria-live': 'polite' }, 'Conectando…');
  const grupoSel = select([['', 'Todos los grupos']], (v) => { grupo = v; render(); });
  const search = input({ type: 'search', placeholder: 'Nombre, código o correo' });
  search.addEventListener('input', () => { q = search.value; render(); });
  const exportBtn = button('Exportar CSV (Excel)', () => {
    const rows = sortRows(filterRows(all, { grupo, q }), sortKey, sortDir);
    const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `resultados-ova${grupo ? '-' + grupo.replace(/\W+/g, '_') : ''}.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'btn btn--primary');

  const tiles = h('div', { class: 'stats' });
  const levels = h('div', {});
  const raps = h('div', {});
  const modules = h('div', {});
  const tbody = h('tbody', {});
  const count = h('span', { class: 'chip' });

  const dialog = h('dialog', { class: 'dash-dialog', 'aria-labelledby': 'dlg-title' });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  const openDetail = (r: Row) => {
    dialog.replaceChildren(
      h('div', { class: 'dash-dialog__head' }, h('h2', { id: 'dlg-title' }, r.nombre), button('Cerrar', () => dialog.close(), 'btn btn--small')),
      detail(r),
    );
    dialog.showModal();
  };

  const columns: [SortKey | null, string][] = [
    ['nombre', 'Estudiante'], ['codigo', 'Código'], ['grupo', 'Grupo'], ['modulos', 'Módulos'],
    ['formativa', 'Formativa'], ['sumativa', 'Sumativa'], ['notaFinal', 'Final'], [null, 'Nivel'], ['ultimoAcceso', 'Último acceso'], [null, ''],
  ];
  const headRow = h('tr', {});
  const paintHead = () => {
    headRow.replaceChildren(...columns.map(([k, label]) => {
      if (!k) return h('th', { scope: 'col' }, label);
      const active = k === sortKey;
      const b = button(`${label}${active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}`, () => {
        if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortKey = k; sortDir = k === 'nombre' || k === 'codigo' || k === 'grupo' ? 'asc' : 'desc'; }
        render();
      }, 'th-sort');
      return h('th', { scope: 'col', 'aria-sort': active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none' }, b);
    }));
  };

  const render = () => {
    const groups = groupsOf(all);
    const current = grupoSel.value;
    grupoSel.replaceChildren(h('option', { value: '' }, 'Todos los grupos'), ...groups.map((g) => h('option', { value: g }, g)));
    grupoSel.value = groups.includes(current) ? current : '';
    grupo = grupoSel.value;

    const rows = filterRows(all, { grupo, q });
    const k = kpis(rows);
    tiles.replaceChildren(
      statTile(String(k.registrados), 'estudiantes registrados'),
      statTile(String(k.iniciaron), 'iniciaron la OVA', k.registrados ? `${Math.round((k.iniciaron / k.registrados) * 100)} % de los registrados` : undefined),
      statTile(String(k.completaron), 'calificaron el reto final', k.registrados ? `${Math.round((k.completaron / k.registrados) * 100)} % de los registrados` : undefined),
      statTile(fmtGrade(k.promedioFinal), 'nota final promedio', 'entre quienes calificaron'),
      statTile(String(k.insignias), 'insignias obtenidas'),
    );
    levels.replaceChildren(k.completaron ? levelBars(levelDistribution(rows)) : h('p', { class: 'muted' }, 'Aún nadie ha calificado el reto final.'));
    const ra = rapAverages(rows);
    raps.replaceChildren(k.completaron ? meters((['1', '2', '3', '4', '5'] as const).map((n) => [`RAP ${n}`, ra[n]])) : h('p', { class: 'muted' }, 'Sin datos todavía.'));
    const mc = moduleCompletion(rows);
    modules.replaceChildren(rows.length ? meters(Object.entries(MODULE_LABELS).map(([id, name]) => [name, mc[id] ?? 0])) : h('p', { class: 'muted' }, 'Sin estudiantes.'));

    paintHead();
    const sorted = sortRows(rows, sortKey, sortDir);
    count.textContent = `${sorted.length} estudiante(s)`;
    tbody.replaceChildren(...(sorted.length ? sorted.map((r) => {
      const s = r.resumen;
      return h('tr', {},
        h('th', { scope: 'row' }, r.nombre),
        h('td', {}, r.codigo),
        h('td', {}, r.grupo),
        h('td', { class: 'num' }, `${s?.modulosCompletados ?? 0} / 5`),
        h('td', { class: 'num' }, fmtGrade(s?.formativa)),
        h('td', { class: 'num' }, fmtGrade(s?.sumativa)),
        h('td', { class: 'num' }, h('strong', {}, fmtGrade(s?.notaFinal))),
        h('td', {}, s?.nivel ?? '—'),
        h('td', {}, fmtDate(r.ultimoAcceso)),
        h('td', {}, button('Ver detalle', () => openDetail(r), 'btn btn--small', { 'aria-label': `Ver detalle de ${r.nombre}` })),
      );
    }) : [h('tr', {}, h('td', { colspan: columns.length, class: 'muted' }, all.length ? 'Ningún estudiante coincide con el filtro.' : 'Todavía no hay estudiantes registrados.'))]));
  };

  container.replaceChildren(
    h('div', { class: 'dash-head' },
      h('h1', {}, 'Resultados de los estudiantes'),
      status,
    ),
    h('div', { class: 'dash-filters', role: 'search' }, field('Grupo', grupoSel), field('Buscar', search), exportBtn),
    tiles,
    h('div', { class: 'dash-grid' },
      h('section', { class: 'panel', 'aria-labelledby': 'h-lv' }, h('h2', { id: 'h-lv', class: 'panel__title' }, 'Distribución por nivel (nota final)'), levels),
      h('section', { class: 'panel', 'aria-labelledby': 'h-rap' }, h('h2', { id: 'h-rap', class: 'panel__title' }, 'Logro promedio por RAP (reto integrador)'), raps),
      h('section', { class: 'panel', 'aria-labelledby': 'h-mod' }, h('h2', { id: 'h-mod', class: 'panel__title' }, 'Estudiantes que completaron cada módulo'), modules),
    ),
    h('section', { class: 'panel', 'aria-labelledby': 'h-reg' },
      h('div', { class: 'panel__title' }, h('h2', { id: 'h-reg', style: 'font-size: 1rem; margin: 0' }, 'Registro de estudiantes'), count),
      h('div', { class: 'table-wrap' }, h('table', { class: 'dash-table' }, h('thead', {}, headRow), tbody)),
    ),
    dialog,
  );

  render();
  return watch(
    (docs) => {
      all = docs.map(toRow);
      status.textContent = `Actualizado en vivo · ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
      render();
    },
    (e) => {
      status.textContent = `No fue posible leer los resultados (${e.message}). Verifica que tu correo esté autorizado y recarga la página.`;
    },
  );
}
