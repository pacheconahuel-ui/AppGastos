import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const medir = async (page, sel) => { const r = await page.locator(sel).boundingBox(); return { w: Math.round(r.width), h: Math.round(r.height) }; };

for (const ancho of [320, 360, 390]) {
  test(`encabezado a ${ancho} px: entra, sin cerrar sesión suelto y con controles de 44`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 740 });
    await openApp(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // cerrar sesión ya no está a un toque en el encabezado; el tema tampoco
    await expect(page.locator('.hdr .btn-logout, .hdr #btn-theme')).toHaveCount(0);
    for (const sel of ['.hdr .hdr-btn', '#btn-profile', '#sync-pill']) {
      const m = await medir(page, sel);
      expect(Math.min(m.w, m.h), sel).toBeGreaterThanOrEqual(44);
    }
    // nada se pisa: la lupa y el perfil caben a la derecha del título
    const r = await page.evaluate(() => ['.hdr-title', '.hdr-btn', '#btn-profile'].map(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left, b.right]; }));
    expect(r[0][1]).toBeLessThanOrEqual(r[1][0]);
    expect(r[1][1]).toBeLessThanOrEqual(r[2][0]);
    expect(r[2][1]).toBeLessThanOrEqual(ancho);
    noErrors(page);
  });
}

test('el punto de sincronización cambia de color y su texto va para lectores de pantalla', async ({ page }) => {
  await openApp(page);
  // todo en un solo paso: el arranque de Firebase puede volver a poner su estado entre dos pasos de la prueba
  const r = await page.evaluate(() => {
    const pill = document.getElementById('sync-pill');
    setStatus('online', '● Sincronizado');
    const online = [pill.classList.contains('online'), pill.getAttribute('aria-label')];
    setStatus('offline', '⚠ Offline');
    const offline = [pill.classList.contains('offline'), pill.getAttribute('aria-label')];
    pill.click(); // tocar el punto dice el estado con palabras
    return { online, offline, toast: document.getElementById('toast').textContent };
  });
  expect(r.online[0]).toBe(true);
  expect(r.online[1]).toMatch(/Sincronizado/);
  expect(r.offline[0]).toBe(true);
  expect(r.offline[1]).toMatch(/Offline/);
  expect(r.toast).toContain('Offline');
  noErrors(page);
});

test('cerrar sesión está en el perfil y pide confirmación', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { window.firebase = { auth: () => ({ currentUser: { displayName: 'Nahuel', email: 'n@x.com' }, isSignInWithEmailLink: () => false }) }; openProfilePanel(); });
  const salir = page.locator('#profile-panel-body .profile-logout');
  await expect(salir).toBeVisible();
  expect((await salir.boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  // el tema también se cambia desde el perfil
  await page.locator('#par-theme-lbl').click();
  expect(await page.evaluate(() => document.body.classList.contains('light'))).toBe(true);
  await page.evaluate(() => { window.__salio = false; window.doLogout = () => { window.__salio = true; }; });
  await salir.click();
  await expect(page.locator('#conf-overlay')).toHaveClass(/\bon\b/);
  expect(await page.evaluate(() => window.__salio)).toBe(false); // un toque solo no cierra la sesión
  await page.locator('#conf-btns .btn-yes').click();
  expect(await page.evaluate(() => window.__salio)).toBe(true);
  noErrors(page);
});

test('presupuestos y metas: tarjeta chica con lo más urgente y "Editar" abre el detalle', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    const d = nowKey() + '-03';
    expenses = [{ id: 'a', type: 'Egreso', amount: 60000, myAmount: 60000, date: d, category: 'Compras', description: 'x', accountId: 'acc_mp' }];
    budgets = { Compras: 50000, Luz: 30000, Gas: 30000, Internet: 30000, Servicios: 30000 };
    goals = [{ id: 'g1', name: 'Viaje', emoji: '✈️', target: 1000, current: 500 }];
    renderAll(); renderBudgetsSection(); renderGoalsSection();
  });
  await expect(page.locator('#bg-card .bg-row')).toHaveCount(4); // 3 presupuestos + 1 meta
  await expect(page.locator('#bg-card .bg-row').first()).toContainText('Compras');
  await expect(page.locator('#bg-card .bg-row').first()).toContainText('120%');
  await expect(page.locator('#bg-card')).toContainText('y 2 más');
  await expect(page.locator('#bg-detail')).toBeHidden();
  await page.getByRole('button', { name: 'Editar ›' }).click();
  await expect(page.locator('#bg-detail')).toBeVisible();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.locator('#bg-detail')).toBeHidden();
  noErrors(page);
});

test('los gráficos se ven de a uno', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { expenses = [{ id: 'a', type: 'Egreso', amount: 100, myAmount: 100, date: nowKey() + '-03', category: 'Luz', description: 'x', accountId: 'acc_mp' }]; renderAll(); });
  await expect(page.locator('#chart-box')).toBeVisible();
  await expect(page.locator('#monthly-chart-box')).toBeHidden();
  await page.getByRole('button', { name: 'Evolución' }).click();
  await expect(page.locator('#monthly-chart-box')).toBeVisible();
  await expect(page.locator('#chart-box')).toBeHidden();
  noErrors(page);
});

test('sin billetera: asignar con un toque, y al editar uno se vuelve a la lista', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openApp(page);
  await page.evaluate(() => {
    expenses = [1, 2, 3].map(n => ({ id: 'e' + n, type: 'Egreso', amount: 1000 * n, myAmount: 1000 * n, date: todayStr(), category: 'Luz', description: 'g' + n }));
    expenses.push({ id: 'u1', type: 'Egreso', amount: 5, myAmount: 5, currency: 'USD', date: todayStr(), category: 'Streaming', description: 'usd' });
    renderAll(); openUnassigned();
  });
  await expect(page.locator('#gsearch-results')).toContainText('Sin billetera (4)');
  // un toque en una billetera: la fila sale de la lista y el saldo se mueve
  await page.locator('.unas-item', { hasText: 'g1' }).locator('.unas-chip', { hasText: 'Mercado Pago' }).click();
  await expect(page.locator('#gsearch-results')).toContainText('Sin billetera (3)');
  expect(await page.evaluate(() => accountBalance('acc_mp'))).toBe(-1000);
  // los de dólares no llevan botones de pesos
  await expect(page.locator('.unas-item', { hasText: 'usd' }).locator('.unas-chip')).toHaveCount(0);
  // las billeteras se tocan fácil
  expect((await page.locator('.unas-chip').first().boundingBox()).height).toBeGreaterThanOrEqual(43.5);
  // tocar la fila abre la edición; al guardar se vuelve a la lista con el resto
  await page.locator('.unas-item', { hasText: 'g2' }).locator('.exp-item').click();
  await expect(page.locator('#m-overlay')).toHaveClass(/\bon\b/);
  await page.evaluate(async () => { document.getElementById('f-account').value = 'acc_efectivo'; onAccountSelected(); await saveExpense(); });
  await expect(page.locator('#gsearch-overlay')).toHaveClass(/\bon\b/);
  await expect(page.locator('#gsearch-results')).toContainText('Sin billetera (2)');
  noErrors(page);
});
