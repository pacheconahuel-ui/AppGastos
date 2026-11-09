# Cambios

## 3.2 — noviembre 2026

Primera parte del rediseño: colores y tipografía. La estructura de las pantallas no cambia.

- **Paleta neutra con un solo acento:** fondos y tarjetas grises, un índigo suave para botones y selección. Verde solo para plata que entra y saldos a favor, rojo para saldos negativos y deudas, amarillo para avisos. Los gastos y los dólares van en el color normal del texto.
- **Sin degradés ni brillos de fondo.** Todas las pestañas activas y los botones flotantes usan el mismo estilo.
- **Números con la tipografía de la app** (Outfit, cifras de ancho fijo) en lugar de la letra de máquina de escribir.
- **Tema claro blanco y gris** (antes lavanda); la barra del sistema toma el color del fondo.
- **Gráficos** con colores apagados y que cambian con el tema.
- Contraste de textos y botones de al menos 4,5:1 en los dos temas.
- En "Nuevo gasto", fecha y categoría van una debajo de la otra: el buscador de categoría ya no queda aplastado. Sin flechitas en los campos numéricos.

## 3.1 — noviembre 2026

- **Vencimiento de la tarjeta:** en el resumen aparece un aviso cuando el resumen ya cerró y no está pago ("Resumen Visa · vence en 3 días"), con el botón **Pagar**. Se pone rojo a dos días del vencimiento y desaparece al pagarlo. Necesita el día de cierre de la tarjeta (Cuentas → editar tarjeta).
- **Próximos resúmenes:** en cada tarjeta, "📅 Próximos resúmenes" muestra cuánto vas a pagar en los próximos 6 meses por las cuotas que quedan y los fijos.
- **Gráfico por período:** el gráfico de "Últimos 6 meses" ahora tiene **Meses / Trimestres / Años** y compara el período en curso con el anterior (▲▼ %).
- **Dólar del día:** al cargar un gasto en USD aparecen botones con la cotización (Tarjeta, Oficial, Blue, MEP, de dolarapi.com) y en un gasto nuevo se completa sola: dólar tarjeta si es con tarjeta, oficial si no. En compra y venta de USD, los botones calculan los pesos.
- En cuotas, el monto dice "Monto de cada cuota" (es lo que entra en cada resumen).

## 3.0 — noviembre 2026

Por dentro; la app se ve y funciona igual que la 2.9.

- **El código está partido en archivos** (`css/app.css` y 15 archivos en `js/`) en lugar de un `index.html` de 4.600 líneas. Sigue sin compilación: GitHub Pages lo publica tal cual.
- **Firebase 12** (antes 10.7, de 2023), en modo compat.
- **Pruebas automáticas:** 17 de lógica, 14 en el navegador y 6 contra los emuladores de Firebase, en GitHub en cada PR.
- **Service worker:** los archivos de la app se piden siempre a la red (la caché queda para sin conexión), así una versión nueva no mezcla archivos viejos y nuevos.
- Se sacaron la carpeta `src/` (la migración de junio, desactualizada) y Vite.

## 2.9 — noviembre 2026

### Nuevo
- **Respaldo completo** (Perfil → Respaldo): descargar todos los datos en un archivo JSON y restaurarlos. Antes de restaurar se descarga solo un respaldo de lo que había.
- **Asignar billetera:** el aviso "N movimientos sin billetera" ahora se toca y lista esos movimientos (de todos los meses) para elegirles la billetera.
- **Funciona sin conexión:** la app abre aunque no haya internet (se guarda la última versión y las librerías).
- **Reglas de Firebase con validación** de la forma de los datos (`database.rules.json`; se publican a mano, ver README).

### Cambia cómo se cuenta el mes
- **El pago del resumen de la tarjeta ya no cuenta como gasto del mes:** las compras con tarjeta ya se contaban, así que se sumaba dos veces (y el pago inflaba "Servicios"). Sigue restando de la billetera con la que pagaste.
- **Comprar o vender dólares no es gasto ni ingreso del mes:** es un cambio de moneda. Los pesos siguen saliendo o entrando de la billetera.
- En la lista, esos movimientos llevan la etiqueta *Pago de tarjeta* o *Cambio de moneda · no suma al mes*. Se aplica también a los que ya estaban cargados.
- **Limpiar deudas repetidas:** en Saldos aparece un aviso si hay deudas duplicadas por el error de editar gastos compartidos. Al tocarlo muestra cuánto sobra por persona y, al confirmar, deja solo la última versión de cada gasto.

