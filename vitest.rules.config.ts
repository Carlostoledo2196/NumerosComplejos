import { defineConfig } from 'vitest/config';

// Pruebas de las reglas de Firestore: se ejecutan con el emulador (npm run test:rules).
export default defineConfig({
  test: { globals: true, include: ['tests-rules/**/*.test.ts'], testTimeout: 20000, fileParallelism: false },
});
