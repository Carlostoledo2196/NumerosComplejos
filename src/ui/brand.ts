/** Banner institucional y preferencias visuales, compartidos por la OVA, el ingreso y el panel docente. */
import { h } from './dom';
import { store } from '../state/store';
import { CREDITS } from '../content/texts';

export function applyPrefs(): void {
  const { largeText, theme } = store.get().prefs;
  document.documentElement.classList.toggle('dua-large', largeText);
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

/** Título, materia y créditos; `tools` y `extra` son opcionales (preferencias, cuenta). */
export function brandHeader(title: string, subtitle: string, tools: Node[] = [], extra: Node | null = null): HTMLElement {
  return h('header', { class: 'app-header' },
    h('div', { class: 'app-header__inner' },
      h('div', {},
        h('p', { class: 'app-header__title' }, title),
        h('p', { class: 'app-header__subtitle' }, subtitle),
      ),
      tools.length ? h('div', { class: 'app-header__tools', role: 'toolbar', 'aria-label': 'Preferencias y cuenta' }, ...tools) : null,
    ),
    extra,
    h('dl', { class: 'app-header__credits' },
      h('div', {}, h('dt', {}, 'Elaborado por:'), h('dd', {}, CREDITS.authors.join(' · '))),
      h('div', {}, h('dt', {}, 'Materia:'), h('dd', {}, CREDITS.course)),
      h('div', {}, h('dd', {}, `${CREDITS.program} · ${CREDITS.institution}`)),
    ),
  );
}
