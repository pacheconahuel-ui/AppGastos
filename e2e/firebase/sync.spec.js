import { test, expect } from '@playwright/test';
import { newUser, device, pending } from './helpers.js';

test('dos dispositivos: cambios seguidos, borrar lo último y claves con "/"', async ({ browser }) => {
  const email = await newUser();
  const A = await device(browser, email), B = await device(browser, email);

  await A.evaluate(() => {
    accounts.push({ id: 'x1', name: 'Uno', emoji: '1', type: 'wallet', initialBalance: 0 }); saveAccounts(); pushSettings();
    accounts.push({ id: 'x2', name: 'Dos', emoji: '2', type: 'wallet', initialBalance: 0 }); saveAccounts(); pushSettings();
  });
  await expect.poll(() => B.evaluate(() => accounts.filter(a => a.id.startsWith('x')).map(a => a.id).join())).toBe('x1,x2');
  expect(await A.evaluate(() => accounts.filter(a => a.id.startsWith('x')).length)).toBe(2);

  // borrar la única transferencia tiene que llegar al otro dispositivo
  await A.evaluate(() => { transfers = [{ id: 'tf1', fromId: 'acc_mp', toId: 'acc_efectivo', amount: 10, date: todayStr(), description: 't' }]; saveAccounts(); pushSettings(); });
  await expect.poll(() => B.evaluate(() => transfers.length)).toBe(1);
  await A.evaluate(() => { transfers = []; saveAccounts(); pushSettings(); });
  await expect.poll(() => B.evaluate(() => transfers.length)).toBe(0);

  // presupuesto en una categoría con "/"
  await A.evaluate(() => { cats.push('Auto / Nafta'); budgets['Auto / Nafta'] = 5000; saveLocal(); saveBudgets(); pushSettings(); });
  await expect.poll(() => B.evaluate(() => budgets['Auto / Nafta'] || null)).toBe(5000);
  expect(await pending(A)).toBe(0);

  expect([...A.errs, ...B.errs]).toEqual([]);
});

test('borrar el único gasto no lo hace reaparecer desde el otro dispositivo', async ({ browser }) => {
  const email = await newUser();
  const A = await device(browser, email), B = await device(browser, email);
  await A.evaluate(() => { const e = { id: 'only1', type: 'Egreso', amount: 5, myAmount: 5, date: todayStr(), category: 'Luz', description: 'x', accountId: 'acc_mp' }; expenses.push(e); persistArs(e); });
  await expect.poll(() => B.evaluate(() => expenses.length)).toBe(1);
  await A.evaluate(() => { expenses = expenses.filter(e => e.id !== 'only1'); persistArs(null, 'only1'); });
  await expect.poll(() => B.evaluate(() => expenses.length)).toBe(0);
  await A.waitForTimeout(2000);
  expect(await A.evaluate(() => expenses.length)).toBe(0);
});

test('lo cargado sin conexión se sube al volver a abrir la app', async ({ browser }) => {
  const email = await newUser();
  const A = await device(browser, email), B = await device(browser, email);
  await A.context().setOffline(true);
  await A.waitForTimeout(1000);
  await A.evaluate(() => { const e = { id: 'off1', type: 'Egreso', amount: 77, myAmount: 77, date: todayStr(), category: 'Luz', description: 'offline', accountId: 'acc_mp' }; expenses.push(e); persistArs(e); });
  await A.context().setOffline(false);
  await A.reload();
  await expect.poll(() => B.evaluate(() => expenses.some(e => e.id === 'off1')), { timeout: 20000 }).toBe(true);
});
