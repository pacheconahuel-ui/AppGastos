import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

async function cargar(page) {
  await page.evaluate(() => {
    persons = [{ id: 'v', name: 'Vicky', emoji: '👩', isRecurrent: true }];
    accounts.push({ id: 'mp', name: 'MP', emoji: '🏦', type: 'wallet', currency: 'ARS', initialBalance: 100000 });
    saveAccounts(); renderAll();
  });
}

test('un toque en "+" abre el gasto; mantenido abre el menú con todo lo demás', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await page.locator('.bnav-plus').click();
  await expect(page.locator('#m-overlay')).toHaveClass(/\bon\b/);
  await expect(page.locator('#new-overlay')).not.toHaveClass(/\bon\b/);
  await expect(page.locator('#f-type')).toHaveValue('Egreso'); // gasto por defecto
  await page.keyboard.press('Escape');
  await page.locator('.bnav-plus').dispatchEvent('pointerdown');
  await page.waitForTimeout(550);
  await page.locator('.bnav-plus').dispatchEvent('pointerup');
  await expect(page.locator('#new-overlay')).toHaveClass(/\bon\b/);
  await expect(page.locator('#m-overlay')).not.toHaveClass(/\bon\b/);
  expect((await page.locator('.bnav-plus').boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  noErrors(page);
});

test('lo pagó otra persona: no sale de tu billetera, cuenta tu parte y queda "le debés"', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => openModal());
  await page.locator('#f-amt').fill('367276');
  await page.locator('#f-desc').fill('Sancor salud');
  await page.locator('#f-more summary').click();
  await page.locator('#payer-toggle-btn').click();
  await expect(page.locator('#f-account')).toBeDisabled();
  await expect(page.locator('#f-payer-mine')).toHaveValue('367276');
  await expect(page.locator('#f-payer-hint')).toContainText('Le debés $367.276 a');
  await page.evaluate(async () => { await saveExpense(); });
  const e = await page.evaluate(() => expenses.find(x => x.description === 'Sancor salud'));
  expect(e.accountId).toBe(null);
  expect(e.sinBilletera).toBe(true);
  expect(e.pagoPor).toEqual({ personId: 'v', personName: 'Vicky' });
  expect(await page.evaluate(() => accountBalance('mp'))).toBe(100000); // no tocó la billetera
  expect(await page.evaluate(() => calcSummary(nowKey()).real)).toBe(367276); // gasto tuyo del mes
  expect(await page.evaluate(() => debts.filter(d => !d.settled).map(d => [d.personId, d.amount]))).toEqual([['v', -367276]]);
  expect(await page.evaluate(() => personBalance('v'))).toBe(-367276);
  noErrors(page);
});

test('lo pagó otra persona con parte menor al total; editar actualiza la deuda; quitarlo la borra', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => openModal());
  await page.locator('#f-amt').fill('100000');
  await page.locator('#f-more summary').click();
  await page.locator('#payer-toggle-btn').click();
  await page.locator('#f-payer-mine').fill('40000');
  await expect(page.locator('#f-payer-hint')).toContainText('$40.000');
  await page.evaluate(async () => { await saveExpense(); });
  expect(await page.evaluate(() => debts.map(d => d.amount))).toEqual([-40000]);
  // editar: el formulario vuelve con la persona y la parte
  const id = await page.evaluate(() => expenses[0].id);
  await page.evaluate(i => editExp(i), id);
  await expect(page.locator('#payer-panel')).toHaveClass(/\bon\b/);
  await expect(page.locator('#f-payer-mine')).toHaveValue('40000');
  await page.locator('#f-payer-mine').fill('50000');
  await page.evaluate(async () => { await saveExpense(); });
  expect(await page.evaluate(() => debts.filter(d => !d.settled).map(d => d.amount))).toEqual([-50000]);
  // sacar "lo pagó otra persona": la deuda se va
  await page.evaluate(i => editExp(i), id);
  await page.locator('#payer-toggle-btn').click();
  await page.evaluate(async () => { document.getElementById('f-account').value = 'mp'; await saveExpense(); });
  expect(await page.evaluate(() => debts.length)).toBe(0);
  noErrors(page);
});

test('dividir y "lo pagó otra persona" no van juntos; no se repite meses', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => openModal());
  await page.locator('#f-amt').fill('1000');
  await page.locator('#f-more summary').click();
  await page.locator('#payer-toggle-btn').click();
  await page.locator('#split-toggle-btn').click();
  await expect(page.locator('#split-panel')).not.toHaveClass(/\bon\b/); // no se abre
  await page.locator('#f-serie').fill('3');
  await page.evaluate(async () => { await saveExpense(); });
  expect(await page.evaluate(() => expenses.length)).toBe(0);
  noErrors(page);
});
