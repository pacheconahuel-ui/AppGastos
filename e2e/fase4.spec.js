import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

const DOLAR = [
  { casa: 'oficial', compra: 1520, venta: 1570, fechaActualizacion: '2026-11-05T18:55:00.000Z' },
  { casa: 'blue', compra: 1535, venta: 1555, fechaActualizacion: '2026-11-08T21:00:00.000Z' },
  { casa: 'bolsa', compra: 1560.2, venta: 1587.9, fechaActualizacion: '2026-11-08T21:00:00.000Z' },
  { casa: 'tarjeta', compra: 1976, venta: 2041, fechaActualizacion: '2026-11-05T18:55:00.000Z' },
];

async function conTarjeta(page) {
  await page.evaluate(() => {
    accounts.push({ id: 'cc', name: 'Visa', emoji: '💳', type: 'credit', closingDay: 25, dueOffset: 10 });
    saveAccounts();
    expenses.push(
      { id: 'z', type: 'Egreso', amount: 50000, myAmount: 50000, date: '2026-10-20', category: 'Compras', description: 'Zapatillas', accountId: 'cc', ccPaid: false },
      { id: 'tv', type: 'Egreso', amount: 30000, myAmount: 30000, date: '2026-10-10', category: 'Compras', description: 'Tele', accountId: 'cc', ccPaid: false, cardExpType: 'installment', installmentCurrent: 2, installmentTotal: 4 },
      { id: 'nf', type: 'Egreso', amount: 8000, myAmount: 8000, date: '2026-10-05', category: 'Streaming', description: 'Netflix', accountId: 'cc', ccPaid: false, cardExpType: 'recurring' });
    renderAll();
  });
}

for (const ancho of [320, 360, 390]) {
  test(`recordatorio de vencimiento y pago (${ancho} px)`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 760 });
    await page.clock.install({ time: new Date('2026-11-01T10:00:00-03:00') });
    await openApp(page);
    await conTarjeta(page);
    const aviso = page.locator('#card-reminders .card-reminder');
    await expect(aviso).toContainText('Resumen Visa · vence en 3 días (04/11)');
    await expect(aviso).toContainText('$88.000');
    const btn = aviso.getByRole('button', { name: 'Pagar' });
    const box = await btn.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await btn.click();
    await page.evaluate(async () => { document.getElementById('ccp-wallet-ars').value = 'acc_mp'; await saveCCPayment(); });
    await expect(page.locator('#card-reminders .card-reminder')).toHaveCount(0);
    expect(await page.evaluate(() => accounts.find(a => a.id === 'cc').lastPaid)).toBe('2026-11-01');
    noErrors(page);
  });
}

test('próximos resúmenes de la tarjeta: cuotas que quedan y fijos', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-01T10:00:00-03:00') });
  await openApp(page);
  await conTarjeta(page);
  await page.evaluate(() => switchTab('cuentas'));
  await page.getByText('Próximos resúmenes').click();
  const filas = page.locator('.cc-proj-row');
  await expect(filas).toHaveCount(6);
  await expect(filas.nth(0)).toContainText('Nov 26 · próximo');
  await expect(filas.nth(0)).toContainText('$88.000');
  await expect(filas.nth(1)).toContainText('$38.000');   // cuota 3/4 + Netflix
  await expect(filas.nth(2)).toContainText('$38.000');   // cuota 4/4 + Netflix
  await expect(filas.nth(3)).toContainText('$8.000');    // solo Netflix
  noErrors(page);
});

