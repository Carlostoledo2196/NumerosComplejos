import { h } from './dom';
import { renderMath } from './math';
import { play } from './audio';

export type FeedbackKind = 'ok' | 'err' | 'info';

/**
 * Caja de retroalimentación accesible (role=status: el lector de pantalla la anuncia).
 * El contenido es HTML propio con fórmulas KaTeX; el texto del estudiante se escapa con escapeHtml().
 */
export class Feedback {
  readonly el = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });

  show(kind: FeedbackKind, markup: string, opts: { title?: string; steps?: string[]; sound?: boolean } = {}): void {
    const titles: Record<FeedbackKind, string> = { ok: '¡Correcto!', err: 'Revisa', info: 'Nota' };
    const title = opts.title ?? titles[kind];
    // los pasos son HTML con fórmulas $…$ (ver core/exercises.ts)
    const steps = opts.steps?.length ? `<ol class="steps">${opts.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` : '';
    this.el.className = `feedback feedback--${kind} is-visible`;
    this.el.innerHTML = `<span class="feedback__title">${title}</span><div>${markup}</div>${steps}`;
    renderMath(this.el);
    if (opts.sound !== false && kind !== 'info') play(kind);
  }

  hide(): void {
    this.el.className = 'feedback';
    this.el.replaceChildren();
  }
}

/** Escapa texto del usuario antes de mostrarlo en HTML. */
export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
