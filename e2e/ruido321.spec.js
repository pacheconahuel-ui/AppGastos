import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const cargar = page => page.evaluate(() => {
  const hoy = todayStr(), mk = hoy.slice(0, 8);
  persons = [{ id: 'v', name: 'Vicky', emoji: '👩', isRecurrent: true }, { id: 'n', name: 'Nacho', emoji: '🧑', isRecurrent: true }];
  accounts.push({ id: 'visa', name: 'Visa', emoji: '💳', type: 'credit', closingDay: 26, dueDay: 9 });
  saveAccounts();
  expenses = [
    { id: 'a', type: 'Egreso', amount: 1000, myAmount: 1000, date: hoy, category: 'Compras', description: 'Zapatillas', accountId: 'acc_mp' },
    { id: 'b', type: 'Egreso', amount: 500, myAmount: 500, date: hoy, category: 'Luz', description: 'Luz', accountId: 'acc_mp', recurring: true },
    { id: 'c', type: 'Ingreso', amount: 9000, myAmount: 9000, date: mk + '01', category: 'Sueldo', description: 'Sueldo', accountId: 'acc_mp' },
    { id: 'd', type: 'Egreso', amount: 9, myAmount: 9, date: mk + '28', category: 'Servicios', description: 'Google', accountId: 'acc_mp', currency: 'USD', exchangeRate: 1000, arsEquiv: 9000 },
  ];
  debts = [];
  saveLocal(); renderAll();
});

test('3.21 Lista: filtros plegados, movimientos agrupados por día y etiquetas sobrias', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T12:00:00') });
  await page.setViewportSize({ width: 390, height: 800 });
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => switchTab('lista'));
  await expect(page.locator('#list-more')).toBeHidden();
  await expect(page.locator('#fil-search')).toBeVisible();
  await expect(page.locator('#full-list .list-day').first()).toHaveText('Programado · 28 de noviembre'); // lo futuro, arriba
  await expect(page.locator('#full-list .list-day').nth(1)).toHaveText('Hoy');
  // dos movimientos de hoy comparten un solo encabezado
  expect(await page.locator('#full-list .list-day', { hasText: 'Hoy' }).count()).toBe(1);
  await expect(page.locator('#full-list .list-day', { hasText: 'Programado' })).toHaveCount(1);
  // sin etiquetas con borde: solo texto gris e iconos
  await expect(page.locator('#full-list .badge')).toHaveCount(0);
  await expect(page.locator('#full-list .exp-item', { hasText: 'Luz' }).locator('[title="Se repite todos los meses"]')).toHaveCount(1);
  await expect(page.locator('#full-list .exp-item', { hasText: 'Google' }).locator('[title="Programado"]')).toHaveCount(1);
  // abrir filtros, usar uno y ver la cuenta en el botón
  await page.getByRole('button', { name: /Filtros/ }).click();
  await expect(page.locator('#list-more')).toBeVisible();
  await page.locator('#fil-type').selectOption('Ingreso');
  await expect(page.locator('#filtros-n')).toHaveText('1');
  await expect(page.locator('#full-list .exp-item')).toHaveCount(1);
  for (const sel of ['#filtros-btn', '#fil-search', '.list-csv']) expect((await page.locator(sel).boundingBox()).height, sel).toBeGreaterThanOrEqual(43.5);
  noErrors(page);
});

test('3.21 Cuentas: billeteras en una fila que abre el detalle; tarjeta con fechas debajo y sin bloque vacío', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T12:00:00') });
  await page.setViewportSize({ width: 390, height: 800 });
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => { expenses.push({ id: 'z', type: 'Egreso', amount: 30000, myAmount: 30000, date: '2026-10-10', category: 'Compras', description: 'Viejo', accountId: 'visa', ccPaid: false, cardExpType: 'recurring' }); saveLocal(); switchTab('cuentas'); });
  const fila = page.locator('.account-card', { hasText: 'Mercado Pago' });
  expect((await fila.boundingBox()).height).toBeLessThan(90);
  await expect(page.locator('.acc-why')).toHaveCount(0);
  await fila.click();
  await expect(page.locator('#lk-body')).toContainText('¿Por qué este saldo?');
  await page.getByRole('button', { name: 'Editar billetera' }).click();
  await expect(page.locator('#account-overlay')).toHaveClass(/\bon\b/);
  await page.keyboard.press('Escape');
  // tarjeta: nombre y total arriba, fechas en otra línea; el período abierto vacío no se muestra
  const head = page.locator('.cc-toggle');
  const n = await head.locator('.cc-summary-name').boundingBox(), f = await head.locator('.cc-tg-sub').boundingBox();
  expect(f.y).toBeGreaterThan(n.y + n.height - 2);
  await expect(page.locator('.cc-st.closed')).toBeVisible();
  await expect(page.locator('.cc-st.open')).toHaveCount(0);
  expect((await page.locator('.cc-proj summary').boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  noErrors(page);
});

