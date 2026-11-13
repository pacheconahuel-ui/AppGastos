import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './load.js';

let app;
beforeEach(() => {
  app = loadApp();
  app.run("currentUID='t';loadAccounts();accounts.push({id:'amex',name:'Amex',emoji:'💳',type:'credit',closingDay:26,dueDay:9});");
});
const E = o => ({ type: 'Egreso', amount: 100, myAmount: 100, category: 'Servicios', ccPaid: false, ...o });
const pend = (mk, prev) => app.run(`(()=>{const r=fijosPendientes('${mk}','${prev}');return{b:r.billetera.map(e=>e.id),t:r.tarjeta.map(e=>e.id)};})()`);

describe('fijos pendientes de confirmar (3.22)', () => {
  it('un fijo de tarjeta de este mes aparece; confirmado (fijoOk) no, y en otro dispositivo tampoco', () => {
    app.set('expenses', [E({ id: 'apple', date: '2026-11-19', accountId: 'amex', cardExpType: 'recurring' })]);
    expect(pend('2026-11', '2026-10')).toEqual({ b: [], t: ['apple'] });
    app.run("expenses[0].fijoOk='2026-11'"); // la marca viaja con el movimiento
    expect(pend('2026-11', '2026-10')).toEqual({ b: [], t: [] });
  });
  it('al mes siguiente vuelve a pedirse una vez', () => {
    app.set('expenses', [E({ id: 'apple', date: '2026-12-19', accountId: 'amex', cardExpType: 'recurring', fijoOk: '2026-11' })]);
    expect(pend('2026-12', '2026-11')).toEqual({ b: [], t: ['apple'] });
  });
  it('un fijo de billetera del mes pasado se pide; omitido o ya cargado este mes, no', () => {
    app.set('expenses', [E({ id: 'alq', date: '2026-10-05', description: 'Alquiler', recurring: true, accountId: 'acc_mp' })]);
    expect(pend('2026-11', '2026-10')).toEqual({ b: ['alq'], t: [] });
    app.run("expenses[0].fijoOk='2026-11'");
    expect(pend('2026-11', '2026-10')).toEqual({ b: [], t: [] });
    app.run("expenses[0].fijoOk=null;expenses.push({id:'alq2',type:'Egreso',amount:1,date:'2026-11-03',description:'Alquiler',category:'Alquiler'})");
    expect(pend('2026-11', '2026-10')).toEqual({ b: [], t: [] });
  });
  it('lo omitido solo en este dispositivo (marca vieja) también se respeta', () => {
    app.set('expenses', [E({ id: 'apple', date: '2026-11-19', accountId: 'amex', cardExpType: 'recurring' })]);
    expect(app.run("fijosPendientes('2026-11','2026-10',new Set(['apple'])).tarjeta.length")).toBe(0);
  });
  it('un fijo de tarjeta ya pagado no se pide', () => {
    app.set('expenses', [E({ id: 'x', date: '2026-11-19', accountId: 'amex', cardExpType: 'recurring', ccPaid: true })]);
    expect(pend('2026-11', '2026-10').t).toEqual([]);
  });
});
