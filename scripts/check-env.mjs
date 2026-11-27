/**
 * Revisión de variables de Firebase antes del build (se ve en el log de despliegue de Netlify).
 *
 * - Todas presentes      → continúa (OVA con registro y panel docente).
 * - Ninguna presente     → aviso y continúa en modo local (sin registro).
 * - Algunas sí, otras no → detiene el build: la OVA saldría en modo local sin que nadie lo note.
 *
 * Nunca imprime las claves: solo si están definidas (y el ID del proyecto, que no es sensible).
 */
import { loadEnv } from 'vite';

// loadEnv junta las variables del sistema (Netlify) y los archivos .env locales.
const env = loadEnv(process.env.NODE_ENV === 'development' ? 'development' : 'production', process.cwd(), 'VITE_');

const REQUIRED = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'];
const OPTIONAL = ['VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_OVA_GRUPOS'];
const SHOW_VALUE = new Set(['VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_OVA_GRUPOS']);

const clean = (v) => (v ?? '').trim();
const problems = [];

const describe = (name) => {
  const raw = env[name];
  const v = clean(raw);
  if (!v) return '✗ falta';
  if (/^["'].*["']$/.test(v)) problems.push(`${name} tiene comillas alrededor del valor: quítalas en Netlify.`);
  if (raw !== v) problems.push(`${name} tiene espacios al inicio o al final.`);
  if (name === 'VITE_FIREBASE_API_KEY' && !v.startsWith('AIza')) problems.push(`${name} no parece una apiKey de Firebase (suelen empezar por «AIza»).`);
  return SHOW_VALUE.has(name) ? `✓ ${v}` : `✓ definida (${v.length} caracteres)`;
};

console.log('\n── Variables de Firebase para la OVA ──');
for (const n of [...REQUIRED, ...OPTIONAL]) console.log(`  ${n.padEnd(34)} ${describe(n)}${OPTIONAL.includes(n) ? '  (opcional)' : ''}`);

// variables con nombre parecido pero mal escrito (p. ej. sin el prefijo VITE_)
const lookalikes = Object.keys(process.env).filter((k) => /FIREBASE/i.test(k) && !k.startsWith('VITE_FIREBASE_'));
if (lookalikes.length) problems.push(`Hay variables con nombre parecido que la OVA NO usa: ${lookalikes.join(', ')}. Deben empezar por VITE_FIREBASE_.`);

const present = REQUIRED.filter((n) => clean(env[n]));
if (env.VITE_USE_EMULATORS === 'true' && process.env.NETLIFY) problems.push('VITE_USE_EMULATORS=true en Netlify: bórrala, solo es para desarrollo local.');

for (const p of problems) console.log(`  ⚠ ${p}`);

if (present.length === 0) {
  console.log('\n  → Sin Firebase: la OVA se publicará en MODO LOCAL (sin registro de estudiantes ni panel docente).');
  console.log('    Si esperabas Firebase: crea las variables en Netlify → Site configuration → Environment variables');
  console.log('    (alcance «Builds») y despliega de nuevo con «Clear cache and deploy site». Ver docs/FIREBASE.md.\n');
} else if (present.length < REQUIRED.length) {
  const missing = REQUIRED.filter((n) => !clean(env[n]));
  console.error(`\n  ✗ Configuración de Firebase INCOMPLETA. Faltan: ${missing.join(', ')}.`);
  console.error('    Se detiene el build para no publicar la OVA en modo local por error.\n');
  process.exit(1);
} else {
  console.log('\n  → Firebase configurado: registro de estudiantes y panel docente activos.\n');
}
