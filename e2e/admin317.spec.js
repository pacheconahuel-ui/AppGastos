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

// 3.19: pantalla completa del administrador, con datos de ejemplo (sin Firebase)
const cargarAdmin = page => page.evaluate(() => {
  ES_ADMIN = true; db = {};
  const hoy = todayStr(), ms = d => new Date(d + 'T12:00:00').getTime();
  adminEstado.d = {
    restringido: false,
    dias: { b: { [hoy]: true }, c: {} },
    users: [
      { uid: 'a', nombre: 'Nahuel', email: 'n@x.com', yo: true, permitido: false, ultimo: ms(hoy), version: '3.19', movs: 70 },
      { uid: 'b', nombre: 'Vicky', email: 'v@x.com', permitido: true, ultimo: ms(hoy), primero: ms('2026-10-01'), version: '3.18', movs: 120 },
      { uid: 'c', nombre: 'Mamá', email: 'mama@x.com', permitido: false, ultimo: ms('2026-08-01'), version: '3.14', movs: 9 },
    ],
  };
  document.getElementById('admin-page').classList.remove('hidden');
  adminPintar();
});

for (const ancho of [320, 360, 390]) {
  test(`administración completa a ${ancho} px: resumen, gráfico, filtros y controles de 44`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 800 });
    await openApp(page);
    await cargarAdmin(page);
    const kpis = page.locator('.ad-kpi');
    await expect(kpis).toHaveCount(5);
    await expect(kpis.nth(0)).toContainText('3');
    await expect(page.locator('.ad-bar')).toHaveCount(30);
    await expect(page.locator('.ad-user')).toHaveCount(3);
    await page.locator('#admin-chips button', { hasText: 'Sin autorizar' }).click();
    await expect(page.locator('.ad-user')).toHaveCount(1);
    await expect(page.locator('.ad-user')).toContainText('Mamá');
    await page.locator('#admin-chips button', { hasText: 'Todos' }).click();
    await page.locator('#admin-buscar').fill('vic');
    await expect(page.locator('.ad-user')).toHaveCount(1);
    await page.locator('#admin-buscar').fill('');
    for (const sel of ['#admin-chips button', '.ad-switch button', '.sd-act', '.ad-foot button', '#admin-page .back-link']) {
      for (const b of await page.locator(sel).all()) { const r = await b.boundingBox(); expect(Math.min(r.width, r.height), sel).toBeGreaterThanOrEqual(43.5); }
    }
    expect(await page.evaluate(() => document.getElementById('admin-page').scrollWidth <= window.innerWidth)).toBe(true);
    noErrors(page);
  });
}

test('administración: exportar CSV y volver con Escape', async ({ page }) => {
  await openApp(page);
  await cargarAdmin(page);
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Exportar lista/ }).click()]);
  expect(d.suggestedFilename()).toMatch(/^personas-\d{4}-\d{2}-\d{2}\.csv$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#admin-page')).toBeHidden();
  noErrors(page);
});