### Arreglos de datos y sincronización
- **Gastos compartidos:** editar un gasto con split volvía a crear las deudas (la persona quedaba debiendo el doble o más). Ahora se actualizan, y borrar el gasto borra sus deudas sin saldar.
- **Saldar deudas:** un pago parcial no descontaba nada; ahora queda como "Pago parcial". Cuando el que paga sos vos, sale de la billetera elegida.
- **Tarjeta:** editar un gasto ya pagado lo volvía a poner en el próximo resumen.
- **Cuotas y fijos del 29 al 31** salteaban un mes (31/01 → 31/03).
- **Gastos en dólares** se sumaban como pesos (U$S 10 = $10). Ahora se pasan a pesos con su cotización; los que no tienen cotización se muestran aparte.
- **Sincronización:** borrar lo último de una lista (transferencias, billeteras, contactos, metas, presupuestos) no llegaba a los otros dispositivos; borrar el único gasto hacía que el otro dispositivo lo volviera a subir; un presupuesto en una categoría con "/" impedía subir toda la configuración.
- Categorías con apóstrofo ("Mc Donald's") no se podían elegir.

- **Aviso al guardar un movimiento sin billetera.** Si tenés billeteras y dejás "Sin asignar", la app avisa que ese movimiento no va a contar en ningún saldo; con un segundo toque en Guardar se guarda igual. En la lista, esos movimientos llevan la etiqueta *Sin billetera*. (Caso real: un sueldo guardado sin billetera y un gasto en Mercado Pago dejaban la billetera en negativo.)
- **La fecha del día ya no salta a mañana de noche.** Se tomaba en hora UTC, así que después de las 21 h un gasto nuevo (y transferencias, deudas, pagos de tarjeta, recurrentes y carga rápida) quedaba con la fecha del día siguiente. Ahora se usa la hora del celular.
- **Diálogo de confirmación arreglado.** Después de abrir (y cancelar) "Borrar todos mis datos", el siguiente borrado de un gasto, deuda, billetera, transferencia, categoría, contacto o meta mostraba ese mismo diálogo ("Sí, borrar todo") y no borraba nada hasta recargar la app. Ahora cada diálogo arma su título y sus botones, y la acción confirmada puede usar los datos del formulario.
- **Las transferencias vuelven a pedir confirmación** (origen → destino y monto) antes de guardarse.
- **Versión en un solo lugar** (`APP_VERSION`): el encabezado y el service worker la toman de ahí. Antes la app decía v2.8 y la caché v2.9.
- **Mensajes de error en castellano** en lugar del error técnico de Firebase (subir y traer configuración, guardar billetera, borrar datos). El detalle queda en la consola.
- **Una sola publicación:** se sacó el workflow de Vite que corría en paralelo a GitHub Pages en cada push (su resultado no se usaba).
- README, CHANGELOG y ROADMAP.

## 2.8 — julio 2026

- Banner "Nueva versión disponible".
- Sincronización de configuración entre dispositivos con identificador por dispositivo (ignora el eco de lo propio).
- Claves con `/` (ej. "Freelance / Honorarios") ya no rompen la subida de configuración.
- Login con Google por ventana emergente en todos los dispositivos.
- El service worker nunca guarda `index.html` en caché.
- Arreglos en transferencias y en la subida de configuración.

## 2.5 a 2.7 — junio y julio 2026

- Billeteras en USD (moneda por cuenta), compra y venta de USD con origen y destino.
- Filtros por billetera e ingreso o egreso en la lista.
- Saldos con contactos agrupados por persona, con botón para saldar.
- "Borrar todos mis datos" con doble confirmación.
- Botón atrás de Android (cierra el modal o doble atrás para salir).
- Tarjeta de patrimonio en el resumen: saldo total, detalle por billetera y ajuste.
- Muchos arreglos de sincronización entre dispositivos.

## 2.4 — junio 2026

- Navegación de meses en el resumen; últimos 10 movimientos de todos los meses.
- Diagnóstico de Firebase en el perfil.
