import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

async function cargar(page, { meses, fecha = '2026-12-07', cuenta = 'acc_mp', desc = 'Cuota heladera' }) {
  await page.evaluate(async ([m, f, c, d]) => {
    openModal(); document.getElementById('f-account').value = c; document.getElementById('f-amt').value = '25000';
    document.getElementById('f-desc').value = d; document.getElementById('f-date').value = f; document.getElementById('f-serie').value = m;
    updateFutureHint(); await saveExpense();
  }, [meses, fecha, cuenta, desc]);
}

test('repetir N meses: carga todas las cuotas programadas, solo cuenta la que ya llegó y se pueden borrar', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00-03:00') });
  await openApp(page);
  // el formulario cuenta cuántas se cargan y hasta cuándo
  await page.evaluate(() => { openModal(); document.getElementById('f-amt').value = '25000'; document.getElementById('f-date').value = '2026-12-07'; document.getElementById('f-serie').value = '12'; updateSerieHint(); });
  await expect(page.locator('#f-serie-hint')).toContainText('Se cargan 12 movimientos, del 07/12/2026 al 07/11/2027');
  await expect(page.locator('#f-serie-hint')).toContainText('$300.000 en total');
  await page.evaluate(() => closeModal());

  await cargar(page, { meses: 12 });
  const fechas = await page.evaluate(() => expenses.map(e => e.date));
  expect(fechas.length).toBe(12);
  expect(fechas[0]).toBe('2026-12-07'); expect(fechas[1]).toBe('2027-01-07'); expect(fechas[11]).toBe('2027-11-07');
  expect(await page.evaluate(() => new Set(expenses.map(e => e.serieId)).size)).toBe(1);
  expect(await page.evaluate(() => expenses.map(e => e.serieIdx).join(','))).toBe('1,2,3,4,5,6,7,8,9,10,11,12');
  // todas futuras: nada resta hoy; el 7 de diciembre resta la primera; el 7 de enero, dos
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(0);
  await page.clock.setSystemTime(new Date('2026-12-07T09:00:00-03:00'));
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(-25000);
  await page.clock.setSystemTime(new Date('2027-01-08T09:00:00-03:00'));
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(-50000);

  // etiqueta 3/12 en la lista
  await page.evaluate(() => { switchTab('lista'); });
  await page.locator('#fil-month').selectOption('2027-02');
  await expect(page.locator('#full-list')).toContainText('3/12');

  // borrar una cuota del medio: pregunta si solo esa o también las que siguen
  const id3 = await page.evaluate(() => expenses.find(e => e.serieIdx === 3).id);
  await page.evaluate(i => delExp(i), id3);
  await expect(page.locator('#conf-txt')).toContainText('cuota 3 de 12');
  await page.getByRole('button', { name: /Esta y las siguientes \(10\)/ }).click();
  expect(await page.evaluate(() => expenses.map(e => e.serieIdx).join(','))).toBe('1,2');
  noErrors(page);
});

test('borrar solo una cuota; editar una no muestra "repetir"; no se repite con tarjeta ni con gastos compartidos', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00-03:00') });
  await openApp(page);
  await cargar(page, { meses: 3 });
  const id2 = await page.evaluate(() => expenses.find(e => e.serieIdx === 2).id);
  await page.evaluate(i => delExp(i), id2);
  await page.getByRole('button', { name: 'Solo esta' }).click();
  expect(await page.evaluate(() => expenses.map(e => e.serieIdx).join(','))).toBe('1,3');
  // la última cuota no ofrece "las siguientes"
  const id3 = await page.evaluate(() => expenses.find(e => e.serieIdx === 3).id);
  await page.evaluate(i => delExp(i), id3);
  await expect(page.getByRole('button', { name: /las siguientes/ })).toHaveCount(0);
  await page.evaluate(() => closeConf());
  // editar: el campo no aparece
  await page.evaluate(() => openModal(expenses[0]));
  await expect(page.locator('#f-serie-wrap')).toBeHidden();
  await page.evaluate(() => closeModal());
  // con tarjeta: no
  await page.evaluate(() => { accounts.push({ id: 'cc', name: 'Visa', emoji: '💳', type: 'credit', closingDay: 25 }); });
  const antes = await page.evaluate(() => expenses.length);
  await cargar(page, { meses: 6, cuenta: 'cc', desc: 'Compra' });
  await expect(page.locator('#toast')).toContainText('Con tarjeta usá');
  expect(await page.evaluate(() => expenses.length)).toBe(antes);
  await page.evaluate(() => closeModal());
  // con gasto dividido: no
  await page.evaluate(async () => {
    persons = [{ id: 'p1', name: 'Juan', emoji: '🙂' }];
    openModal(); document.getElementById('f-account').value = 'acc_mp'; document.getElementById('f-amt').value = '1000'; document.getElementById('f-serie').value = '3';
    splitRows = [{ personId: 'p1', personName: 'Juan', emoji: '🙂', amount: 400 }]; splitPanelOpen = true; await saveExpense();
  });
  await expect(page.locator('#toast')).toContainText('dividido');
  expect(await page.evaluate(() => expenses.length)).toBe(antes);
  noErrors(page);
});
