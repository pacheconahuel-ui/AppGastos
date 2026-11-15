import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './load.js';

let app;
beforeEach(() => {
  app = loadApp();
  app.run("currentUID='t';loadAccounts();");
  app.run("accounts=[{id:'a',name:'Santander',emoji:'🏦',type:'wallet',currency:'ARS'},{id:'b',name:'MP',emoji:'🏦',type:'wallet',currency:'ARS'},{id:'u',name:'Wise',emoji:'🌐',type:'wallet',currency:'USD'},{id:'c',name:'Visa',emoji:'💳',type:'credit'}]");
});

describe('borrar una billetera sin dejar movimientos huérfanos (3.24)', () => {
  it('cuenta lo que depende de ella', () => {
    app.set('expenses', [{ id: 'e1', accountId: 'a' }, { id: 'e2', accountId: 'b' }]);
    app.set('usdTx', [{ id: 't1', usdAccountId: 'a' }]);
    app.set('transfers', [{ id: 'x', fromId: 'a', toId: 'b' }, { id: 'y', fromId: 'b', toId: 'u' }]);
    const u = app.run("(()=>{const u=usoDeCuenta('a');return[u.movs.length,u.usd.length,u.transf.length];})()");
    expect(u).toEqual([1, 1, 1]);
  });
  it('los destinos posibles son del mismo tipo y moneda', () => {
    expect(app.run("destinosPara('a').map(x=>x.id)")).toEqual(['b']);
    expect(app.run("destinosPara('u').map(x=>x.id)")).toEqual([]);
    expect(app.run("destinosPara('c').map(x=>x.id)")).toEqual([]);
  });
});

describe('avisos de presupuesto (3.24)', () => {
  const gasto = n => app.set('expenses', [{ id: 'g', type: 'Egreso', amount: n, myAmount: n, date: app.run('todayStr()'), category: 'Supermercado' }]);
  beforeEach(() => app.run("budgets={Supermercado:1000}"));
  it('avisa al cruzar el 80% y al pasar el 100%, una sola vez cada uno', () => {
    gasto(850);
    expect(app.run("avisoPresupuesto('Supermercado',700)")).toContain('85% del presupuesto');
    expect(app.run("avisoPresupuesto('Supermercado',820)")).toBe(null); // ya estaba arriba del 80%
    gasto(1100);
    expect(app.run("avisoPresupuesto('Supermercado',900)")).toContain('pasaste el presupuesto');
    expect(app.run("avisoPresupuesto('Supermercado',1050)")).toBe(null);
  });
  it('sin presupuesto en la categoría no avisa', () => {
    gasto(5000);
    expect(app.run("avisoPresupuesto('Luz',0)")).toBe(null);
  });
});
