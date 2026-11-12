# Mis Gastos (AppGastos)

App de gastos personales: PWA que se instala en el celular, con login de Google o email y sincronización entre dispositivos.

**En línea:** https://pacheconahuel-ui.github.io/AppGastos/

## Qué hace

- **Movimientos:** gastos e ingresos en pesos o dólares, con categoría, nota, billetera y gastos compartidos (split con contactos).
- **Billeteras y tarjetas:** saldo de cada billetera (ARS y USD), transferencias entre billeteras, tarjetas de crédito con fijos, cuotas y pago del resumen.
- **Dólares:** ingresos en USD, compra y venta con su contrapartida en pesos.
- **Deudas y saldos** con contactos, con botón para saldar.
- **Resumen del mes:** gráficos (por mes, trimestre o año), presupuestos por categoría, metas, recurrentes pendientes.
- **Cuotas de varios meses:** se cargan de una vez ("Cargar varios meses de una vez"), programadas mes a mes, y se pueden borrar una o desde esa en adelante.
- **Movimientos programados:** con fecha futura no tocan el saldo hasta ese día. Los gastos fijos se marcan como "Se repite todos los meses" y la app los recuerda cada mes.
- **Lo que viene:** el mínimo ya comprometido para el mes que viene y los próximos 5 (tarjetas, cuotas, programados y fijos), con detalle; opcionalmente suma los servicios que cambian y lo compara con tus ingresos.
- **Lista** con búsqueda, filtros (billetera, ingreso o egreso, categoría) y exportación a CSV.
- **Tarjetas:** resumen cerrado (para pagar) y en curso con su período, vencimiento por día fijo (corregible mes a mes), aviso de vencimiento y próximos 6 resúmenes (cuotas y fijos); se pliegan.
- **Dólar del día** al cargar movimientos en USD.
- Modo claro u oscuro (se cambia desde el perfil), botón atrás de Android, aviso de versión nueva.

### Cómo se calcula el saldo de una billetera

Saldo inicial (o el ajuste) + ingresos − lo que pagaste + transferencias que entran − transferencias que salen. En un gasto dividido sale el total que pagaste; la parte de la otra persona vuelve cuando la cobrás.
Solo cuentan los movimientos **que tienen esa billetera elegida**.

### Qué cuenta como gasto o ingreso del mes

Todo, salvo lo que solo mueve plata entre cuentas: el **pago del resumen de la tarjeta** (las compras con tarjeta ya cuentan el mes en que se hacen), la **compra o venta de dólares**, las **liquidaciones de deudas** (lo que te devuelven o devolvés) y los **ajustes de saldo**. Esos movimientos igual suman o restan en el saldo de la billetera. Un movimiento "sin billetera" no suma ni resta en ningún saldo; la app avisa al guardarlo y lo marca con la etiqueta *Sin billetera* en la lista.

## Cómo está armada

| Parte | Dónde |
|---|---|
| Pantallas y formularios (HTML) | `index.html` |
| Estilos | `css/app.css` |
| La app (JS), por tema | `js/` (ver abajo) |
| Service worker (instalación y caché) | `sw.js` |
| Manifest de la PWA e íconos | `manifest.json`, `public/icons/` |
| Reglas de Firebase Realtime Database | `database.rules.json` (y `firebase.json`) |
| Pruebas | `tests/` (lógica), `e2e/` (navegador), `e2e/firebase/` (con emuladores) |

### `js/`

No hay compilación: GitHub Pages sirve los archivos tal cual. Son **scripts clásicos** que se cargan en orden desde `index.html` y comparten el ámbito global (por eso los `onclick="..."` del HTML encuentran las funciones). El orden importa solo para lo que corre al cargar; hoy eso es únicamente `init.js`, que va último.

| Archivo | Qué tiene |
|---|---|
| `config.js` | `APP_VERSION`, configuración de Firebase, constantes y estado global |
| `icons.js` | íconos de línea (SVG): `ic('nombre')` en el JS y `<i data-ico="nombre">` en el HTML |
| `storage.js` | copia local, rutas de Firebase, cola sin conexión, guardado |
| `settings.js` | configuración: armarla, aplicarla y subirla |
| `sync.js` | login, listeners de Firebase, arranque |
| `ui.js` | botón atrás, perfil, diagnóstico, borrar todo, diálogo de confirmación |
| `backup.js` | respaldo completo, ayuda |
| `calc.js` | formatos y cálculos: montos, USD, resumen del mes, deudas |
| `render.js` | resumen, lista, USD y saldos |
| `expense.js` | formulario de gastos, split, contactos, categorías |
| `usd-debts.js` | USD, deudas, saldar, borrar |
| `misc.js` | pestañas, tema, CSV, recurrentes, gráficos, búsqueda |
| `sw-register.js` | registro del service worker y aviso de versión nueva |
| `accounts.js` | billeteras, tarjetas, saldos, transferencias, pago del resumen |
| `budgets.js` | presupuestos, metas, estadísticas, carga rápida, patrimonio |
| `cards.js` | ciclo de cierre y vencimiento de tarjetas, próximos resúmenes, aviso de vencimiento |
| `periods.js` | gráfico por meses, trimestres o años |
| `form-chips.js` | categorías y billeteras como botones en el formulario de movimiento |
| `dolar.js` | cotización del día (dolarapi.com) para gastos en USD y compra/venta |
| `forecast.js` | "Lo que viene": el mínimo comprometido por mes (lógica) |
| `forecast-ui.js` | pantalla de "Lo que viene" y su línea en el Resumen |
| `saldo.js` | "¿Por qué este saldo?": el saldo de una billetera desarmado en renglones |
| `linked.js` | vínculo con otras personas, avisos de deudas y pagos (lógica y Firebase) |
| `linked-ui.js` | bandeja de avisos, pagar y confirmar, mi código, vincular un contacto |
| `init.js` | arranque |

