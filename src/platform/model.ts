/**
 * Modelo de datos en Firestore.
 *
 *   docentes/{correo en minúsculas}   → existe = docente autorizado (se crea a mano en la consola)
 *   estudiantes/{uid}                 → perfil + consentimiento + estado de la OVA + resumen para el panel
 *
 * El resumen se calcula en el navegador del estudiante con el mismo núcleo que muestra su informe,
 * y se guarda junto al estado para que el panel docente lea todo con una sola consulta.
 */
import type { OvaState, ModuleId } from '../state/store';
import { moduleDone } from '../state/store';
import { reportFor, CIRCUITS_REQUIRED } from '../state/report';
import type { CriterionId, Level, Rap } from '../core/assessment';
import { FORMATIVE_LABS } from '../core/assessment';

export const CONSENT_VERSION = '2026-11';
export const MODULE_IDS: ModuleId[] = ['m1', 'm2', 'm3', 'm4', 'm5'];

export interface StudentProfile {
  nombre: string;
  codigo: string;
  grupo: string;
  email: string;
}

export interface Summary {
  modulos: ModuleId[];
  modulosCompletados: number;
  /** % de laboratorios formativos con al menos una ronda */
  labsIniciados: number;
  labs: Record<string, number>;
  formativa: number;
  /** null mientras el reto integrador no esté calificado */
  sumativa: number | null;
  notaFinal: number | null;
  nivel: Level | null;
  criterios: Record<CriterionId, number> | null;
  raps: Record<`${Rap}`, number> | null;
  circuitos: number;
  insignia: boolean;
  retoCalificado: boolean;
  confianzaInicial: number | null;
  confianzaFinal: number | null;
  encuesta: OvaState['survey'];
}

export function buildSummary(s: Readonly<OvaState>): Summary {
  const r = reportFor(s);
  const modulos = MODULE_IDS.filter((m) => moduleDone(s, m));
  const labs = Object.fromEntries(FORMATIVE_LABS.map((id) => [id, Math.round((s.labs[id]?.best ?? 0) * 100) / 100]));
  const graded = s.finalGraded;
  return {
    modulos,
    modulosCompletados: modulos.length,
    labsIniciados: FORMATIVE_LABS.filter((id) => (s.labs[id]?.attempts ?? 0) > 0).length / FORMATIVE_LABS.length,
    labs,
    formativa: r.formative.grade,
    sumativa: graded ? r.summative.grade : null,
    notaFinal: graded ? r.final.grade : null,
    nivel: graded ? r.final.level : null,
    criterios: graded ? { C1: r.summative.criteria.C1.grade, C2: r.summative.criteria.C2.grade, C3: r.summative.criteria.C3.grade } : null,
    raps: graded ? { 1: r.raps[1], 2: r.raps[2], 3: r.raps[3], 4: r.raps[4], 5: r.raps[5] } : null,
    circuitos: Math.min(s.circuitsSolved.length, CIRCUITS_REQUIRED * 2),
    insignia: graded && r.badge,
    retoCalificado: graded,
    confianzaInicial: s.confidenceBefore,
    confianzaFinal: s.confidenceAfter,
    encuesta: { ...s.survey },
  };
}

/** Normaliza y valida el perfil del registro. Devuelve mensajes de error en español. */
export function validateProfile(p: Partial<StudentProfile>): { ok: true; value: StudentProfile } | { ok: false; errors: Partial<Record<keyof StudentProfile, string>> } {
  const nombre = (p.nombre ?? '').replace(/\s+/g, ' ').trim();
  const codigo = (p.codigo ?? '').replace(/\s+/g, '').trim();
  const grupo = (p.grupo ?? '').replace(/\s+/g, ' ').trim();
  const email = (p.email ?? '').trim().toLowerCase();
  const errors: Partial<Record<keyof StudentProfile, string>> = {};
  if (nombre.length < 5 || !nombre.includes(' ')) errors.nombre = 'Escribe tu nombre completo (nombre y apellido).';
  if (nombre.length > 120) errors.nombre = 'El nombre es demasiado largo.';
  if (!/^[A-Za-z0-9-]{3,30}$/.test(codigo)) errors.codigo = 'El código estudiantil debe tener entre 3 y 30 letras o números.';
  if (grupo.length < 1 || grupo.length > 40) errors.grupo = 'Indica tu grupo o curso.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Escribe un correo válido.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { nombre, codigo, grupo, email } };
}

/** Mensajes en español para los códigos de error de Firebase Auth. */
export function authErrorMessage(code: string): string {
  const m: Record<string, string> = {
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Ingresa con tu contraseña o recupérala.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'Correo o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos o recupera tu contraseña.',
    'auth/network-request-failed': 'No hay conexión con el servidor. Revisa tu internet.',
    'auth/missing-password': 'Escribe tu contraseña.',
  };
  return m[code] ?? 'No fue posible completar la operación. Intenta de nuevo.';
}
