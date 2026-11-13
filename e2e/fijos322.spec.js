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

// 3.23: al pagar un resumen, las cuotas y los fijos dejan una copia pagada en su mes y siguen adelante
test('3.23 pagar el resumen deja una copia pagada de cada fijo y cuota en su mes, y el movimiento sigue al mes siguiente', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T12:00:00') });
  await openApp(page);
  await page.evaluate(() => {
    accounts.push({ id: 'visa', name: 'Visa', emoji: '💳', type: 'credit', closingDay: 26, dueDay: 9 });
    saveAccounts();
    const e = (id, o) => ({ id, type: 'Egreso', amount: 1000, myAmount: 1000, category: 'Seguros', description: id, accountId: 'visa', ccPaid: false, date: '2026-10-14', ...o });
    expenses = [
      e('seguro', { amount: 84810, myAmount: 84810, cardExpType: 'recurring' }),
      e('cuota', { amount: 70833, myAmount: 70833, cardExpType: 'installment', installmentCurrent: 6, installmentTotal: 12 }),
      e('ultima', { amount: 500, myAmount: 500, cardExpType: 'installment', installmentCurrent: 3, installmentTotal: 3 }),
      e('unica', { amount: 300, myAmount: 300 }),
    ];
    saveLocal(); renderAll(); openCCPayModal('visa');
  });
  await page.evaluate(async () => { await saveCCPayment(); });
  const r = await page.evaluate(() => expenses.filter(x => !x.ccPayment).map(x => [x.description, x.date, x.ccPaid, x.installmentCurrent || 0]).sort());
  expect(r).toEqual([
    ['cuota', '2026-10-14', true, 6],   // la copia pagada, en octubre
    ['cuota', '2026-11-14', false, 7],  // la que sigue
    ['seguro', '2026-10-14', true, 0],
    ['seguro', '2026-11-14', false, 0],
    ['ultima', '2026-10-14', true, 3],  // la última cuota: queda paga, sin copia
    ['unica', '2026-10-14', true, 0],
  ]);
  // octubre sigue mostrando todo lo que se gastó en octubre
  expect(await page.evaluate(() => calcSummary('2026-10').real)).toBe(84810 + 70833 + 500 + 300);
  // y lo pendiente es solo lo que sigue
  expect(await page.evaluate(() => expenses.filter(x => !x.ccPaid && !x.ccPayment).map(x => x.description).sort())).toEqual(['cuota', 'seguro']);
  noErrors(page);
});
