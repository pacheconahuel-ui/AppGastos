import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

// Resumen cerrado de octubre (se cierra el 26/10): 1000 de compras
const cargar = page => page.evaluate(() => {
  accounts.push({ id: 'visa', name: 'Visa', emoji: '💳', type: 'credit', closingDay: 26, dueDay: 9 });
  saveAccounts();
  expenses = [
    { id: 'c1', type: 'Egreso', amount: 1000, myAmount: 1000, date: '2026-10-10', category: 'Compras', description: 'Zapatillas', accountId: 'visa', ccPaid: false },
  ];
  saveLocal(); renderAll();
});
const abrirPago = (page, real) => page.evaluate(r => { openCCPayModal('visa'); document.getElementById('ccp-real-ars').value = r ?? ''; ccPayDiff(); }, real);

test.beforeEach(async ({ page }) => { await page.clock.install({ time: new Date('2026-11-13T12:00:00') }); });

test('3.25 pagar de más: ofrece registrar la diferencia como «Intereses y cargos» (cuenta como gasto del mes)', async ({ page }) => {
  await openApp(page); await cargar(page);
  await abrirPago(page, 1250);
  const dif = page.locator('#ccp-diff');
  await expect(dif).toBeVisible();
  await expect(dif).toContainText('$250 más');
  await expect(page.locator('#ccp-diff-mode')).toHaveValue('registrar');
  await page.evaluate(async () => { await saveCCPayment(); });
  const e = await page.evaluate(() => expenses.find(x => x.cargosResumen));
  expect([e.amount, e.category, e.ccPaid, e.accountId]).toEqual([250, 'Servicios', true, 'visa']);
  expect(await page.evaluate(() => calcSummary('2026-11').real)).toBe(250); // cuenta en noviembre, el mes del pago
  expect(await page.evaluate(() => expenses.filter(x => x.accountId === 'visa' && !x.ccPaid && !x.ccPayment).length)).toBe(0);
  noErrors(page);
});

test('3.25 pagar de menos: pago parcial, el resto queda pendiente y no se cuenta dos veces', async ({ page }) => {
  await openApp(page); await cargar(page);
  await abrirPago(page, 600);
  await expect(page.locator('#ccp-diff')).toContainText('$400 menos');
  await expect(page.locator('#ccp-diff-mode')).toHaveValue('pendiente');
  await page.evaluate(async () => { await saveCCPayment(); });
  const p = await page.evaluate(() => expenses.find(x => x.arrastre));
  expect([p.amount, p.ccPaid, p.description]).toEqual([400, false, 'Saldo pendiente del resumen Visa']);
  expect(await page.evaluate(() => calcSummary('2026-11').real)).toBe(0); // no es un gasto nuevo
  expect(await page.evaluate(() => ccEstimated('visa').totalARS)).toBe(400); // pero sigue por pagar
  // lo vuelve a mostrar la tarjeta, y al pagar el próximo resumen se salda
  await page.evaluate(() => { switchTab('cuentas'); });
  await expect(page.locator('.cc-summary-box')).toContainText('Saldo pendiente del resumen');
  noErrors(page);
});

test('3.25 «Era el total» no deja deuda, y sin diferencia no aparece ninguna pregunta', async ({ page }) => {
  await openApp(page); await cargar(page);
  await abrirPago(page, 600);
  await page.locator('#ccp-diff-mode').selectOption('total');
  await page.evaluate(async () => { await saveCCPayment(); });
  expect(await page.evaluate(() => expenses.some(x => x.arrastre || x.cargosResumen))).toBe(false);
  await page.evaluate(() => { expenses.push({ id: 'c2', type: 'Egreso', amount: 800, myAmount: 800, date: '2026-10-12', category: 'Compras', description: 'Otra', accountId: 'visa', ccPaid: false }); saveLocal(); });
  await abrirPago(page, 800);
  await expect(page.locator('#ccp-diff')).toBeHidden();
  noErrors(page);
});

test('3.25 una devolución en la tarjeta baja el resumen y los gastos del mes', async ({ page }) => {
  await openApp(page); await cargar(page);
  await page.evaluate(async () => {
    openModal(); setType('Ingreso');
    document.getElementById('f-account').value = 'visa'; onAccountSelected();
    document.getElementById('f-amt').value = '300'; document.getElementById('f-desc').value = 'Devolución zapatillas';
    selectCat('Otros ingresos'); await saveExpense();
  });
  const d = await page.evaluate(() => expenses.find(x => x.devolucion));
  expect([d.type, d.accountId, d.cardExpType]).toEqual(['Ingreso', 'visa', 'one']);
  expect(await page.evaluate(() => ccEstimated('visa').totalARS)).toBe(700);
  expect(await page.evaluate(() => { const r = calcSummary('2026-11'); return [r.ing, r.real]; })).toEqual([0, -300]); // noviembre: el gasto de octubre no se toca
  await page.evaluate(() => { switchTab('cuentas'); });
  await expect(page.locator('.cc-summary-box')).toContainText('−$300'); // la línea muestra el signo
  await page.evaluate(() => { switchTab('lista'); });
  await expect(page.locator('#full-list')).toContainText('Devolución en la tarjeta');
  // la devolución es de hoy (resumen en curso): pagar el resumen cerrado deja pendiente solo esa devolución, que baja el próximo
  await page.evaluate(async () => { openCCPayModal('visa'); await saveCCPayment(); });
  expect(await page.evaluate(() => expenses.filter(x => x.accountId === 'visa' && !x.ccPaid && !x.ccPayment).map(x => x.id === x.id && !!x.devolucion))).toEqual([true]);
  expect(await page.evaluate(() => ccEstimated('visa').totalARS)).toBe(-300);
  noErrors(page);
});
