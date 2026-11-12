import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './load.js';

let app;
beforeEach(() => { app = loadApp(); app.run("currentUID='t'"); });
const DIA = 86400000;

describe('haceCuanto', () => {
  it('minutos, horas, ayer, días y meses', () => {
    const h = 1_800_000_000_000;
    expect(app.run(`haceCuanto(${h - 20_000},${h})`)).toBe('recién');
    expect(app.run(`haceCuanto(${h - 5 * 60000},${h})`)).toBe('hace 5 min');
    expect(app.run(`haceCuanto(${h - 3 * 3600000},${h})`)).toBe('hace 3 h');
    expect(app.run(`haceCuanto(${h - 1.5 * DIA},${h})`)).toBe('ayer');
    expect(app.run(`haceCuanto(${h - 12 * DIA},${h})`)).toBe('hace 12 días');
    expect(app.run(`haceCuanto(${h - 90 * DIA},${h})`)).toBe('hace 3 meses');
    expect(app.run('haceCuanto(0)')).toBe('nunca');
  });
});

describe('aviso de respaldo cada 30 días', () => {
  const datos = n => app.set('expenses', Array.from({ length: n }, (_, i) => ({ id: 'e' + i, type: 'Egreso', amount: 1, date: '2026-11-01' })));
  const ahora = 1_800_000_000_000;
  it('con pocos datos no molesta', () => {
    datos(2);
    expect(app.run(`backupPendiente(${ahora})`)).toBe(null);
  });
  it('nunca bajó uno: avisa', () => {
    datos(10);
    expect(app.run(`backupPendiente(${ahora})`)).toBe(Infinity);
  });
  it('reciente no avisa; a los 30 días sí', () => {
    datos(10);
    app.run(`localStorage.setItem(backupKey(),'${ahora - 10 * DIA}')`);
    expect(app.run(`backupPendiente(${ahora})`)).toBe(null);
    app.run(`localStorage.setItem(backupKey(),'${ahora - 31 * DIA}')`);
    expect(app.run(`backupPendiente(${ahora})`)).toBe(31);
  });
  it('"Después" lo pospone una semana', () => {
    datos(10);
    app.run(`localStorage.setItem(lsKey('gp_backup_snooze'),'${ahora + 3 * DIA}')`);
    expect(app.run(`backupPendiente(${ahora})`)).toBe(null);
    expect(app.run(`backupPendiente(${ahora + 8 * DIA})`)).toBe(Infinity);
  });
});
