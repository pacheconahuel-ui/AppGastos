// Arranque
// --- INIT ---
hydrateIcons();
document.getElementById('f-amt')?.addEventListener('input',()=>updateSerieHint());
// El tema elegido se aplica ya, no recién al iniciar sesión (si no, la pantalla de ingreso sale oscura)
loadTheme();
aplicarDashVista();
initFirebase();
setTimeout(checkMagicLink,500);
// Los scripts van diferidos: las pruebas esperan esta marca para no adelantarse al arranque
window.APP_LISTA=true;
