import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './load.js';

let app;
beforeEach(() => {
  app = loadApp();
  app.run("currentUID='t';loadAccounts();accounts.push({id:'cc',name:'Visa',emoji:'💳',type:'credit',closingDay:25,dueOffset:10});");
});
const cc = o => ({ type: 'Egreso', myAmount: o.amount, date: '2026-11-01', category: 'Compras', description: 'x', accountId: 'cc', ccPaid: false, ...o });

describe('ciclo de la tarjeta', () => {
  it('cierre anterior, próximo y vencimiento', () => {
    expect(app.run("cardCycle(accounts.find(a=>a.id==='cc'),'2026-11-08')")).toEqual({ lastClosing: '2026-10-25', nextClosing: '2026-11-25', due: '2026-11-04' });
    expect(app.run("cardCycle(accounts.find(a=>a.id==='cc'),'2026-11-25')")).toEqual({ lastClosing: '2026-11-25', nextClosing: '2026-12-25', due: '2026-12-05' });
  });
  it('cierre el 31 en meses cortos', () => {
    expect(app.run("cardCycle({closingDay:31,dueOffset:5},'2026-03-10')")).toEqual({ lastClosing: '2026-02-28', nextClosing: '2026-03-31', due: '2026-03-05' });
  });
  it('sin día de cierre no hay ciclo', () => {
    expect(app.run("cardCycle({closingDay:0},'2026-11-08')")).toBe(null);
  });
});

describe('cuotas proyectadas', () => {
  it('próximo resumen con todo; después cuotas que quedan y fijos', () => {
    app.set('expenses', [
      cc({ id: 'u', amount: 1000 }),
      cc({ id: 'c', amount: 300, cardExpType: 'installment', installmentCurrent: 4, installmentTotal: 6 }),
      cc({ id: 'f', amount: 50, cardExpType: 'recurring' }),
      cc({ id: 'd', amount: 10, currency: 'USD', cardExpType: 'recurring' }),
      cc({ id: 'p', amount: 999, ccPaid: true }),
    ]);
    const rows = app.run("ccProjection('cc',4,'2026-11-08')");
    expect(rows.map(r => r.label)).toEqual(['Nov 26', 'Dic 26', 'Ene 27', 'Feb 27']);
    expect(rows.map(r => r.ars)).toEqual([1350, 350, 350, 50]);
    expect(rows.map(r => r.usd)).toEqual([10, 10, 10, 10]);
  });
  it('después del cierre, el próximo resumen es el del mes siguiente', () => {
    app.set('expenses', [cc({ id: 'u', amount: 1 })]);
    expect(app.run("ccProjection('cc',1,'2026-11-26')[0].label")).toBe('Dic 26');
  });
});

describe('recordatorios de vencimiento', () => {
  it('avisa el resumen cerrado sin pagar y deja de avisar al pagarlo', () => {
    app.set('expenses', [cc({ id: 'u', amount: 1000 })]);
    // cerró el 25/10 y vence el 4/11
    const r = app.run("cardReminders('2026-11-01').map(x=>[x.acc.id,x.due,x.daysLeft,x.totalARS])");
    expect(r).toEqual([['cc', '2026-11-04', 3, 1000]]);
    app.run("accounts.find(a=>a.id==='cc').lastPaid='2026-10-30'");
    expect(app.run("cardReminders('2026-11-01').length")).toBe(0);
  });
  it('reconoce pagos viejos por la descripción', () => {
    app.set('expenses', [cc({ id: 'u', amount: 1000 }), { id: 'p', type: 'Egreso', amount: 1000, myAmount: 1000, date: '2026-10-28', description: 'Pago resumen Visa', accountId: 'acc_mp' }]);
    expect(app.run("cardReminders('2026-11-01').length")).toBe(0);
  });
  it('vencido hace más de 10 días ya no avisa; sin consumos tampoco', () => {
    app.set('expenses', [cc({ id: 'u', amount: 1000 })]);
    expect(app.run("cardReminders('2026-11-14')[0].daysLeft")).toBe(-10);
    expect(app.run("cardReminders('2026-11-15').length")).toBe(0);
    app.set('expenses', []);
    expect(app.run("cardReminders('2026-11-01').length")).toBe(0);
  });
});

describe('períodos', () => {
  it('trimestres y años con su etiqueta', () => {
    expect(app.run("periodList('trim',4,'2026-11-08').map(p=>p.label)")).toEqual(['T1 26', 'T2 26', 'T3 26', 'T4 26']);
    expect(app.run("periodList('trim',2,'2026-02-08').map(p=>p.label+':'+p.keys.join('/'))")).toEqual(['T4 25:2025-10/2025-11/2025-12', 'T1 26:2026-01/2026-02/2026-03']);
    expect(app.run("periodList('anio',3,'2026-11-08').map(p=>p.label)")).toEqual(['2024', '2025', '2026']);
  });
  it('totales con las reglas del mes (mi parte, USD a pesos, sin pago de tarjeta)', () => {
    app.set('expenses', [
      { id: 'a', type: 'Ingreso', amount: 1000, myAmount: 1000, date: '2026-10-02' },
      { id: 'b', type: 'Egreso', amount: 500, myAmount: 300, date: '2026-11-02' },
      { id: 'c', type: 'Egreso', amount: 10, myAmount: 10, currency: 'USD', arsEquiv: 15000, date: '2026-07-02' },
      { id: 'd', type: 'Egreso', amount: 400, myAmount: 400, description: 'Pago resumen Visa', date: '2026-11-03' },
    ]);
    expect(app.run("periodTotals('trim',2,'2026-11-08')")).toEqual([
      { label: 'T3 26', gastos: 15000, ingresos: 0 },
      { label: 'T4 26', gastos: 300, ingresos: 1000 },
    ]);
  });
});
