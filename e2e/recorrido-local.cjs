// Recorrido de punta a punta: interactúa con cada escena y verifica resultados y errores de consola.
const { chromium } = require('playwright');
const assert = (cond, msg) => { if (!cond) throw new Error('FALLO: ' + msg); console.log('  ok · ' + msg); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(process.argv[2], { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  console.log('Escena 1');
  await page.locator('#e1 .scale button', { hasText: '2' }).click();
  await page.getByRole('button', { name: 'Iniciar desafío de evocación' }).click();
  const diag = page.locator('#e1 .options');
  await diag.nth(0).locator('button').nth(1).click();
  await diag.nth(1).locator('button').nth(1).click();
  await diag.nth(2).locator('button').nth(0).click();
  assert(await page.locator('#e1 .feedback--ok').count() === 3, 'diagnóstico: 3 respuestas correctas con retroalimentación');

  console.log('Escena 2');
  await page.getByLabel('Parte real (a)').fill('3');
  await page.getByLabel('Parte imaginaria (b)').fill('2');
  await page.getByRole('button', { name: 'Verificar vector' }).click();
  assert(await page.locator('#e2 .feedback--ok').count() === 1, 'Argand: z = 3 + 2i ubicado');
  await page.getByRole('application').focus();
  await page.keyboard.press('ArrowLeft');
  assert((await page.locator('#e2 .readout').textContent()).includes('2.5 + 2i'), 'Argand: flecha izquierda mueve el punto 0.5');
  const left = page.locator('#e2 .match .options').nth(0).locator('button');
  const right = page.locator('#e2 .match .options').nth(1).locator('button');
  // rightOrder = [2, 0, 3, 1]
  for (const [l, r] of [[0, 1], [1, 3], [2, 0], [3, 2]]) { await left.nth(l).click(); await right.nth(r).click(); }
  assert((await page.locator('#e2').textContent()).includes('Emparejados: 4 / 4'), 'emparejamiento completo');
  assert(await page.locator('.route__item.is-done').count() === 1, 'módulo 1 marcado como completado');

  console.log('Escena 3');
  // leer el ejercicio desde la anotación TeX y responder bien
  const ann = await page.locator('#e3 .big-expr annotation').textContent();
  const nums = ann.match(/-?\d+/g).map(Number); // a, b, c, d (formato "a ± bi")
  const sign = (s) => s.includes(' - ') ? -1 : 1;
  const [z1, z2] = ann.split('\\cdot').map((s) => s.replace(/[()\\;]/g, '').trim());
  const parse = (s) => { const m = s.match(/^(-?\d+)\s*([+-])\s*(\d*)i$/); return [Number(m[1]), (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : Number(m[3]))]; };
  const [a, b] = parse(z1), [c, d] = parse(z2);
  void nums; void sign;
  await page.getByLabel('Parte real (ac − bd)').fill(String(a * c + b * d)); // error típico
  await page.getByLabel('Coeficiente imaginario (ad + bc)').fill(String(a * d + b * c));
  await page.locator('#e3').getByRole('button', { name: 'Verificar' }).click();
  assert((await page.locator('#e3 .feedback.is-visible').first().textContent()).includes('Error de signo en i²') || b * d === 0, 'escena 3: detecta el error ac + bd');
  await page.getByLabel('Parte real (ac − bd)').fill(String(a * c - b * d));
  await page.locator('#e3').getByRole('button', { name: 'Verificar' }).click();
  assert(await page.locator('#e3 .feedback--ok').count() === 1, 'escena 3: respuesta correcta aceptada');

  console.log('Escena 4');
  await page.getByLabel('Prueba un exponente n').fill('-1');
  assert((await page.locator('#e4 .panel').first().textContent()).includes('i^{-1} = i^{3} = -i'), 'rueda: i^-1 = -i');
  await page.getByRole('button', { name: 'Modo DUA sin límite de tiempo' }).click();
  await page.getByRole('button', { name: /Iniciar prueba de velocidad/ }).click();
  for (let k = 0; k < 5; k++) {
    await page.waitForFunction(() => [...document.querySelectorAll('#e4 .btn-row[role=group] button')].some((b) => !b.disabled));
    await page.locator('#e4 .btn-row[role=group] button').first().click();
    await page.waitForTimeout(1900);
  }
  assert((await page.locator('#e4 .feedback.is-visible').first().textContent()).includes('Prueba terminada'), 'juego de velocidad completo (5 preguntas)');

  console.log('Escena 5');
  for (let tries = 0; tries < 30; tries++) {
    const ok = await page.locator('#e5 .order-item').evaluateAll((els) => els.map((e) => e.textContent));
    const want = ['Identifica', 'Multiplica', 'El denominador', 'Expande'];
    const pos = ok.findIndex((t, i) => !t.includes(want[i]));
    if (pos === -1) break;
    const target = ok.findIndex((t) => t.includes(want[pos]));
    await page.locator('#e5 .order-item').nth(target).getByRole('button', { name: /Subir/ }).click();
  }
  await page.getByRole('button', { name: 'Verificar secuencia' }).click();
  assert(await page.locator('#e5 .feedback--ok').count() === 1, 'división: pasos ordenados correctamente');
  await page.getByLabel('1. Conjugado del denominador').fill('1+1i');
  await page.locator('#e5').getByRole('button', { name: 'Comprobar' }).click();
  assert(await page.locator('#e5 .feedback--err').count() >= 1, 'división: respuesta incompleta marcada con retroalimentación');

  console.log('Escena 6');
  await page.locator('#e6 select').first().selectOption('det');
  await page.locator('#e6').getByRole('button', { name: 'Mostrar solución' }).click();
  assert((await page.locator('#e6 .feedback.is-visible').first().textContent()).includes('det'), 'matrices reales: solución de det(A)');
  await page.locator('#e6').getByRole('button', { name: 'Probar una matriz singular' }).click();
  assert((await page.locator('#e6').textContent()).includes('singular'), 'matrices reales: aviso de matriz singular');

  console.log('Escena 7');
  await page.locator('#e7').getByRole('button', { name: /Pauli-Y y Hadamard/ }).click();
  const S = Math.SQRT1_2;
  const YH = [['-i/√2', 'i/√2'], ['i/√2', 'i/√2']]; // Y·H
  const cells = page.locator('#e7 .panel--outline .matrix-editor input');
  for (let t = 0; t < 4; t++) await cells.nth(t).fill(YH[Math.floor(t / 2)][t % 2]);
  await cells.nth(0).focus();
  assert((await page.locator('#e7').textContent()).includes('fila 1 de'), 'matrices complejas: traza fila-columna visible');
  await page.locator('#e7').getByRole('button', { name: 'Verificar resultado' }).click();
  assert(await page.locator('#e7 .feedback--ok').count() === 1, 'matrices complejas: YH correcto con entradas tipo i/√2');
  void S;

  console.log('Escena 8');
  await page.locator('#e8').getByRole('button', { name: '|+i⟩' }).click();
  assert((await page.locator('#e8 .readout').textContent()).includes('(0.00, 1.00, 0.00)'), 'Bloch: |+i⟩ en el eje y');

  console.log('Escena 9');
  await page.locator('#e9 select').selectOption('y-zero');
  await page.getByLabel("Nueva amplitud α'").fill('0');
  await page.getByLabel("Nueva amplitud β'").fill('i');
  await page.locator('#e9').getByRole('button', { name: 'Aplicar y verificar' }).click();
  assert(await page.locator('#e9 .feedback--ok').count() === 1, 'compuertas: Y|0⟩ = i|1⟩');
  await page.locator('#e9 select').selectOption('h-one');
  await page.getByLabel("Nueva amplitud α'").fill('1/√2');
  await page.getByLabel("Nueva amplitud β'").fill('-1/sqrt(2)');
  await page.locator('#e9').getByRole('button', { name: 'Aplicar y verificar' }).click();
  assert(await page.locator('#e9 .feedback--ok').count() === 1, 'compuertas: H|1⟩ = |−⟩ con 1/√2');

  console.log('Escena 10');
  const run = async (id, gates) => {
    await page.locator('#e10 select').first().selectOption(id);
    for (const g of gates) await page.locator('#e10 [aria-label="Compuertas disponibles"] button', { hasText: new RegExp(`^${g}$`) }).click();
    await page.getByRole('button', { name: 'Ejecutar circuito' }).click();
  };
  await run('minus', ['Z', 'H']);
  assert(await page.locator('#e10 .feedback--err').count() >= 1, 'circuitos: Z luego H no da |−⟩');
  await page.getByRole('button', { name: 'Limpiar' }).click();
  await page.getByRole('button', { name: 'Ejecutar circuito' }).click();
  await run('minus', ['H', 'Z']);
  assert((await page.locator('#e10 pre.code').textContent()).includes('q = H(q)\nq = Z(q)'), 'circuitos: código conceptual');
  await run('flip', ['X']);
  await run('plus-i', ['H', 'S']);
  assert((await page.locator('#e10').textContent()).includes('Resueltos: 3 / 6'), 'circuitos: 3 retos resueltos');

  // cuestionario: elegir A en todas; sin revelar antes de calificar
  const qs = page.locator('#e10 .options[aria-label^="RAP"]');
  for (let k = 0; k < 5; k++) await qs.nth(k).locator('button').first().click();
  assert(await page.locator('#e10 .option.is-ok, #e10 .option.is-err').count() === 0, 'cuestionario: no revela acierto antes de calificar');
  await page.getByRole('button', { name: 'Calificar reto integrador' }).click();
  assert(await page.locator('#e10 .option.is-ok, #e10 .option.is-err').count() === 5, 'cuestionario: revela las 5 respuestas al calificar');
  assert(await page.locator('#e10 button.option:disabled').count() === 15, 'cuestionario: opciones bloqueadas tras calificar');
  await page.locator('[aria-label="Confianza final del 1 al 5"] button', { hasText: '4' }).click();
  assert((await page.locator('#e10 .report').textContent()).includes('Confianza: 2 → 4 / 5 (+2)'), 'informe: comparación de confianza');
  assert(await page.locator('#e10 .grade').count() === 1, 'informe: nota final visible');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descargar informe/ }).click()]);
  assert(dl.suggestedFilename() === 'informe-ova-complejos.txt', 'informe: descarga .txt');

  console.log('Persistencia');
  const before = await page.locator('.route__item.is-done').count();
  await page.reload({ waitUntil: 'networkidle' });
  assert(await page.locator('.route__item.is-done').count() === before, `progreso conservado tras recargar (${before} módulos)`);
  assert(await page.locator('#e10 .grade').count() === 1, 'informe conservado tras recargar');

  console.log('Preferencias');
  await page.getByRole('button', { name: 'Tema oscuro' }).click();
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'tema oscuro aplicado');
  await page.screenshot({ path: process.argv[3] + '-dark.png', fullPage: false });

  await browser.close();
  if (errors.length) { console.log('ERRORES DE CONSOLA:\n' + errors.join('\n')); process.exit(1); }
  console.log('\nRecorrido completo sin errores de consola.');
})().catch((e) => { console.error(e.message); process.exit(1); });
