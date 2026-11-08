import { test, expect } from '@playwright/test';

test('sin conexión la app vuelve a abrir desde la caché del service worker', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // dar tiempo a que se guarden index.html, js/ y css/
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  expect(await page.evaluate(() => typeof APP_VERSION !== 'undefined' && typeof renderAll === 'function' && typeof firebase !== 'undefined')).toBe(true);
});
