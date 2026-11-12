import { expect } from '@playwright/test';

// Abre la app sin login: muestra la pantalla principal con un usuario de prueba y
// datos solo locales (Firebase no se usa). Junta los errores de la página en page.errs.
export async function openApp(page) {
  page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message));
  await page.goto('./');
  await page.waitForFunction(() => window.APP_LISTA === true && window.AUTH_LISTA === true); // los scripts van diferidos: esperar al arranque y a la respuesta de Firebase
  await page.evaluate(() => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    currentUID = 'prueba';
    loadAccounts();
  });
}

export function noErrors(page) {
  expect(page.errs, 'errores de la página').toEqual([]);
}
