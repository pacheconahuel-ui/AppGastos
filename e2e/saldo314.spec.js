import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const cargar = async page => page.evaluate(() => {
  accounts = [
    { id: 'mp', name: 'Mercado Pago', emoji: '📱', type: 'wallet', currency: 'ARS', initialBalance: 0 },
    { id: 'ga', name: 'Galicia', emoji: '🏦', type: 'wallet', currency: 'ARS', initialBalance: 0 },
  ];
  const E = o => ({ type: 'Egreso', myAmount: o.amount, category: 'Otro', description: o.id, accountId: 'mp', date: todayStr(), ...o });
  expenses = [
    E({ id: 'Ingreso', type: 'Ingreso', amount: 100000 }),
    E({ id: 'Cena grande con amigos', amount: 300000, myAmount: 100000, splits: [{ personId: 'v', amount: 200000 }] }),
    E({ id: 'Ajuste de saldo — Mercado Pago', amount: 50000, ajuste: true }),
    E({ id: 'Super', amount: 90000, accountId: 'ga' }),
  ];
  debts = [{ id: 'd1', personId: 'v', personName: 'Vicky', amount: 200000, settled: false, linkedExpenseId: 'Cena grande con amigos', date: todayStr() }];
  transfers = []; usdTx = []; renderAll();
});

test('un total negativo se ve con su signo y en rojo (antes salía "$163.068" sin el menos)', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  // Mercado Pago: +100.000 − 300.000 − 50.000 = −250.000; Galicia −90.000
  await expect(page.locator('#patrimonio-card .pat-total')).toHaveText('−$340.000');
  await expect(page.locator('#patrimonio-card .pat-total')).toHaveClass(/neg/);
  await page.evaluate(() => switchTab('cuentas'));
  await expect(page.locator('#cuentas-total-ars')).toContainText('−$340.000');
  noErrors(page);
});

for (const ancho of [320, 390]) {
  test(`"¿Por qué este saldo?" desarma el saldo (${ancho} px)`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 780 });
    await openApp(page);
    await cargar(page);
    await page.evaluate(() => switchTab('cuentas'));
    await page.locator('.account-card', { hasText: 'Mercado Pago' }).getByRole('button', { name: '¿Por qué este saldo?' }).click();
    const v = page.locator('#lk-body');
    await expect(v).toContainText('Mercado Pago');
    await expect(v.locator('.sd-row', { hasText: 'Ingresos' })).toContainText('+$100.000');
    await expect(v.locator('.sd-row', { hasText: 'Tus gastos' })).toContainText('−$100.000'); // solo tu parte
    await expect(v.locator('.sd-row', { hasText: 'Lo que pagaste por otros' })).toContainText('−$200.000');
    await expect(v.locator('.sd-row', { hasText: 'Ajustes de saldo' })).toContainText('−$50.000');
    await expect(v.locator('.sd-total')).toContainText('−$250.000');
    // los dos grupos que más suelen explicar un saldo raro, con su ayuda y lo que dice Saldos
    await expect(v).toContainText('Gastos divididos que pesan en este saldo');
    await expect(v).toContainText('todavía te deben $200.000');
    await expect(v).toContainText('pagaste $300.000 · tu parte $100.000');
    await expect(v).toContainText('Ajustes de saldo');
    for (const b of await page.locator('#lk-overlay button').all()) {
      const r = await b.boundingBox();
      expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(43.5);
    }
    expect(await page.evaluate(() => { const m = document.querySelector('#lk-overlay .modal'); return m.scrollWidth <= m.clientWidth && document.documentElement.scrollWidth <= window.innerWidth; })).toBe(true);
    // tocar un gasto de la lista lo abre para editarlo
    await v.locator('.sd-item', { hasText: 'Cena grande' }).click();
    await expect(page.locator('#m-overlay')).toHaveClass(/\bon\b/);
    await expect(page.locator('#lk-overlay')).not.toHaveClass(/\bon\b/);
    noErrors(page);
  });
}

test('una billetera sin nada raro no muestra las listas de ayuda', async ({ page }) => {
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => openSaldoDetalle('ga'));
  const v = page.locator('#lk-body');
  await expect(v.locator('.sd-total')).toContainText('−$90.000');
  await expect(v).not.toContainText('Gastos divididos que pesan');
  await expect(v).not.toContainText('Ajustes de saldo');
  noErrors(page);
});
