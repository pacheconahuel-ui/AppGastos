import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const dialogo = page => page.evaluate(() => ({
  titulo: document.getElementById('conf-ttl').textContent,
  boton: document.querySelector('#conf-btns .btn-yes').textContent,
}));

test('después de cancelar "Borrar todos mis datos", borrar un gasto funciona', async ({ page }) => {
  await openApp(page);
  page.on('dialog', d => d.dismiss());
  await page.evaluate(() => { expenses.push({ id: 'e1', type: 'Egreso', amount: 100, myAmount: 100, date: todayStr(), category: 'Luz', description: 'Luz', accountId: 'acc_mp' }); confirmResetAll(); });
  expect((await dialogo(page)).boton).toBe('Sí, borrar todo');
  await page.click('#conf-btns .btn-no');
  await page.evaluate(() => delExp('e1'));
  expect(await dialogo(page)).toEqual({ titulo: '¿Eliminar?', boton: 'Eliminar' });
  await page.click('#conf-btns .btn-yes');
  await expect.poll(() => page.evaluate(() => expenses.length)).toBe(0);
  noErrors(page);
});

test('la transferencia pide confirmación y mueve los saldos', async ({ page }) => {
  await openApp(page);
  const preparar = () => page.evaluate(() => {
    openTransferModal();
    document.getElementById('tf-from').value = 'acc_mp';
    document.getElementById('tf-to').value = 'acc_efectivo';
    document.getElementById('tf-amt').value = '500';
    saveTransfer();
  });
  await preparar();
  expect((await dialogo(page)).titulo).toBe('Confirmar transferencia');
  await page.click('#conf-btns .btn-no');
  expect(await page.evaluate(() => transfers.length)).toBe(0);
  await preparar();
  await page.click('#conf-btns .btn-yes');
  expect(await page.evaluate(() => [transfers.length, accountBalance('acc_mp'), accountBalance('acc_efectivo')])).toEqual([1, -500, 500]);
  await page.evaluate(() => deleteTransfer(transfers[0].id));
  expect((await dialogo(page)).boton).toBe('Eliminar');
  await page.click('#conf-btns .btn-yes');
  await expect.poll(() => page.evaluate(() => transfers.length)).toBe(0);
  noErrors(page);
});
