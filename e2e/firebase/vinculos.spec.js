import { test, expect } from '@playwright/test';
import { newUser, device, pending } from './helpers.js';

const base = 'http://127.0.0.1:9000';
const put = async (tok, p, d, method = 'PUT') => (await fetch(`${base}/${p}.json?ns=gastos-pache-default-rtdb&auth=${tok}`, { method, body: JSON.stringify(d) })).status;
const token = p => p.evaluate(() => auth.currentUser.getIdToken());

test('vincular dos personas, avisar una deuda, pagar y confirmar; y las reglas cierran lo demás', async ({ browser }) => {
  const A = await device(browser, await newUser()); // Nahuel: acreedor
  const B = await device(browser, await newUser()); // Nacho: debe
  const C = await device(browser, await newUser()); // un tercero que no está vinculado con nadie
  const uidA = await A.evaluate(() => currentUID), uidB = await B.evaluate(() => currentUID);
  const codeB = await B.evaluate(() => miCodigo());
  expect(codeB.startsWith(uidB + '.')).toBe(true);

  // A vincula su contacto "Nacho" con el código de B
  await A.evaluate(() => { persons.push({ id: 'p_nacho', name: 'Nacho', emoji: '🙂', isRecurrent: true }); saveLocal(); pushSettings(); });
  expect(await A.evaluate(c => vincularContacto('p_nacho', c), codeB)).toBe(true);
  expect(await A.evaluate(() => personById('p_nacho').linkedUid)).toBe(uidB);
  // B ve la solicitud, todavía sin contacto
  await expect.poll(() => B.evaluate(() => lkSolicitudes().length)).toBe(1);

  // A carga una deuda con Nacho: le llega el aviso aunque todavía no haya aceptado
  await A.evaluate(async () => { openDebtModal(); document.getElementById('df-person').value = 'p_nacho'; document.getElementById('df-amt').value = '15000'; document.getElementById('df-desc').value = 'Cena'; await saveDebt(); });
  await expect.poll(() => B.evaluate(() => avisosIn.length)).toBe(1);
  expect(await B.evaluate(() => avisoTexto(avisosIn[0]))).toContain('registró una deuda tuya: $15.000 · Cena');
  expect(await B.evaluate(() => lkNoVistos())).toBe(2); // el aviso y la solicitud

  // B todavía no aceptó: no puede mandarle nada a A
  const tokB = await token(B), tokA = await token(A), tokC = await token(C);
  const av = { tipo: 'pago', de: uidB, ref: 'x', creado: 1 };
  expect(await put(tokB, `avisos/${uidA}/zz1`, av)).toBe(401);
  // un tercero no vinculado no puede mandarle avisos a B, ni leer los de B, ni vincularse con un secreto equivocado
  const uidC = await C.evaluate(() => currentUID);
  expect(await put(tokC, `avisos/${uidB}/zz2`, { ...av, de: uidC })).toBe(401);
  expect((await fetch(`${base}/avisos/${uidB}.json?ns=gastos-pache-default-rtdb&auth=${tokC}`)).status).toBe(401);
  expect(await put(tokC, `vinculos/${uidB}/aceptados/${uidC}`, { nombre: 'C', secreto: 'aaaaaaaaaaaaaaaa', miCodigo: 'x.y' })).toBe(401);
  // nadie puede hacerse pasar por otro en un aviso
  expect(await put(tokA, `avisos/${uidB}/zz3`, { ...av, de: uidC })).toBe(401);
  // ni mandar avisos mal formados
  expect(await put(tokA, `avisos/${uidB}/zz4`, { ...av, de: uidA, tipo: 'cualquiera' })).toBe(401);
  expect(await put(tokA, `avisos/${uidB}/zz5`, { ...av, de: uidA, extra: 1 })).toBe(401);

  // B acepta: queda un contacto vinculado
  await B.evaluate(uid => aceptarVinculo(uid), uidA);
  expect(await B.evaluate(() => persons.some(p => p.linkedUid && p.linkedUid.length > 10))).toBe(true);
  await expect.poll(() => A.evaluate(() => !!vinculosIn[currentUID && personById('p_nacho').linkedUid])).toBe(true);

  // B paga: sale plata de su billetera y A recibe el aviso del pago
  const idDeuda = await B.evaluate(() => avisosIn[0].id);
  await B.evaluate(id => abrirPago(id, 'pagar'), idDeuda);
  await B.evaluate(async id => { document.getElementById('lk-acc').value = 'acc_mp'; await hacerPago(id, 'pagar'); }, idDeuda);
  expect(await B.evaluate(() => accountBalance('acc_mp'))).toBe(-15000);
  expect(await B.evaluate(() => estadoDeuda(avisosIn.find(a => a.tipo === 'deuda'), avisosIn))).toBe('esperando');
  await expect.poll(() => A.evaluate(() => avisosIn.filter(a => a.tipo === 'pago').length)).toBe(1);

  // A confirma: la deuda queda saldada y entra la plata; B ve "saldada"
  const idPago = await A.evaluate(() => avisosIn.find(a => a.tipo === 'pago').id);
  await A.evaluate(id => abrirPago(id, 'cobrar'), idPago);
  await A.evaluate(async id => { document.getElementById('lk-acc').value = 'acc_santander'; await hacerPago(id, 'cobrar'); }, idPago);
  expect(await A.evaluate(() => debts.every(d => d.settled))).toBe(true);
  expect(await A.evaluate(() => accountBalance('acc_santander'))).toBe(15000);
  await expect.poll(() => B.evaluate(() => estadoDeuda(avisosIn.find(a => a.tipo === 'deuda'), avisosIn))).toBe('saldada');

  // los datos propios de cada uno siguen siendo solo suyos
  expect(await put(tokB, `usuarios/${uidA}/gastos/z`, { id: 'z', type: 'Egreso', amount: 1, date: '2026-01-01' })).toBe(401);
  await expect.poll(() => pending(A)).toBe(0);
  await expect.poll(() => pending(B)).toBe(0);
  for (const p of [A, B, C]) expect(p.errs).toEqual([]);
});

