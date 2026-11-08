import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' });

// Antes se usaba la fecha UTC: de 21 a 24 h la app proponía la de mañana
for (const [momento, hora] of [['antes', '07:00'], ['durante', '18:30'], ['después', '22:30']]) {
  test(`la fecha de hoy es la local (${momento}: ${hora})`, async ({ page }) => {
    await page.clock.install({ time: new Date(`2026-11-08T${hora}:00-03:00`) });
    await openApp(page);
    const f = await page.evaluate(() => { openModal(); return document.getElementById('f-date').value; });
    expect(f).toBe('2026-11-08');
    noErrors(page);
  });
}
