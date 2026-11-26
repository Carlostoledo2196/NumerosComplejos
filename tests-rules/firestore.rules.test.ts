/**
 * Pruebas de las reglas de seguridad de Firestore contra el emulador.
 * Ejecutar con: npm run test:rules
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

let env: RulesTestEnvironment;

const perfil = (email: string) => ({ nombre: 'Ana María Pérez', codigo: '20261234', grupo: 'Grupo 1', email });
const registro = (email: string) => ({
  perfil: perfil(email),
  consentimiento: { aceptado: true, version: '2026-11', fecha: serverTimestamp() },
  creado: serverTimestamp(),
  ultimoAcceso: serverTimestamp(),
  actualizado: serverTimestamp(),
  estado: null,
  resumen: null,
});

const ana = () => env.authenticatedContext('ana', { email: 'ana@unilibre.edu.co', email_verified: false }).firestore();
const beto = () => env.authenticatedContext('beto', { email: 'beto@unilibre.edu.co', email_verified: false }).firestore();
const profe = (verified = true) => env.authenticatedContext('profe', { email: 'Profe@Unilibre.edu.co', email_verified: verified }).firestore();
const intruso = () => env.authenticatedContext('x', { email: 'intruso@gmail.com', email_verified: true }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ova',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'docentes', 'profe@unilibre.edu.co'), { nombre: 'Docente' });
  });
});

describe('registro de estudiantes', () => {
  it('un estudiante crea su propio documento con perfil válido y consentimiento', async () => {
    await assertSucceeds(setDoc(doc(ana(), 'estudiantes', 'ana'), registro('ana@unilibre.edu.co')));
  });
  it('no puede crear el documento de otro', async () => {
    await assertFails(setDoc(doc(ana(), 'estudiantes', 'beto'), registro('ana@unilibre.edu.co')));
  });
  it('sin sesión no se puede registrar', async () => {
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'estudiantes', 'ana'), registro('ana@unilibre.edu.co')));
  });
  it('exige consentimiento de tratamiento de datos', async () => {
    const r = registro('ana@unilibre.edu.co');
    await assertFails(setDoc(doc(ana(), 'estudiantes', 'ana'), { ...r, consentimiento: { ...r.consentimiento, aceptado: false } }));
  });
  it('el correo del perfil debe ser el de la cuenta', async () => {
    await assertFails(setDoc(doc(ana(), 'estudiantes', 'ana'), registro('otro@unilibre.edu.co')));
  });
  it('valida nombre, código y campos extra', async () => {
    const r = registro('ana@unilibre.edu.co');
    await assertFails(setDoc(doc(ana(), 'estudiantes', 'ana'), { ...r, perfil: { ...r.perfil, nombre: 'Ana' } }));
    await assertFails(setDoc(doc(ana(), 'estudiantes', 'ana'), { ...r, perfil: { ...r.perfil, codigo: 'a b' } }));
    await assertFails(setDoc(doc(ana(), 'estudiantes', 'ana'), { ...r, perfil: { ...r.perfil, rol: 'docente' } }));
    await assertFails(setDoc(doc(ana(), 'estudiantes', 'ana'), { ...r, esDocente: true }));
  });
  it('no acepta fechas falsificadas', async () => {
    await assertFails(setDoc(doc(ana(), 'estudiantes', 'ana'), { ...registro('ana@unilibre.edu.co'), creado: new Date(2020, 0, 1) }));
  });
});

describe('progreso', () => {
  beforeEach(async () => {
    await setDoc(doc(ana(), 'estudiantes', 'ana'), registro('ana@unilibre.edu.co'));
  });
  it('el estudiante guarda su estado y resumen', async () => {
    await assertSucceeds(updateDoc(doc(ana(), 'estudiantes', 'ana'), { estado: { version: 1 }, resumen: { notaFinal: 4.2 }, actualizado: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(ana(), 'estudiantes', 'ana'), { ultimoAcceso: serverTimestamp() }));
  });
  it('no puede cambiar su perfil ni su consentimiento ni borrar', async () => {
    await assertFails(updateDoc(doc(ana(), 'estudiantes', 'ana'), { 'perfil.grupo': 'Otro', actualizado: serverTimestamp() }));
    await assertFails(updateDoc(doc(ana(), 'estudiantes', 'ana'), { 'consentimiento.version': 'x', actualizado: serverTimestamp() }));
    await assertFails(deleteDoc(doc(ana(), 'estudiantes', 'ana')));
  });
  it('otro estudiante no puede leer ni escribir', async () => {
    await assertFails(getDoc(doc(beto(), 'estudiantes', 'ana')));
    await assertFails(updateDoc(doc(beto(), 'estudiantes', 'ana'), { resumen: { notaFinal: 1 }, actualizado: serverTimestamp() }));
  });
  it('un estudiante no puede listar la colección', async () => {
    await assertFails(getDocs(collection(ana(), 'estudiantes')));
  });
});

describe('panel docente', () => {
  beforeEach(async () => {
    await setDoc(doc(ana(), 'estudiantes', 'ana'), registro('ana@unilibre.edu.co'));
  });
  it('un docente autorizado y verificado lista todos los estudiantes (correo sin importar mayúsculas)', async () => {
    await assertSucceeds(getDocs(collection(profe(), 'estudiantes')));
  });
  it('un docente sin correo verificado no accede', async () => {
    await assertFails(getDocs(collection(profe(false), 'estudiantes')));
  });
  it('un usuario que no está en la lista de docentes no accede', async () => {
    await assertFails(getDocs(collection(intruso(), 'estudiantes')));
  });
  it('el docente no puede modificar resultados', async () => {
    await assertFails(updateDoc(doc(profe(), 'estudiantes', 'ana'), { resumen: { notaFinal: 5 }, actualizado: serverTimestamp() }));
  });
  it('la lista de docentes no se puede escribir desde la app y cada quien solo lee su entrada', async () => {
    await assertFails(setDoc(doc(intruso(), 'docentes', 'intruso@gmail.com'), {}));
    await assertSucceeds(getDoc(doc(profe(), 'docentes', 'profe@unilibre.edu.co')));
    await assertFails(getDoc(doc(intruso(), 'docentes', 'profe@unilibre.edu.co')));
    await assertFails(getDocs(collection(profe(), 'docentes')));
  });
});
