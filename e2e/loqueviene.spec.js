import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

async function cargar(page) {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00-03:00') });
  await openApp(page);
  await page.evaluate(() => {
    accounts.push({ id: 'cc', name: 'Visa', emoji: '💳', type: 'credit', closingDay: 25, dueOffset: 10 });
    const E = o => ({ type: 'Egreso', myAmount: o.amount, category: 'Otro', description: o.id, accountId: 'acc_mp', ...o });
    expenses = [
      E({ id: 'cuota', amount: 30000, accountId: 'cc', date: '2026-11-05', cardExpType: 'installment', installmentCurrent: 1, installmentTotal: 3, ccPaid: false }),
      E({ id: 'netflix', amount: 5000, accountId: 'cc', date: '2026-11-05', cardExpType: 'recurring', ccPaid: false }),
      E({ id: 'alq', description: 'Alquiler', amount: 400000, date: '2026-10-01', recurring: true }),
      ...Array.from({ length: 12 }, (_, i) => E({ id: 'h' + i, description: 'Heladera', amount: 25000, date: dateAddMonths('2026-12-07', i), serieId: 's', serieIdx: i + 1, serieTotal: 12 })),
      E({ id: 'luz', category: 'Luz', description: 'Luz', amount: 30000, date: '2026-10-12' }),
      ...['2026-08-01', '2026-09-01', '2026-10-01'].map((d, i) => E({ id: 'i' + i, type: 'Ingreso', amount: 1200000, date: d, category: 'Salario' })),
    ];
    renderAll();
  });
}

test('sin nada cargado para adelante, la línea del resumen no aparece', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { expenses = []; renderAll(); });
  await expect(page.locator('#fc-line')).toBeHidden();
  noErrors(page);
});

test('el resumen muestra el mínimo del mes que viene y la pantalla lo desarma', async ({ page }) => {
  await cargar(page);
  // diciembre: tarjeta 35.000 (cuota 1/3 + netflix) + cuota heladera 25.000 + alquiler 400.000
  await expect(page.locator('#fc-line')).toContainText('Mes que viene');
  await expect(page.locator('#fc-line')).toContainText('$460.000');
  await page.locator('#fc-line').click();
  const v = page.locator('#lk-body');
  await expect(v).toContainText('Mínimo de Diciembre 2026');
  await expect(v.locator('.fc-kpi-val')).toHaveText('$460.000');
  await expect(v).toContainText('Visa');
  await expect(v).toContainText('cuota 1/3');
  await expect(v).toContainText('cuota 1/12 · hasta 07/11');
  await expect(v).toContainText('Alquiler');
  // los servicios que cambian se suman solo si se pide (promedio de 3 meses: luz 30.000 / 3 = 10.000)
  await expect(v).toContainText('promedio de 3 meses, $10.000');
  await v.getByRole('switch', { name: /Sumar servicios/ }).click();
  await expect(v.locator('.fc-kpi-val')).toHaveText('$470.000');
  await expect(page.locator('#fc-line')).toContainText('$470.000');
  // comparar con ingresos (D)
  await v.getByRole('switch', { name: /Comparar con mis ingresos/ }).click();
  await expect(v).toContainText('Entran ~$1.200.000 por mes');
  await expect(v).toContainText('te quedan libres ~$730.000');
  // otro mes de la tira: marzo, ya sin la cuota 3/3 de la tarjeta
  await v.getByRole('button', { name: /Marzo/ }).click();
  await expect(v).toContainText('Mínimo de Marzo 2027');
  await expect(v.locator('.fc-kpi-val')).toHaveText('$440.000'); // netflix 5.000 + heladera 25.000 + alquiler 400.000 + servicios 10.000
  // noviembre (este mes): lo que falta, sin estimar servicios
  await v.getByRole('button', { name: /Noviembre/ }).click();
  await expect(v).toContainText('Lo que falta pagar de Noviembre 2026');
  noErrors(page);
});

for (const ancho of [320, 360, 390]) {
  test(`pantalla "Lo que viene" a ${ancho} px: entra y los controles miden 44`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 780 });
    await cargar(page);
    await page.evaluate(() => openForecast());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => { const m = document.querySelector('#lk-overlay .modal'); return m.scrollWidth <= m.clientWidth; })).toBe(true);
    for (const b of await page.locator('#lk-overlay button').all()) {
      const r = await b.boundingBox();
      expect(Math.min(r.width, r.height), await b.innerText()).toBeGreaterThanOrEqual(43.5);
    }
    await page.evaluate(() => closeLk());
    expect((await page.locator('#fc-line').boundingBox()).height).toBeGreaterThanOrEqual(43.5);
    noErrors(page);
  });
}
