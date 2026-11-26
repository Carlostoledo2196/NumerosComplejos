import { defineConfig } from 'vitest/config';

// base relativa: el build funciona igual en un servidor web que dentro de un paquete SCORM.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: { globals: true, include: ['tests/**/*.test.ts'] },
});
