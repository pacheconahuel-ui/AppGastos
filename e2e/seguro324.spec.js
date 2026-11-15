import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const cargar = page => page.evaluate(() => {
  accounts.push({ id: 'sa', name: 'Santander 2', emoji: '🏦', type: 'wallet', currency: 'ARS', initialBalance: 0 });
  saveAccounts();
  const hoy = todayStr();
  expenses = [
    { id: 'a', type: 'Egreso', amount: 1000, myAmount: 1000, date: hoy, category: 'Compras', description: 'Zapatillas', accountId: 'sa' },
    { id: 'b', type: 'Egreso', amount: 500, myAmount: 500, date: hoy, category: 'Luz', description: 'Luz', accountId: 'sa' },
    { id: 'c', type: 'Egreso', amount: 200, myAmount: 200, date: hoy, category: 'Gas', description: 'Gas', accountId: 'acc_mp' },
  ];
  transfers = [{ id: 'tf1', fromId: 'sa', toId: 'acc_mp', amount: 300, date: hoy, description: 'Pase' }];
  saveAccounts(); saveLocal(); renderAll();
});

test('3.24 borrar un movimiento se puede deshacer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => { delExp('a'); });
  await page.locator('#conf-btns .btn-yes').click();
  expect(await page.evaluate(() => expenses.some(e => e.id === 'a'))).toBe(false);
  const barra = page.locator('#undo-bar');
  await expect(barra).toContainText('Movimiento eliminado');
  const btn = barra.getByRole('button', { name: 'Deshacer' });
  expect((await btn.boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  await btn.click();
  expect(await page.evaluate(() => expenses.some(e => e.id === 'a'))).toBe(true);
  await expect(barra).not.toHaveClass(/\bon\b/);
  noErrors(page);
});

test('3.24 eliminar una billetera con movimientos: pasar todo a otra, y deshacer lo deja como estaba', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => confirmDeleteAccount('sa'));
  const m = page.locator('#lk-body');
  await expect(m).toContainText('2 movimientos y 1 transferencia');
  await m.locator('#del-acc-dest').selectOption('acc_mp');
  await m.getByRole('button', { name: 'Pasar y eliminar' }).click();
  expect(await page.evaluate(() => accounts.some(a => a.id === 'sa'))).toBe(false);
  expect(await page.evaluate(() => expenses.filter(e => e.accountId === 'acc_mp').length)).toBe(3);
  expect(await page.evaluate(() => transfers.length)).toBe(0); // quedaría de MP a MP: se descarta
  await page.locator('#undo-bar').getByRole('button', { name: 'Deshacer' }).click();
  expect(await page.evaluate(() => [accounts.some(a => a.id === 'sa'), expenses.filter(e => e.accountId === 'sa').length, transfers.length])).toEqual([true, 2, 1]);
  noErrors(page);
});

test('3.24 eliminar sin mover deja los movimientos sin billetera, a la vista para reasignar', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => confirmDeleteAccount('sa'));
  await page.locator('#lk-body').getByRole('button', { name: /dejar los movimientos sin billetera/ }).click();
  expect(await page.evaluate(() => expenses.filter(e => !e.accountId).length)).toBe(2);
  await expect(page.locator('#patrimonio-card')).toContainText('2 movimientos sin billetera');
  noErrors(page);
});

test('3.24 una billetera vacía se elimina con una confirmación simple', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { accounts.push({ id: 'v', name: 'Vacía', emoji: '🏦', type: 'wallet', currency: 'ARS' }); saveAccounts(); confirmDeleteAccount('v'); });
  await expect(page.locator('#conf-txt')).toContainText('No tiene movimientos');
  await page.locator('#conf-btns .btn-yes').click();
  expect(await page.evaluate(() => accounts.some(a => a.id === 'v'))).toBe(false);
  noErrors(page);
});

test('3.24 una transferencia se puede editar (antes había que borrarla y rehacerla)', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => switchTab('cuentas'));
  await page.locator('.transfer-box', { hasText: 'Pase' }).click();
  await expect(page.locator('#tf-title')).toContainText('Editar transferencia');
  await expect(page.locator('#tf-amt')).toHaveValue('300');
  await page.locator('#tf-amt').fill('450');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.locator('#conf-btns .btn-yes').click();
  expect(await page.evaluate(() => transfers.map(t => [t.id, t.amount]))).toEqual([['tf1', 450]]);
  noErrors(page);
});

test('3.24 al cruzar el 80% de un presupuesto, avisa', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { budgets = { Supermercado: 10000 }; saveBudgets(); expenses = []; renderAll(); });
  await page.evaluate(async () => {
    openModal(); document.getElementById('f-account').value = 'acc_mp'; document.getElementById('f-amt').value = '8500';
    selectCat('Supermercado'); await saveExpense();
  });
  await expect(page.locator('#toast')).toContainText('85% del presupuesto', { timeout: 4000 });
  noErrors(page);
});
