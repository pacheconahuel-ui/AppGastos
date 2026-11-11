# Cambios

## 3.13 — noviembre 2026

Auditoría completa: sincronización con Firebase, caché, rendimiento y pantallas (celular y escritorio), revisada con tus datos reales de noviembre.

**Sincronización y lecturas de Firebase**
- **Se sacó la migración vieja:** en cada inicio la app hacía 2 lecturas (`/gastos` y `/usd` de la raíz) que las reglas no permiten, así que siempre fallaban. Era código de antes de tener cuentas.
- **Los avisos viejos se limpian solos:** los avisos ya vistos con más de 60 días se borran. Antes la bandeja crecía para siempre y se bajaba entera en cada inicio.
- **Los eventos de Firebase dibujan una sola vez:** gastos, USD, deudas y configuración llegan de a varios al abrir; antes cada uno redibujaba todo (≈5 veces).
- **Cuentas, metas y presupuestos se leen al entrar** (antes con un retraso, que dejaba un instante la pantalla "sin billeteras") y **ya no se vuelven a leer al cambiar de pestaña**, que además podía pisar lo que estaba en memoria.

**Caché y arranque**
- **Los scripts van diferidos** (`defer`) y se agregaron conexiones tempranas a los servidores de las librerías: la pantalla se dibuja sin esperar a que bajen Firebase y los gráficos.
- **Service worker:** sigue pidiendo primero la red, pero con tope de 4 segundos: con mala señal ahora abre al toque con lo guardado, en vez de colgarse. Al instalar guarda también los archivos de la app (se leen de `index.html`, sin lista que mantener), no solo las librerías.
- **Guardado local:** solo se escribe en el celular lo que cambió.
- **Los gráficos se dibujan solo cuando se ven** (con otra pestaña abierta no se redibujan).

**Pantallas**
- **Lista:** la descripción se ve entera en 2 renglones (antes se cortaba a ~12 letras). Tocar la fila edita; queda solo el botón de borrar.
- **Cuentas:** el total en pesos y dólares ya no se aprieta con "transferencias este mes".
- **Resumen en escritorio ancho (≥1280 px):** dos columnas (movimientos y mes a la izquierda; presupuestos, metas y gráficos a la derecha).
- **Proyección a fin de mes corregida:** antes repetía todos los días lo ya pagado una sola vez (luz, seguro, patente), y daba cifras absurdas ($3,9 millones con $1,4 millones gastados). Ahora cuenta lo gastado, más el ritmo diario de lo que no es fijo, más los fijos que todavía faltan cargar. No aparece la primera semana del mes. "Gasto por día" también es sin fijos.
- Pruebas nuevas (8 de navegador, 1 con emuladores): scripts diferidos, un solo dibujo por tanda de eventos, gráficos solo a la vista, guardado selectivo, Lista, Cuentas, proyección, escritorio de dos columnas y limpieza de avisos.

## 3.12 — noviembre 2026

Cuatro arreglos que aparecieron al armar las cuentas de cero y conciliar con el banco.

- **Gastos divididos:** de la billetera ahora sale **el total que pagaste**. Antes solo descontaba tu parte: si pagabas $1.000 y tu parte era $600, la billetera mostraba −$600 en vez de −$1.000, y cuando te devolvían $400 quedaba −$200 en vez de −$600. Lo mismo para el resumen de la tarjeta, la proyección de cuotas y "Lo que viene": la tarjeta cobra el total.
- **Liquidar deudas ya no infla el mes:** lo que te devuelven (o devolvés) al tocar "Marcar cobrado/pagado", y los pagos y cobros de la bandeja de avisos, mueven la billetera pero **no suman a ingresos ni a gastos del mes**. Se ven con la etiqueta "Liquidación". Tu gasto cuenta cuando lo cargás, no cuando se compensa.
- **Saldo inicial negativo:** la cuenta tiene una casilla "El saldo es negativo (en descubierto)", porque el teclado de números del celular no siempre trae el signo menos.
- **Ajustar saldo:** deja poner un saldo negativo, y el ajuste ya no se anota como un ingreso "Sueldo" ni suma a los gastos o ingresos del mes (se ve como "Ajuste de saldo").
- Pruebas nuevas: saldo con compra dividida y cobro, liquidaciones y ajustes fuera del mes, tarjeta con total, saldo inicial negativo, y la casilla y el ajuste en pantalla.

## 3.11 — noviembre 2026

**Lo que viene:** cuánto es lo mínimo que ya está comprometido para el mes que viene y los siguientes.

