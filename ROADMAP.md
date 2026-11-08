# Roadmap

Estado a **noviembre 2026**: versión **2.9**, en uso. Toda la app está en `index.html` (~4650 líneas).

## Fase 1 — Ordenar ✅ (2.9)

- [x] Una sola forma de publicar (GitHub Pages desde `main`).
- [x] Versión en un solo lugar (`APP_VERSION`) y CHANGELOG.
- [x] README y ROADMAP.
- [x] Errores en castellano en lugar del mensaje técnico.
- [x] Aviso al guardar sin billetera.
- [x] Fecha del día en hora local (antes, después de las 21 h quedaba la de mañana).
- [x] Diálogo de confirmación (`showConf`) arreglado y confirmación de transferencias.

## Fase 2 — Robustez

- [ ] **Respaldo completo:** exportar e importar todos los datos en JSON (hoy solo hay CSV del mes).
- [ ] **Sincronización entre dispositivos:** revisar el sistema de deviceId + pushId (2.8) y cerrarlo con pruebas.
- [ ] **Reglas de Firebase con validación** de tipos y forma, no solo del dueño.
- [ ] **Sin conexión de verdad:** el service worker intenta devolver `index.html` desde la caché pero nunca lo guarda; guardar la última versión buena.
- [ ] Revisar los saldos: ofrecer "Asignar billetera" desde el aviso "N movimientos sin billetera".

## Fase 3 — Estructura

- [ ] Partir `index.html` en módulos (`src/`) de a una sección, con Vite. La carpeta `src/` actual es una copia de junio que quedó desactualizada: se rehace a partir del código de hoy.
- [ ] Firebase moderno (SDK modular, v12) en lugar del modo compat 10.7 por CDN.
- [ ] Pruebas de los cálculos (saldos, deudas, USD, tarjetas).
- [ ] Sacar los estilos en línea a clases.

## Fase 4 — Funciones nuevas (a elegir)

- [ ] Gráficos por período (trimestre, año) y comparación con meses anteriores.
- [ ] Cotización del dólar automática.
- [ ] Cuotas de tarjeta proyectadas a meses futuros.
- [ ] Recordatorios de vencimientos.
