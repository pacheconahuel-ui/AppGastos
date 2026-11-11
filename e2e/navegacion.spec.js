import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const activa = page => page.evaluate(() => [...document.querySelectorAll('.bnav-item.on span')].map(s => s.textContent));

for (const ancho of [320, 360, 390]) {
  test(`barra de abajo y "+" (${ancho} px)`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 740 });
    await openApp(page);
    const nav = page.locator('.bnav');
    await expect(nav).toBeVisible();
    await expect(page.locator('.tabs')).toBeHidden();
    // todos los controles de la barra miden al menos 44×44
    for (const b of await nav.locator('button').all()) {
      const r = await b.boundingBox();
      expect(r.width, await b.innerText()).toBeGreaterThanOrEqual(44);
      expect(r.height, await b.innerText()).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // la barra queda pegada abajo
    const r = await nav.boundingBox();
    expect(Math.round(r.y + r.height)).toBe(740);

    await nav.getByText('Saldos').click();
    expect(await activa(page)).toEqual(['Saldos']);
    await expect(page.locator('#tab-saldos')).toBeVisible();

    // "+" abre el menú; cada opción abre su formulario
    for (const [opcion, overlay] of [['Gasto o ingreso', 'm-overlay'], ['Gasto rápido', 'qa-overlay'], ['Dólares', 'usd-overlay'], ['Deuda', 'debt-overlay'], ['Transferencia', 'transfer-overlay']]) {
      await page.locator('.bnav-plus').click();
      await expect(page.locator('#new-overlay')).toHaveClass(/\bon\b/);
      const item = page.locator('.new-item', { hasText: opcion });
      expect((await item.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await item.click();
      await expect(page.locator('#new-overlay')).not.toHaveClass(/\bon\b/);
      await expect(page.locator('#' + overlay)).toHaveClass(/\bon\b/);
      await page.keyboard.press('Escape');
    }
    noErrors(page);
  });
}

test('USD se abre desde Cuentas y "Cuentas" sigue marcada', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await page.locator('.bnav').getByText('Cuentas').click();
  await page.locator('.usd-link').click();
  await expect(page.locator('#tab-usd')).toBeVisible();
  expect(await activa(page)).toEqual(['Cuentas']);
  await page.locator('#tab-usd .back-link').click();
  await expect(page.locator('#tab-cuentas')).toBeVisible();
  noErrors(page);
});

test('lo último de la pantalla no queda tapado por la barra', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await openApp(page);
  await page.evaluate(() => {
    for (let i = 0; i < 30; i++) expenses.push({ id: 'e' + i, type: 'Egreso', amount: 100 + i, myAmount: 100 + i, date: todayStr(), category: 'Luz', description: 'Gasto ' + i, accountId: 'acc_mp' });
    switchTab('lista');
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const ultimo = await page.locator('#tab-lista .exp-item').last().boundingBox();
  const barra = await page.locator('.bnav').boundingBox();
  expect(ultimo.y + ultimo.height).toBeLessThanOrEqual(barra.y);
  noErrors(page);
});

test('en la compu: columna de secciones con "+ Nuevo" y sin barra de abajo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page);
  await expect(page.locator('.bnav')).toBeHidden();
  await expect(page.locator('.tabs')).toBeVisible();
  await page.locator('.tabs-new').click();
  await expect(page.locator('#new-overlay')).toHaveClass(/\bon\b/);
  await page.keyboard.press('Escape');
  await page.locator('.tab[data-tab="usd"]').click();
  await expect(page.locator('#tab-usd')).toBeVisible();
  noErrors(page);
});

test('sin sesión no se ve la barra', async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(() => window.APP_LISTA === true && window.AUTH_LISTA === true);
  await expect(page.locator('.bnav')).toBeHidden();
});
