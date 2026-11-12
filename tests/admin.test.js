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

describe('pantalla del administrador (3.19)', () => {
  const hoy = '2026-11-12';
  const ms = d => new Date(d + 'T12:00:00').getTime();
  const users = [
    { uid: 'a', nombre: 'Admin', email: 'a@x.com', yo: true, permitido: false, ultimo: ms('2026-11-12'), primero: ms('2026-10-01') },
    { uid: 'b', nombre: 'Hermana', email: 'b@x.com', permitido: true, ultimo: ms('2026-11-09') },
    { uid: 'c', nombre: 'Mamá', email: 'mama@x.com', permitido: false, ultimo: ms('2026-09-01') },
    { uid: 'd', nombre: '', email: 'sinusar@x.com', permitido: false },
  ];
  const dias = { b: { '2026-11-12': true, '2026-11-05': true }, c: { '2026-09-01': true } };
  const call = (fn, ...a) => { app.set('__u', users); app.set('__d', dias); return app.run(`${fn}(${a.join(',')})`); };

  it('los últimos n días, del más viejo al de hoy', () => {
    expect(app.run(`adminDiasAtras('${hoy}',3)`)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    expect(app.run(`adminDiasAtras('2026-03-02',3)`)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });
  it('días de una persona: las marcas diarias más el día del último acceso', () => {
    expect([...app.run(`adminDiasDe({uid:'b',ultimo:${ms('2026-11-09')}},{b:{'2026-11-12':true}})`)].sort()).toEqual(['2026-11-09', '2026-11-12']);
    expect([...app.run(`adminDiasDe({uid:'z'},{})`)]).toEqual([]);
  });
  it('resumen: hoy, 7 y 30 días, y los sin autorizar', () => {
    expect(call('adminResumen', '__u', '__d', `'${hoy}'`)).toEqual({ total: 4, hoy: 2, sem: 2, mes: 2, sinAutorizar: 2 });
  });
  it('quién entró cada día', () => {
    const r = call('adminPorDia', '__u', '__d', `'${hoy}'`, 8);
    expect(r.find(x => x.dia === '2026-11-12').n).toBe(2);
    expect(r.find(x => x.dia === '2026-11-09').n).toBe(1);
    expect(r.find(x => x.dia === '2026-11-10').n).toBe(0);
    expect(r).toHaveLength(8);
  });
  it('filtros y búsqueda', () => {
    const f = o => call('adminFiltrar', '__u', '__d', `'${hoy}'`, JSON.stringify(o)).map(u => u.uid);
    expect(f({})).toEqual(['a', 'b', 'c', 'd']);
    expect(f({ filtro: 'autorizados' })).toEqual(['a', 'b']);
    expect(f({ filtro: 'sin' })).toEqual(['c', 'd']);
    expect(f({ filtro: 'inactivos' })).toEqual(['c', 'd']);
    expect(f({ texto: 'MAMA' })).toEqual(['c']);
    expect(f({ texto: 'sinusar' })).toEqual(['d']);
  });
  it('CSV con comillas escapadas y una línea por persona', () => {
    app.set('__u', [{ uid: 'q', nombre: 'Ana "la" Gómez', email: 'a@x.com', permitido: true, ultimo: ms('2026-11-12'), version: '3.19', movs: 5 }]);
    app.set('__d', {});
    const csv = app.run(`adminCSV(__u,__d,'${hoy}')`).split('\n');
    expect(csv[0]).toBe('"nombre","email","estado","primer_acceso","ultimo_acceso","version","movimientos","dias_activos_30"');
    expect(csv[1]).toBe('"Ana ""la"" Gómez","a@x.com","autorizado","","2026-11-12","3.19","5","1"');
    expect(csv).toHaveLength(2);
  });
});
