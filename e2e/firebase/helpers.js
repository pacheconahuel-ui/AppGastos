// Pruebas contra los emuladores de Firebase (npm run test:firebase).
// Cada "dispositivo" es un contexto de navegador aparte con la misma cuenta.
export async function newUser() {
  const email = `u${Date.now()}${Math.random().toString(36).slice(2, 6)}@prueba.com`;
  await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'secreta12', returnSecureToken: true }),
  });
  return email;
}

export async function device(browser, email) {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.addInitScript(() => { window.FB_EMULATOR = true; });
  const page = await context.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto('./');
  await page.waitForFunction(() => window.APP_LISTA === true && typeof auth !== 'undefined' && auth);
  await page.evaluate(e => auth.signInWithEmailAndPassword(e, 'secreta12'), email);
  await page.waitForFunction(() => currentUID && fbOnline && fbReady !== undefined);
  // que lleguen los primeros datos y corra la subida de pendientes del arranque
  await page.waitForTimeout(5000);
  return page;
}

// Lo que queda sin subir (colas sin conexión y configuración pendiente)
export const pending = page => page.evaluate(() => pendingQ.length + usdPendQ.length + debtPendQ.length + (localStorage.getItem('gp_settings_pending') ? 1 : 0));
