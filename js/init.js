// Arranque
// --- INIT ---
hydrateIcons();
// El tema elegido se aplica ya, no recién al iniciar sesión (si no, la pantalla de ingreso sale oscura)
loadTheme();
initFirebase();
setTimeout(checkMagicLink,500);