- **En el Resumen** queda una línea chica, "Mes que viene · $X ›", que abre la pantalla completa.
- **Mínimo del mes** (el número grande) con el desglose: tarjetas, cuotas y programados, y fijos.
- **Tira de 6 meses** (este mes y los 5 que siguen) con el total de cada uno; tocás un mes y ves su detalle. Sirve para ver cuándo baja el total, por ejemplo cuando termina una cuota.
- **Detalle** como las filas de un Excel: cada tarjeta con sus compras (cuota 2/3, fijo), las cuotas cargadas de varios meses con hasta cuándo llegan, y los fijos de cada mes.
- Cómo se arma, todo aproximado: **tarjetas** por vencimiento del resumen (lo ya cerrado vence en su fecha; lo nuevo, en el próximo cierre) con las cuotas y fijos que siguen; **gastos programados y cuotas de varios meses** en su mes; **fijos de cada mes** (alquiler, internet) con el último monto que confirmaste, mientras sigan apareciendo.
- **Opcionales** (se prenden y apagan, y quedan recordados): sumar los **servicios que cambian** (luz, gas, servicios) con el promedio de los últimos 3 meses, y **comparar con mis ingresos** (promedio de 3 meses) para ver cuánto queda libre.
- Pruebas nuevas: el cálculo mes a mes (cuotas de tarjeta que terminan, resumen cerrado, fijos vencidos, servicios e ingresos) y la pantalla a 320/360/390 px.

## 3.10 — noviembre 2026

- **Cargar varios meses de una vez** (para cuotas fijas: la heladera en 12 pagos, el curso, un sueldo): en el formulario, "Más opciones → Cargar varios meses de una vez" con la cantidad de meses (hasta 36). Se crea un movimiento por mes, con la misma fecha de cada mes (si el mes no tiene ese día queda el último), y el formulario avisa cuántos son, hasta cuándo y el total. Los de fecha futura quedan **programados**: no restan hasta su día. En la lista se ven con su número (3/12).
- **Borrar:** si borrás una cuota que tiene otras después, pregunta si borrás **solo esa** o **esa y las siguientes**. Editar una cuota cambia solo esa.
- No se puede usar con tarjeta (ahí están las cuotas de la tarjeta) ni con gastos divididos con otras personas; el formulario lo avisa.
- Pruebas nuevas: fechas mes a mes (31 de enero, año bisiesto), carga de 12 cuotas con el reloj en distintos días, borrado de una o de las siguientes, y los casos que no se permiten.

## 3.9.1 — noviembre 2026

- **Movimientos programados:** un gasto o ingreso con **fecha futura** (por ejemplo la cuota del curso con fecha 7 de diciembre) ya no resta ni suma en tu billetera hasta ese día. Antes se descontaba en el momento. En la lista aparece con la etiqueta **Programado**, y el formulario avisa "Programado para el …: no resta de tu saldo hasta ese día". También vale para transferencias con fecha futura, y la proyección de fin de mes no cuenta lo programado.
- Para gastos que se repiten todos los meses (curso, dentista, cuota de la heladera): cargá el primero con la fecha en que arranca y marcá **Se repite todos los meses** (en "Más opciones"). Cada mes la app te lo recuerda en el resumen para confirmarlo.
- Pruebas nuevas: saldo con movimientos programados (lógica y navegador, con el reloj fijado antes y el día del gasto).

## 3.9 — noviembre 2026

**Vincular contactos con otras personas que usan la app**, solo para avisarse deudas y pagos.

- **Mi código de contacto** (Perfil): se lo pasás a otra persona; ella lo pega en su contacto tuyo y vos aceptás en **Avisos**. Se hace una sola vez. Desvincular está en el contacto.
- **Avisos de deuda:** si cargás, cambiás o borrás una deuda (o un gasto compartido) con un contacto vinculado, a esa persona le llega un aviso. Tiene bandeja en Perfil → Avisos, con un puntito rojo en el botón de perfil y un cartel en Saldos cuando hay nuevos.
- **Pagar y confirmar:** la persona que debe toca **Ya pagué**, elige la billetera y la plata sale de ahí (queda como egreso, en negativo). A quien cobra le llega el aviso y **confirma** (entra a la billetera que elija y la deuda queda saldada) o dice que **no la recibió**. Si vos debés y saldás desde Saldos, la otra persona confirma igual. La deuda muestra su estado: esperando, saldada, no la recibió o cancelada.
- **Seguridad:** el código lleva un secreto; sin vincularse nadie puede mandar avisos, y cada uno sigue sin ver nada de los datos del otro. Reglas nuevas en `database.rules.json` (`vinculos` y `avisos`): **hay que publicarlas en la consola de Firebase** para que esto funcione.
- No hay aviso en el celular con la app cerrada (haría falta un servidor y el plan de pago de Firebase): se ve al abrir la app.
- Pruebas nuevas: lógica de los avisos, pantallas a 320/360/390 px y, con los emuladores de Firebase, dos personas vinculándose, cargando y pagando una deuda, rechazando un pago y las reglas que cierran todo lo demás.

