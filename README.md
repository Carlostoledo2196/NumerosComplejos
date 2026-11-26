# OVA · Evocación de Números Complejos y Computación Cuántica

Objeto Virtual de Aprendizaje para *Matemáticas Avanzadas para Ingenieros* (Ingeniería de Sistemas, 5.º semestre).

- Plan, decisiones y fases: [`docs/PLAN.md`](docs/PLAN.md)
- Correcciones propuestas al guion: [`docs/correcciones-guion.md`](docs/correcciones-guion.md)
- Prototipo original (referencia): [`legacy/prototipo-ova.html`](legacy/prototipo-ova.html)

## Uso

```bash
npm install
npm test          # pruebas del núcleo matemático
npm run dev       # servidor local
npm run build     # sitio estático en dist/
```

## Núcleo (`src/core`)

| Módulo | Contenido | Escenas / RAP |
|---|---|---|
| `complex.ts` | Aritmética en ℂ, forma polar con cuadrante correcto, ciclo de iⁿ, analizador de respuestas | E2–E5 · RAP 1–2 |
| `matrix.ts` | Suma, escalar, producto, potencia, determinante con desglose, inversa, daga, unitariedad | E6–E7 · RAP 3–4 |
| `quantum.ts` | Cúbits, compuertas X Y Z H S T, esfera de Bloch, fase global | E8–E9 · RAP 5 |
| `circuits.ts` | Reto de circuitos por bloques con evaluador y solución óptima | Cierre · RAP 5 |
| `exercises.ts` | Generadores con pasos y diagnóstico del error típico | E3–E5 |
| `assessment.ts` | Formativa 40 % / sumativa 60 %, rúbrica 1.0–5.0, insignia, puntaje SCORM | E10 |
