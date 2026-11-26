/**
 * Configuración de Firebase desde variables de entorno de Vite (ver .env.example).
 * Si faltan, la OVA funciona en modo local (progreso solo en el navegador, sin registro).
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const env = import.meta.env;

export const useEmulators = env.VITE_USE_EMULATORS === 'true';

export function firebaseConfig(): FirebaseConfig | null {
  const cfg = {
    apiKey: env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
    appId: env.VITE_FIREBASE_APP_ID ?? '',
  };
  if (useEmulators) {
    // los emuladores aceptan cualquier valor; el proyecto «demo-*» nunca toca la nube
    return { ...cfg, apiKey: cfg.apiKey || 'demo-key', authDomain: cfg.authDomain || 'localhost', projectId: cfg.projectId || 'demo-ova', appId: cfg.appId || 'demo-app' };
  }
  return cfg.apiKey && cfg.projectId && cfg.appId && cfg.authDomain ? cfg : null;
}

export const cloudEnabled = (): boolean => firebaseConfig() !== null;

/** Grupos sugeridos para el registro (VITE_OVA_GRUPOS="Grupo 1,Grupo 2"). */
export const suggestedGroups = (): string[] =>
  String(env.VITE_OVA_GRUPOS ?? '')
    .split(',')
    .map((g: string) => g.trim())
    .filter(Boolean);
