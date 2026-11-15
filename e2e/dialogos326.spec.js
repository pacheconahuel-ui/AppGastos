import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

// Si algo vuelve a usar prompt() del navegador, la prueba falla
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.prompt = () => { throw new Error('se usó prompt() del navegador'); }; });
});

const dlg = page => page.locator('#ask-overlay');

test('3.26 nueva categoría: se pide en un diálogo de la app, valida y se crea', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openApp(page);
  await page.evaluate(() => { loadLocal(); openCatManager(); });
  await page.evaluate(() => { addCatTyped('egreso'); });
  await expect(dlg(page)).toHaveClass(/\bon\b/);
  await expect(dlg(page)).toContainText('Nueva categoría de egreso');
  expect((await page.locator('#ask-inp').boundingBox()).height).toBeGreaterThanOrEqual(44);
  // vacío y repetida no pasan
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.locator('#ask-err')).toContainText('Escribí un nombre');
  await page.locator('#ask-inp').fill('Supermercado');
  await page.keyboard.press('Enter');
  await expect(page.locator('#ask-err')).toContainText('Ya existe');
  await page.locator('#ask-inp').fill('Cafetería');
  await page.keyboard.press('Enter');
  await expect(dlg(page)).not.toHaveClass(/\bon\b/);
  expect(await page.evaluate(() => cats.includes('Cafetería'))).toBe(true);
  noErrors(page);
});

test('3.26 renombrar, cambiar ícono y cancelar con Escape no cambian nada', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { loadLocal(); cats.push('Prueba'); setCatType('Prueba', 'egreso'); saveLocal(); });
  await page.evaluate(() => { renameCat('Prueba'); });
  await expect(page.locator('#ask-inp')).toHaveValue('Prueba');
  await page.locator('#ask-inp').fill('Renombrada');
  await page.getByRole('button', { name: 'Guardar' }).click();
  expect(await page.evaluate(() => cats.includes('Renombrada') && !cats.includes('Prueba'))).toBe(true);
  // cancelar con Escape
  await page.evaluate(() => { editCatIcon('Renombrada'); });
  await page.locator('#ask-inp').fill('🎯');
  await page.keyboard.press('Escape');
  await expect(dlg(page)).not.toHaveClass(/\bon\b/);
  expect(await page.evaluate(() => catIcon('Renombrada'))).not.toBe('🎯');
  await page.evaluate(() => { editCatIcon('Renombrada'); });
  await page.locator('#ask-inp').fill('🎯');
  await page.getByRole('button', { name: 'Cambiar' }).click();
  expect(await page.evaluate(() => catIcon('Renombrada'))).toBe('🎯');
  noErrors(page);
});

test('3.26 agregar a una meta pide un monto válido', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { goals = [{ id: 'g1', name: 'Vacaciones', emoji: '🏖️', target: 1000, current: 100 }]; saveGoals(); });
  await page.evaluate(() => { addToGoal('g1'); });
  await expect(dlg(page)).toContainText('Actual: $100 de $1.000');
  await page.locator('#ask-inp').fill('-5');
  await page.getByRole('button', { name: 'Agregar' }).click();
  await expect(page.locator('#ask-err')).toContainText('mayor a cero');
  await page.locator('#ask-inp').fill('250');
  await page.getByRole('button', { name: 'Agregar' }).click();
  expect(await page.evaluate(() => goals[0].current)).toBe(350);
  noErrors(page);
});

test('3.26 dividir con alguien: se elige de una lista, o se crea una persona nueva', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { persons = [{ id: 'v', name: 'Vicky', emoji: '👩' }, { id: 'n', name: 'Nacho', emoji: '🧑' }]; splitRows = []; splitPanelOpen = true; openModal(); splitPanelOpen = true; splitRows = []; });
  await page.evaluate(() => { addSplitPerson(); });
  await expect(dlg(page)).toContainText('Dividir con');
  await page.getByRole('button', { name: /Nacho/ }).click();
  expect(await page.evaluate(() => splitRows.map(r => r.personName))).toEqual(['Nacho']);
  await page.evaluate(() => { addSplitPerson(); });
  await page.getByRole('button', { name: '+ Nueva persona' }).click();
  await expect(page.locator('#add-contact-overlay')).toHaveClass(/\bon\b/);
  noErrors(page);
});

test('3.26 «Borrar todos mis datos» pide escribir BORRAR en el diálogo de la app', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { window.__borrado = false; resetAllData = () => { window.__borrado = true; }; confirmResetAll(); });
  await page.locator('#conf-btns .btn-yes').click(); // primera confirmación
  await expect(dlg(page)).toContainText('BORRAR');
  await page.locator('#ask-inp').fill('borrar mal');
  await page.getByRole('button', { name: 'Borrar todo' }).click();
  expect(await page.evaluate(() => window.__borrado)).toBe(false);
  await page.evaluate(() => confirmResetAll());
  await page.locator('#conf-btns .btn-yes').click();
  await page.locator('#ask-inp').fill('borrar');
  await page.getByRole('button', { name: 'Borrar todo' }).click();
  expect(await page.evaluate(() => window.__borrado)).toBe(true);
  noErrors(page);
});
