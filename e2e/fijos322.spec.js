import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const cargar = page => page.evaluate(() => {
  accounts.push({ id: 'amex', name: 'Amex', emoji: '💳', type: 'credit', closingDay: 26, dueDay: 9 });
  saveAccounts();
  expenses = [
    { id: 'apple', type: 'Egreso', amount: 6.99, myAmount: 6.99, currency: 'USD', exchangeRate: 1000, arsEquiv: 6990, date: '2026-11-19', category: 'Servicios', description: 'Apple (suscripción)', accountId: 'amex', cardExpType: 'recurring', ccPaid: false },
    { id: 'max', type: 'Egreso', amount: 8123, myAmount: 8123, date: '2026-11-19', category: 'Streaming', description: 'Max', accountId: 'amex', cardExpType: 'recurring', ccPaid: false },
  ];
  saveLocal(); renderAll();
});

test('3.22 confirmar un fijo de tarjeta lo anota en el movimiento y no vuelve a pedirse (ni en otro dispositivo)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T12:00:00') });
  await openApp(page);
  await cargar(page);
  const aviso = page.locator('#recurring-reminders');
  await expect(aviso).toContainText('Apple');
  await expect(aviso).toContainText('Max');
  await aviso.getByRole('button', { name: 'Confirmar' }).first().click();
  await expect(aviso).not.toContainText('Apple');
  await expect(aviso).toContainText('Max');
  expect(await page.evaluate(() => expenses.find(e => e.id === 'apple').fijoOk)).toBe('2026-11');
  // "otro dispositivo": sin la marca local de omitidos, igual no aparece, porque la marca viaja con el movimiento
  await page.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith('gp_skipped_rec')).forEach(k => localStorage.removeItem(k)); renderRecurringReminders(); });
  await expect(aviso).not.toContainText('Apple');
  // y sigue en el resumen de la tarjeta: no se duplicó nada
  expect(await page.evaluate(() => expenses.filter(e => /Apple/.test(e.description)).length)).toBe(1);
  noErrors(page);
});

test('3.22 el lápiz de un fijo de tarjeta edita ese mismo movimiento (no crea otro igual)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T12:00:00') });
  await openApp(page);
  await cargar(page);
  await page.locator('#recurring-reminders').getByRole('button').filter({ has: page.locator('svg') }).nth(1).click(); // lápiz de Apple
  await expect(page.locator('#m-overlay')).toHaveClass(/\bon\b/);
  expect(await page.locator('#f-id').inputValue()).toBe('apple'); // edita el existente
  await page.locator('#f-amt').fill('7.5');
  await page.evaluate(async () => { await saveExpense(); });
  expect(await page.evaluate(() => expenses.filter(e => /Apple/.test(e.description)).map(e => [e.id, e.amount]))).toEqual([['apple', 7.5]]);
  await expect(page.locator('#recurring-reminders')).not.toContainText('Apple');
  noErrors(page);
});
