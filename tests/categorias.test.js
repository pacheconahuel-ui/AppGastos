import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './load.js';

let app;
beforeEach(() => { app = loadApp(); app.run("currentUID='t'"); });
const gasto = category => ({ id: 'g' + category, type: 'Egreso', amount: 1, date: '2026-11-01', category });

describe('categorías de fábrica (3.20)', () => {
  it('un usuario nuevo trae solo lo común', () => {
    app.set('expenses', []);
    const cats = app.run('armarCats()');
    for (const c of ['Padel', 'Zurich', 'Fútbol', 'Educador Canino', 'Salario', 'SAC', 'Sueldo 2', 'Comisión', 'Aguinaldo / Bono', 'Freelance / Honorarios']) expect(cats, c).not.toContain(c);
    for (const c of ['Supermercado', 'Alquiler', 'Otro', 'Servicios', 'Venta USD', 'Sueldo', 'Transferencia', 'Reintegro', 'Otros ingresos']) expect(cats, c).toContain(c);
  });
  it('las que usa el sistema siguen siendo de fábrica', () => {
    const cats = app.run('armarCats()');
    for (const c of ['Otro', 'Servicios', 'Otros ingresos', 'Venta USD']) expect(cats).toContain(c);
  });
  it('quien ya usa una que salió de fábrica la conserva como propia', () => {
    app.set('expenses', [gasto('Padel'), { ...gasto('Salario'), type: 'Ingreso' }]);
    const cats = app.run('armarCats()');
    expect(cats).toContain('Padel');
    expect(cats).toContain('Salario');
    expect(cats).not.toContain('Zurich'); // la que no usa, no
    expect(app.run('customCats()')).toEqual([]); // (cats global todavía vacío)
  });
  it('las conservadas quedan como propias y se guardan con las demás', () => {
    app.set('expenses', [gasto('Zurich')]);
    app.set('cats', app.run('armarCats()'));
    expect(app.run('customCats()')).toEqual(['Zurich']);
  });
  it('después de que llegan los movimientos se suman las que faltan', () => {
    app.set('expenses', []);
    app.set('cats', app.run('armarCats()'));
    expect(app.run('cats.includes("Fútbol")')).toBe(false);
    app.set('expenses', [gasto('Fútbol')]);
    expect(app.run('actualizarCatsLegacy()')).toBe(true);
    expect(app.run('cats.includes("Fútbol")')).toBe(true);
    expect(app.run('actualizarCatsLegacy()')).toBe(false); // ya estaba
  });
  it('si la persona elimina una, no vuelve a aparecer aunque tenga movimientos', () => {
    app.set('expenses', [gasto('Padel')]);
    app.run("olvidarCatLegacy('Padel')");
    expect(app.run('armarCats()')).not.toContain('Padel');
    app.set('cats', []);
    expect(app.run('actualizarCatsLegacy()')).toBe(false);
    app.run("olvidarCatLegacy('Alquiler')"); // una de fábrica no se anota
    expect(app.run("legacyRemoved().has('Alquiler')")).toBe(false);
  });
  it('lo que salió de fábrica como ingreso sigue siendo de ingreso', () => {
    app.set('expenses', [{ ...gasto('SAC'), type: 'Ingreso' }]);
    app.set('cats', app.run('armarCats()'));
    app.run('catTypes=normalizeCatTypes({})');
    for (const c of ['Salario', 'SAC', 'Sueldo 2', 'Comisión', 'Aguinaldo / Bono', 'Freelance / Honorarios', 'Sueldo', 'Venta USD']) expect(app.run(`catTypeFor(${JSON.stringify(c)})`), c).toBe('ingreso');
    for (const c of ['Padel', 'Zurich', 'Supermercado']) expect(app.run(`catTypeFor(${JSON.stringify(c)})`), c).toBe('egreso');
  });
});
