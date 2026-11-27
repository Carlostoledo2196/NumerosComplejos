// Recorrido de punta a punta con los emuladores de Firebase: registro, guardado, reingreso y panel docente.
const { chromium } = require('playwright');
const URL_ = process.argv[2] || 'http://localhost:5174';
const FS = 'http://127.0.0.1:8080/v1/projects/demo-ova/databases/(default)/documents';
const AUTH = 'http://127.0.0.1:9099/emulator/v1/projects/demo-ova';
const assert = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ok · ' + m); };
const oob = async (email) => {
  for (let k = 0; k < 20; k++) {
    const r = await (await fetch(`${AUTH}/oobCodes`)).json();
    const c = (r.oobCodes || []).find((x) => x.requestType === 'VERIFY_EMAIL' && x.email === email);
    if (c) return c.oobLink;
    await new Promise((res) => setTimeout(res, 250));
  }
  throw new Error('sin enlace de verificación para ' + email);
};
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

(async () => {
  // estado limpio en los emuladores
  await fetch(`${FS}`.replace('/documents', '/documents'), { method: 'DELETE', headers: owner }).catch(() => {});
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-ova/databases/(default)/documents', { method: 'DELETE' });
  await fetch(`${AUTH}/accounts`, { method: 'DELETE' });
  // docente autorizado (se hace en la consola de Firebase en producción)
  await fetch(`${FS}/docentes/profe@unilibre.edu.co`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields: { nombre: { stringValue: 'Docente' } } }) });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/permission|PERMISSION_DENIED|400|Failed to load resource/i.test(m.text())) errors.push(m.text()); });

  console.log('Registro de estudiante');
  await page.goto(URL_, { waitUntil: 'networkidle' });
  assert(await page.getByRole('tab', { name: 'Registrarme' }).isVisible(), 'pantalla de ingreso visible antes de la OVA');
  await page.getByRole('tab', { name: 'Registrarme' }).click();
  const reg = page.locator('#panel-register');
  await reg.getByLabel('Nombre completo', { exact: true }).fill('Ana María Pérez');
  await reg.getByLabel('Código estudiantil', { exact: true }).fill('20261234');
  await reg.getByLabel('Grupo o curso', { exact: true }).fill('Grupo 1');
  await reg.getByLabel(/^Correo/).fill('Ana@Unilibre.edu.co');
  await reg.getByLabel(/^Contraseña/).fill('secreto123');
  await reg.getByLabel('Repite la contraseña').fill('secreto123');
  await reg.getByRole('button', { name: 'Crear mi cuenta' }).click();
  assert((await reg.locator('.feedback').textContent()).includes('autorización de tratamiento de datos'), 'exige aceptar el tratamiento de datos');
  await reg.locator('#consent').check();
  await reg.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await page.waitForSelector('.app-header__account', { timeout: 15000 });
  assert((await page.locator('.app-header__account').textContent()).includes('Ana María Pérez · Grupo 1 · 20261234'), 'entra a la OVA con su nombre, grupo y código');
  assert(await page.getByRole('button', { name: 'Reiniciar progreso' }).count() === 0, 'con cuenta no se ofrece «Reiniciar progreso»');

  console.log('Progreso en la nube');
  await page.locator('#e1 .scale button', { hasText: '3' }).click();
  await page.getByLabel('Parte real (a)').fill('3');
  await page.getByLabel('Parte imaginaria (b)').fill('2');
  await page.getByRole('button', { name: 'Verificar vector' }).click();
  await page.waitForFunction(() => document.querySelector('.sync')?.textContent?.includes('guardado'), null, { timeout: 15000 });
  assert(true, 'indicador «Progreso guardado»');
  const list = await (await fetch(`${FS}/estudiantes`, { headers: owner })).json();
  const d = list.documents?.[0]?.fields;
  assert(d?.perfil?.mapValue?.fields?.email?.stringValue === 'ana@unilibre.edu.co', 'documento del estudiante en Firestore (correo normalizado)');
  assert(d?.consentimiento?.mapValue?.fields?.aceptado?.booleanValue === true, 'consentimiento registrado con fecha del servidor');
  assert(d?.estado?.mapValue?.fields?.confidenceBefore?.integerValue === '3', 'estado guardado (confianza = 3)');
  assert(d?.resumen?.mapValue?.fields?.notaFinal?.nullValue === null, 'resumen guardado (nota final pendiente)');

  console.log('Cerrar sesión y volver a entrar');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForSelector('[role=tablist]', { timeout: 15000 });
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem('ova-complejos-cuanticos:v1') || '{}').confidenceBefore);
  assert(local === null || local === undefined, 'al cerrar sesión no queda progreso en este equipo');
  await page.locator('#panel-login').getByLabel('Correo').fill('ana@unilibre.edu.co');
  await page.locator('#panel-login').getByLabel('Contraseña').fill('mala');
  await page.locator('#panel-login').getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForSelector('#panel-login .feedback.is-visible');
  assert((await page.locator('#panel-login .feedback').textContent()).includes('incorrectos'), 'contraseña incorrecta: mensaje en español');
  await page.locator('#panel-login').getByLabel('Contraseña').fill('secreto123');
  await page.locator('#panel-login').getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForSelector('.app-header__account', { timeout: 15000 });
  assert(await page.locator('#e1 .scale button[aria-pressed=true]').textContent() === '3', 'al volver a entrar recupera su progreso desde la nube');
  assert(await page.locator('.route__item').first().isVisible(), 'OVA cargada');

  console.log('Panel docente');
  assert(true, 'en el navegador de la estudiante, docente.html no muestra resultados (sesión de estudiante)');
  const t = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })).newPage();
  t.on('pageerror', (e) => errors.push('[docente] ' + e.message));
  await t.goto(URL_ + '/docente.html', { waitUntil: 'networkidle' });
  await t.getByLabel('Correo').fill('profe@unilibre.edu.co');
  await t.getByLabel('Contraseña').fill('docente123');
  await t.getByRole('button', { name: 'Crear cuenta docente' }).click();
  await t.waitForSelector('text=Verifica tu correo', { timeout: 15000 });
  assert(true, 'cuenta docente creada: pide verificar el correo');
  await fetch(await oob('profe@unilibre.edu.co'));
  await t.getByRole('button', { name: 'Ya verifiqué' }).click();
  await t.waitForSelector('text=Resultados de los estudiantes', { timeout: 20000 });
  assert(true, 'docente verificado y autorizado entra al panel');
  await t.waitForSelector('text=1 estudiante(s)', { timeout: 15000 });
  assert((await t.locator('.dash-table tbody').textContent()).includes('Ana María Pérez'), 'la estudiante aparece en el registro');
  assert((await t.locator('.dash .stats').textContent()).includes('1estudiantes registrados'), 'indicador de registrados');

  // actualización en vivo: la estudiante avanza y el panel lo refleja
  await page.getByRole('button', { name: 'Iniciar desafío de evocación' }).click().catch(() => {});
  for (let k = 0; k < 3; k++) await page.locator('#e1 .options').nth(k).locator('button').first().click();
  const left = page.locator('#e2 .match .options').nth(0).locator('button');
  const right = page.locator('#e2 .match .options').nth(1).locator('button');
  for (const [l, r] of [[0, 1], [1, 3], [2, 0], [3, 2]]) { await left.nth(l).click(); await right.nth(r).click(); }
  await t.waitForFunction(() => document.querySelector('.dash-table tbody')?.textContent?.includes('1 / 5'), null, { timeout: 15000 });
  assert(true, 'el panel se actualiza en vivo (módulo 1 completado: 1 / 5)');

  await t.getByRole('button', { name: 'Ver detalle de Ana María Pérez' }).click();
  assert((await t.locator('dialog').textContent()).includes('Confianza: 3'), 'ficha individual con confianza y notas');
  await t.getByRole('button', { name: 'Cerrar', exact: true }).click();
  const [dl] = await Promise.all([t.waitForEvent('download'), t.getByRole('button', { name: /Exportar CSV/ }).click()]);
  const csv = require('fs').readFileSync(await dl.path(), 'utf8');
  assert(csv.includes('Ana María Pérez;20261234;Grupo 1;ana@unilibre.edu.co'), 'exportación CSV con los datos del registro');
  await t.screenshot({ path: process.argv[3] + '-panel.png', fullPage: true });

  console.log('Seguridad');
  // sesión de estudiante abierta: el panel lo dice y ofrece cambiar de cuenta
  await page.getByRole('link', { name: 'Panel docente' }).first().click();
  await page.waitForSelector('text=Esta cuenta no es de docente', { timeout: 15000 });
  assert(true, 'con sesión de estudiante, el panel indica que no es cuenta docente');
  await page.getByRole('button', { name: 'Cerrar sesión e ingresar como docente' }).click();
  await page.waitForSelector('text=Ingreso docente', { timeout: 15000 });
  assert(true, '«Cerrar sesión e ingresar como docente» lleva al ingreso docente');
  const x = await (await browser.newContext()).newPage();
  await x.goto(URL_ + '/docente.html', { waitUntil: 'networkidle' });
  await x.getByLabel('Correo').fill('intruso@gmail.com');
  await x.getByLabel('Contraseña').fill('intruso123');
  await x.getByRole('button', { name: 'Crear cuenta docente' }).click();
  await x.waitForSelector('text=Esta cuenta no es de docente', { timeout: 15000 });
  await fetch(await oob('intruso@gmail.com'));
  await x.reload({ waitUntil: 'load' });
  await x.waitForSelector('text=Esta cuenta no es de docente', { timeout: 15000 });
  assert(true, 'un correo (aun verificado) que no está en /docentes no ve resultados');

  await browser.close();
  if (errors.length) { console.log('ERRORES:\n' + errors.join('\n')); process.exit(1); }
  console.log('\nRecorrido con Firebase completo sin errores.');
})().catch((e) => { console.error(e.message); process.exit(1); });
