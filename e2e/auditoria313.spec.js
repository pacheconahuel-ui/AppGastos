import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

test('todos los scripts van diferidos (no frenan el primer dibujo) y no queda la migración vieja', async ({ page }) => {
  await openApp(page);
  expect(await page.evaluate(() => [...document.querySelectorAll('script[src]')].filter(s => !s.defer).map(s => s.src))).toEqual([]);
  expect(await page.evaluate(() => typeof checkMigration)).toBe('undefined');
  await expect(page.locator('#mig-banner')).toHaveCount(0);
  noErrors(page);
});

test('varios eventos de Firebase seguidos dibujan una sola vez', async ({ page }) => {
  await openApp(page);
  const veces = await page.evaluate(async () => {
    let n = 0; const orig = renderDashboard; renderDashboard = () => { n++; return orig(); };
    renderAllSoon(); renderAllSoon(); renderAllSoon(); renderAllSoon();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    renderDashboard = orig; return n;
  });
  expect(veces).toBe(1);
  noErrors(page);
});

test('los gráficos no se dibujan con otra pestaña abierta, y vuelven al volver al Resumen', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { expenses = [{ id: 'a', type: 'Egreso', amount: 100, myAmount: 100, date: todayStr(), category: 'Luz', description: 'x', accountId: 'acc_mp' }]; renderAll(); switchTab('saldos'); });
  const durante = await page.evaluate(() => { let n = 0; const o = renderPieChart; renderPieChart = (...a) => { n++; return o(...a); }; renderAll(); renderPieChart = o; return n; });
  expect(durante).toBe(0);
  const alVolver = await page.evaluate(() => { let n = 0; const o = renderPieChart; renderPieChart = (...a) => { n++; return o(...a); }; switchTab('dashboard'); renderPieChart = o; return n; });
  expect(alVolver).toBe(1);
  noErrors(page);
});

test('guardado local: lo que no cambió no se vuelve a escribir', async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => {
    let n = 0; const set = Storage.prototype.setItem; Storage.prototype.setItem = function (...a) { n++; return set.apply(this, a); };
    saveLocal(); const primera = n; n = 0;
    saveLocal(); saveLocal(); const repetidas = n; n = 0;
    expenses.push({ id: 'z', type: 'Egreso', amount: 1, myAmount: 1, date: todayStr(), category: 'Luz', description: 'x' });
    saveLocal(); const cambio = n;
    Storage.prototype.setItem = set; return { primera, repetidas, cambio };
  });
  expect(r.repetidas).toBe(0);
  expect(r.cambio).toBe(1); // solo la lista de gastos
  noErrors(page);
});

test('Lista: tocar la fila edita, queda solo el botón de borrar y la descripción larga se ve entera en 2 renglones', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await openApp(page);
  await page.evaluate(() => {
    expenses = [{ id: 'a', type: 'Egreso', amount: 5900, myAmount: 5900, date: todayStr(), category: 'Otro', description: 'Transferencia a Galanuru S.R.L. por varios conceptos', accountId: 'acc_mp' }];
    renderAll(); switchTab('lista');
  });
  await expect(page.locator('#full-list .btn-ico.edit')).toHaveCount(0);
  await expect(page.locator('#full-list .btn-ico.del')).toHaveCount(1);
  const d = await page.locator('#full-list .exp-desc').boundingBox();
  expect(d.width).toBeGreaterThan(110); // antes quedaba en ~70 px, una sola línea cortada
  expect(d.height).toBeLessThan(45); // 2 renglones como mucho
  await page.locator('#full-list .exp-item').click({ position: { x: 100, y: 20 } });
  await expect(page.locator('#m-overlay')).toHaveClass(/\bon\b/);
  noErrors(page);
});

test('Cuentas: el total y las transferencias van en renglones separados', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openApp(page);
  await page.evaluate(() => { usdTx = []; accounts.push({ id: 'w', name: 'Wise', emoji: '🌐', type: 'wallet', currency: 'USD', initialBalance: 3992.34 }); renderAll(); switchTab('cuentas'); });
  const t = await page.locator('.cuentas-total').boundingBox();
  const s = await page.locator('.cuentas-total-sub').boundingBox();
  expect(s.y).toBeGreaterThan(t.y + 20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  noErrors(page);
});

test('proyección del mes: los fijos ya pagados no se repiten cada día', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-11T11:00:00-03:00') });
  await openApp(page);
  await page.evaluate(() => {
    const E = o => ({ type: 'Egreso', myAmount: o.amount, category: 'Otro', description: o.id, accountId: 'acc_mp', ...o });
    expenses = [
      E({ id: 'Zurich', amount: 440000, date: '2026-11-04', recurring: true }),
      E({ id: 'Super', amount: 110000, date: '2026-11-05' }),
      E({ id: 'Cafe', amount: 11000, date: '2026-11-08' }),
      E({ id: 'Alquiler', amount: 300000, date: '2026-10-01', recurring: true }), // el fijo del mes pasado: todavía falta cargar el de este mes
    ];
    renderAll();
  });
  // gastado 561.000 · variable 121.000 en 11 días = 11.000/día × 19 días que faltan = 209.000 · falta el alquiler: 300.000
  await expect(page.locator('#c-proj')).toHaveText('$1.070.000');
  await expect(page.locator('#sum-stats')).toContainText('/día sin fijos');
  noErrors(page);
});

test('escritorio ancho: el Resumen va en dos columnas; en el celular, una abajo de la otra', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await page.evaluate(() => { expenses = [{ id: 'a', type: 'Egreso', amount: 100, myAmount: 100, date: todayStr(), category: 'Luz', description: 'x', accountId: 'acc_mp' }]; renderAll(); });
  const x = async s => (await page.locator(s).first().boundingBox()).x;
  expect(await x('#bg-card')).toBeGreaterThan((await x('#recent-list')) + 300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  const a = (await page.locator('#recent-list').boundingBox()), b = (await page.locator('#bg-card').boundingBox());
  expect(b.y).toBeGreaterThan(a.y);
  expect(Math.abs(a.x - b.x)).toBeLessThan(2);
  noErrors(page);
});
