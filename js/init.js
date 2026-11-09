// Arranque
// --- INIT ---
hydrateIcons();
document.getElementById('f-amt')?.addEventListener('input',()=>updateSerieHint());
// El tema elegido se aplica ya, no recién al iniciar sesión (si no, la pantalla de ingreso sale oscura)
loadTheme();
initFirebase();
setTimeout(checkMagicLink,500);
