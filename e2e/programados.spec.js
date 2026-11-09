import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

test('un gasto con fecha futura queda programado: no resta del saldo hasta ese día', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00-03:00') });
  await openApp(page);
  await page.evaluate(() => {
    expenses = [
      { id: 'i', type: 'Ingreso', amount: 100000, myAmount: 100000, date: '2026-11-01', category: 'Salario', description: 'Sueldo', accountId: 'acc_mp' },
      { id: 'g', type: 'Egreso', amount: 20000, myAmount: 20000, date: '2026-11-05', category: 'Luz', description: 'Luz', accountId: 'acc_mp' },
    ];
    renderAll();
  });
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(80000);

  // el formulario avisa que queda programado
  await page.evaluate(() => { openModal(); document.getElementById('f-date').value = '2026-12-07'; updateFutureHint(); });
  await expect(page.locator('#f-future-hint')).toContainText('Programado para el 07/12');
  await page.evaluate(() => { document.getElementById('f-date').value = '2026-11-10'; updateFutureHint(); });
  await expect(page.locator('#f-future-hint')).toHaveText('');
  await page.evaluate(() => closeModal());

  // cargar la cuota del curso para el 7 de diciembre no toca el saldo de hoy
  await page.evaluate(async () => {
    openModal(); document.getElementById('f-account').value = 'acc_mp'; document.getElementById('f-amt').value = '15000';
    document.getElementById('f-desc').value = 'Curso'; document.getElementById('f-date').value = '2026-12-07'; await saveExpense();
  });
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(80000);
  await page.evaluate(() => switchTab('lista'));
  await page.locator('#fil-month').selectOption('2026-12');
  await expect(page.locator('#full-list')).toContainText('Programado');
  // ese día ya resta
  await page.clock.setSystemTime(new Date('2026-12-07T09:00:00-03:00'));
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(65000);
  noErrors(page);
});
