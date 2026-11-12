import { test, expect } from '@playwright/test';
import { newUser, device } from './helpers.js';

const base = 'http://127.0.0.1:9000';
const put = async (tok, p, d) => (await fetch(`${base}/${p}.json?ns=gastos-pache-default-rtdb&auth=${tok}`, { method: 'PUT', body: JSON.stringify(d) })).status;

test('los avisos ya vistos con más de 60 días se borran solos; los nuevos y los sin ver quedan', async ({ browser }) => {
  const email = await newUser();
  const A = await device(browser, email);
  const { tok, uid } = await A.evaluate(async () => ({ tok: await auth.currentUser.getIdToken(), uid: currentUID }));
  const dia = 86400000, ahora = Date.now();
  const av = (id, creado, visto) => ({ id, tipo: 'baja', de: 'otro', ref: 'r' + id, creado, monto: 1, ...(visto ? { visto: true } : {}) });
  expect(await put(tok, `avisos/${uid}/viejo_visto`, av('viejo_visto', ahora - 70 * dia, true))).toBe(200);
  expect(await put(tok, `avisos/${uid}/viejo_sin_ver`, av('viejo_sin_ver', ahora - 70 * dia, false))).toBe(200);
  expect(await put(tok, `avisos/${uid}/nuevo_visto`, av('nuevo_visto', ahora - 5 * dia, true))).toBe(200);
  const B = await device(browser, email); // otra sesión: al abrir limpia
  await expect.poll(() => B.evaluate(() => avisosIn.map(a => a.id).sort().join(','))).toBe('nuevo_visto,viejo_sin_ver');
  const quedan = await (await fetch(`${base}/avisos/${uid}.json?ns=gastos-pache-default-rtdb&auth=${tok}`)).json();
  expect(Object.keys(quedan).sort()).toEqual(['nuevo_visto', 'viejo_sin_ver']);
  expect(B.errs).toEqual([]);
});
