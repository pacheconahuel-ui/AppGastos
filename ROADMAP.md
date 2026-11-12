# Roadmap

Estado a **noviembre 2026**: versión **3.15.1**. El código está en `index.html`, `css/app.css` y `js/` (ver README).

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

## Decisiones de cómo se cuenta el mes ✅ (2.9)

- [x] El pago del resumen de la tarjeta no cuenta como gasto del mes (las compras ya cuentan); sigue restando de la billetera.
- [x] Comprar o vender USD es un cambio de moneda, fuera del gasto e ingreso del mes.
- [x] Aviso en Saldos para limpiar las deudas repetidas que ya existían.

## Fase 3 — Estructura ✅ (3.0)

- [x] `index.html` partido en `css/app.css` y 15 archivos en `js/` (scripts clásicos, sin compilación).
- [x] Firebase 12 en modo compat. El SDK modular pediría pasar a módulos ES y cambiar las ~60 llamadas a `db`/`auth`; hoy no trae una mejora visible.
- [x] Pruebas: lógica (vitest), navegador (Playwright) y emuladores de Firebase, con CI.
- [x] Estilos en línea: revisados y **no se pasan a clases**. Son 239 y 157 distintos: casi todos aparecen una sola vez, y los pocos repetidos son de una propiedad (`margin-bottom:0`, `display:none`). Moverlos daría clases con nombres sin sentido y el riesgo de que otra regla del CSS les gane de mano, sin ningún cambio para quien usa la app.

## Fase 4 — Funciones nuevas ✅ (3.1)

- [x] Gráficos por período (meses, trimestres, años) con comparación contra el anterior.
- [x] Cotización del dólar del día (dolarapi.com) en gastos en USD y compra/venta.
- [x] Cuotas y fijos de tarjeta proyectados a los próximos 6 resúmenes.
- [x] Aviso de vencimiento del resumen de la tarjeta.

## Rediseño visual

- [x] Paleta y tipografía (3.2).
- [x] Navegación abajo con un único botón + (3.3).
- [x] Resumen reordenado (3.4).
- [x] Formulario de gasto nuevo (3.5).
- [x] Íconos de línea en vez de emojis en botones y títulos (3.6). Los de categoría, billetera, contacto y meta quedan: son datos de cada persona.

## 3.7 — arreglos de uso real ✅

- [x] Deudas de contactos borrados, aviso largo, encabezado, emojis sueltos, billeteras y asignación masiva.
- [ ] Verificar en un Android real que el tema claro ya no se ve oscuro (ver README).

## 3.8 — encabezado, menú y resumen ✅

- [x] Perfil como botón; cerrar sesión y tema dentro del perfil; sincronización como punto de color.
- [x] Resumen más corto: presupuestos y metas en una tarjeta, gráficos de a uno.
- [x] Sin billetera: asignar con un toque y volver a la lista al editar.
- [x] Auditoría con datos de prueba: todos los controles a 44 px.

## 3.9 — vincular contactos ✅

- [x] Código de contacto, vincular y aceptar.
- [x] Avisos de deudas y bandeja.
- [x] Pagar (egreso en negativo) y confirmar el cobro.
- [ ] Publicar las reglas nuevas en Firebase (sin eso el vínculo no anda).

## 3.9.1 y 3.10 ✅

- [x] Movimientos programados (fecha futura) que no tocan el saldo hasta su día.
- [x] Cargar varios meses de una vez, con borrado de una o de las siguientes.

## 3.11 — lo que viene ✅

- [x] Mínimo comprometido del mes que viene y de los próximos 5, con detalle.
- [x] Opcional: servicios que cambian (promedio de 3 meses) y comparación con ingresos.
- [ ] Idea: aviso de "se libera" cuando termina una cuota (cuánta plata se libera y en qué mes).

## 3.12 — cuentas que cierran con el banco ✅

- [x] Gastos divididos: de la billetera sale el total pagado.
- [x] Liquidaciones y ajustes fuera del gasto e ingreso del mes.
- [x] Saldo inicial negativo y "Ajustar saldo" con negativos.
- [ ] Idea: "Pagó la otra persona" en el formulario (carga tu parte y la deuda en un solo paso).

## 3.13 — auditoría de rendimiento y pantallas ✅

- [x] Lecturas de Firebase de más, avisos que crecían sin fin y renders repetidos.
- [x] Scripts diferidos, service worker con tope de espera, guardado local selectivo.
- [x] Lista, Cuentas, proyección y Resumen en dos columnas en escritorio.
- [ ] Idea: carga parcial de movimientos (solo los últimos meses) cuando haya más de 10.000.
- [ ] Idea: botón de borrar billetera dentro de su pantalla de edición, no en la tarjeta.

## 3.14 — saldos que se explican ✅

- [x] "¿Por qué este saldo?" en cada billetera, con la lista de gastos divididos y ajustes que pesan.
- [x] El total negativo conserva su signo.
- [x] Desde esa pantalla: corregir con el saldo real, sacar un gasto dividido de la billetera y borrar un ajuste.

## Ideas para después

- [ ] Avisos al celular con la app cerrada (vencimientos y avisos de deudas) (hoy el aviso se ve al abrir la app). Necesita un servidor que las mande a una hora (Firebase Cloud Messaging más una función programada) y permiso del celular: hoy la app es solo archivos en GitHub Pages, así que implica sumar un backend. No se hace salvo que lo pidas.

## Pasos manuales (no los hace el código)

- [ ] Publicar `database.rules.json` en la consola de Firebase (Realtime Database → Reglas → Publicar). Hasta entonces las reglas son las viejas: la app anda igual, pero no se valida la forma de los datos.
- [ ] En cada celular: tocar **Actualizar** cuando aparece la versión nueva; para ver el ícono nuevo de la app, sacar el acceso directo y volver a agregarlo.