- **Datos:** Firebase Realtime Database, en `usuarios/{uid}/...`. Cada usuario solo lee y escribe lo suyo. También hay una copia local en `localStorage` para abrir rápido y funcionar sin conexión.
- **Firebase (12, modo compat) y Chart.js** se cargan desde CDN (`<script>` al principio de `index.html`). Si cambia la versión, actualizarla también en `CDN_ASSETS` de `sw.js`.
- **Publicación:** GitHub Pages sirve la rama `main` tal cual. Cada push a `main` se publica solo, en uno o dos minutos.

## Reglas de Firebase

`database.rules.json` no se publica solo. Para aplicarlo: consola de Firebase → Realtime Database → Reglas → pegar el contenido → Publicar (o `npx firebase-tools deploy --only database --project gastos-pache`). Cada usuario solo lee y escribe `usuarios/{su uid}`, y se valida la forma de gastos, USD, deudas y configuración.

## Si el tema claro se ve oscuro

Chrome y Samsung Internet en Android tienen un «modo oscuro para sitios web» que oscurece páginas claras. La app declara `color-scheme` para que no lo aplique, pero si en tu celular sigue pasando: Chrome → `chrome://flags` → «Auto Dark Mode for Web Contents» → Disabled; o Samsung Internet → Ajustes → Pantalla → Tema oscuro/«Usar modo oscuro en sitios web».

## Vincular con otras personas

Un contacto se puede **vincular** con otra persona que use la app, solo para avisarse deudas y pagos (no se comparten gastos ni saldos):

1. La otra persona abre **Perfil → Mi código de contacto** y te lo manda.
2. En **Contactos** tocás el ícono de vincular de ese contacto y pegás el código. Ella lo ve en **Perfil → Avisos** y acepta.
3. Desde ahí, cuando le cargás una deuda (o un gasto compartido) le llega un aviso. Si ella te debe, toca **Ya pagué**: la plata sale de su billetera y a vos te llega un aviso para **confirmar** que la recibiste (entra a tu billetera y la deuda queda saldada) o decir que no la recibiste. Si vos le debés y la saldás desde Saldos, ella confirma de la misma forma.

El código lleva un secreto: sin haberlo recibido nadie puede mandarte avisos. **Cambiar mi código** frena vínculos nuevos; para sacar a alguien ya vinculado, **Desvincular** en el contacto. Las reglas están en `database.rules.json` (`vinculos` y `avisos`): hay que **publicarlas** para que esto ande.

## Rendimiento y datos

- **Carga:** cada apertura baja los gastos, USD y deudas completos (no hay carga parcial). Un movimiento pesa ≈230 bytes: 1.000 movimientos ≈ 230 KB y 10.000 ≈ 2,3 MB por apertura. Con el plan gratis de Firebase (10 GB de descarga por mes) sobra para un uso personal.
- **Copia en el celular:** `localStorage` guarda todo (límite ≈5 MB, unos 20.000 movimientos). Si algún día se acerca, hay que pasar a IndexedDB.
- **Dibujo:** con 3.000 a 8.000 movimientos y un celular 4 veces más lento que la compu, dibujar el Resumen lleva 100 a 170 ms; los gráficos solo se dibujan cuando se ven.
- **Caché:** el service worker pide primero la red (así cada versión se ve al toque) con tope de 4 segundos, y las librerías de afuera salen de la caché.

## Respaldo

Perfil → Respaldo → **Descargar respaldo completo** baja un JSON con todo. **Restaurar un respaldo** reemplaza todos los datos por los del archivo (antes descarga uno de lo actual).

## Versión

La versión está en **una sola constante**: `APP_VERSION` en `js/config.js`. Se muestra en el encabezado y le da nombre a la caché del service worker (`sw.js?v=...`), así que **subirla hace que los celulares vean "Nueva versión disponible"**.

Al publicar una versión: subir `APP_VERSION` (y `version` en `package.json`) y sumar la entrada en `CHANGELOG.md`.

## Trabajar en local

```bash
npm install
npm run dev          # http://localhost:8765/AppGastos/
```

El login de Google necesita que el dominio esté autorizado en Firebase Authentication (`localhost` ya lo está por defecto).

## Pruebas

| Comando | Qué prueba |
|---|---|
| `npm test` | lógica: saldos, resumen del mes, USD, cuotas, deudas repetidas, configuración (vitest, sin navegador) |
| `npm run test:e2e` | la app en Chromium: formularios, diálogos, fecha a distintas horas, cálculos en pantalla, sin conexión |
| `npm run test:firebase` | contra los emuladores de Firebase (necesita Java): sincronización entre dos dispositivos, reglas, deudas, respaldo |

Las tres corren en GitHub en cada PR (`.github/workflows/pruebas.yml`). Para usar un Chromium ya instalado: `CHROMIUM_PATH=/ruta/a/chromium npm run test:e2e`.

## Documentos

- `CHANGELOG.md` — qué cambió en cada versión.
- `ROADMAP.md` — qué falta y en qué orden.
