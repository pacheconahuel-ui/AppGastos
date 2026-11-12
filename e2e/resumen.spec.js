import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

async function cargar(page, extra = {}) {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00-03:00') });
  await openApp(page);
  await page.evaluate(x => {
    accounts.push({ id: 'cc', name: 'Visa', emoji: '💳', type: 'credit', closingDay: 25, dueOffset: 20 }); saveAccounts();
    const E = (id, type, amount, date, o = {}) => ({ id, type, amount, myAmount: amount, date, category: o.category || 'Luz', description: id, accountId: 'acc_mp', ...o });
    expenses = [
      E('sueldo', 'Ingreso', 1000000, '2026-11-01', { category: 'Sueldo' }),
      E('cena', 'Egreso', 40000, '2026-11-02', { category: 'Restaurante', myAmount: x.compartido ? 20000 : 40000 }),
      E('luz', 'Egreso', 30000, '2026-11-03'),
      E('z', 'Egreso', 50000, '2026-10-20', { accountId: 'cc', ccPaid: false, category: 'Compras' }),
      ...Array.from({ length: 8 }, (_, i) => E('v' + i, 'Egreso', 1000, '2026-10-0' + (i + 1))),
    ];
    renderAll();
  }, extra);
}

test('orden (3.18): avisos, disponible, el mes, últimos movimientos; presupuestos, metas y gráficos van en Análisis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await cargar(page);
  const y = sel => page.locator(sel).first().evaluate(el => el.getBoundingClientRect().top + window.scrollY);
  const orden = [await y('#card-reminders .card-reminder'), await y('#patrimonio-card'), await y('.sum-card'), await y('#recent-list')];
  expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  await expect(page.locator('#bg-card')).toBeHidden(); // en el celular, Análisis es otra vista
  await expect(page.locator('#chart-seg')).toBeHidden();
  await expect(page.locator('#c-ing')).toHaveText('$1.000.000');
  await expect(page.locator('#c-real')).toHaveText('$70.000');
  await expect(page.locator('#c-bal')).toHaveText('+$930.000');
  await expect(page.locator('#c-bal')).toHaveClass(/pos/);
  await expect(page.locator('#c-pag-line')).toBeHidden();
  // lo de más: plegado en «Ver detalle»
  await expect(page.locator('#sum-stats')).toBeHidden();
  await page.locator('#sum-det summary').click();
  await expect(page.locator('#sum-stats')).toContainText('Ahorrás el 93%');
  // últimos 3, en una línea cada uno, con acceso a la lista completa
  await expect(page.locator('#recent-list .exp-item')).toHaveCount(3);
  await expect(page.locator('#recent-list .badge')).toHaveCount(0);
  // Análisis: presupuestos, metas y gráficos
  await page.getByRole('tab', { name: 'Análisis' }).click();
  await expect(page.locator('#bg-card')).toBeVisible();
  await expect(page.locator('#chart-seg')).toBeVisible();
  await expect(page.locator('#recent-list')).toBeHidden();
  await page.getByRole('tab', { name: 'Resumen' }).click();
  await page.getByRole('button', { name: 'Ver todos ›' }).click();
  await expect(page.locator('#tab-lista')).toBeVisible();
  noErrors(page);
});

test('con gastos compartidos aparece lo pagado en total', async ({ page }) => {
  await cargar(page, { compartido: true });
  await expect(page.locator('#c-real')).toHaveText('$50.000');
  await page.locator('#sum-det summary').click(); // el detalle viene plegado
  await expect(page.locator('#c-pag-line')).toBeVisible();
  await expect(page.locator('#c-pag')).toHaveText('$70.000');
  noErrors(page);
});

test('sin presupuestos ni metas: botones para agregarlos', async ({ page }) => {
  await cargar(page);
  await page.getByRole('button', { name: '＋ Presupuesto', exact: true }).click();
  await expect(page.locator('#budget-overlay')).toHaveClass(/\bon\b/);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '＋ Meta de ahorro' }).click();
  await expect(page.locator('#goal-overlay')).toHaveClass(/\bon\b/);
  noErrors(page);
});

for (const ancho of [320, 360, 390]) {
  test(`el resumen entra en ${ancho} px y sus botones miden 44`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 760 });
    await cargar(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const sel of ['.sum-nav', '.sec-link', '.add-row', '.seg button']) {
      for (const b of await page.locator('#tab-dashboard ' + sel).all()) {
        if (!(await b.isVisible())) continue;
        const r = await b.boundingBox();
        expect(Math.min(r.width, r.height), sel).toBeGreaterThanOrEqual(44);
      }
    }
    noErrors(page);
  });
}

// Un número no se corta nunca: "$10.199 + U$D 5" tenía el 5 en la línea de abajo
for (const ancho of [320, 360, 390]) {
  test(`montos grandes y dólares sin cotización no se cortan ni se pisan (${ancho} px)`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 760 });
    await openApp(page);
    await page.evaluate(() => {
      const d = nowKey() + '-05';
      expenses = [
        { id: 'i', type: 'Ingreso', amount: 12345678, myAmount: 12345678, date: d, category: 'Sueldo', description: 's', accountId: 'acc_mp' },
        { id: 'g', type: 'Egreso', amount: 10199, myAmount: 10199, date: d, category: 'Luz', description: 'g', accountId: 'acc_mp' },
        { id: 'u', type: 'Egreso', amount: 5, myAmount: 5, date: d, category: 'Streaming', description: 'u', accountId: 'acc_mp', currency: 'USD' },
      ];
      renderAll();
    });
    await expect(page.locator('#c-real')).toHaveText('$10.199');
    await expect(page.locator('#c-real-usd')).toHaveText('+ U$D 5');
    // cada número en una sola línea (alto de una línea de texto) y sin pisar a su vecino
    const cajas = await page.evaluate(() => ['c-ing', 'c-real', 'c-bal'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return { id, l: r.left, r: r.right, h: r.height, w: r.width }; }));
    expect(cajas[0].h, 'c-ing').toBeLessThan(30);
    expect(cajas[1].h, 'c-real').toBeLessThan(30);
    expect(cajas[2].h, 'c-bal (grande)').toBeLessThan(48);
    expect(cajas[0].r).toBeLessThanOrEqual(cajas[1].l);
    expect(cajas[2].r).toBeLessThanOrEqual(ancho); // el balance grande entra en la pantalla
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => { const c = document.querySelector('.sum-card'); return c.scrollWidth <= c.clientWidth + 1; })).toBe(true);
    noErrors(page);
  });
}
