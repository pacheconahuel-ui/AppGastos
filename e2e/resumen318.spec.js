import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const cargar = page => page.evaluate(() => {
  const d = nowKey() + '-02';
  expenses = [
    { id: 'i', type: 'Ingreso', amount: 1000000, myAmount: 1000000, date: d, category: 'Sueldo', description: 'Sueldo', accountId: 'acc_mp' },
    { id: 'g', type: 'Egreso', amount: 40000, myAmount: 40000, date: d, category: 'Luz', description: 'Luz', accountId: 'acc_mp' },
    { id: 'h', type: 'Egreso', amount: 30000, myAmount: 30000, date: d, category: 'Compras', description: 'Zapatillas', accountId: 'acc_mp' },
    { id: 'f', type: 'Egreso', amount: 9, myAmount: 9, date: '2030-01-01', category: 'Servicios', description: 'Futuro', accountId: 'acc_mp', currency: 'USD', exchangeRate: 1000, arsEquiv: 9000 },
  ];
  renderAll();
});

for (const ancho of [320, 360, 390]) {
  test(`3.18 Resumen limpio en ${ancho} px: balance grande, detalle plegado, selector de 44 px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 800 });
    await openApp(page);
    await cargar(page);
    await expect(page.locator('#c-bal')).toHaveText('+$930.000');
    expect((await page.locator('#c-bal').boundingBox()).height).toBeLessThan(48);
    await expect(page.locator('#sum-stats')).toBeHidden();
    await expect(page.locator('#recent-list .exp-item')).toHaveCount(3);
    // el programado lleva un icono, no una etiqueta
    await expect(page.locator('#recent-list .exp-item', { hasText: 'Futuro' }).locator('[title="Programado"]')).toHaveCount(1);
    for (const sel of ['#dash-seg button', '#sum-det summary']) {
      const r = await page.locator(sel).first().boundingBox();
      expect(r.height, sel).toBeGreaterThanOrEqual(43.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    noErrors(page);
  });
}

test('3.18 Análisis: los gráficos se dibujan al mostrarse y la vista se recuerda', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await cargar(page);
  expect(await page.evaluate(() => !!chart)).toBe(false); // con Resumen a la vista no se dibuja nada caro
  await page.getByRole('tab', { name: 'Análisis' }).click();
  await expect(page.locator('#chart-box')).toBeVisible();
  expect((await page.locator('#pie').boundingBox()).height).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Evolución' }).click();
  expect((await page.locator('#monthly-chart').boundingBox()).height).toBeGreaterThan(100);
  expect(await page.evaluate(() => localStorage.getItem('dash_vista'))).toBe('analisis');
  await page.reload();
  await page.waitForFunction(() => window.APP_LISTA === true && window.AUTH_LISTA === true);
  expect(await page.evaluate(() => document.getElementById('tab-dashboard').dataset.vista)).toBe('analisis');
  noErrors(page);
});

test('3.18 sin nada para el detalle, «Ver detalle» no aparece', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openApp(page);
  await page.evaluate(() => { expenses = []; renderAll(); });
  await expect(page.locator('#sum-det')).toBeHidden();
  noErrors(page);
});

test('3.18 en la compu Resumen y Análisis se ven juntos y los gráficos se dibujan', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await cargar(page);
  await expect(page.locator('#dash-seg')).toBeHidden();
  await expect(page.locator('#recent-list')).toBeVisible();
  await expect(page.locator('#chart-box')).toBeVisible();
  expect(await page.evaluate(() => !!chart)).toBe(true);
  noErrors(page);
});
