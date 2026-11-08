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

## Fase 2 — Robustez ✅ (2.9)

- [x] Respaldo completo en JSON (descargar y restaurar).
- [x] Sincronización revisada y probada con dos dispositivos contra el emulador de Firebase.
- [x] Reglas de Firebase con validación (falta publicarlas en la consola).
- [x] Sin conexión.
- [x] "Asignar billetera" desde el aviso.
- [x] Auditoría: deudas duplicadas al editar, pagos parciales, tarjeta pagada, cuotas del 31, USD como pesos, apóstrofos.

## Decisiones pendientes (hacen cambiar los números del resumen)

- [ ] **Tarjeta contada dos veces en el resumen del mes:** la compra con tarjeta es un gasto y el "Pago resumen" también (categoría Servicios). Propuesta: el pago del resumen descuenta de la billetera pero no cuenta como gasto del mes.
- [ ] **Comprar dólares cuenta como gasto** (egreso "Otro" en pesos) y venderlos como ingreso. Propuesta: tratarlos como cambio de moneda, fuera del gasto e ingreso del mes.
- [ ] **Deudas duplicadas que ya existen** por el bug de editar gastos compartidos: detectarlas (misma persona y mismo gasto) y ofrecer limpiarlas.

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
