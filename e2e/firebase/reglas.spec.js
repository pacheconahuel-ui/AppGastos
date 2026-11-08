import { test, expect } from '@playwright/test';
import { newUser, device, pending } from './helpers.js';

test('todo lo que escribe la app pasa las reglas; lo mal formado y otro usuario no', async ({ browser }) => {
  const A = await device(browser, await newUser());
  await A.evaluate(() => { persons.push({ id: 'p1', name: 'Juan', emoji: '🙂' }); saveLocal(); pushSettings(); });
  await A.evaluate(async () => {
    openModal(); document.getElementById('f-account').value = 'acc_mp'; document.getElementById('f-amt').value = '1000';
    splitRows = [{ personId: 'p1', personName: 'Juan', emoji: '🙂', amount: 400 }]; splitPanelOpen = true; await saveExpense();
  });
  for (const t of ['ingreso', 'compra', 'venta']) {
    await A.evaluate(async t => { openUsdModal(); setUsdType(t); document.getElementById('uf-usd').value = '10'; document.getElementById('uf-ars').value = '12000'; await saveUsdTx(); }, t);
  }
  await A.evaluate(async () => { openDebtModal(); document.getElementById('df-person').value = 'p1'; document.getElementById('df-amt').value = '300'; document.getElementById('df-desc').value = 'cena'; await saveDebt(); });
  await A.evaluate(async () => { openSettleModal('p1'); await doSettle(); });
  await A.evaluate(async () => { openQuickAdd(); _qaCat = 'Luz'; document.getElementById('qa-amt').value = '50'; await saveQuickAdd(); });
  await A.evaluate(async () => { openAdjustModal('acc_mp'); document.getElementById('adj-acc').value = 'acc_mp'; document.getElementById('adj-real').value = '99999'; await saveAdjust(); });
  await A.evaluate(() => { transfers.push({ id: 'tf_1', fromId: 'acc_mp', toId: 'acc_efectivo', amount: 5, date: todayStr(), description: 't' }); saveAccounts(); pushSettings(); });
  await expect.poll(() => pending(A)).toBe(0);
  expect(await A.evaluate(() => [expenses.length, usdTx.length, debts.length])).toEqual([6, 3, 2]);

  const { tok, uid } = await A.evaluate(async () => ({ tok: await auth.currentUser.getIdToken(), uid: currentUID }));
  const put = async (p, d) => (await fetch(`http://127.0.0.1:9000/${p}.json?ns=gastos-pache-default-rtdb&auth=${tok}`, { method: 'PUT', body: JSON.stringify(d) })).status;
  const ok = { id: 'z', type: 'Egreso', amount: 1, date: '2026-01-01' };
  expect(await put('usuarios/otro/gastos/z', ok)).toBe(401);
  expect(await put(`usuarios/${uid}/gastos/z`, { id: 'z', type: 'Egreso', date: '2026-01-01' })).toBe(401);
  expect(await put(`usuarios/${uid}/gastos/z`, { ...ok, amount: '1' })).toBe(401);
  expect(await put(`usuarios/${uid}/gastos/z`, { ...ok, id: 'w' })).toBe(401);
  expect(await put(`usuarios/${uid}/gastos/z`, { ...ok, date: '1/1/26' })).toBe(401);
  expect(await put(`usuarios/${uid}/basura`, { a: 1 })).toBe(401);
  expect(await put(`usuarios/${uid}/gastos/z`, ok)).toBe(200);
  expect(await A.evaluate(async () => { try { await db.ref('usuarios/' + currentUID).remove(); return 'ok'; } catch (e) { return e.code; } })).toBe('ok');
  expect(A.errs).toEqual([]);
});
