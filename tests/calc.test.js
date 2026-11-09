import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from './load.js';

let app;
beforeEach(() => { app = loadApp(); app.run('currentUID="t";loadAccounts();'); });
const mov = (o) => ({ type: 'Egreso', myAmount: o.amount, date: '2026-11-05', category: 'Otro', description: 'x', accountId: 'acc_mp', ...o });

describe('nextMonthDate', () => {
  it.each([
    ['2026-01-15', '2026-02-15'],
    ['2026-01-31', '2026-02-28'],
    ['2028-01-30', '2028-02-29'],
    ['2026-03-31', '2026-04-30'],
    ['2026-12-31', '2027-01-31'],
  ])('%s → %s', (d, next) => expect(app.run(`nextMonthDate('${d}')`)).toBe(next));
});

describe('todayStr', () => {
  it('usa la fecha local, no la UTC', () => {
    const n = new Date();
    const local = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    expect(app.run('todayStr()')).toBe(local);
  });
});

describe('resumen del mes', () => {
  it('pasa los USD a pesos y separa los que no tienen cotización', () => {
    app.set('expenses', [
      mov({ id: 'a', type: 'Ingreso', amount: 1000 }),
      mov({ id: 'b', amount: 10, currency: 'USD', arsEquiv: 12000 }),
      mov({ id: 'c', amount: 20, currency: 'USD', exchangeRate: 100 }),
      mov({ id: 'd', amount: 5, currency: 'USD' }),
    ]);
    expect(app.run("calcSummary('2026-11')")).toMatchObject({ ing: 1000, pag: 14000, real: 14000, usdNoRate: 5 });
  });

  it('usa mi parte en los gastos compartidos', () => {
    app.set('expenses', [mov({ id: 'a', amount: 1000, myAmount: 600 })]);
    expect(app.run("calcSummary('2026-11')")).toMatchObject({ pag: 1000, real: 600 });
  });

  it('no cuenta el pago del resumen ni la compra de USD (viejos y nuevos)', () => {
    app.set('expenses', [
      mov({ id: 'c', amount: 500, category: 'Luz' }),
      mov({ id: 'p1', amount: 300, description: 'Pago resumen Visa' }),
      mov({ id: 'p2', amount: 300, description: 'Otro texto', ccPayment: true }),
      mov({ id: 'f1', amount: 1200 }),
      mov({ id: 'f2', type: 'Ingreso', amount: 900, fxOp: true }),
    ]);
    app.set('usdTx', [{ id: 'u', type: 'compra', usdAmount: 1, linkedArsId: 'f1' }]);
    expect(app.run("calcSummary('2026-11')")).toMatchObject({ ing: 0, pag: 500 });
    expect(app.run("calcByCat('2026-11')")).toEqual({ Luz: 500 });
    // pero sí mueven el saldo de la billetera
    expect(app.run("accountBalance('acc_mp')")).toBe(-500 - 300 - 300 - 1200 + 900);
  });
});

describe('saldo de billeteras', () => {
  it('suma ingresos, resta gastos y transferencias; ignora los de otra billetera o sin billetera', () => {
    app.run("accounts.find(a=>a.id==='acc_mp').initialBalance=100");
    app.set('expenses', [
      mov({ id: 'a', type: 'Ingreso', amount: 1000 }),
      mov({ id: 'b', amount: 300 }),
      mov({ id: 'c', amount: 50, accountId: null }),
      mov({ id: 'd', amount: 70, accountId: 'acc_efectivo' }),
    ]);
    app.set('transfers', [{ id: 't', fromId: 'acc_mp', toId: 'acc_efectivo', amount: 200 }]);
    expect(app.run("accountBalance('acc_mp')")).toBe(100 + 1000 - 300 - 200);
    expect(app.run("accountBalance('acc_efectivo')")).toBe(-70 + 200);
  });

  it('billetera en USD: movimientos USD, compras, ventas y gastos en dólares', () => {
    app.run("accounts.push({id:'u',name:'USD',type:'wallet',currency:'USD',initialBalance:10})");
    app.set('usdTx', [
      { id: '1', type: 'ingreso', usdAmount: 100, usdAccountId: 'u' },
      { id: '2', type: 'venta', usdAmount: 30, usdAccountId: 'u' },
    ]);
    app.set('expenses', [mov({ id: 'g', amount: 5, currency: 'USD', accountId: 'u' })]);
    expect(app.run("accountBalance('u')")).toBe(10 + 100 - 30 - 5);
  });
});

