import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const color = (page, sel) => page.evaluate(s => getComputedStyle(document.querySelector(s)).color, sel);
const rgb = hex => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

// Los nombres viejos (--gold, --green…) tienen que tomar los colores del tema activo,
// no los del oscuro (si se declaran en :root quedan textos casi invisibles en el tema claro)
for (const [tema, txt, pos] of [['oscuro', '#ececee', '#5bb98b'], ['claro', '#18181b', '#23774d']]) {
  test(`colores del tema ${tema}`, async ({ page }) => {
    await openApp(page);
    await page.evaluate(t => {
      if (t === 'claro') document.body.classList.add('light');
      expenses.push({ id: 'i', type: 'Ingreso', amount: 10, myAmount: 10, date: todayStr(), category: 'Sueldo', description: 'S', accountId: 'acc_mp' });
      renderAll();
    }, tema);
    const probe = await page.evaluate(() => {
      const d = document.createElement('div'); d.style.color = 'var(--gold)'; document.body.appendChild(d);
      const e = document.createElement('div'); e.style.color = 'var(--green)'; document.body.appendChild(e);
      return [getComputedStyle(d).color, getComputedStyle(e).color];
    });
    expect(probe).toEqual([rgb(txt), rgb(pos)]);
    expect(await color(page, '#c-ing')).toBe(rgb(txt));
    noErrors(page);
  });
}

test('el buscador de categoría no queda aplastado en el celular', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openApp(page);
  await page.evaluate(() => openModal());
  const w = await page.evaluate(() => document.getElementById('f-cat-search').getBoundingClientRect().width);
  expect(w).toBeGreaterThan(150);
  noErrors(page);
});
