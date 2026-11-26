/** Estructura general: encabezado con controles DUA, presentación, ruta de aprendizaje y módulos. */
import { h, button } from './ui/dom';
import { renderMath } from './ui/math';
import { prose, toggle } from './ui/widgets';
import { store, moduleDone } from './state/store';
import { COURSE } from './content/texts';
import { brandHeader, applyPrefs } from './ui/brand';
import { MODULES } from './scenes';
import type { ModuleDef } from './scenes/types';


/** Datos de la cuenta cuando la OVA está conectada a Firebase. */
export interface AccountInfo {
  nombre: string;
  detalle: string;
  /** indicador del guardado en la nube */
  syncEl: HTMLElement;
  onLogout: () => void;
}

function header(account?: AccountInfo): HTMLElement {
  const p = store.get().prefs;
  const large = toggle('Texto ampliado', p.largeText, (v) => store.update((s) => { s.prefs.largeText = v; }), 'btn btn--small');
  const sound = toggle('Sonido guía', p.sound, (v) => store.update((s) => { s.prefs.sound = v; }), 'btn btn--small');
  const dark = toggle('Tema oscuro', p.theme === 'dark' || (p.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches), (v) =>
    store.update((s) => { s.prefs.theme = v ? 'dark' : 'light'; }), 'btn btn--small');

  let armed = false;
  const reset = button('Reiniciar progreso', () => {
    if (!armed) {
      armed = true;
      reset.textContent = 'Confirmar reinicio';
      setTimeout(() => {
        armed = false;
        reset.textContent = 'Reiniciar progreso';
      }, 4000);
      return;
    }
    store.reset();
    location.reload();
  }, 'btn btn--small');

  // Con cuenta en la nube no se ofrece «Reiniciar progreso»: borraría los resultados que ve el docente.
  const tools: Node[] = account ? [large, sound, dark] : [large, sound, dark, reset];
  const accountBar = account
    ? h('div', { class: 'app-header__account' },
        h('span', {}, h('strong', {}, account.nombre), ` · ${account.detalle}`),
        account.syncEl,
        button('Cerrar sesión', account.onLogout, 'btn btn--small'),
      )
    : null;
  return brandHeader('OVA · Números Complejos y Computación Cuántica', `${COURSE.subject} · ${COURSE.audience}`, tools, accountBar);
}

function hero(): HTMLElement {
  return h('section', { class: 'hero', 'aria-labelledby': 'ova-title' },
    h('h1', { id: 'ova-title' }, COURSE.title),
    prose(COURSE.lead, 'hero__lead'),
    h('div', { class: 'stats' },
      ...[
        ['80 %', 'no aprobó el primer corte (2024–2026)'],
        ['5 RAP', 'resultados de aprendizaje evaluables'],
        ['60 min', '5 módulos · 10 escenas'],
        ['40 / 60', 'formativa / sumativa'],
      ].map(([v, l]) => h('div', { class: 'stat' }, h('span', { class: 'stat__value' }, v), h('span', { class: 'stat__label' }, l))),
    ),
    prose(COURSE.context, 'muted'),
  );
}

function route(cloud = false): HTMLElement {
  const fill = h('div', { class: 'route__fill' });
  const label = h('p', { class: 'muted', 'aria-live': 'polite' });
  const bar = h('div', { class: 'route__bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': MODULES.length, 'aria-label': 'Módulos completados' }, fill);
  const items = MODULES.map((m) => {
    const check = h('span', { class: 'route__check', 'aria-hidden': 'true' });
    const li = h('li', { class: 'route__item' }, h('a', { href: `#${m.id}` }, check, h('span', {}, `M${m.number} · ${m.title}`)));
    return { m, li, check };
  });
  const paint = () => {
    const s = store.get();
    let done = 0;
    for (const { m, li, check } of items) {
      const d = moduleDone(s, m.id);
      if (d) done++;
      li.classList.toggle('is-done', d);
      check.textContent = d ? '✓' : '';
      li.querySelector('a')?.setAttribute('aria-label', `Módulo ${m.number}: ${m.title}${d ? ' (completado)' : ''}`);
    }
    fill.style.width = `${(done / MODULES.length) * 100}%`;
    bar.setAttribute('aria-valuenow', String(done));
    label.textContent = `Progreso: ${done} de ${MODULES.length} módulos completados. ${cloud ? 'Se guarda automáticamente en tu cuenta.' : 'Se guarda automáticamente en este navegador.'}`;
  };
  store.subscribe(paint);
  paint();
  return h('nav', { class: 'route', 'aria-label': 'Ruta de aprendizaje' }, h('h2', { style: 'font-size: 1.1rem' }, 'Ruta de aprendizaje'), bar, label, h('ol', { class: 'route__list' }, ...items.map((i) => i.li)));
}

function moduleSection(m: ModuleDef): HTMLElement {
  const sec = h('section', { class: 'module', id: m.id, 'aria-labelledby': `${m.id}-title` },
    h('div', { class: 'module__head' },
      h('div', { class: 'module__meta' },
        h('span', { class: 'chip' }, `Módulo ${m.number} · ${m.minutes} min`),
        ...m.raps.map((r) => h('span', { class: 'chip chip--muted' }, r)),
      ),
      h('h2', { id: `${m.id}-title` }, m.title),
      prose(m.intro, 'module__intro'),
    ),
  );
  for (const sc of m.scenes) sec.append(sc.mount());
  return sec;
}

export function mountApp(root: HTMLElement, account?: AccountInfo): void {
  applyPrefs();
  store.subscribe(applyPrefs);
  const main = h('main', { class: 'page', id: 'contenido' }, hero(), route(!!account), ...MODULES.map(moduleSection));
  root.replaceChildren(
    h('a', { class: 'skip-link', href: '#contenido' }, 'Saltar al contenido'),
    header(account),
    main,
    h('footer', { class: 'app-footer' },
      h('p', {}, `Objeto Virtual de Aprendizaje · ${COURSE.subject} · Enfoque DUA y constructivismo mediado por tecnología.`),
    ),
  );
  renderMath(root.querySelector('.hero') as HTMLElement);
}