test('gráfico por período: meses, trimestres y años con comparación', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-08T10:00:00-03:00') });
  await openApp(page);
  await page.evaluate(() => {
    expenses.push(
      { id: 'a', type: 'Egreso', amount: 1000, myAmount: 1000, date: '2026-08-05', category: 'Luz', description: 'x', accountId: 'acc_mp' },
      { id: 'b', type: 'Egreso', amount: 1500, myAmount: 1500, date: '2026-11-05', category: 'Luz', description: 'x', accountId: 'acc_mp' },
      { id: 'c', type: 'Ingreso', amount: 9000, myAmount: 9000, date: '2026-11-02', category: 'Sueldo', description: 'x', accountId: 'acc_mp' });
    renderAll();
  });
  await expect(page.locator('#monthly-chart-title')).toHaveText('Últimos 6 meses');
  await page.locator('#period-tabs button', { hasText: 'Trimestres' }).click();
  await expect(page.locator('#monthly-chart-title')).toHaveText('Últimos 4 trimestres');
  await expect(page.locator('#period-compare')).toContainText('T4 26 (en curso) vs T3 26');
  await expect(page.locator('#period-compare')).toContainText('Gastos $1.500 ▲50%');
  await page.locator('#period-tabs button', { hasText: 'Años' }).click();
  await expect(page.locator('#monthly-chart-title')).toHaveText('Últimos 3 años');
  expect(await page.evaluate(() => localStorage.getItem('gp_period_mode'))).toBe('anio');
  noErrors(page);
});

test('dólar del día: completa el tipo de cambio en gastos y en compra de USD', async ({ page }) => {
  await page.route('https://dolarapi.com/**', r => r.fulfill({ json: DOLAR }));
  await openApp(page);
  // gasto nuevo en USD con billetera: propone el oficial; se puede elegir otro
  await page.evaluate(() => { openModal(); document.getElementById('f-account').value = 'acc_mp'; document.getElementById('f-amt').value = '10'; document.getElementById('f-currency').value = 'USD'; onAmtOrCurrencyChange(); });
  await expect(page.locator('#f-tc')).toHaveValue('1570');
  await expect(page.locator('#f-ars-equiv')).toHaveValue('15700');
  await page.locator('#f-tc-rates .rate-chip', { hasText: 'Tarjeta' }).click();
  await expect(page.locator('#f-tc')).toHaveValue('2041');
  await expect(page.locator('#f-ars-equiv')).toHaveValue('20410');
  await page.evaluate(() => closeModal());
  // con tarjeta propone el dólar tarjeta
  await page.evaluate(() => { accounts.push({ id: 'cc', name: 'Visa', emoji: '💳', type: 'credit' }); openModal(); document.getElementById('f-account').innerHTML += '<option value="cc">Visa</option>'; document.getElementById('f-account').value = 'cc'; document.getElementById('f-currency').value = 'USD'; onAmtOrCurrencyChange(); });
  await expect(page.locator('#f-tc')).toHaveValue('2041');
  await page.evaluate(() => closeModal());
  // compra de USD: precio de venta del blue
  await page.evaluate(() => { openUsdModal(); setUsdType('compra'); document.getElementById('uf-usd').value = '100'; });
  await page.locator('#uf-rates .rate-chip', { hasText: 'Blue' }).click();
  await expect(page.locator('#uf-ars')).toHaveValue('155500');
  // venta: precio de compra
  await page.evaluate(() => setUsdType('venta'));
  await page.locator('#uf-rates .rate-chip', { hasText: 'Blue' }).click();
  await expect(page.locator('#uf-ars')).toHaveValue('153500');
  noErrors(page);
});

test('dólar del día: sin conexión con la API no hay botones ni errores', async ({ page }) => {
  await page.route('https://dolarapi.com/**', r => r.abort());
  await openApp(page);
  await page.evaluate(() => { openModal(); document.getElementById('f-currency').value = 'USD'; onAmtOrCurrencyChange(); });
  await page.waitForTimeout(500);
  await expect(page.locator('#f-tc-rates .rate-chip')).toHaveCount(0);
  await expect(page.locator('#f-tc')).toHaveValue('');
  noErrors(page);
});

test('en cuotas, el monto es el de cada cuota', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { accounts.push({ id: 'cc', name: 'Visa', emoji: '💳', type: 'credit' }); openModal(); document.getElementById('f-account').innerHTML += '<option value="cc">Visa</option>'; document.getElementById('f-account').value = 'cc'; onAccountSelected(); setCardExpType('installment'); });
  await expect(page.locator('#f-amt-lbl')).toHaveText('Monto de cada cuota ($)');
  await page.evaluate(() => { document.getElementById('f-account').value = 'acc_mp'; onAccountSelected(); });
  await expect(page.locator('#f-amt-lbl')).toHaveText('Monto total ($)');
  noErrors(page);
});