describe('deudas', () => {
  it('detecta las repetidas de un mismo gasto y persona, deja la más nueva', () => {
    app.set('debts', [
      { id: '1', personId: 'j', linkedExpenseId: 'x', amount: 400, createdAt: 1 },
      { id: '2', personId: 'j', linkedExpenseId: 'x', amount: 500, createdAt: 2 },
      { id: '3', personId: 'a', linkedExpenseId: 'x', amount: 100, createdAt: 3 },
      { id: '4', personId: 'j', linkedExpenseId: 'x', amount: 400, createdAt: 0, settled: true },
      { id: '5', personId: 'j', linkedExpenseId: null, amount: 9, createdAt: 5 },
    ]);
    expect(app.run('duplicateSplitDebts().map(d=>d.id)')).toEqual(['1']);
    expect(app.run("personBalance('j')")).toBe(400 + 500 + 9);
  });
});

describe('configuración', () => {
  it('las claves con . # $ / [ ] % ida y vuelta', () => {
    for (const k of ['Auto / Nafta', 'a.b#c$d[e]f', '100%', 'Mc Donald\'s']) {
      expect(app.run(`decKey(encKey(${JSON.stringify(k)}))`)).toBe(k);
      expect(app.run(`encKey(${JSON.stringify(k)})`)).not.toMatch(/[.#$/[\]]/);
    }
  });

  it('payload v2: una lista que falta se toma como vacía', () => {
    app.set('transfers', [{ id: 't' }]);
    app.run("applySettings({v:2,accounts:[{id:'w',type:'wallet'}],updatedAt:1})");
    expect(app.run('transfers.length')).toBe(0);
    expect(app.run('accounts.length')).toBe(1);
  });

  it('payload viejo (sin v): lo que falta no pisa lo local', () => {
    app.set('transfers', [{ id: 't' }]);
    app.run('applySettings({persons:[],updatedAt:1})');
    expect(app.run('transfers.length')).toBe(1);
  });

  it('un presupuesto con "/" sobrevive armar y aplicar', () => {
    app.run("budgets['Auto / Nafta']=5000");
    const payload = app.run('JSON.stringify(buildSettingsPayload(1))');
    app.run('budgets={}');
    app.run(`applySettings(${payload})`);
    expect(app.run("budgets['Auto / Nafta']")).toBe(5000);
  });
});

describe('escapes', () => {
  it('jsArg sirve dentro de onclick aunque el texto tenga comillas', () => {
    const attr = app.run(`jsArg("x');alert(1);('")`);
    // el navegador decodifica el atributo y lo que queda es un string JS válido
    const decoded = attr.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    expect(JSON.parse(decoded)).toBe("x');alert(1);('");
  });
});

describe('debtPeople (contactos borrados con deudas)', () => {
  const deuda = (id, personId, amount, settled = false) => ({ id, personId, personName: 'Vicky', amount, settled, date: '2026-01-01', createdAt: 1 });
  it('suma los contactos y también a quien ya no está pero dejó deudas', () => {
    app.set('persons', [{ id: 'a', name: 'Ana', emoji: '👩', isRecurrent: true }]);
    app.set('debts', [deuda('1', 'a', 100), deuda('2', 'gone', 300), deuda('3', 'gone', 200)]);
    expect(app.run('debtPeople().map(p=>p.id)')).toEqual(['a', 'gone']);
    expect(app.run('personOf("gone").name')).toBe('Vicky');
    expect(app.run('personOf("gone").orphan')).toBe(true);
    expect(app.run('debtPeople().reduce((s,p)=>s+personBalance(p.id),0)')).toBe(600);
  });
  it('un contacto existente no se marca como borrado', () => {
    app.set('persons', [{ id: 'a', name: 'Ana', emoji: '👩', isRecurrent: true }]);
    app.set('debts', []);
    expect(app.run('personOf("a").orphan')).toBeUndefined();
  });
});
