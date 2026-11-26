/**
 * Ronda de laboratorio formativo: N ejercicios. Cuenta los aciertos al primer intento
 * y al cerrar la ronda la registra en el estado (formativa 40 %).
 * El estudiante puede reintentar cada ejercicio hasta acertar (retroalimentación no punitiva).
 */
import type { LabId } from '../core/assessment';
import { store } from '../state/store';
import { h } from './dom';

export class LabRound {
  done = 0;
  firstTry = 0;
  private attempted = false;
  private counted = false;
  readonly chip = h('span', { class: 'chip', 'aria-live': 'polite' });

  constructor(readonly labId: LabId, readonly size: number, private onRoundEnd?: (firstTry: number, size: number) => void) {
    this.render();
  }

  /** Llamar cada vez que el estudiante verifica el ejercicio actual. */
  check(correct: boolean): void {
    if (this.counted) return;
    if (!this.attempted) {
      this.attempted = true;
      if (correct) this.firstTry++;
    }
    if (correct) this.complete();
    this.render();
  }

  /** Llamar al pasar a un ejercicio nuevo: si se intentó y no se resolvió, cuenta como hecho sin acierto. */
  next(): void {
    if (this.attempted && !this.counted) this.complete();
    this.attempted = false;
    this.counted = false;
    this.render();
  }

  private complete(): void {
    this.counted = true;
    this.done++;
    if (this.done >= this.size) {
      store.recordLab(this.labId, this.firstTry, this.size);
      this.onRoundEnd?.(this.firstTry, this.size);
      this.done = 0;
      this.firstTry = 0;
    }
  }

  private render(): void {
    const best = store.get().labs[this.labId]?.best;
    const bestTxt = best !== undefined ? ` · mejor ronda ${Math.round(best * 100)} %` : '';
    this.chip.textContent = `Ronda ${this.done}/${this.size} · al primer intento ${this.firstTry}${bestTxt}`;
  }
}
