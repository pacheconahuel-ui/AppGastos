# Cambios

## 2.9 — noviembre 2026

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
