import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

async function abrir(page, ancho = 390) {
  await page.setViewportSize({ width: ancho, height: 800 });
  await page.clock.install({ time: new Date('2026-11-10T10:00:00-03:00') });
  await openApp(page);
  await page.evaluate(() => {
    loadLocal(); currentUID = 'prueba'; loadAccounts();
    accounts.push({ id: 'cc', name: 'Visa', emoji: '💳', type: 'credit' }); saveAccounts();
    const E = (id, category, n) => Array.from({ length: n }, (_, i) => ({ id: id + i, type: 'Egreso', amount: 10, myAmount: 10, date: '2026-10-1' + i, category, description: category, accountId: 'acc_mp' }));
    expenses = [...E('a', 'Luz', 3), ...E('b', 'Farmacia', 5), ...E('c', 'Gas', 1)];
    openModal();
  });
}

test('el monto va primero y las categorías más usadas aparecen como botones', async ({ page }) => {
  await abrir(page);
  const yMonto = (await page.locator('#f-amt').boundingBox()).y;
  const yCat = (await page.locator('#f-cat-chips').boundingBox()).y;
  expect(yMonto).toBeLessThan(yCat);
  const chips = await page.locator('#f-cat-chips .chip').allInnerTexts();
  expect(chips[0]).toContain('Farmacia');
  expect(chips[1]).toContain('Luz');
  await page.locator('#f-cat-chips .chip', { hasText: 'Luz' }).click();
  expect(await page.evaluate(() => document.getElementById('f-cat').value)).toBe('Luz');
  await expect(page.locator('#f-cat-chips .chip.on')).toContainText('Luz');
  noErrors(page);
});

test('elegir billetera con un botón y guardar; tarjeta muestra el tipo de cargo', async ({ page }) => {
  await abrir(page);
  await page.fill('#f-amt', '1500');
  await page.locator('#f-cat-chips .chip', { hasText: 'Luz' }).click();
  await page.locator('#f-acc-chips .chip', { hasText: 'Visa' }).click();
  await expect(page.locator('#f-card-type-wrap')).toBeVisible();
  await page.locator('#f-acc-chips .chip', { hasText: 'Mercado Pago' }).click();
  await expect(page.locator('#f-card-type-wrap')).toBeHidden();
  await page.getByRole('button', { name: 'Guardar' }).click();
  const g = await page.evaluate(() => expenses[expenses.length - 1]);
  expect([g.amount, g.category, g.accountId, g.type]).toEqual([1500, 'Luz', 'acc_mp', 'Egreso']);
  noErrors(page);
});

test('"Sin billetera" sigue pidiendo confirmación', async ({ page }) => {
  await abrir(page);
  await page.fill('#f-amt', '10');
  await page.locator('#f-acc-chips .chip', { hasText: 'Sin billetera' }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('#toast')).toContainText('Sin billetera');
  noErrors(page);
});

test('Ingreso muestra categorías de ingreso', async ({ page }) => {
  await abrir(page);
  await page.getByRole('button', { name: 'Ingreso', exact: true }).click();
  const chips = await page.locator('#f-cat-chips .chip').allInnerTexts();
  expect(chips.join(' ')).toContain('Sueldo');
  expect(chips.join(' ')).not.toContain('Farmacia');
  noErrors(page);
});

test('"Más opciones" se abre solo si el movimiento ya tiene notas', async ({ page }) => {
  await abrir(page);
  expect(await page.evaluate(() => document.getElementById('f-more').open)).toBe(false);
  await page.evaluate(() => { closeModal(); openModal({ id: 'x', type: 'Egreso', amount: 5, date: '2026-11-01', category: 'Luz', description: 'x', notes: 'algo', accountId: 'acc_mp' }); });
  expect(await page.evaluate(() => document.getElementById('f-more').open)).toBe(true);
  await expect(page.locator('#m-title')).toHaveText('Editar movimiento');
  await expect(page.locator('#f-acc-chips .chip.on')).toContainText('Mercado Pago');
  noErrors(page);
});

for (const ancho of [320, 360, 390]) {
  test(`formulario a ${ancho} px: sin scroll lateral y controles de 44`, async ({ page }) => {
    await abrir(page, ancho);
    const modal = page.locator('#m-overlay .modal');
    expect(await modal.evaluate(m => m.scrollWidth <= m.clientWidth + 1)).toBe(true);
    for (const b of await page.locator('#m-overlay .chip, #m-overlay .seg-tog .type-btn, #f-currency, #f-more summary').all()) {
      const r = await b.boundingBox();
      expect(r.height, await b.innerText()).toBeGreaterThanOrEqual(44);
    }
    for (const b of await page.locator('#m-overlay .chip').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
    noErrors(page);
  });
}
