// Carga los scripts de la app (js/) en un contexto aislado, como los cargaría el
// navegador: comparten el ámbito global. Solo los que no tocan el DOM al cargar.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const JS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../js');
const FILES = ['config', 'storage', 'settings', 'calc', 'accounts', 'budgets', 'cards', 'periods'];

export function loadApp() {
  const store = new Map();
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  const ctx = vm.createContext({ localStorage, console, navigator: {}, setTimeout, clearTimeout });
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(JS, f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  // Lo que dibuja pantalla no se prueba acá
  vm.runInContext('renderAll=()=>{};renderCuentasTab=()=>{};', ctx);
  const run = code => vm.runInContext(code, ctx);
  // set('expenses', [...]) asigna a las variables globales de la app (let incluidas)
  const set = (name, value) => { ctx.__v = value; run(`${name}=__v`); };
  return { run, set, localStorage };
}
