/**
 * Panel docente: ingreso del docente (correo verificado + autorizado en /docentes) y tablero de resultados.
 */
import '@fontsource-variable/inter';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import './dashboard.css';
import { h, button, input, field } from '../ui/dom';
import { Feedback } from '../ui/feedback';
import { brandHeader, applyPrefs } from '../ui/brand';
import { cloudEnabled } from '../platform/config';
import { authErrorMessage } from '../platform/model';
import { CREDITS } from '../content/texts';
import { mountDashboard } from './dashboard';

const TITLE = 'Panel docente · OVA Números Complejos y Computación Cuántica';
const errCode = (e: unknown): string => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '');

function page(root: HTMLElement, extra: Node | null, ...content: Node[]): void {
  root.replaceChildren(
    h('a', { class: 'skip-link', href: '#contenido' }, 'Saltar al contenido'),
    brandHeader(TITLE, `${CREDITS.institution} · Seguimiento de resultados`, [], extra),
    h('main', { class: 'page', id: 'contenido' }, ...content),
  );
}

function card(title: string, ...body: Node[]): HTMLElement {
  return h('section', { class: 'auth-card', 'aria-labelledby': 'card-title', style: 'max-width: 640px; margin: 0 auto; width: 100%' }, h('h1', { id: 'card-title' }, title), ...body);
}

async function start(root: HTMLElement): Promise<void> {
  applyPrefs();
  if (!cloudEnabled()) {
    page(root, null, card('Firebase no está configurado',
      h('p', { html: 'El panel docente necesita la conexión con Firebase. Configura las variables <code>VITE_FIREBASE_*</code> (ver <code>docs/FIREBASE.md</code>) y vuelve a publicar el sitio.' })));
    return;
  }
  const cloud = await import('../platform/cloud');
  cloud.init();

  const loginView = () => {
    const fb = new Feedback();
    const email = input({ type: 'email', autocomplete: 'email', inputmode: 'email' });
    const pass = input({ type: 'password', autocomplete: 'current-password' });
    const act = async (fn: () => Promise<unknown>, okMsg?: string) => {
      try {
        await fn();
        if (okMsg) fb.show('info', okMsg, { sound: false, title: 'Listo' });
      } catch (e) {
        fb.show('err', authErrorMessage(errCode(e)), { sound: false });
      }
    };
    const form = h('form', { class: 'auth-form', novalidate: true },
      field('Correo', email),
      field('Contraseña', pass),
      h('div', { class: 'btn-row' },
        h('button', { type: 'submit', class: 'btn btn--primary' }, 'Ingresar'),
        button('Crear cuenta docente', () => void act(() => cloud.registerTeacher(email.value, pass.value)), 'btn'),
        button('Olvidé mi contraseña', () => void act(() => cloud.resetPassword(email.value), 'Si el correo está registrado, te llegará un enlace para crear una contraseña nueva.'), 'btn btn--small'),
      ),
      fb.el,
    );
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      void act(() => cloud.login(email.value, pass.value));
    });
    page(root, null, card('Ingreso docente',
      h('p', { class: 'muted' }, 'Solo los correos autorizados por la administración del curso pueden ver los resultados. La primera vez, crea tu cuenta docente y verifica tu correo.'),
      form,
      h('p', { class: 'muted' }, h('a', { href: './' }, '← Ir a la OVA de estudiantes')),
    ));
  };

  const accountBar = (u: { email: string | null }) =>
    h('div', { class: 'app-header__account' }, h('span', {}, h('strong', {}, u.email ?? ''), ' · docente'), button('Cerrar sesión', () => void cloud.logout(), 'btn btn--small'));

  let stop: (() => void) | null = null;
  cloud.onUser(async (u) => {
    stop?.();
    stop = null;
    if (!u) {
      loginView();
      return;
    }
    if (!u.emailVerified) {
      const fb = new Feedback();
      page(root, accountBar(u), card('Verifica tu correo',
        h('p', {}, `Enviamos un enlace de verificación a ${u.email}. Ábrelo y luego pulsa «Ya verifiqué». Revisa también la carpeta de spam.`),
        h('div', { class: 'btn-row' },
          button('Ya verifiqué', async () => {
            await u.reload();
            await u.getIdToken(true); // el token nuevo incluye email_verified = true para las reglas
            location.reload();
          }, 'btn btn--primary'),
          button('Reenviar enlace', async () => {
            try {
              await cloud.resendVerification(u);
              fb.show('info', 'Enlace reenviado.', { sound: false, title: 'Listo' });
            } catch (e) {
              fb.show('err', authErrorMessage(errCode(e)), { sound: false });
            }
          }),
        ),
        fb.el,
      ));
      return;
    }
    if (!(await cloud.isTeacher(u))) {
      page(root, accountBar(u), card('Correo no autorizado',
        h('p', { html: `La cuenta <strong>${(u.email ?? '').replace(/[<>&"]/g, '')}</strong> no está en la lista de docentes. Pide a quien administra el proyecto de Firebase que la agregue: <em>Firestore → colección <code>docentes</code> → documento con ID = tu correo en minúsculas</em>.` }),
      ));
      return;
    }
    const container = h('div', { class: 'dash' });
    page(root, accountBar(u), container);
    stop = mountDashboard(container, cloud.watchStudents);
  });
}

const root = document.getElementById('app');
if (root) void start(root);
