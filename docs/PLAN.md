# Plan del proyecto · OVA «Evocación de Números Complejos y Computación Cuántica»

Fuentes:
- `docs/guion-instruccional-original.docx`: guion instruccional (documento rector).
- `legacy/prototipo-ova.html`: prototipo funcional de un solo archivo (≈85 % del guion).

## 1. Decisiones de arranque

Tomadas por defecto según la recomendación del análisis. Cualquiera se puede cambiar.

| # | Decisión | Elección actual | Alternativa |
|---|----------|-----------------|-------------|
| D1 | Publicación | Sitio web estático **y** paquete SCORM 1.2 para Moodle (nota al libro de calificaciones) | Solo web, o xAPI/LTI |
| D2 | Base de código | Evolucionar el prototipo: se extrae la lógica, se modulariza y se prueba | Reescritura total / Genially + H5P |
| D3 | Reto de programación del cierre | Constructor de circuitos por bloques (X, Y, Z, H, S): el estudiante arma la secuencia que lleva \|0⟩ al estado objetivo, y un evaluador la verifica (igualdad salvo fase global) | Pseudocódigo tipo Qiskit evaluado en el navegador |
| D4 | Video de la escena 1 | Animación programada (bit vs. cúbit + esfera de Bloch) con locución, transcripción y subtítulos | Video producido por la institución (se puede insertar después sin cambiar código) |
| D5 | Inconsistencias del guion | Se corrigen en la OVA y se documentan en `docs/correcciones-guion.md` para actualizar el .docx | Entregar el .docx revisado |
| D6 | Tecnología | Vite + TypeScript, sin framework de UI; KaTeX empaquetado localmente (funciona sin conexión); Vitest para pruebas | React/Vue |
| D7 | Encuesta final | Formulario dentro de la OVA, que se guarda en SCORM (`cmi.comments` / suspend_data), con enlace opcional a Google Forms | Solo Google Forms |

## 2. Arquitectura

```
ova-complejos-cuanticos/
├─ docs/                 plan, correcciones al guion, guion original
├─ legacy/               prototipo HTML original (referencia, no se modifica)
├─ src/
│  ├─ core/              lógica pura sin DOM, 100 % probada
│  │  ├─ complex.ts        aritmética en ℂ, polar, potencias de i, parseo y formato
│  │  ├─ matrix.ts         suma, escalar, producto, potencia, det, inversa, daga, unitariedad
│  │  ├─ quantum.ts        cúbits, compuertas, esfera de Bloch, fase global
│  │  ├─ circuits.ts       evaluador del reto de circuitos (D3)
│  │  ├─ exercises.ts      generadores de ejercicios con desglose paso a paso
│  │  ├─ assessment.ts     ponderación 40/60, rúbrica 1.0–5.0, insignia
│  │  └─ random.ts         generador pseudoaleatorio con semilla (reproducible)
│  ├─ content/           textos, preguntas y retos (editables por docentes)
│  ├─ platform/          guardado (localStorage + SCORM), exportación de informe   [Fase 4]
│  ├─ ui/                tema accesible, navegación, KaTeX, audio                     [Fase 3]
│  └─ scenes/            escena01 … escena10                                           [Fase 3]
└─ tests/                pruebas unitarias del núcleo
```

Principio rector: **ningún cálculo que corrija al estudiante vive en la interfaz.** Todo pasa por `src/core`, que tiene pruebas. Una OVA que corrige mal un signo refuerza justamente el error que quiere eliminar (el término −bd).

## 3. Fases

| Fase | Entregable | Estado |
|------|------------|--------|
| 0 | Plan, decisiones y correcciones del guion | ✅ |
| 1 | Esqueleto del proyecto (Vite + TS + Vitest) | ✅ |
| 2 | Núcleo matemático con pruebas: complejos, matrices, cúbits, circuitos, ejercicios, evaluación | ✅ |
| 3 | Migrar las escenas 1–10 del prototipo a módulos que usan `core` | ⏳ siguiente |
| 4 | Lo que falta: reto de circuitos, ponderación 40/60, confianza antes/después, guardado local y SCORM | |
| 5 | Empaquetado SCORM .zip, auditoría WCAG 2.1 AA (teclado, contraste, lector de pantalla) y prueba en Moodle | |
| 6 | Piloto con un grupo y ajustes según la encuesta | |

## 4. Modelo de evaluación (concreta lo que el guion deja abierto)

- **Diagnóstica (0 %)**: escena 1 (3 preguntas) y confianza inicial de 1 a 5. Solo informa.
- **Formativa (40 %)**: aciertos sobre intentos en los laboratorios de los RAP 2, 3 y 4 (escenas 3–7). Cuenta el **mejor** desempeño de cada laboratorio, para no castigar el reintento (DUA: retroalimentación no punitiva).
- **Sumativa (60 %)**: reto integrador (escena 10) más el reto de circuitos, con los criterios de la rúbrica:
  - C1 Evocación y operaciones en ℂ (30 %) ← RAP 1 y RAP 2
  - C2 Matrices complejas y determinantes (30 %) ← RAP 3 y RAP 4
  - C3 Aplicación en computación cuántica (40 %) ← RAP 5 + reto de circuitos
- **Escala**: nota = 1.0 + 4.0 × fracción de logro. Niveles: Bajo 1.0–2.9, Básico 3.0–3.9, Alto 4.0–4.5, Superior 4.6–5.0.
- **Insignia**: nota sumativa ≥ 3.0 (nivel Básico o superior).
- **Nota final** = 0.4 · formativa + 0.6 · sumativa. Es la que se reporta a SCORM (`cmi.core.score.raw` en escala 0–100).

## 5. Tiempos reconciliados (60 min)

El guion tiene tres esquemas de tiempo que no coinciden. Se propone una sola distribución que respeta la tabla de fases didácticas (5 + 40 + 10 + 5):

| Fase didáctica | Escenas | Min |
|---|---|---|
| Inicio: evocación y enganche | E1 | 5 |
| Desarrollo: construcción e interacción | E2, E3, E4, E5, E6, E7, E8, E9 (5 min c/u) | 40 |
| Cierre: transferencia y evaluación | E10 reto integrador + reto de circuitos | 10 |
| Encuesta | Autoevaluación DUA | 5 |

Así, los módulos quedan en M1 10 · M2 15 · M3 10 · M4 10 · M5 15. Si el equipo prefiere conservar 15 min para matrices (M3), se puede quitar el tiempo a M4 o al reto. Es una decisión pedagógica abierta.
