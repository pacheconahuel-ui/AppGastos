import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const opciones = page => page.evaluate(() => { openModal(); return cats.filter(c => catVisibleForCurrentType(c)); });
const entrar = page => page.evaluate(() => { loadLocal(); }); // como al iniciar sesión: arma las categorías

test('3.20 usuario nuevo: solo las categorías comunes, sin las personales de antes', async ({ page }) => {
  await openApp(page);
  await entrar(page);
  const cs = await opciones(page);
  for (const c of ['Padel', 'Zurich', 'Fútbol', 'Educador Canino']) expect(cs).not.toContain(c);
  for (const c of ['Supermercado', 'Alquiler', 'Servicios', 'Otro']) expect(cs).toContain(c);
  // y las de ingreso
  const ing = await page.evaluate(() => { setType('Ingreso'); return cats.filter(c => catVisibleForCurrentType(c)); });
  for (const c of ['Sueldo', 'Transferencia', 'Reintegro', 'Otros ingresos']) expect(ing).toContain(c);
  for (const c of ['Salario', 'SAC', 'Sueldo 2', 'Comisión', 'Aguinaldo / Bono', 'Freelance / Honorarios']) expect(ing).not.toContain(c);
  noErrors(page);
});

test('3.20 quien ya las usa las conserva, y puede eliminarlas', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    expenses = [
      { id: 'a', type: 'Egreso', amount: 100, myAmount: 100, date: todayStr(), category: 'Padel', description: 'Cancha', accountId: 'acc_mp' },
      { id: 'b', type: 'Ingreso', amount: 900, myAmount: 900, date: todayStr(), category: 'Salario', description: 'Sueldo', accountId: 'acc_mp' },
    ];
    cats = armarCats(); catTypes = normalizeCatTypes({}); renderAll();
  });
  const cs = await opciones(page);
  expect(cs).toContain('Padel');
  expect(cs).not.toContain('Zurich');
  const ing = await page.evaluate(() => { setType('Ingreso'); return cats.filter(c => catVisibleForCurrentType(c)); });
  expect(ing).toContain('Salario');
  // la mueve de lugar el administrador de categorías: aparece como propia y se puede eliminar
  await page.evaluate(() => { closeModal(); openCatManager(); });
  const fila = page.locator('.cat-manager-item', { hasText: 'Padel' });
  await expect(fila.locator('.cat-manager-name.custom')).toHaveCount(1);
  await fila.locator('.cat-mgr-btn.delete').click();
  await page.locator('#conf-btns .btn-yes').click();
  await expect(page.locator('.cat-manager-item', { hasText: 'Padel' })).toHaveCount(0);
  // aunque tenga movimientos con esa categoría, no vuelve
  expect(await page.evaluate(() => { actualizarCatsLegacy(); return cats.includes('Padel'); })).toBe(false);
  noErrors(page);
});
