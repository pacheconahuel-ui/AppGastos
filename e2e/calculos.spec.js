import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test('USD: se pasan a pesos con su cotización; sin cotización van aparte', async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => {
    accounts.push({ id: 'usdw', name: 'Dólares', emoji: '💵', type: 'wallet', currency: 'USD', initialBalance: 100 }, { id: 'cc', name: 'Visa', emoji: '💳', type: 'credit' });
    const mk = nowKey(), d = mk + '-05';
    expenses.push(
      { id: 'a', type: 'Ingreso', amount: 1000000, myAmount: 1000000, date: d, category: 'Sueldo', description: 's', accountId: 'acc_mp', currency: 'ARS' },
      { id: 'b', type: 'Egreso', amount: 10, myAmount: 10, date: d, category: 'Streaming', description: 'Netflix', accountId: 'acc_mp', currency: 'USD', exchangeRate: 1200, arsEquiv: 12000 },
      { id: 'c', type: 'Egreso', amount: 20, myAmount: 20, date: d, category: 'Compras', description: 'Amazon', accountId: 'cc', currency: 'USD' });
    renderAll();
    return { res: calcSummary(mk), mp: accountBalance('acc_mp'), gastos: document.getElementById('c-real').textContent };
  });
  expect(r.res).toMatchObject({ ing: 1000000, pag: 12000, real: 12000, usdNoRate: 20 });
  expect(r.mp).toBe(988000);
  expect(r.gastos).toBe('$12.000 + U$S 20');
  noErrors(page);
});

test('el mes no cuenta el pago de la tarjeta ni la compra de dólares; los saldos sí', async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => {
    const mk = nowKey(), d = mk + '-05';
    accounts.push({ id: 'cc', name: 'Visa', emoji: '💳', type: 'credit' });
    expenses = [
      { id: 's', type: 'Ingreso', amount: 1000000, myAmount: 1000000, date: d, category: 'Sueldo', description: 'Sueldo', accountId: 'acc_mp' },
      { id: 'c1', type: 'Egreso', amount: 50000, myAmount: 50000, date: d, category: 'Compras', description: 'Zapatillas', accountId: 'cc', ccPaid: true },
      { id: 'pg', type: 'Egreso', amount: 50000, myAmount: 50000, date: d, category: 'Servicios', description: 'Pago resumen Visa', accountId: 'acc_mp' },
      { id: 'fx1', type: 'Egreso', amount: 120000, myAmount: 120000, date: d, category: 'Otro', description: 'Compra U$S 100', accountId: 'acc_mp' },
      { id: 'luz', type: 'Egreso', amount: 30000, myAmount: 30000, date: d, category: 'Luz', description: 'Luz', accountId: 'acc_mp' }];
    usdTx = [{ id: 'u1', type: 'compra', usdAmount: 100, arsAmount: 120000, date: d, linkedArsId: 'fx1' }];
    renderAll();
    return { pag: calcSummary(mk).pag, cats: calcByCat(mk), mp: accountBalance('acc_mp'), etiqueta: expHTML(expenses[2], false).includes('Pago de tarjeta') };
  });
  expect(r.pag).toBe(80000);
  expect(r.cats).toEqual({ Compras: 50000, Luz: 30000 });
  expect(r.mp).toBe(800000);
  expect(r.etiqueta).toBe(true);
  noErrors(page);
});

test('saldar: pago parcial, pago total y pago mío desde una billetera', async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    persons = [{ id: 'j', name: 'Juan', emoji: '🙂' }, { id: 'a', name: 'Ana', emoji: '🙂' }];
    debts = [
      { id: 'd1', personId: 'j', personName: 'Juan', amount: 1000, date: '2026-11-01', description: 'cena', settled: false },
      { id: 'd2', personId: 'a', personName: 'Ana', amount: -600, date: '2026-11-01', description: 'nafta', settled: false }];
    const out = {};
    openSettleModal('j'); document.getElementById('settle-amt').value = '400'; document.getElementById('settle-acc').value = 'acc_mp'; await doSettle();
    out.parcial = personBalance('j');
    openSettleModal('j'); document.getElementById('settle-acc').value = 'acc_mp'; await doSettle();
    out.total = personBalance('j');
    openSettleModal('a'); out.etiqueta = document.getElementById('settle-acc-lbl').textContent.trim(); document.getElementById('settle-acc').value = 'acc_efectivo'; await doSettle();
    out.ana = personBalance('a'); out.mp = accountBalance('acc_mp'); out.efectivo = accountBalance('acc_efectivo');
    return out;
  });
  expect(r).toEqual({ parcial: 600, total: 0, etiqueta: 'Pagar desde', ana: 0, mp: 1000, efectivo: -600 });
  noErrors(page);
});

test('deudas repetidas: el aviso las muestra y "Limpiar" deja la más nueva', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    persons = [{ id: 'j', name: 'Juan', emoji: '🙂' }];
    const d = todayStr();
    debts = [1, 2, 3].map(n => ({ id: 'd' + n, personId: 'j', personName: 'Juan', amount: n === 3 ? 500 : 400, linkedExpenseId: 'x', settled: false, createdAt: n, date: d }))
      .concat([{ id: 'd4', personId: 'j', personName: 'Juan', amount: 200, linkedExpenseId: 'y', settled: false, createdAt: 4, date: d }]);
    switchTab('saldos');
  });
  await page.getByText('tocá para revisar y limpiar').click();
  await expect(page.locator('#conf-txt')).toContainText('Juan: te debe $800 de más');
  await page.click('#conf-btns .btn-yes');
  await expect.poll(() => page.evaluate(() => debts.map(d => d.id).join(','))).toBe('d3,d4');
  expect(await page.evaluate(() => personBalance('j'))).toBe(700);
  noErrors(page);
});
