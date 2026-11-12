import { test, expect } from '@playwright/test';
import { newUser, device } from './helpers.js';

const NS = 'ns=gastos-pache-default-rtdb';
const url = (p, auth) => `http://127.0.0.1:9000/${p}.json?${NS}&auth=${auth}`;
// El emulador deja escribir sin pasar por las reglas con el encabezado "Bearer owner" (lo que haría la consola)
const owner = async (p, d) => {
  const r = await fetch(`http://127.0.0.1:9000/${p}.json?${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: JSON.stringify(d) });
  expect(r.status, 'escritura de consola ' + p).toBe(200);
};
const as = (tok) => ({
  get: async p => (await fetch(url(p, tok))).status,
  put: async (p, d) => (await fetch(url(p, tok), { method: 'PUT', body: JSON.stringify(d) })).status,
});
const uidTok = page => page.evaluate(async () => ({ uid: currentUID, tok: await auth.currentUser.getIdToken() }));

test('acceso restringido: solo autorizados; el administrador ve la actividad y autoriza', async ({ browser }) => {
  const A = await device(browser, await newUser()); // administrador
  const B = await device(browser, await newUser()); // de la familia
  const C = await device(browser, await newUser()); // desconocido
  const a = await uidTok(A), b = await uidTok(B), c = await uidTok(C);
  await owner('admin/uid', a.uid); // lo único que se hace a mano en la consola

  // Cada uno deja su actividad (sin montos); la lectura es solo del administrador
  for (const P of [A, B, C]) { await P.evaluate(() => { localStorage.removeItem('gp_act_ts_' + currentUID); return registrarActividad(); }); }
  expect(await as(a.tok).get('actividad')).toBe(200);
  expect(await as(b.tok).get('actividad')).toBe(401);
  expect(await as(b.tok).put(`actividad/${c.uid}`, { ultimo: 1, version: 'x' })).toBe(401); // no se escribe la de otro
  expect(await as(b.tok).put('admin/uid', b.uid)).toBe(401);
  expect(await as(b.tok).put('config/restringido', true)).toBe(401);
  expect(await as(b.tok).put(`permitidos/${b.uid}`, true)).toBe(401);

  // Apagada, entra cualquiera
  expect(await as(c.tok).put(`usuarios/${c.uid}/settings`, { updatedAt: 1 })).toBe(200);

  // El administrador, desde la app: ve a todos, autoriza a B y prende la restricción
  await A.evaluate(() => verificarAcceso());
  await A.evaluate(() => openAdmin());
  await expect(A.locator('#lk-body')).toContainText('Administración');
  await expect(A.locator('.ad-user')).toHaveCount(3);
  await expect(A.locator('#lk-body')).toContainText('Sin autorizar');
  await A.evaluate(uid => adminAutorizar(uid, true), b.uid);
  await expect(A.locator('.ad-user').filter({ hasText: 'Sin autorizar' })).toHaveCount(1); // queda C
  await A.evaluate(async () => { await db.ref('config/restringido').set(true); });

  // Prendida: B (autorizado) y A (admin) siguen; C no ve ni escribe nada suyo
  expect(await as(b.tok).get(`usuarios/${b.uid}`)).toBe(200);
  expect(await as(a.tok).get(`usuarios/${a.uid}`)).toBe(200);
  expect(await as(c.tok).get(`usuarios/${c.uid}`)).toBe(401);
  expect(await as(c.tok).put(`usuarios/${c.uid}/settings`, { updatedAt: 2 })).toBe(401);
  // ...pero C sigue pudiendo aparecer en la lista del administrador
  expect(await as(c.tok).put(`actividad/${c.uid}`, { ultimo: 5, version: '3.17' })).toBe(200);

  // C ve la pantalla de "sin acceso", y B no
  await C.evaluate(async () => { const ok = await verificarAcceso(); if (!ok) bloquearAcceso(); });
  await expect(C.locator('#sin-acceso')).toBeVisible();
  await expect(C.locator('#app')).toBeHidden();
  expect(await B.evaluate(() => verificarAcceso())).toBe(true);

  // Se autoriza a C y pasa
  await owner(`permitidos/${c.uid}`, true);
  expect(await C.evaluate(() => verificarAcceso())).toBe(true);
  expect(await as(c.tok).get(`usuarios/${c.uid}`)).toBe(200);
  // Se le quita el acceso a B y se corta
  await A.evaluate(uid => adminAutorizar(uid, false), b.uid);
  expect(await as(b.tok).get(`usuarios/${b.uid}`)).toBe(401);
  // Apagar la restricción devuelve el acceso a todos
  await owner('config/restringido', false);
  expect(await as(b.tok).get(`usuarios/${b.uid}`)).toBe(200);
});

test('la restricción también cubre vínculos y avisos', async ({ browser }) => {
  const A = await device(browser, await newUser()), B = await device(browser, await newUser());
  const a = await uidTok(A), b = await uidTok(B);
  await owner('admin/uid', a.uid);
  await owner('config/restringido', true);
  expect(await as(b.tok).put(`vinculos/${b.uid}/secreto`, 'abcdefghijklmnop')).toBe(401);
  expect(await as(b.tok).get(`avisos/${b.uid}`)).toBe(401);
  expect(await as(a.tok).put(`vinculos/${a.uid}/secreto`, 'abcdefghijklmnop')).toBe(200); // el administrador siempre entra
  await owner('config/restringido', false);
});
