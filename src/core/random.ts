/** Generador pseudoaleatorio con semilla (mulberry32): los ejercicios son reproducibles en pruebas y revisiones. */
export type Rng = () => number;

export function createRng(seed: number = Date.now()): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entero uniforme en [min, max]. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Entero en [min, max] distinto de cero (evita ejercicios triviales). */
export function randNonZero(rng: Rng, min: number, max: number): number {
  let v = 0;
  while (v === 0) v = randInt(rng, min, max);
  return v;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: lista vacía');
  return items[Math.floor(rng() * items.length)] as T;
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
