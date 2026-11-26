/**
 * Estado de la OVA y su persistencia.
 * Fase 3: localStorage (con try/catch: modo privado o almacenamiento bloqueado no rompen la OVA).
 * Fase 4: se añade un adaptador SCORM que guarda el mismo objeto en cmi.suspend_data.
 */
import type { LabId, LabRecords } from '../core/assessment';
import { recordRound } from '../core/assessment';

export type ModuleId = 'm1' | 'm2' | 'm3' | 'm4' | 'm5';

export interface OvaState {
  version: 1;
  prefs: { largeText: boolean; sound: boolean; theme: 'auto' | 'light' | 'dark' };
  confidenceBefore: number | null;
  confidenceAfter: number | null;
  /** índice de la opción elegida en cada pregunta diagnóstica (sin nota) */
  diagnostic: Record<string, number>;
  argandSolved: number[];
  matchedPairs: number[];
  divOrderDone: boolean;
  blochExplored: boolean;
  gatesSolved: string[];
  /** retos del constructor de circuitos resueltos (escena 10) */
  circuitsSolved: string[];
  labs: LabRecords;
  /** semilla del intento del reto final: decide qué reactivo sale por RAP y el orden de las opciones */
  finalSeed: number;
  /** id de pregunta → índice de la opción original elegida */
  finalAnswers: Record<string, number>;
  finalGraded: boolean;
  survey: { clarity: string; transfer: string; comment: string };
}

export const defaultState = (): OvaState => ({
  version: 1,
  prefs: { largeText: false, sound: true, theme: 'auto' },
  confidenceBefore: null,
  confidenceAfter: null,
  diagnostic: {},
  argandSolved: [],
  matchedPairs: [],
  divOrderDone: false,
  blochExplored: false,
  gatesSolved: [],
  circuitsSolved: [],
  labs: {},
  finalSeed: Math.floor(Math.random() * 2 ** 31),
  finalAnswers: {},
  finalGraded: false,
  survey: { clarity: '', transfer: '', comment: '' },
});

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const KEY = 'ova-complejos-cuanticos:v1';

/** Mezcla un estado guardado con los valores por defecto (tolera versiones anteriores o datos corruptos). */
export function hydrate(raw: unknown): OvaState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<OvaState>;
  return {
    ...base,
    ...r,
    version: 1,
    prefs: { ...base.prefs, ...(r.prefs ?? {}) },
    survey: { ...base.survey, ...(r.survey ?? {}) },
    labs: { ...(r.labs ?? {}) },
    diagnostic: { ...(r.diagnostic ?? {}) },
    finalAnswers: { ...(r.finalAnswers ?? {}) },
    argandSolved: Array.isArray(r.argandSolved) ? r.argandSolved : [],
    gatesSolved: Array.isArray(r.gatesSolved) ? r.gatesSolved : [],
    matchedPairs: Array.isArray(r.matchedPairs) ? r.matchedPairs : [],
    circuitsSolved: Array.isArray(r.circuitsSolved) ? r.circuitsSolved : [],
  };
}

type Listener = (s: OvaState) => void;

export class Store {
  private state: OvaState;
  private listeners = new Set<Listener>();

  constructor(private storage: StorageLike | null) {
    let raw: unknown = null;
    try {
      const txt = storage?.getItem(KEY);
      raw = txt ? JSON.parse(txt) : null;
    } catch {
      raw = null;
    }
    this.state = hydrate(raw);
  }

  get(): Readonly<OvaState> {
    return this.state;
  }

  /** Aplica un cambio, guarda y notifica. */
  update(fn: (draft: OvaState) => void): void {
    const draft = structuredClone(this.state);
    fn(draft);
    this.state = draft;
    try {
      this.storage?.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* almacenamiento lleno o bloqueado: el progreso vive solo en esta pestaña */
    }
    for (const l of this.listeners) l(this.state);
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Registra una ronda de laboratorio formativo (conserva el mejor desempeño). */
  recordLab(id: LabId, correct: number, total: number): void {
    this.update((s) => {
      s.labs[id] = recordRound(s.labs[id], correct, total);
    });
  }

  reset(): void {
    const prefs = this.state.prefs;
    this.update((s) => {
      Object.assign(s, defaultState(), { prefs });
    });
  }
}

function safeLocalStorage(): StorageLike | null {
  try {
    const ls = window.localStorage;
    const probe = '__ova_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export const store = new Store(typeof window === 'undefined' ? null : safeLocalStorage());

/** Criterios de módulo completado (para la ruta de aprendizaje). */
export function moduleDone(s: Readonly<OvaState>, m: ModuleId): boolean {
  const lab = (id: LabId) => (s.labs[id]?.attempts ?? 0) > 0;
  switch (m) {
    case 'm1':
      return s.confidenceBefore !== null && Object.keys(s.diagnostic).length >= 3 && s.argandSolved.length >= 1 && s.matchedPairs.length >= 4;
    case 'm2':
      return lab('e3-algebra') && lab('e4-powers') && lab('e5-division');
    case 'm3':
      return lab('e6-real-matrix') && lab('e7-complex-matrix');
    case 'm4':
      return s.blochExplored && s.gatesSolved.length >= 2;
    case 'm5':
      return s.finalGraded;
  }
}
