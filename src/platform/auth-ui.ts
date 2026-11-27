/**
 * Pantalla de ingreso y registro de estudiantes.
 */
import { h, button, input, field } from '../ui/dom';
import { Feedback } from '../ui/feedback';
import { COURSE } from '../content/texts';
import { PRIVACY } from '../content/privacy';
import { suggestedGroups } from './config';
import { validateProfile, authErrorMessage, type StudentProfile } from './model';

export interface AuthHandlers {
  login(email: string, password: string): Promise<void>;
  register(profile: StudentProfile, password: string): Promise<void>;
  reset(email: string): Promise<void>;
}

const errCode = (e: unknown): string => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '');

function passwordInput(autocomplete: string): HTMLInputElement {
  return input({ type: 'password', autocomplete, minlength: 6, required: true });
}

function loginForm(on: AuthHandlers): HTMLElement {
  const fb = new Feedback();
  const email = input({ type: 'email', autocomplete: 'email', required: true, inputmode: 'email' });
  const pass = passwordInput('current-password');
  const submit = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Ingresar');
  const form = h('form', { class: 'auth-form', novalidate: true },
    field('Correo', email),
    field('Contraseña', pass),
    h('div', { class: 'btn-row' }, submit, button('Olvidé mi contraseña', async () => {
      if (!email.value.trim()) {
        fb.show('info', 'Escribe tu correo y vuelve a pulsar «Olvidé mi contraseña».', { sound: false });
        email.focus();
        return;
      }
      try {
        await on.reset(email.value);
        fb.show('info', 'Si el correo está registrado, te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.', { title: 'Revisa tu correo', sound: false });
      } catch (e) {
        fb.show('err', authErrorMessage(errCode(e)), { sound: false });
      }
    }, 'btn btn--small')),
    fb.el,
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    submit.disabled = true;
    submit.textContent = 'Ingresando…';
    try {
      await on.login(email.value, pass.value);
    } catch (e) {
      fb.show('err', authErrorMessage(errCode(e)), { sound: false });
      submit.disabled = false;
      submit.textContent = 'Ingresar';
    }
  });
  return form;
}

function registerForm(on: AuthHandlers): HTMLElement {
  const fb = new Feedback();
  const nombre = input({ autocomplete: 'name', required: true, maxlength: 120 });
  const codigo = input({ autocomplete: 'off', required: true, maxlength: 30, inputmode: 'text' });
  const groups = suggestedGroups();
  const grupo = groups.length
    ? (h('select', { class: 'select', required: true }, h('option', { value: '' }, 'Selecciona tu grupo…'), ...groups.map((g) => h('option', { value: g }, g))) as HTMLSelectElement)
    : input({ required: true, maxlength: 40, placeholder: 'Ej: Grupo 1' });
  const email = input({ type: 'email', autocomplete: 'email', required: true, inputmode: 'email' });
  const pass = passwordInput('new-password');
  const pass2 = passwordInput('new-password');
  const consent = h('input', { type: 'checkbox', id: 'consent', required: true });
  const submit = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Crear mi cuenta');
  const fields: Record<keyof StudentProfile, HTMLInputElement | HTMLSelectElement> = { nombre, codigo, grupo, email };

  const form = h('form', { class: 'auth-form', novalidate: true },
    field('Nombre completo', nombre),
    h('div', { class: 'fields' }, field('Código estudiantil', codigo), field('Grupo o curso', grupo)),
    field('Correo', email, 'Institucional o personal; lo usarás para ingresar'),
    h('div', { class: 'fields' }, field('Contraseña', pass, 'Mínimo 6 caracteres'), field('Repite la contraseña', pass2)),
    h('div', { class: 'consent' },
      h('label', { class: 'consent__check', for: 'consent' }, consent, h('span', {}, PRIVACY.short)),
      h('details', {}, h('summary', {}, 'Ver la autorización completa'), h('ul', {}, ...PRIVACY.details.map((d) => h('li', { html: d })))),
    ),
    submit,
    fb.el,
  );

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    Object.values(fields).forEach((el) => el.removeAttribute('aria-invalid'));
    const v = validateProfile({ nombre: nombre.value, codigo: codigo.value, grupo: grupo.value, email: email.value });
    const problems: string[] = [];
    if (!v.ok) {
      for (const [k, msg] of Object.entries(v.errors)) {
        fields[k as keyof StudentProfile].setAttribute('aria-invalid', 'true');
        problems.push(msg as string);
      }
    }
    if (pass.value.length < 6) problems.push('La contraseña debe tener al menos 6 caracteres.');
    else if (pass.value !== pass2.value) problems.push('Las contraseñas no coinciden.');
    if (!consent.checked) problems.push('Debes aceptar la autorización de tratamiento de datos para registrarte.');
    if (problems.length || !v.ok) {
      fb.show('err', `<ul>${problems.map((p) => `<li>${p}</li>`).join('')}</ul>`, { title: 'Revisa el formulario', sound: false });
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Creando cuenta…';
    try {
      await on.register(v.value, pass.value);
    } catch (e) {
      fb.show('err', authErrorMessage(errCode(e)), { sound: false });
      submit.disabled = false;
      submit.textContent = 'Crear mi cuenta';
    }
  });
  return form;
}

/** Tarjeta con pestañas «Ingresar» / «Registrarme» (patrón de pestañas accesible). */
export function authScreen(on: AuthHandlers): HTMLElement {
  const panels = { login: loginForm(on), register: registerForm(on) };
  const tabs = {
    login: h('button', { type: 'button', role: 'tab', id: 'tab-login', 'aria-controls': 'panel-login', class: 'tab' }, 'Ingresar'),
    register: h('button', { type: 'button', role: 'tab', id: 'tab-register', 'aria-controls': 'panel-register', class: 'tab' }, 'Registrarme'),
  };
  const select = (k: 'login' | 'register') => {
    for (const key of ['login', 'register'] as const) {
      const on_ = key === k;
      tabs[key].setAttribute('aria-selected', String(on_));
      tabs[key].tabIndex = on_ ? 0 : -1;
      panels[key].hidden = !on_;
    }
  };
  tabs.login.addEventListener('click', () => select('login'));
  tabs.register.addEventListener('click', () => select('register'));
  const list = h('div', { role: 'tablist', class: 'tabs', 'aria-label': 'Acceso a la OVA' }, tabs.login, tabs.register);
  list.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next = tabs.login.getAttribute('aria-selected') === 'true' ? 'register' : 'login';
    select(next);
    tabs[next].focus();
  });
  panels.login.setAttribute('role', 'tabpanel');
  panels.login.id = 'panel-login';
  panels.login.setAttribute('aria-labelledby', 'tab-login');
  panels.register.setAttribute('role', 'tabpanel');
  panels.register.id = 'panel-register';
  panels.register.setAttribute('aria-labelledby', 'tab-register');
  select('login');

  return h('main', { class: 'page auth-page', id: 'contenido' },
    h('section', { class: 'auth-card', 'aria-labelledby': 'auth-title' },
      h('h1', { id: 'auth-title' }, COURSE.title),
      h('p', { class: 'muted' }, 'Ingresa con tu cuenta para guardar tu progreso y que tu docente pueda ver tus resultados. Si es tu primera vez, regístrate.'),
      list,
      panels.login,
      panels.register,
    ),
    h('aside', { class: 'auth-teacher', 'aria-label': 'Acceso docente' },
      h('span', {}, '¿Eres docente?'),
      h('a', { class: 'btn', href: './docente.html' }, 'Ir al panel docente →'),
    ),
  );
}
