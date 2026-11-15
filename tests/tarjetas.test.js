import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './load.js';

let app;
beforeEach(() => {
  app = loadApp();
  app.run("currentUID='t';loadAccounts();accounts.push({id:'v',name:'Visa',emoji:'💳',type:'credit',closingDay:26,dueDay:9});");
});
const g = o => ({ type: 'Egreso', category: 'Compras', ccPaid: false, accountId: 'v', date: '2026-11-03', ...o, myAmount: o.amount });

describe('devoluciones en la tarjeta (3.25)', () => {
  it('bajan el resumen y los gastos del mes, y no suman como ingreso', () => {
    app.set('expenses', [g({ id: 'a', amount: 1000 }), g({ id: 'd', type: 'Ingreso', devolucion: true, amount: 300 })]);
    expect(app.run("ccEstimated('v').totalARS")).toBe(700);
    expect(app.run("cardStatements(accounts.find(a=>a.id==='v'),'2026-11-12').open.ars")).toBe(700);
    const r = app.run("calcSummary('2026-11')");
    expect([r.ing, r.real, r.bal]).toEqual([0, 700, -700]);
    expect(app.run("calcByCat('2026-11')")).toEqual({ Compras: 700 });
  });
  it('una devolución mayor al gasto de la categoría no deja barras negativas', () => {
    app.set('expenses', [g({ id: 'd', type: 'Ingreso', devolucion: true, amount: 300 })]);
    expect(app.run("calcByCat('2026-11')")).toEqual({});
  });
  it('un ingreso común en una billetera no se toca', () => {
    app.set('expenses', [{ id: 'i', type: 'Ingreso', amount: 500, myAmount: 500, date: '2026-11-02', category: 'Sueldo', accountId: 'acc_mp' }]);
    const r = app.run("calcSummary('2026-11')");
    expect([r.ing, r.real]).toEqual([500, 0]);
  });
  it('en los gráficos por período también bajan los gastos', () => {
    app.set('expenses', [g({ id: 'a', amount: 1000 }), g({ id: 'd', type: 'Ingreso', devolucion: true, amount: 400 })]);
    const t = app.run("periodTotals('mes',1,'2026-11-12')");
    expect(t[0].gastos).toBe(600);
    expect(t[0].ingresos).toBe(0);
  });
});

describe('saldo pendiente de un pago parcial (3.25)', () => {
  it('no cuenta como gasto del mes, pero sí como pendiente de la tarjeta', () => {
    app.set('expenses', [g({ id: 'p', amount: 400, arrastre: true, date: '2026-11-12', description: 'Saldo pendiente del resumen Visa' })]);
    expect(app.run("countsInMonth(expenses[0])")).toBe(false);
    expect(app.run("calcSummary('2026-11').real")).toBe(0);
    expect(app.run("ccEstimated('v').totalARS")).toBe(400);
  });
});
