# Mis Gastos (AppGastos)

App de gastos personales: PWA que se instala en el celular, con login de Google o email y sincronización entre dispositivos.

**En línea:** https://pacheconahuel-ui.github.io/AppGastos/

## Qué hace

- **Movimientos:** gastos e ingresos en pesos o dólares, con categoría, nota, billetera y gastos compartidos (split con contactos).
- **Billeteras y tarjetas:** saldo de cada billetera (ARS y USD), transferencias entre billeteras, tarjetas de crédito con fijos, cuotas y pago del resumen.
- **Dólares:** ingresos en USD, compra y venta con su contrapartida en pesos.
- **Deudas y saldos** con contactos, con botón para saldar.
- **Resumen del mes:** gráficos (por mes, trimestre o año), presupuestos por categoría, metas, recurrentes pendientes.
- **Lista** con búsqueda, filtros (billetera, ingreso o egreso, categoría) y exportación a CSV.
- **Tarjetas:** aviso de vencimiento del resumen y próximos 6 resúmenes (cuotas y fijos).
- **Dólar del día** al cargar movimientos en USD.
- Modo claro u oscuro, botón atrás de Android, aviso de versión nueva.

### Cómo se calcula el saldo de una billetera

Saldo inicial (o el ajuste) + ingresos − gastos + transferencias que entran − transferencias que salen.
Solo cuentan los movimientos **que tienen esa billetera elegida**.

### Qué cuenta como gasto o ingreso del mes

Todo, salvo lo que solo mueve plata entre cuentas: el **pago del resumen de la tarjeta** (las compras con tarjeta ya cuentan el mes en que se hacen) y la **compra o venta de dólares**. Esos movimientos igual suman o restan en el saldo de la billetera. Un movimiento "sin billetera" no suma ni resta en ningún saldo; la app avisa al guardarlo y lo marca con la etiqueta *Sin billetera* en la lista.

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
| `init.js` | arranque |

- **Datos:** Firebase Realtime Database, en `usuarios/{uid}/...`. Cada usuario solo lee y escribe lo suyo. También hay una copia local en `localStorage` para abrir rápido y funcionar sin conexión.
- **Firebase (12, modo compat) y Chart.js** se cargan desde CDN (`<script>` al principio de `index.html`). Si cambia la versión, actualizarla también en `CDN_ASSETS` de `sw.js`.
- **Publicación:** GitHub Pages sirve la rama `main` tal cual. Cada push a `main` se publica solo, en uno o dos minutos.

## Reglas de Firebase

`database.rules.json` no se publica solo. Para aplicarlo: consola de Firebase → Realtime Database → Reglas → pegar el contenido → Publicar (o `npx firebase-tools deploy --only database --project gastos-pache`). Cada usuario solo lee y escribe `usuarios/{su uid}`, y se valida la forma de gastos, USD, deudas y configuración.

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