test('3.21 «Disponible ahora»: sin botones de ajuste en cada fila; tocar una fila abre el detalle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => { patrimonioExpanded = true; renderPatrimonioCard(); });
  await page.waitForTimeout(450);
  await expect(page.locator('#pat-detail button[title="Ajustar"]')).toHaveCount(0);
  await page.locator('#pat-detail .pat-row', { hasText: 'Mercado Pago' }).click();
  await expect(page.locator('#lk-body')).toContainText('Mercado Pago');
  noErrors(page);
});

test('3.21 Perfil: agrupado, y lo técnico y peligroso va en «Avanzado» plegado', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { window.firebase = window.firebase || { auth: () => ({ currentUser: { email: 'a@x.com', displayName: 'Ana' } }) }; });
  await page.evaluate(() => { try { openProfilePanel(); } catch (e) { window.__e = e.message; } });
  const b = page.locator('#profile-panel-body');
  for (const t of ['Mi cuenta', 'Configuración', 'Respaldo', 'Ayuda']) await expect(b).toContainText(t);
  await expect(b.locator('.profile-adv')).not.toHaveAttribute('open', '');
  await expect(b.getByText('Verificar datos en Firebase')).toBeHidden();
  await expect(b.getByText('Borrar todos mis datos')).toBeHidden();
  await b.locator('.profile-adv summary').click();
  await expect(b.getByText('Verificar datos en Firebase')).toBeVisible();
  await expect(b.getByText('Borrar todos mis datos')).toBeVisible();
  noErrors(page);
});

test('3.21 Lo que viene: sin barras, textos cortos y el detalle de cada tarjeta plegado', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T12:00:00') });
  await page.setViewportSize({ width: 390, height: 800 });
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => {
    expenses.push({ id: 'z', type: 'Egreso', amount: 30000, myAmount: 30000, date: '2026-11-03', category: 'Compras', description: 'Zapatillas nuevas', accountId: 'visa', ccPaid: false });
    saveLocal(); openForecast();
  });
  await expect(page.locator('.fc-bar')).toHaveCount(0);
  await expect(page.locator('.fc-tog').first()).toContainText('Sumar luz y gas');
  const tarjeta = page.locator('details.fc-item', { hasText: 'Visa' });
  await expect(tarjeta).toHaveCount(1);
  await expect(tarjeta.locator('.fc-sub').first()).toBeHidden();
  await tarjeta.locator('summary').click();
  await expect(tarjeta.locator('.fc-sub').first()).toBeVisible();
  noErrors(page);
});

test('3.21 Saldos: quien no tiene nada va en una sola línea; «Ver detalle» lleva flecha', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openApp(page);
  await cargar(page);
  await page.evaluate(() => { debts = [{ id: 'd1', personId: 'v', personName: 'Vicky', description: 'Alquiler', amount: 1000, date: todayStr(), settled: false }]; saveLocal(); renderSaldosTab(); switchTab('saldos'); });
  await expect(page.locator('.person-card', { hasText: 'Vicky' })).toBeVisible();
  await expect(page.locator('.person-card', { hasText: 'Nacho' })).toHaveCount(0);
  await expect(page.locator('.person-zeros')).toContainText('Nacho');
  await page.evaluate(() => switchTab('dashboard'));
  const summ = page.locator('#sum-det summary');
  expect(await summ.evaluate(el => getComputedStyle(el, '::after').content)).toContain('▾');
  noErrors(page);
});