## 3.8 — noviembre 2026

Encabezado, menú y resumen más claros, y una auditoría con datos de prueba parecidos a los de uso real (varios meses, 56 movimientos sin billetera, un contacto borrado con deudas, USD, tarjeta, presupuestos y metas).

- **Encabezado:** quedan solo el título con la versión, la lupa y el botón de perfil. El perfil ahora se ve como botón (borde, avatar, nombre y flecha). **Cerrar sesión** y el **cambio de tema** ya no están sueltos arriba: están en el perfil, y cerrar sesión pide confirmación (antes se apretaba sin querer).
- **Sincronización:** en lugar del cartel "● Sincronizado" queda solo el punto de color al lado de la versión (verde, azul o amarillo según el estado). Tocarlo dice el estado con palabras.
- **Resumen más corto:** menos texto ("4 billeteras" sin la explicación, sin "mes actual", la proyección en una línea) y **Presupuestos y metas en una tarjeta chica** con lo más cerca del tope; "Editar" abre el detalle completo. Los **gráficos** se ven de a uno ("Por categoría" o "Evolución"). El resumen con datos de prueba pasó de 2470 a 1572 px de alto.
- **Movimientos sin billetera:** cada uno trae botones con las billeteras para asignarla con un toque (la fila sale de la lista y el saldo se actualiza). Si tocás la fila para editarla, al guardar **volvés a la lista** y seguís con el resto. Los de dólares se eligen uno por uno.
- **Controles de 44 px en toda la app:** la auditoría encontró más de 20 botones más chicos (Cobrar, Contactos, CSV, Nueva, Ajustar saldo, borrar, saldar, Transferencia/Compensación, etc.); ahora todos miden 44 px como mínimo. Sin desbordes laterales a 320, 360 y 390 px ni errores en ninguna pantalla.
- Pruebas nuevas: encabezado a 320/360/390 px, punto de sincronización, cerrar sesión con confirmación, tarjeta de presupuestos y metas, gráficos de a uno y asignación desde la lista.

## 3.7 — noviembre 2026

Arreglos a partir de capturas del celular.

- **Saldos: las deudas de un contacto borrado ya cuentan.** Si borrabas un contacto con deudas pendientes, las deudas quedaban en la base pero Saldos las dejaba afuera: el resumen mostraba $0 mientras el aviso de "más de 30 días" mostraba el monto, y "Cobrar" solo mostraba un cartel sin hacer nada. Ahora esas personas tienen su tarjeta ("ya no está en tus contactos"), suman en los totales y se pueden cobrar o pagar. Un botón las vuelve a agregar a contactos o, si ya hay uno con el mismo nombre, une las deudas con ese contacto. Al borrar un contacto, el aviso aclara que las deudas siguen en Saldos.
- Saldos: "Marcar pagado" ya no aparece apagado cuando no hay deudas.
- **Aviso (toast):** los mensajes largos se cortaban por los costados; ahora se parten en renglones dentro de la pantalla.
- **Encabezado:** muestra solo la versión. El mes se ve en el resumen; si estás mirando un mes que no es el actual, aparece "No es el mes actual · Ir a {mes}".
- Quedaban emojis sueltos (⏰ ⏳ ⏭): ahora son íconos o texto, y la prueba de íconos los detecta.
- Cuentas: el botón de borrar billetera es de 44 px y queda alineado a la derecha.
- **Movimientos sin billetera:** se pueden asignar todos juntos a una billetera (con confirmación que muestra cuánto cambia el saldo). Los de dólares se siguen eligiendo uno por uno.
- **Tema claro que se ve oscuro (informe de un celular Android):** la app ahora declara `color-scheme` para que Chrome y Samsung Internet no apliquen su "modo oscuro para sitios web" encima del tema claro, y el tema elegido se aplica al abrir, antes de iniciar sesión. Esto no se pudo comprobar en un Android real; si sigue pasando, hay que apagar esa opción del navegador (ver README).
- Pruebas nuevas: `debtPeople`, contactos borrados, toast dentro de la pantalla a 320/360/390 px, encabezado y mes, asignación masiva.

