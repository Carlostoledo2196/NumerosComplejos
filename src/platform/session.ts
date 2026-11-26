/**
 * Sesión del estudiante con Firebase: ingreso/registro, carga del progreso desde la nube
 * y guardado automático (con espera de 2 s tras cada cambio y al salir de la página).
 */
import { h, button } from '../ui/dom';
import { store } from '../state/store';
import { mountApp } from '../app';
import { brandHeader, applyPrefs } from '../ui/brand';
import { COURSE } from '../content/texts';
import { authScreen } from './auth-ui';
import { buildSummary } from './model';
import * as cloud from './cloud';

type SyncState = 'saved' | 'saving' | 'pending' | 'error';

function syncIndicator() {
  const el = h('span', { class: 'sync', role: 'status', 'aria-live': 'polite' });
  const set = (s: SyncState) => {
    el.dataset.state = s;
    el.textContent = {
      saved: '✓ Progreso guardado',
      saving: 'Guardando…',
      pending: 'Cambios sin guardar',
      error: 'Sin conexión: se guardará al reconectar',
    }[s];
  };
  set('saved');
  return { el, set };
}

function message(root: HTMLElement, title: string, body: string, actions: HTMLElement[] = []): void {
  root.replaceChildren(
    brandHeader('OVA · Números Complejos y Computación Cuántica', `${COURSE.subject} · ${COURSE.audience}`),
    h('main', { class: 'page auth-page', id: 'contenido' },
      h('section', { class: 'auth-card' }, h('h1', {}, title), h('p', { html: body }), h('div', { class: 'btn-row' }, ...actions)),
    ),
  );
}

async function enterOva(root: HTMLElement, user: cloud.User): Promise<void> {
  message(root, 'Cargando tu progreso…', 'Un momento, por favor.');
  let docu = await cloud.getStudent(user.uid);
  // justo después del registro el documento puede tardar un instante en estar disponible
  for (let k = 0; !docu && k < 3; k++) {
    await new Promise((r) => setTimeout(r, 600));
    docu = await cloud.getStudent(user.uid);
  }
  if (!docu) {
    message(root, 'Esta cuenta no tiene registro de estudiante',
      'Si eres docente, el panel de resultados está en <a href="./docente.html">docente.html</a>. Si eres estudiante, cierra sesión y regístrate con la pestaña «Registrarme».',
      [button('Cerrar sesión', () => void cloud.logout(), 'btn btn--primary')]);
    return;
  }

  // La nube es la fuente de verdad: en un computador compartido no se hereda el progreso de otra persona.
  store.replace(docu.estado ?? {});
  void cloud.touchLastAccess(user.uid).catch(() => {});

  const sync = syncIndicator();
  let timer = 0;
  let dirty = false;
  /** tras cerrar sesión no se sincroniza nada más (evita subir el estado vacío a la nube) */
  let closing = false;
  const flush = async () => {
    window.clearTimeout(timer);
    if (!dirty || closing) return;
    dirty = false;
    sync.set('saving');
    try {
      const s = store.get();
      await cloud.saveProgress(user.uid, s, buildSummary(s));
      sync.set(dirty ? 'pending' : 'saved');
    } catch {
      dirty = true;
      sync.set('error');
      timer = window.setTimeout(() => void flush(), 10000);
    }
  };
  store.subscribe(() => {
    if (closing) return;
    dirty = true;
    sync.set('pending');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void flush(), 2000);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
  window.addEventListener('pagehide', () => void flush());

  mountApp(root, {
    nombre: docu.perfil.nombre,
    detalle: `${docu.perfil.grupo} · ${docu.perfil.codigo}`,
    syncEl: sync.el,
    onLogout: async () => {
      await flush();
      closing = true;
      await cloud.logout();
      // limpia el progreso local para que la siguiente persona en este equipo empiece de cero
      store.reset();
      location.reload();
    },
  });
}

export function start(root: HTMLElement): void {
  applyPrefs();
  cloud.init();
  let registering = false;
  let entered = false;

  const showAuth = () => {
    root.replaceChildren(
      h('a', { class: 'skip-link', href: '#contenido' }, 'Saltar al contenido'),
      brandHeader('OVA · Números Complejos y Computación Cuántica', `${COURSE.subject} · ${COURSE.audience}`),
      authScreen({
        login: async (email, password) => { await cloud.login(email, password); },
        register: async (profile, password) => {
          registering = true;
          try {
            const u = await cloud.registerStudent(profile, password);
            entered = true;
            await enterOva(root, u);
          } finally {
            registering = false;
          }
        },
        reset: (email) => cloud.resetPassword(email),
      }),
    );
  };

  cloud.onUser((u) => {
    if (registering) return; // el registro entra a la OVA cuando termina de crear el documento
    if (!u) {
      if (entered) location.reload();
      else showAuth();
      return;
    }
    if (entered) return;
    entered = true;
    void enterOva(root, u).catch(() => {
      entered = false;
      message(root, 'No fue posible cargar tu progreso', 'Revisa tu conexión a internet e intenta de nuevo.', [button('Reintentar', () => location.reload(), 'btn btn--primary')]);
    });
  });
}
