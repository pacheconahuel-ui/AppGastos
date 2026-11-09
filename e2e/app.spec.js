import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test('carga, muestra la versión y registra el service worker con ella', async ({ page }) => {
  await openApp(page);
  const ver = await page.evaluate(() => APP_VERSION);
  await page.evaluate(() => { renderAll(); });
  await expect(page.locator('#hdr-month')).toContainText('v' + ver);
  const sw = await page.evaluate(async () => (await navigator.serviceWorker.ready).active.scriptURL);
  expect(sw).toContain('sw.js?v=' + ver);
  noErrors(page);
});

test('los íconos del HTML se dibujan y no queda ninguno sin reemplazar', async ({ page }) => {
  await openApp(page);
  expect(await page.locator('i[data-ico]').count()).toBe(0);
  expect(await page.locator('.bnav .ico').count()).toBe(0); // la barra de abajo trae sus SVG propios
  expect(await page.locator('#btn-theme .ico').count()).toBe(1);
  expect(await page.locator('#usd-overlay .btn-save .ico').count()).toBe(1);
  // cada ícono tiene tamaño (no quedó en 0 por falta de CSS)
  for (const b of await page.locator('.ico').all()) {
    if (!(await b.isVisible())) continue;
    const r = await b.boundingBox();
    expect(r.width).toBeGreaterThan(6);
  }
  noErrors(page);
});

test('guardar sin billetera pide un segundo toque y marca "Sin billetera"', async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    openModal();
    document.getElementById('f-account').value = '';
    document.getElementById('f-amt').value = '1000';
    await saveExpense();
    const primero = { toast: document.getElementById('toast').textContent, guardados: expenses.length };
    await saveExpense();
    return { primero, guardados: expenses.length, badge: expHTML(expenses[0], false).includes('Sin billetera') };
  });
  expect(r.primero.toast).toContain('Sin billetera');
  expect(r.primero.guardados).toBe(0);
  expect(r.guardados).toBe(1);
  expect(r.badge).toBe(true);
  noErrors(page);
});

test('el aviso "sin billetera" lista los movimientos y permite asignarla (360 px)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openApp(page);
  await page.evaluate(() => {
    expenses.push(
      { id: 's1', type: 'Ingreso', amount: 500000, myAmount: 500000, date: '2026-10-01', category: 'Sueldo', description: 'Sueldo' },
      { id: 'l1', type: 'Egreso', amount: 30000, myAmount: 30000, date: todayStr(), category: 'Luz', description: 'Luz', accountId: 'acc_mp' });
    renderAll();
  });
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(-30000);
  await page.getByText('tocá para asignar').click();
  await expect(page.locator('#gsearch-results')).toContainText('Sin billetera (1)');
  await page.locator('#unassigned-list .exp-item').first().click();
  await expect(page.locator('#gsearch-overlay')).not.toHaveClass(/\bon\b/);
  await page.evaluate(async () => { document.getElementById('f-account').value = 'acc_mp'; onAccountSelected(); await saveExpense(); });
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(470000);
  await expect(page.getByText('tocá para asignar')).toHaveCount(0);
  noErrors(page);
});

test('categorías con apóstrofo se pueden elegir y un nombre armado no ejecuta código', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { cats.push("Mc Donald's", "x');window.PWNED=1;('"); catTypes = normalizeCatTypes(catTypes); openQuickAdd(); });
  await page.locator('.qa-cat-btn', { hasText: 'Mc Do' }).click();
  expect(await page.evaluate(() => _qaCat)).toBe("Mc Donald's");
  await page.locator('.qa-cat-btn', { hasText: "x');w" }).click();
  expect(await page.evaluate(() => window.PWNED || 0)).toBe(0);
  noErrors(page);
});