## 3.6.1 — noviembre 2026

- **El ícono de la app instalada ahora sí es el nuevo.** En la 3.6 se regeneraron los PNG con la paleta nueva, pero el `manifest.json` seguía apuntando a unos SVG con el violeta y el emoji viejos, así que el ícono del celular no cambiaba. Ahora el manifest usa los PNG (normales y maskable, 192 y 512) y el ícono de iOS también. Hay que sacar el acceso directo y volver a agregarlo para verlo.
- Prueba nueva (`tests/manifest.test.js`): los íconos del manifest existen, miden lo que dicen y no usan el color viejo.
- **Resumen:** en "Gastos", los dólares sin cotización se cortaban a la mitad ("$10.199 + U$S" y el 5 abajo). Ahora van en una línea chica debajo del monto ("+ U$D 5") y ningún número se parte, ni con montos de 8 cifras en un celular de 320 px.
- **Dólares escritos "U$D" en toda la app** (antes "U$S"): resumen, cuentas, tarjeta, formulario de USD, lista y gráficos.

## 3.6 — noviembre 2026

Última parte del rediseño: íconos.

- **Íconos de línea en lugar de emojis** en botones, títulos, menús, ayuda, avisos y pantallas vacías (cerca de 130 lugares). Heredan el color del texto, así quedan bien en el tema claro y el oscuro, y no cambian de aspecto según el celular. Los emojis de **categorías, billeteras, contactos y metas** siguen: son los que elegís vos.
- **Ícono de la app** (el del celular y el de la pestaña del navegador) con la paleta nueva: cuadrado índigo con un "$" blanco. En el celular hay que sacar el acceso directo y volver a agregarlo para que tome el ícono nuevo.
- Todos los botones de "Guardar" usan el mismo color (el de USD era blanco).
- Pruebas que avisan si se pide un ícono que no existe o si vuelve a aparecer un emoji en un botón o título.

## 3.5 — noviembre 2026

Cuarta parte del rediseño: el formulario para cargar un movimiento.

- **El monto primero y grande**, con la moneda al lado. Gasto / Ingreso como interruptor arriba.
- **Categorías como botones:** las 6 que más usás (de gasto o de ingreso, según lo que estés cargando); el buscador sigue para las demás.
- **"Pagado con" como botones:** tus billeteras y tarjetas, más "Sin billetera" (que sigue pidiendo confirmación al guardar).
- Fecha y descripción en una fila; notas, "se repite todos los meses" y "dividir con alguien" quedan en **Más opciones** (se abre solo si el movimiento ya usa algo de eso).
- **Iniciar sesión con Google deja elegir la cuenta:** antes, si el navegador ya tenía una cuenta abierta, entraba directo con esa.

## 3.4 — noviembre 2026

Tercera parte del rediseño: el resumen.

- **Avisos arriba de todo** (vencimiento de la tarjeta y recurrentes pendientes).
- **El mes en una sola tarjeta:** ‹ mes › con Ingresos · Gastos · Balance. Debajo, en chico: lo que pagaste en total (solo si hay gastos compartidos), la proyección a fin de mes y una línea con el ahorro, el gasto por día y la categoría más grande. Reemplaza las cuatro tarjetas, la proyección y los tres cuadritos de estadísticas.
- **Últimos 5 movimientos** con **Ver todos ›** (antes 10).
- Gráficos y metas más abajo. Los botones "+ Presupuesto" y "+ Meta" ahora están dentro de cada sección cuando todavía no hay ninguno.

## 3.3 — noviembre 2026

Segunda parte del rediseño: navegación.

- **Barra de navegación abajo** (Resumen · Lista · **+** · Saldos · Cuentas), al alcance del pulgar. Antes las pestañas estaban arriba.
- **Un solo botón +** para agregar cualquier cosa: gasto o ingreso, gasto rápido, dólares, deuda o transferencia. Reemplaza los cinco botones flotantes que cambiaban según la pantalla.
- **Dólares dentro de Cuentas:** se entra desde "Dólares" en Cuentas y se vuelve con "‹ Cuentas".
- En la compu sigue la columna de la izquierda, ahora con un botón **+ Nuevo** arriba.
- Controles de la barra y del menú de al menos 44×44; nada queda tapado por la barra (también en iPhone con la barra de inicio).

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
