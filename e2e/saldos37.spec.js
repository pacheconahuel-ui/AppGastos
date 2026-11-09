import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

// Deudas de un contacto que se borró: antes no sumaban en el resumen de Saldos y "Cobrar" no hacía nada
const deudaHuerfana = (id, personId, amount) => ({ id, personId, personName: 'Vicky', description: 'Cena', amount, date: '2026-01-05', settled: false, settledDate: null, linkedExpenseId: null, createdAt: 1 });

test('las deudas de un contacto borrado cuentan, tienen tarjeta y se pueden cobrar', async ({ page }) => {
  await openApp(page);
  await page.evaluate(d => { persons = []; debts = d; renderAll(); }, [deudaHuerfana('d1', 'gone', 1000), deudaHuerfana('d2', 'gone', 500)]);
  await expect(page.locator('#sum-me-deben')).toHaveText('$1.500');
  await expect(page.locator('#saldos-list')).toContainText('ya no está en tus contactos');
  await page.locator('#saldos-list .btn-settle').first().evaluate(b => b.click()); // la pestaña Saldos no está activa
  await expect(page.locator('#settle-overlay')).toHaveClass(/on/);
  await expect(page.locator('#settle-name')).toHaveText('Vicky');
  await page.evaluate(() => doSettle());
  await expect.poll(() => page.evaluate(() => debts.filter(d => !d.settled).length)).toBe(0);
  noErrors(page);
});

test('"Agregar a contactos" reconecta las deudas; con un contacto del mismo nombre las une', async ({ page }) => {
  await openApp(page);
  await page.evaluate(d => { persons = []; debts = d; renderAll(); restoreOrphan('gone'); }, [deudaHuerfana('d1', 'gone', 1000)]);
  expect(await page.evaluate(() => persons.map(p => p.id))).toEqual(['gone']);
  await page.evaluate(d => { persons = [{ id: 'v2', name: 'Vicky', emoji: '👩', isRecurrent: true }]; debts = d; renderAll(); restoreOrphan('gone'); }, [deudaHuerfana('d1', 'gone', 1000)]);
  await expect.poll(() => page.evaluate(() => debts[0].personId)).toBe('v2');
  noErrors(page);
});

test('sin deudas activas no hay botón de saldar', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { persons = [{ id: 'p1', name: 'Ana', emoji: '👩', isRecurrent: true }]; debts = []; renderAll(); });
  await expect(page.locator('#saldos-list .person-card')).toHaveCount(1);
  await expect(page.locator('#saldos-list .btn-settle')).toHaveCount(0);
  noErrors(page);
});

for (const ancho of [320, 360, 390]) {
  test(`el aviso largo se ve entero a ${ancho} px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 700 });
    await openApp(page);
    await page.evaluate(() => toast('⚠️ Persona no encontrada (Vicky). Eliminá las deudas manualmente desde cada tarjeta.', 60000));
    const r = await page.locator('#toast').boundingBox();
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(ancho);
    noErrors(page);
  });
}

test('el encabezado muestra solo la versión y un mes pasado ofrece volver al actual', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { expenses = [{ id: 'a', type: 'Egreso', amount: 10, myAmount: 10, date: '2026-01-10', category: 'Comida', description: 'x', accountId: 'acc_mp' }]; dashMk = null; renderAll(); });
  await expect(page.locator('#hdr-month')).toHaveText(/^v\d/);
  const go = page.locator('#dash-month-hint .sum-go');
  await expect(go).toBeVisible();
  expect((await go.boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  await go.click();
  await expect(page.locator('#dash-month-hint')).toHaveText('mes actual');
  noErrors(page);
});

test('asignar todos los movimientos sin billetera, con confirmación', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    expenses = [1, 2].map(n => ({ id: 'e' + n, type: 'Egreso', amount: 100, myAmount: 100, date: todayStr(), category: 'Comida', description: 'g' + n }));
    renderAll(); openUnassigned();
  });
  await page.locator('#gsearch-results .btn-settle').click();
  await expect(page.locator('#conf-overlay, .conf-overlay').first()).toBeVisible();
  await page.locator('#conf-btns .btn-yes').first().click();
  await expect.poll(() => page.evaluate(() => expenses.every(e => e.accountId))).toBe(true);
  noErrors(page);
});

test('el tema declara que existen claro y oscuro (no se deja al navegador oscurecer a la fuerza)', async ({ page }) => {
  await openApp(page);
  expect(await page.locator('meta[name="color-scheme"]').getAttribute('content')).toBe('dark light');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light dark');
});
