import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const fijarHoy = (page, iso) => page.clock.install({ time: new Date(iso) });

async function conTarjeta(page) {
  await page.evaluate(() => {
    accounts.push({ id: 'amex', name: 'Amex', emoji: '💳', type: 'credit', closingDay: 26, dueDay: 9 });
    saveAccounts();
    expenses.push(
      { id: 'c1', type: 'Egreso', amount: 30000, myAmount: 30000, date: '2026-10-10', category: 'Compras', description: 'Zapatillas', accountId: 'amex', ccPaid: false },
      { id: 'c2', type: 'Egreso', amount: 12000, myAmount: 12000, date: '2026-11-03', category: 'Compras', description: 'Libros', accountId: 'amex', ccPaid: false },
    );
    saveLocal(); renderCuentasTab();
  });
}

test('«Gestionar» y «Ajustar saldo» no se cortan con varias billeteras', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) accounts.push({ id: 'w' + i, name: 'Billetera ' + i, emoji: '🏦', type: 'wallet', currency: 'ARS', initialBalance: 100 });
    saveAccounts(); renderAll();
    patrimonioExpanded = true; renderPatrimonioCard();
  });
  await page.waitForTimeout(450); // la animación del desplegable
  for (const b of ['Gestionar', 'Ajustar saldo']) {
    const btn = page.locator('.pat-btn', { hasText: b });
    const box = await btn.boundingBox(), card = await page.locator('#pat-detail').boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(34);
    expect(box.y + box.height).toBeLessThanOrEqual(card.y + card.height + 1);
  }
  noErrors(page);
});

test('la tarjeta separa el resumen cerrado del que está en curso, con su período y vencimiento', async ({ page }) => {
  await fijarHoy(page, '2026-11-12T12:00:00');
  await openApp(page);
  await conTarjeta(page);
  await page.evaluate(() => switchTab('cuentas'));
  const box = page.locator('.cc-summary-box');
  await expect(box).toContainText('Ya cerró');
  await expect(box).toContainText('compras del 27/09 al 26/10');
  await expect(box).toContainText('vence el 09/11');
  await expect(box).toContainText('En curso');
  await expect(box).toContainText('compras del 27/10 al 26/11');
  await expect(box).toContainText('vence el 09/12');
  noErrors(page);
});

test('las tarjetas se pliegan y se acuerdan del estado', async ({ page }) => {
  await fijarHoy(page, '2026-11-12T12:00:00');
  await openApp(page);
  await conTarjeta(page);
  await page.evaluate(() => switchTab('cuentas'));
  await expect(page.locator('.cc-st').first()).toBeVisible();
  await page.locator('.cc-toggle').click();
  await expect(page.locator('.cc-st')).toHaveCount(0);
  await expect(page.locator('.cc-toggle')).toContainText('Amex');
  expect((await page.locator('.cc-toggle').boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  await page.locator('.cc-toggle').click();
  await expect(page.locator('.cc-st').first()).toBeVisible();
  noErrors(page);
});

test('pagar el resumen cerrado no toca lo del resumen en curso', async ({ page }) => {
  await fijarHoy(page, '2026-11-12T12:00:00');
  await openApp(page);
  await conTarjeta(page);
  await page.evaluate(() => openCCPayModal('amex'));
  await expect(page.locator('#ccp-subtotal-ars')).toContainText('30.000');
  await page.evaluate(async () => { await saveCCPayment(); });
  const r = await page.evaluate(() => expenses.filter(e => e.accountId === 'amex').map(e => [e.id, e.ccPaid]));
  expect(r).toEqual([['c1', true], ['c2', false]]);
  noErrors(page);
});

test('cambiar la fecha de vencimiento de un resumen puntual', async ({ page }) => {
  await fijarHoy(page, '2026-11-12T12:00:00');
  await openApp(page);
  await conTarjeta(page);
  await page.evaluate(() => switchTab('cuentas'));
  await page.getByRole('button', { name: 'Cambiar fecha' }).click();
  await page.locator('#due-date').fill('2026-11-12');
  await page.getByRole('button', { name: 'Guardar' }).last().click();
  await expect(page.locator('.cc-st.closed')).toContainText('vence el 12/11 (hoy)');
  // el resumen siguiente conserva el día de siempre
  expect(await page.evaluate(() => cardDue(accounts.find(a => a.id === 'amex'), '2026-11-26'))).toBe('2026-12-09');
  noErrors(page);
});

test('la tarjeta se edita con «Vence el día» y se elimina desde adentro de la edición', async ({ page }) => {
  await fijarHoy(page, '2026-11-12T12:00:00');
  await openApp(page);
  await page.evaluate(() => { accounts.push({ id: 'v', name: 'Visa', emoji: '💳', type: 'credit', closingDay: 26, dueOffset: 8 }); saveAccounts(); openAccountModal('v'); });
  await expect(page.locator('#acc-due-day')).toHaveValue('3'); // el cierre del 26/10 + 8 días = 3/11
  await page.locator('#acc-due-day').fill('9');
  await page.evaluate(() => saveAccount());
  expect(await page.evaluate(() => accounts.find(a => a.id === 'v').dueDay)).toBe(9);
  await page.evaluate(() => { switchTab('cuentas'); });
  await expect(page.locator('.account-card .btn-ico.del')).toHaveCount(0); // sin tachos sueltos en las tarjetas de billetera
  await page.evaluate(() => openAccountModal('v'));
  await page.locator('#acc-delete-btn').click();
  await expect(page.locator('#conf-txt')).toContainText('Visa');
  noErrors(page);
});

test('Transferir está a la vista en Cuentas', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => switchTab('cuentas'));
  await page.getByRole('button', { name: 'Transferir' }).click();
  await expect(page.locator('#transfer-overlay')).toHaveClass(/on/);
  noErrors(page);
});

test('el aviso de fecha futura ocupa todo el ancho y el monto muestra los miles', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => openModal());
  await page.locator('#f-amt').fill('20990');
  await expect(page.locator('#f-amt-fmt')).toHaveText('20.990');
  await page.locator('#f-date').fill('2030-01-20');
  await page.locator('#f-date').dispatchEvent('input');
  const hint = await page.locator('#f-future-hint').boundingBox(), row = await page.locator('.f-row-fecha').boundingBox();
  expect(hint.width).toBeGreaterThan(row.width * 0.9);
  expect(hint.height).toBeLessThan(40);
  noErrors(page);
});
