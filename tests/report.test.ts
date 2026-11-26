import { describe, it, expect } from 'vitest';
import { selectQuiz, summativeItems, reportFor, reportText, CIRCUITS_REQUIRED } from '../src/state/report';
import { defaultState, hydrate, Store, moduleDone, type StorageLike } from '../src/state/store';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('selección del cuestionario', () => {
  it('un reactivo por RAP, en orden, determinista por semilla', () => {
    const a = selectQuiz(123), b = selectQuiz(123);
    expect(a.map((s) => s.item.rap)).toEqual([1, 2, 3, 4, 5]);
    expect(a).toEqual(b);
    for (const s of a) expect([...s.order].sort()).toEqual([0, 1, 2]);
  });
  it('la respuesta correcta no queda siempre en la primera posición', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 50; seed++) for (const s of selectQuiz(seed)) positions.add(s.order.indexOf(s.item.correct));
    expect(positions).toEqual(new Set([0, 1, 2]));
  });
  it('distintas semillas recorren todo el banco', () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 60; seed++) for (const s of selectQuiz(seed)) ids.add(s.item.id);
    expect(ids.size).toBe(10);
  });
});

describe('ítems sumativos e informe', () => {
  const graded = (correctCount: number, circuits: string[]) => {
    const s = defaultState();
    s.finalSeed = 7;
    selectQuiz(7).forEach(({ item }, k) => { s.finalAnswers[item.id] = k < correctCount ? item.correct : (item.correct + 1) % 3; });
    s.finalGraded = true;
    s.circuitsSolved = circuits;
    return s;
  };
  it('sin calificar no hay ítems sumativos', () => {
    expect(summativeItems(defaultState())).toEqual([]);
  });
  it('puntaje por RAP y crédito proporcional de circuitos', () => {
    const items = summativeItems(graded(3, ['flip']));
    expect(items.filter((i) => i.rap !== 'circuit').map((i) => i.score)).toEqual([1, 1, 1, 0, 0]);
    expect(items.find((i) => i.rap === 'circuit')!.score).toBeCloseTo(1 / CIRCUITS_REQUIRED);
  });
  it('ids de circuito desconocidos no suman', () => {
    expect(summativeItems(graded(0, ['inventado', 'otro', 'mas'])).find((i) => i.rap === 'circuit')!.score).toBe(0);
  });
  it('todo correcto → sumativa 5.0 e insignia; la final pondera los laboratorios', () => {
    const r = reportFor(graded(5, ['flip', 'minus', 'plus-i']));
    expect(r.summative.grade).toBe(5);
    expect(r.badge).toBe(true);
    expect(r.final.fraction).toBeCloseTo(0.6); // sin laboratorios: 0.4·0 + 0.6·1
    expect(r.final.grade).toBe(3.4);
  });
  it('el informe de texto incluye nota, rúbrica y encuesta', () => {
    const s = graded(5, ['flip', 'minus', 'plus-i']);
    s.survey.comment = 'Muy útil';
    const txt = reportText(s, new Date(2026, 0, 1));
    expect(txt).toMatch(/NOTA FINAL: 3\.4/);
    expect(txt).toMatch(/C3 Aplicación en computación cuántica/);
    expect(txt).toMatch(/Muy útil/);
    expect(txt).toMatch(/OBTENIDA/);
  });
});

describe('estado persistente', () => {
  it('guarda y recupera', () => {
    const mem = memoryStorage();
    const a = new Store(mem);
    a.update((s) => { s.confidenceBefore = 3; });
    a.recordLab('e3-algebra', 3, 4);
    const b = new Store(mem);
    expect(b.get().confidenceBefore).toBe(3);
    expect(b.get().labs['e3-algebra']).toEqual({ attempts: 4, correct: 3, best: 0.75 });
  });
  it('tolera datos corruptos o de otra versión', () => {
    const mem = memoryStorage();
    mem.data.set('ova-complejos-cuanticos:v1', '{no es json');
    expect(new Store(mem).get().labs).toEqual({});
    expect(hydrate({ prefs: { sound: false }, argandSolved: 'x' }).prefs).toEqual({ largeText: false, sound: false, theme: 'auto' });
    expect(hydrate({ argandSolved: 'x' }).argandSolved).toEqual([]);
  });
  it('funciona sin almacenamiento (modo privado)', () => {
    const st = new Store(null);
    st.update((s) => { s.blochExplored = true; });
    expect(st.get().blochExplored).toBe(true);
  });
  it('si guardar falla, el estado sigue en memoria', () => {
    const st = new Store({ getItem: () => null, setItem: () => { throw new Error('cuota'); }, removeItem: () => {} });
    st.update((s) => { s.confidenceAfter = 5; });
    expect(st.get().confidenceAfter).toBe(5);
  });
  it('reiniciar conserva las preferencias de accesibilidad', () => {
    const st = new Store(memoryStorage());
    st.update((s) => { s.prefs.largeText = true; s.confidenceBefore = 2; });
    st.reset();
    expect(st.get().prefs.largeText).toBe(true);
    expect(st.get().confidenceBefore).toBeNull();
  });
  it('criterios de módulo completado', () => {
    const s = defaultState();
    expect(moduleDone(s, 'm1')).toBe(false);
    Object.assign(s, { confidenceBefore: 3, diagnostic: { d1: 1, d2: 1, d3: 0 }, argandSolved: [0], matchedPairs: [0, 1, 2, 3] });
    expect(moduleDone(s, 'm1')).toBe(true);
    s.labs = { 'e6-real-matrix': { attempts: 3, correct: 1, best: 0.33 } };
    expect(moduleDone(s, 'm3')).toBe(false);
    s.labs['e7-complex-matrix'] = { attempts: 3, correct: 3, best: 1 };
    expect(moduleDone(s, 'm3')).toBe(true);
  });
});
