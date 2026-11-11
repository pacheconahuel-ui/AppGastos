import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test('saldo inicial negativo con la casilla (el teclado del celular no siempre trae el −)', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { openAccountModal(); document.getElementById('acc-name').value = 'Santander 2'; document.getElementById('acc-initial').value = '80195.81'; });
  await page.locator('#acc-initial-neg').check();
  await page.evaluate(() => saveAccount());
  expect(await page.evaluate(() => accounts.find(a => a.name === 'Santander 2').initialBalance)).toBe(-80195.81);
  // al editar, el campo muestra el valor sin signo y la casilla marcada
  const id = await page.evaluate(() => accounts.find(a => a.name === 'Santander 2').id);
  await page.evaluate(i => openAccountModal(i), id);
  await expect(page.locator('#acc-initial')).toHaveValue('80195.81');
  await expect(page.locator('#acc-initial-neg')).toBeChecked();
  expect((await page.locator('.acc-neg').boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  noErrors(page);
});

test('Ajustar saldo admite negativos y no suma a ingresos ni gastos del mes', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { openAdjustModal('acc_mp'); document.getElementById('adj-acc').value = 'acc_mp'; document.getElementById('adj-real').value = '5000'; });
  await page.evaluate(() => saveAdjust());
  await page.evaluate(() => { openAdjustModal('acc_mp'); document.getElementById('adj-acc').value = 'acc_mp'; document.getElementById('adj-real').value = '-1500'; updateAdjHint(); });
  await expect(page.locator('#adj-hint')).toContainText('no suma a tus gastos del mes');
  await page.evaluate(() => saveAdjust());
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(-1500);
  const r = await page.evaluate(() => calcSummary(nowKey()));
  expect([r.ing, r.real]).toEqual([0, 0]);
  noErrors(page);
});

test('cobrar lo de un gasto dividido: la billetera queda bien y el ingreso del mes no se infla', async ({ page }) => {
  await openApp(page);
  await page.evaluate(async () => {
    persons = [{ id: 'v', name: 'Vicky', emoji: '👩', isRecurrent: true }];
    openModal(); document.getElementById('f-account').value = 'acc_mp'; document.getElementById('f-amt').value = '1000'; document.getElementById('f-desc').value = 'Super';
    splitRows = [{ personId: 'v', personName: 'Vicky', emoji: '👩', amount: 400 }]; splitPanelOpen = true; await saveExpense();
  });
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(-1000); // salió el total
  await page.evaluate(async () => { openSettleModal('v'); document.getElementById('settle-acc').value = 'acc_mp'; await doSettle(); });
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(-600); // volvió su parte
  const r = await page.evaluate(() => calcSummary(nowKey()));
  expect([r.ing, r.real, r.pag]).toEqual([0, 600, 1000]);
  noErrors(page);
});
