import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { newUser, device } from './helpers.js';

test('gasto compartido: editar no duplica deudas y borrarlo las borra; tarjeta pagada sigue pagada', async ({ browser }) => {
  const A = await device(browser, await newUser());
  await A.evaluate(() => { persons.push({ id: 'p1', name: 'Juan', emoji: '🙂' }, { id: 'p2', name: 'Ana', emoji: '🙂' }); saveLocal(); });
  const save = (id, amt, splits, acc = 'acc_mp') => A.evaluate(async ([id, amt, splits, acc]) => {
    openModal(id ? expenses.find(e => e.id === id) : null);
    document.getElementById('f-account').value = acc; document.getElementById('f-amt').value = String(amt);
    splitRows = splits; splitPanelOpen = splits.length > 0; await saveExpense();
    return id || expenses[expenses.length - 1].id;
  }, [id, amt, splits, acc]);
  const deudas = () => A.evaluate(() => debts.filter(d => d.linkedExpenseId).map(d => d.personName + ':' + d.amount).sort().join(','));
  const juan = n => ({ personId: 'p1', personName: 'Juan', emoji: '🙂', amount: n });
  const ana = n => ({ personId: 'p2', personName: 'Ana', emoji: '🙂', amount: n });

  const id = await save(null, 1000, [juan(400)]);
  expect(await deudas()).toBe('Juan:400');
  await save(id, 1000, [juan(400)]);
  expect(await deudas()).toBe('Juan:400');
  await save(id, 1200, [juan(500), ana(300)]);
  expect(await deudas()).toBe('Ana:300,Juan:500');
  await save(id, 1200, [ana(300)]);
  expect(await deudas()).toBe('Ana:300');
  await A.evaluate(id => { pendingDel = { type: 'ars', id }; doDelete(); }, id);
  await expect.poll(deudas).toBe('');
  await expect.poll(() => A.evaluate(async () => { const v = (await db.ref('usuarios/' + currentUID + '/debts').once('value')).val(); return v ? Object.keys(v).length : 0; })).toBe(0);

  await A.evaluate(() => { accounts.push({ id: 'cc1', name: 'Visa', emoji: '💳', type: 'credit' }); saveAccounts(); });
  const cid = await save(null, 700, [], 'cc1');
  await A.evaluate(cid => { const e = expenses.find(x => x.id === cid); e.ccPaid = true; e.ccPaidDate = '2026-11-01'; }, cid);
  await save(cid, 750, [], 'cc1');
  expect(await A.evaluate(cid => { const e = expenses.find(x => x.id === cid); return [e.ccPaid, e.ccPaidDate, e.amount]; }, cid)).toEqual([true, '2026-11-01', 750]);
  expect(A.errs).toEqual([]);
});

test('respaldo: descargar, perder todo, restaurar y verlo en el otro dispositivo', async ({ browser }, info) => {
  const email = await newUser();
  const A = await device(browser, email), B = await device(browser, email);
  await A.evaluate(async () => {
    persons.push({ id: 'p1', name: 'Juan', emoji: '🙂' });
    accounts.push({ id: 'w9', name: 'Banco / Ahorro', emoji: '🏦', type: 'wallet', initialBalance: 100 });
    budgets['Luz'] = 3000; cats.push('Auto / Nafta'); saveLocal(); saveAccounts(); saveBudgets(); await pushSettings();
    for (let i = 0; i < 5; i++) { const e = { id: 'e' + i, type: 'Egreso', amount: 10 + i, myAmount: 10 + i, date: '2026-11-0' + (i + 1), category: 'Luz', description: 'x', accountId: 'w9' }; expenses.push(e); await persistArs(e); }
    const t = { id: 'u1', type: 'ingreso', usdAmount: 50, date: '2026-11-01' }; usdTx.push(t); await persistUsd(t);
    const d = { id: 'd1', personId: 'p1', personName: 'Juan', amount: -200, date: '2026-11-01', description: 'c' }; debts.push(d); await persistDebt(d);
  });
  const [dl] = await Promise.all([A.waitForEvent('download'), A.evaluate(() => exportBackup())]);
  const file = info.outputPath('respaldo.json');
  await dl.saveAs(file);

  await A.evaluate(() => db.ref('usuarios/' + currentUID).remove());
  await expect.poll(() => B.evaluate(() => expenses.length + usdTx.length + debts.length)).toBe(0);

  const bad = info.outputPath('malo.json');
  fs.writeFileSync(bad, '{"hola":1}');
  await A.setInputFiles('#backup-file', bad);
  await expect(A.locator('#toast')).toContainText('no es un respaldo de Mis Gastos');

  await A.setInputFiles('#backup-file', file);
  await expect(A.locator('#conf-txt')).toContainText('5 movimientos, 1 en USD, 1 deudas');
  const [previo] = await Promise.all([A.waitForEvent('download'), A.click('#conf-btns .btn-yes')]);
  expect(previo.suggestedFilename()).toMatch(/^mis-gastos-antes-de-restaurar-/);
  await expect(A.locator('#toast')).toContainText('Respaldo restaurado');

  const estado = p => p.evaluate(() => ({ g: expenses.length, u: usdTx.length, d: debts.length, saldo: accountBalance('w9'), luz: budgets['Luz'] }));
  const esperado = { g: 5, u: 1, d: 1, saldo: 40, luz: 3000 };
  expect(await estado(A)).toEqual(esperado);
  await expect.poll(() => estado(B)).toEqual(esperado);
  expect([...A.errs, ...B.errs]).toEqual([]);
});
