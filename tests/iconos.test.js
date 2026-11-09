import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApp } from './load.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const archivosJs = fs.readdirSync(path.join(RAIZ, 'js')).map(f => 'js/' + f);

// Todos los nombres de ícono que el código pide: ic('x'), ic(cond?'x':'y'), showConf('x', ...) y <i data-ico="x">
function nombresUsados() {
  const usados = new Set();
  for (const f of [...archivosJs, 'index.html']) {
    const txt = leer(f).split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    // dentro de ic(...) solo cuentan los valores, no las comparaciones (moveTo==='ingreso')
    for (const m of txt.matchAll(/\bic\(([^()]*)\)/g)) for (const n of m[1].matchAll(/(?<!===)'([a-z]+)'/g)) usados.add(n[1]);
    for (const m of txt.matchAll(/showConf\(\s*'([a-z]+)'/g)) usados.add(m[1]);
    for (const m of txt.matchAll(/data-ico="([a-z]+)"/g)) usados.add(m[1]);
  }
  return usados;
}

describe('íconos', () => {
  it('todos los íconos que se piden existen', () => {
    const app = loadApp();
    const definidos = new Set(app.run('Object.keys(ICO_PATHS)'));
    const faltan = [...nombresUsados()].filter(n => !definidos.has(n));
    expect(faltan).toEqual([]);
  });

  it('ic() arma un SVG que hereda el color, y un nombre desconocido no rompe nada', () => {
    const app = loadApp();
    expect(app.run("ic('trash')")).toMatch(/^<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">.+<\/svg>$/);
    expect(app.run("ic('no-existe')")).toBe('');
  });

  it('no quedan emojis de la interfaz en botones y títulos (solo datos: categorías, contactos, billeteras)', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}⭐☀-➿]/u;
    // líneas que son datos de la persona o mensajes, no botones ni títulos
    const permitido = /toast\(|console\.|^const (ICONS|ING_ICONS|DEF_|ACC_EMOJIS|GOAL|COLORS|CONTACT_EMOJIS)|emoji:|emoji-preview|\|\|'|settle-ava|favicon|setStatus\(|statusEl\.textContent|span\.textContent|<link rel=/;
    const sobran = [];
    for (const f of [...archivosJs, 'index.html']) {
      leer(f).split('\n').forEach((l, i) => { if (emoji.test(l) && !permitido.test(l)) sobran.push(`${f}:${i + 1}`); });
    }
    expect(sobran).toEqual([]);
  });
});
