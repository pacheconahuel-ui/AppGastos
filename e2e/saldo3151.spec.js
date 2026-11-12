import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

// Los datos de una usuaria real: ajustes viejos cargados como gasto común y gastos de relleno de antes de usar la app
async function cargar(page) {
  await page.evaluate(() => {
    accounts.push({ id: 'mp', name: 'Mercado Pago', emoji: '🏦', type: 'wallet', currency: 'ARS', initialBalance: 184900 });
    saveAccounts();
    const hoy = todayStr(), mk = hoy.slice(0, 8);
    expenses.push(
      { id: 'relleno', type: 'Egreso', amount: 598044, myAmount: 0, date: '2026-05-31', category: 'Prestamito', description: 'gastos mayo y anteriores', accountId: 'mp' },
      { id: 'viejo', type: 'Egreso', amount: 126240, myAmount: 126240, date: mk + '01', category: 'Otro', description: 'Ajuste de saldo — Mercado Pago', accountId: 'mp' },
      { id: 'chico', type: 'Egreso', amount: 1000, myAmount: 1000, date: mk + '01', category: 'Compras', description: 'Kiosco', accountId: 'mp' },
    );
    saveLocal(); renderAll();
  });
}

test('un ajuste viejo (cargado a mano como gasto) se lista como ajuste y no suma a los gastos del mes', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  expect(await page.evaluate(() => isAjuste(expenses.find(e => e.id === 'viejo')))).toBe(true);
  expect(await page.evaluate(() => isAjuste(expenses.find(e => e.id === 'chico')))).toBe(false);
  expect(await page.evaluate(() => calcSummary(nowKey()).real)).toBe(1000); // solo el kiosco
  await page.evaluate(() => openSaldoDetalle('mp'));
  const v = page.locator('#lk-body');
  await expect(v).toContainText('Ajustes de saldo');
  await v.getByRole('button', { name: 'Borrar este ajuste' }).click();
  await page.locator('#conf-btns .btn-yes').click();
  expect(await page.evaluate(() => expenses.some(e => e.id === 'viejo'))).toBe(false);
  noErrors(page);
});

test('los gastos más grandes se pueden sacar de la billetera o borrar desde «¿Por qué este saldo?»', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => openSaldoDetalle('mp'));
  const v = page.locator('#lk-body');
  await expect(v).toContainText('Los gastos más grandes de esta billetera');
  await expect(v.locator('.sd-box').filter({ hasText: 'gastos mayo y anteriores' })).toBeVisible();
  const sacar = v.locator('.sd-box').filter({ hasText: 'gastos mayo y anteriores' }).getByRole('button', { name: 'Sacar de esta billetera' });
  expect((await sacar.boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  await sacar.click();
  await page.locator('#conf-btns .btn-yes').click();
  expect(await page.evaluate(() => { const e = expenses.find(x => x.id === 'relleno'); return [e.accountId, e.sinBilletera]; })).toEqual([null, true]);
  // y el kiosco se borra
  await v.locator('.sd-box').filter({ hasText: 'Kiosco' }).getByRole('button', { name: 'Borrar', exact: true }).click();
  await page.locator('#conf-btns .btn-yes').click();
  expect(await page.evaluate(() => expenses.some(e => e.id === 'chico'))).toBe(false);
  noErrors(page);
});
