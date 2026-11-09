import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const aviso = (o) => ({ id: 'a' + o.n, de: 'UidNacho123', deNombre: 'Nahuel', ref: 'r' + o.n, creado: 1000 + o.n, tipo: 'deuda', monto: 15000, desc: 'Cena', fecha: '2026-11-05', ...o });

for (const ancho of [320, 360, 390]) {
  test(`bandeja de avisos a ${ancho} px: solicitudes, acciones y controles de 44`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 780 });
    await openApp(page);
    await page.evaluate(([a, b, c]) => {
      persons = [{ id: 'p1', name: 'Nahu', emoji: '🙂', linkedUid: 'UidNacho123' }];
      avisosIn = [a, b, c];
      vinculosIn = { UidNacho123: { nombre: 'Nahuel', miCodigo: 'x' }, OtroUid12345: { nombre: 'Vicky', secreto: 'x', miCodigo: 'OtroUid12345.abcdefghijkl1234' } };
      lkRender();
    }, [aviso({ n: 1 }), aviso({ n: 2, tipo: 'pago', desc: 'Cena', monto: 15000 }), aviso({ n: 3, tipo: 'deuda', monto: -500, desc: 'Nafta' })]);
    // insignia en el perfil y aviso en Saldos
    await expect(page.locator('#btn-profile')).toHaveClass(/has-badge/);
    await expect(page.locator('#avisos-banner')).toContainText('4 avisos nuevos');
    await page.evaluate(() => openAvisos());
    const body = page.locator('#lk-body');
    await expect(body).toContainText('Vicky quiere vincularse con vos'); // solicitud de alguien que todavía no es contacto
    await expect(body).toContainText('Nahu registró una deuda tuya: $15.000 · Cena');
    await expect(body).toContainText('Nahu dice que te pagó $15.000');
    await expect(body).toContainText('Nahu registró que te debe $500 · Nafta');
    // "Ya pagué" solo en la deuda que yo debo (no en la que me deben a mí); el pago ofrece confirmar o rechazar
    await expect(body.getByRole('button', { name: 'Ya pagué' })).toHaveCount(1);
    await expect(body.getByRole('button', { name: 'Recibí el pago' })).toHaveCount(1);
    await expect(body.getByRole('button', { name: 'No lo recibí' })).toHaveCount(1);
    for (const b of await page.locator('#lk-overlay button').all()) {
      const r = await b.boundingBox();
      expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(43.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    noErrors(page);
  });
}

test('"Ya pagué" pide billetera y fecha, y el estado de la deuda se muestra', async ({ page }) => {
  await openApp(page);
  await page.evaluate(a => { persons = []; avisosIn = [a]; renderAvisos(); }, aviso({ n: 1 }));
  await page.getByRole('button', { name: 'Ya pagué' }).click();
  await expect(page.locator('#lk-acc')).toBeVisible();
  await expect(page.locator('#lk-body')).toContainText('tiene que confirmar que la recibió');
  await expect(page.locator('#lk-date')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  // con la deuda ya pagada y confirmada por la otra persona, la tarjeta lo dice y no ofrece nada
  await page.evaluate(a => { avisosIn = [{ ...a, pagadoEn: 2000, estado: 'pagado' }, { id: 'ac', de: a.de, ref: a.ref, tipo: 'confirmado', creado: 3000, monto: 15000 }]; renderAvisos(); }, aviso({ n: 1 }));
  await expect(page.locator('#lk-body')).toContainText('Saldada');
  await expect(page.getByRole('button', { name: 'Ya pagué' })).toHaveCount(0);
  noErrors(page);
});

test('contactos: botón para vincular y estado', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { persons = [{ id: 'p1', name: 'Nacho', emoji: '🙂', isRecurrent: true }, { id: 'p2', name: 'Vicky', emoji: '👩', isRecurrent: true, linkedUid: 'UidVicky1234' }]; vinculosIn = {}; renderContactsList(); });
  await expect(page.locator('#contacts-body .lk-chip')).toHaveText(/esperando/);
  await page.evaluate(() => openVincular('p1'));
  await expect(page.locator('#lk-in')).toBeVisible();
  await page.evaluate(() => { document.getElementById('lk-in').value = 'esto no es un código'; });
  await page.getByRole('button', { name: 'Vincular', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('no parece válido');
  await page.evaluate(() => { closeLk(); openVincular('p2'); });
  await expect(page.locator('#lk-body')).toContainText('Falta que acepte');
  await expect(page.getByRole('button', { name: 'Desvincular' })).toBeVisible();
  noErrors(page);
});

test('el perfil trae Avisos y Mi código de contacto', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { window.firebase = { auth: () => ({ currentUser: { displayName: 'N', email: 'n@x.com' }, isSignInWithEmailLink: () => false }) }; avisosIn = [{ id: 'a1', de: 'U', ref: 'r', creado: 1, tipo: 'baja', monto: 1 }]; openProfilePanel(); });
  await expect(page.locator('#profile-panel-body')).toContainText('Mi código de contacto');
  await expect(page.locator('#profile-panel-body .par-badge')).toHaveText('1');
  noErrors(page);
});
