# Mis Gastos (AppGastos)

App de gastos personales: PWA que se instala en el celular, con login de Google o email y sincronización entre dispositivos.

**En línea:** https://pacheconahuel-ui.github.io/AppGastos/

## Qué hace

- **Movimientos:** gastos e ingresos en pesos o dólares, con categoría, nota, billetera y gastos compartidos (split con contactos).
- **Billeteras y tarjetas:** saldo de cada billetera (ARS y USD), transferencias entre billeteras, tarjetas de crédito con fijos, cuotas y pago del resumen.
- **Dólares:** ingresos en USD, compra y venta con su contrapartida en pesos.
- **Deudas y saldos** con contactos, con botón para saldar.
- **Resumen del mes:** gráficos, presupuestos por categoría, metas, recurrentes pendientes.
- **Lista** con búsqueda, filtros (billetera, ingreso o egreso, categoría) y exportación a CSV.
- Modo claro u oscuro, botón atrás de Android, aviso de versión nueva.

### Cómo se calcula el saldo de una billetera

Saldo inicial (o el ajuste) + ingresos − gastos + transferencias que entran − transferencias que salen.
Solo cuentan los movimientos **que tienen esa billetera elegida**. Un movimiento "sin billetera" no suma ni resta en ningún saldo; la app avisa al guardarlo y lo marca con la etiqueta *Sin billetera* en la lista.

## Cómo está armada

| Parte | Dónde |
|---|---|
| Toda la app (HTML, estilos y JS) | `index.html` (un solo archivo) |
| Service worker (instalación y caché) | `sw.js` |
| Manifest de la PWA e íconos | `manifest.json`, `public/icons/` |
| Reglas de Firebase Realtime Database | `database.rules.json` |
| Versión modular **sin terminar** (no se publica) | `src/` — ver `ROADMAP.md`, fase 3 |

- **Datos:** Firebase Realtime Database, en `usuarios/{uid}/...`. Cada usuario solo lee y escribe lo suyo. También hay una copia local en `localStorage` para abrir rápido y funcionar sin conexión.
- **Firebase y Chart.js** se cargan desde CDN (`<script>` al principio de `index.html`).
- **Publicación:** GitHub Pages sirve la rama `main` tal cual. Cada push a `main` se publica solo, en uno o dos minutos.

## Reglas de Firebase

`database.rules.json` no se publica solo. Para aplicarlo: consola de Firebase → Realtime Database → Reglas → pegar el contenido → Publicar. Cada usuario solo lee y escribe `usuarios/{su uid}`, y se valida la forma de gastos, USD, deudas y configuración.

## Respaldo

Perfil → Respaldo → **Descargar respaldo completo** baja un JSON con todo. **Restaurar un respaldo** reemplaza todos los datos por los del archivo (antes descarga uno de lo actual).

## Versión

La versión está en **una sola constante**: `APP_VERSION` al principio del `<script>` de `index.html`. Se muestra en el encabezado y le da nombre a la caché del service worker (`sw.js?v=...`), así que **subirla hace que los celulares vean "Nueva versión disponible"**.

Al publicar una versión: subir `APP_VERSION` (y `version` en `package.json`) y sumar la entrada en `CHANGELOG.md`.

## Trabajar en local

```bash
npx serve .          # o cualquier servidor estático
# abrir http://localhost:3000/
```

El login de Google necesita que el dominio esté autorizado en Firebase Authentication (`localhost` ya lo está por defecto).

## Documentos

- `CHANGELOG.md` — qué cambió en cada versión.
- `ROADMAP.md` — qué falta y en qué orden.
