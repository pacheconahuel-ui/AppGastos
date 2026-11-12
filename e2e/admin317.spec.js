import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const cargarDatos = page => page.evaluate(() => {
  for (let i = 0; i < 8; i++) expenses.push({ id: 'e' + i, type: 'Egreso', amount: 100, myAmount: 100, date: todayStr(), category: 'Otro' });
  saveLocal(); renderAll();
});

test('aviso de respaldo: aparece sin respaldo, se pospone y desaparece al descargar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await expect(page.locator('#backup-aviso .card-reminder')).toHaveCount(0); // sin datos no molesta
  await cargarDatos(page);
  await page.evaluate(() => renderBackupAviso());
  const av = page.locator('#backup-aviso .card-reminder');
  await expect(av).toContainText('Todavía no bajaste un respaldo');
  for (const n of ['Después', 'Descargar']) expect((await av.getByRole('button', { name: n }).boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  await av.getByRole('button', { name: 'Después' }).click();
  await expect(av).toHaveCount(0);
  await page.evaluate(() => { localStorage.removeItem(lsKey('gp_backup_snooze')); renderBackupAviso(); });
  await expect(av).toHaveCount(1);
  const [d] = await Promise.all([page.waitForEvent('download'), av.getByRole('button', { name: 'Descargar' }).click()]);
  expect(d.suggestedFilename()).toContain('mis-gastos-respaldo');
  await expect(av).toHaveCount(0);
  // 31 días después vuelve a avisar
  await page.evaluate(() => { localStorage.setItem(backupKey(), String(Date.now() - 31 * 86400000)); renderBackupAviso(); });
  await expect(av).toContainText('Hace 31 días');
  noErrors(page);
});

test('«Administración» solo aparece en el perfil del administrador', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { window.firebase = window.firebase || {}; });
  const abrir = () => page.evaluate(() => { ES_ADMIN = window.__admin; try { openProfilePanel(); } catch (e) { window.__err = e.message; } });
  await page.evaluate(() => { window.__admin = false; });
  await abrir();
  await expect(page.locator('#profile-panel-body')).not.toContainText('Administración');
  await page.evaluate(() => { closeProfilePanel(); window.__admin = true; });
  await abrir();
  await expect(page.locator('#profile-panel-body')).toContainText('Administración · quién usa la app');
  noErrors(page);
});

test('cuenta sin acceso: pantalla clara con salida', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await openApp(page);
  await page.evaluate(() => { auth = { currentUser: { email: 'alguien@ejemplo.com' } }; bloquearAcceso(); });
  const s = page.locator('#sin-acceso');
  await expect(s).toBeVisible();
  await expect(s).toContainText('todavía no tiene acceso');
  await expect(s).toContainText('alguien@ejemplo.com');
  await expect(page.locator('#app')).toBeHidden();
  for (const n of ['Ya me autorizaron', 'Cerrar sesión']) expect((await s.getByRole('button', { name: n }).boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  noErrors(page);
});
