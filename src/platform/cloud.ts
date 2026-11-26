/**
 * Acceso a Firebase (Auth + Firestore). Se importa de forma dinámica solo si hay configuración,
 * para que la OVA en modo local no descargue el SDK.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, sendEmailVerification, onAuthStateChanged, updateProfile, type Auth, type User,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, onSnapshot, collection,
  serverTimestamp, type Firestore, type Timestamp,
} from 'firebase/firestore';
import { firebaseConfig, useEmulators } from './config';
import { CONSENT_VERSION, type StudentProfile, type Summary } from './model';
import type { OvaState } from '../state/store';

let app: FirebaseApp | null = null;
let auth: Auth;
let db: Firestore;

export function init(): void {
  if (app) return;
  const cfg = firebaseConfig();
  if (!cfg) throw new Error('Firebase no está configurado');
  app = initializeApp(cfg);
  auth = getAuth(app);
  auth.languageCode = 'es';
  db = getFirestore(app);
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

export type { User };

export interface StudentDoc {
  perfil: StudentProfile;
  consentimiento: { aceptado: true; version: string; fecha: Timestamp | null };
  creado: Timestamp | null;
  ultimoAcceso: Timestamp | null;
  actualizado: Timestamp | null;
  estado: OvaState | null;
  resumen: Summary | null;
}

export const onUser = (cb: (u: User | null) => void): (() => void) => onAuthStateChanged(auth, cb);
export const currentUser = (): User | null => auth.currentUser;

export async function login(email: string, password: string): Promise<User> {
  return (await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)).user;
}

export const logout = (): Promise<void> => signOut(auth);
export const resetPassword = (email: string): Promise<void> => sendPasswordResetEmail(auth, email.trim().toLowerCase());

/** Registro de estudiante: crea la cuenta y su documento con perfil y consentimiento (Ley 1581 de 2012). */
export async function registerStudent(profile: StudentProfile, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, profile.email, password);
  await updateProfile(cred.user, { displayName: profile.nombre });
  await setDoc(doc(db, 'estudiantes', cred.user.uid), {
    perfil: profile,
    consentimiento: { aceptado: true, version: CONSENT_VERSION, fecha: serverTimestamp() },
    creado: serverTimestamp(),
    ultimoAcceso: serverTimestamp(),
    actualizado: serverTimestamp(),
    estado: null,
    resumen: null,
  });
  return cred.user;
}

export async function getStudent(uid: string): Promise<StudentDoc | null> {
  const snap = await getDoc(doc(db, 'estudiantes', uid));
  return snap.exists() ? (snap.data() as StudentDoc) : null;
}

export async function touchLastAccess(uid: string): Promise<void> {
  await updateDoc(doc(db, 'estudiantes', uid), { ultimoAcceso: serverTimestamp() });
}

/** Guarda el estado y el resumen. Firestore reintenta solo si no hay conexión. */
export async function saveProgress(uid: string, estado: OvaState, resumen: Summary): Promise<void> {
  // JSON ida y vuelta: quita undefined (Firestore no lo acepta) y garantiza datos planos
  const plain = JSON.parse(JSON.stringify({ estado, resumen }));
  await updateDoc(doc(db, 'estudiantes', uid), { ...plain, actualizado: serverTimestamp() });
}

/* ------------------------------ Docentes ------------------------------ */

export async function registerTeacher(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await sendEmailVerification(cred.user);
  return cred.user;
}

export const resendVerification = (u: User): Promise<void> => sendEmailVerification(u);

/** ¿Está el correo en la colección docentes? (la regla solo deja leer el propio documento). */
export async function isTeacher(u: User): Promise<boolean> {
  if (!u.email) return false;
  try {
    return (await getDoc(doc(db, 'docentes', u.email.toLowerCase()))).exists();
  } catch {
    return false;
  }
}

export interface StudentRow extends StudentDoc {
  uid: string;
}

/** Escucha en vivo todos los estudiantes (solo docentes autorizados, por reglas). */
export function watchStudents(cb: (rows: StudentRow[]) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    collection(db, 'estudiantes'),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as StudentDoc) }))),
    onError,
  );
}