test('rechazar un pago, desvincular y cambiar el código', async ({ browser }) => {
  const A = await device(browser, await newUser());
  const B = await device(browser, await newUser());
  const uidA = await A.evaluate(() => currentUID), uidB = await B.evaluate(() => currentUID);
  const codeB = await B.evaluate(() => miCodigo());
  await A.evaluate(() => { persons.push({ id: 'p_n', name: 'Nacho', emoji: '🙂', isRecurrent: true }); });
  await A.evaluate(c => vincularContacto('p_n', c), codeB);
  await expect.poll(() => B.evaluate(() => lkSolicitudes().length)).toBe(1);
  await B.evaluate(uid => aceptarVinculo(uid), uidA);
  // A le debe a B (deuda con monto negativo): A paga desde Saldos y B recibe un "pagó" para confirmar
  await A.evaluate(async () => { openDebtModal(); document.getElementById('df-person').value = 'p_n'; document.getElementById('df-dir').value = 'yo-debo'; document.getElementById('df-amt').value = '5000'; document.getElementById('df-desc').value = 'Nafta'; await saveDebt(); });
  await expect.poll(() => B.evaluate(() => avisosIn.length)).toBe(1);
  expect(await B.evaluate(() => avisoTexto(avisosIn[0]))).toContain('registró que te debe $5.000');
  await A.evaluate(async () => { openSettleModal('p_n'); await doSettle(); });
  await expect.poll(() => B.evaluate(() => avisosIn.filter(a => a.tipo === 'pago').length)).toBe(1);
  // B dice que no lo recibió: A se entera
  await B.evaluate(() => rechazarPago(avisosIn.find(a => a.tipo === 'pago').id));
  await expect.poll(() => A.evaluate(() => avisosIn.filter(a => a.tipo === 'rechazado').length)).toBe(1);
  expect(await A.evaluate(() => avisoTexto(avisosIn.find(a => a.tipo === 'rechazado')))).toContain('no recibió');

  // B cambia su código y desvincula a A: A ya no puede mandarle avisos
  const tokA = await A.evaluate(() => auth.currentUser.getIdToken());
  const av = { tipo: 'baja', de: uidA, ref: 'q', creado: 1 };
  expect(await put(tokA, `avisos/${uidB}/ok1`, av)).toBe(200);
  await B.evaluate(uid => sacarVinculo(uid), uidA);
  expect(await put(tokA, `avisos/${uidB}/ok2`, av)).toBe(401);
  // y con el código viejo tampoco puede volver a entrar
  expect(await A.evaluate(c => vincularContacto('p_n', c), codeB)).toBe(false);
  for (const p of [A, B]) expect(p.errs).toEqual([]);
});
