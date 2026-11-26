# Correcciones propuestas al guion instruccional

Hallazgos al contrastar el .docx con el prototipo. Cada uno indica dónde está y qué se propone. La OVA ya implementa la versión corregida.

| # | Sección del guion | Problema | Corrección propuesta |
|---|---|---|---|
| 1 | §3 tabla de fases, §4 módulos y escenas | Tres esquemas de tiempo incompatibles: M4 dice 15 min pero E8 + E9 suman 10; E10 dice 8 min dentro de un M5 de 5; la tabla de fases (5/40/10/5) no corresponde con los módulos | Unificar con la tabla de `PLAN.md §5` (todas las escenas de desarrollo de 5 min) |
| 2 | §5 Actividad 2, paso 3 | $T = Y\begin{pmatrix}\alpha\|0\rangle\\ \beta\|1\rangle\end{pmatrix}$ mete los kets dentro del vector columna | $\|\psi'\rangle = Y\begin{pmatrix}\alpha\\ \beta\end{pmatrix} = \begin{pmatrix}0 & -i\\ i & 0\end{pmatrix}\begin{pmatrix}\alpha\\ \beta\end{pmatrix} = \begin{pmatrix}-i\beta\\ i\alpha\end{pmatrix}$ |
| 3 | §4 Escena 2, retroalimentación | $\theta = \tan^{-1}(b/a)$ da el ángulo equivocado en los cuadrantes II y III, y no está definido para $a = 0$ | $\theta = \operatorname{atan2}(b, a)$, o $\tan^{-1}(b/a)$ más el ajuste por cuadrante (+180° si $a<0$). Es justo un error conceptual que la OVA debe enseñar |
| 4 | §7 matriz de alineación, RAP 5 | Lista las compuertas $Y, Z, H$; la escena 9 dice «Pauli y Hadamard», que incluye $X$ | Unificar como $X, Y, Z, H$ |
| 5 | §7 matriz de alineación, RAP 3 y RAP 4 | Las filas no tienen el texto corto del RAP, como sí lo tienen las demás | «RAP 3: Opera matrices con elementos en ℂ» / «RAP 4: Calcula determinantes con elementos en ℂ» |
| 6 | §6 rúbrica | RAP 3 y RAP 4 comparten el criterio «Operaciones con matrices complejas (30 %)», pero el título no menciona los determinantes | Renombrar a «Matrices complejas y determinantes (30 %)» |
| 7 | §3 cierre | Pide «reto de programación conceptual de compuertas» con «evaluador de código conceptual», pero no hay escena ni actividad que lo describa | Añadir a la escena 10 el reto de circuitos por bloques (ver `PLAN.md`, D3) |
| 8 | §6 esquema de evaluación | No define cómo se calcula el 40 % formativo | Adoptar `PLAN.md §4` |
| 9 | §4 Escena 10 | Dice «cuestionario adaptativo», pero los 5 reactivos son fijos | Quitar «adaptativo», o definir la regla (p. ej. un reactivo de refuerzo si falla un RAP). Por ahora: banco de reactivos por RAP con selección aleatoria |
| 10 | §4 Escena 8 | «phyton» | «Python» (o eliminarlo: el simulador es web) |
| 11 | §9 recurso 3 | GeoGebra para «contornos de integración en el plano complejo», tema que no está en esta OVA | Eliminar la mención |
| 12 | §9 recursos | Nombra Genially/H5P/GeoGebra; la implementación es web propia | Describir el recurso real: aplicación web HTML5 empaquetada como SCORM, compatible con Moodle |
| 13 | §4 Escena 1 | La confianza previa (1–5) se recoge pero no se usa | Comparar con la confianza final en la escena 10 (evidencia de metacognición, DUA 3) |
| 14 | §1 | «espacio vectorial de los números imaginarios» | Precisar: $\{bi : b\in\mathbb{R}\}$ es un espacio vectorial sobre $\mathbb{R}$, pero **no** es un campo (no es cerrado bajo el producto: $i\cdot i = -1 \notin \mathbb{I}m$). Es un buen motivo didáctico para ampliar a ℂ |
