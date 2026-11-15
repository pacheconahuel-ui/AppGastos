import { test, expect } from '@playwright/test';
import { newUser, device, pending } from './helpers.js';

// Dos dispositivos con la misma cuenta tocan secciones distintas de la configuración al mismo tiempo
test('3.27 la configuración se sube por secciones: dos dispositivos no se pisan', async ({ browser }) => {
  const email = await newUser();
  const A = await device(browser, email), B = await device(browser, email);
  // B "no se entera" de lo que hace A: se le corta el listener de configuración
  await B.evaluate(() => { db.ref(settingsPath()).off(); });
  await A.evaluate(() => { transfers.push({ id: 'tf_a', fromId: 'acc_mp', toId: 'acc_efectivo', amount: 123, date: todayStr(), description: 'desde A' }); saveAccounts(); pushSettings(); });
  const leer = () => B.evaluate(async () => (await db.ref(settingsPath()).once('value')).val());
  await expect.poll(async () => ((await leer())?.transfers || []).length).toBe(1);
  // B (que todavía no vio la transferencia) toca los presupuestos: con el envío completo viejo, borraba la transferencia de A
  await B.evaluate(async () => { budgets = { Luz: 5000 }; saveBudgets(); await pushSettings(); });
  await expect.poll(async () => (await leer())?.budgets?.Luz).toBe(5000);
  const r = await leer();
  expect(r.transfers).toHaveLength(1);             // lo de A sigue
  expect(r.transfers[0].description).toBe('desde A');
  expect(r.budgets.Luz).toBe(5000);                // y lo de B también
  // A recibe el presupuesto y conserva su transferencia
  await expect.poll(() => A.evaluate(() => [transfers.length, budgets.Luz])).toEqual([1, 5000]);
  // borrar una sección entera también se propaga (las listas vacías se borran)
  await A.evaluate(() => { transfers = []; saveAccounts(); pushSettings(); });
  await expect.poll(async () => ((await leer())?.transfers || []).length).toBe(0);
  expect((await leer()).budgets.Luz).toBe(5000);
  await expect.poll(() => pending(A)).toBe(0);
});
