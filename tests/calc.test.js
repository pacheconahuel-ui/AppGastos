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

describe('avisos entre personas vinculadas', () => {
  const av = (o) => ({ id: 'a' + Math.random(), de: 'U1', ref: 'd1', creado: 100, tipo: 'deuda', monto: 15000, ...o });
  const estado = (a, lista) => { app.set('__a', a); app.set('__l', lista); return app.run('estadoDeuda(__a,__l)'); };
  it('el código se arma con uid y secreto', () => {
    expect(app.run('parseCodigo("abcDEF123456.abcdefghijkl1234")')).toEqual({ uid: 'abcDEF123456', secreto: 'abcdefghijkl1234' });
    for (const mal of ['', 'sin-punto', 'a.b', 'uid12345.MAYUSCULAS1234567', null]) expect(app.run(`parseCodigo(${JSON.stringify(mal)})`)).toBeNull();
  });
  it('una deuda pasa de abierta a esperando, saldada o rechazada', () => {
    const d = av({});
    expect(estado(d, [d])).toBe('abierta');
    const pagada = av({ ...d, id: d.id, pagadoEn: 200 });
    expect(estado(pagada, [pagada])).toBe('esperando');
    expect(estado(pagada, [pagada, av({ tipo: 'confirmado', creado: 300 })])).toBe('saldada');
    expect(estado(pagada, [pagada, av({ tipo: 'rechazado', creado: 300 })])).toBe('rechazada');
    // pagó de nuevo después del rechazo: vuelve a esperar
    const denuevo = { ...pagada, pagadoEn: 400 };
    expect(estado(denuevo, [denuevo, av({ tipo: 'rechazado', creado: 300 })])).toBe('esperando');
  });
  it('si la borran queda cancelada, y un aviso de otra deuda o de otra persona no cuenta', () => {
    const d = av({});
    expect(estado(d, [d, av({ tipo: 'baja', creado: 150 })])).toBe('cancelada');
    expect(estado(d, [d, av({ tipo: 'baja', creado: 150, ref: 'otra' })])).toBe('abierta');
    expect(estado(d, [d, av({ tipo: 'baja', creado: 150, de: 'U2' })])).toBe('abierta');
    expect(estado(d, [d, av({ tipo: 'baja', creado: 50 })])).toBe('abierta'); // anterior a la deuda
  });
  it('solo el último aviso de cada deuda ofrece acciones', () => {
    const v1 = av({ id: 'v1', creado: 100 }), v2 = av({ id: 'v2', tipo: 'cambio', creado: 200 });
    app.set('__l', [v1, v2]);
    expect(app.run('avisoVigente(__l[0],__l)')).toBe(false);
    expect(app.run('avisoVigente(__l[1],__l)')).toBe(true);
  });
  it('el texto se lee desde quien recibe', () => {
    app.set('persons', []);
    app.set('__a', av({ deNombre: 'Nahuel', desc: 'Cena' }));
    expect(app.run('avisoTexto(__a)')).toBe('Nahuel registró una deuda tuya: $15.000 · Cena');
    app.set('__a', av({ deNombre: 'Nahuel', monto: -5000, desc: 'Nafta' }));
    expect(app.run('avisoTexto(__a)')).toBe('Nahuel registró que te debe $5.000 · Nafta');
    app.set('persons', [{ id: 'p', name: 'Nahu', linkedUid: 'U1' }]);
    expect(app.run('avisoTexto(__a)')).toContain('Nahu registró');
  });
});

describe('movimientos programados (fecha futura)', () => {
  it('no cuentan en el saldo de la billetera hasta su fecha', () => {
    app.set('expenses', [
      mov({ id: 'a', type: 'Ingreso', amount: 1000, accountId: 'acc_mp', date: '2020-01-01' }),
      mov({ id: 'b', amount: 300, accountId: 'acc_mp', date: '2020-01-02' }),
      mov({ id: 'c', amount: 500, accountId: 'acc_mp', date: '2099-12-07' }), // programado
    ]);
    expect(app.run('accountBalance("acc_mp")')).toBe(700);
    expect(app.run('esFuturo(expenses[2])')).toBe(true);
    expect(app.run('esFuturo(expenses[1])')).toBe(false);
  });
  it('hoy ya cuenta, y las transferencias programadas tampoco mueven plata todavía', () => {
    app.set('expenses', [mov({ id: 'h', amount: 100, accountId: 'acc_mp', date: app.run('todayStr()') })]);
    app.set('transfers', [{ id: 't', fromId: 'acc_mp', toId: 'acc_efectivo', amount: 50, date: '2099-01-01' }]);
    expect(app.run('accountBalance("acc_mp")')).toBe(-100);
    expect(app.run('accountBalance("acc_efectivo")')).toBe(0);
  });
});

describe('dateAddMonths (repetir mes a mes)', () => {
  it.each([
    ['2026-12-07', 0, '2026-12-07'],
    ['2026-12-07', 1, '2027-01-07'],
    ['2026-12-07', 12, '2027-12-07'],
    ['2026-01-31', 1, '2026-02-28'],
    ['2026-01-31', 2, '2026-03-31'], // sale de la fecha original, no de la del mes anterior
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-11-30', 3, '2027-02-28'],
  ])('%s + %i meses → %s', (d, k, r) => expect(app.run(`dateAddMonths('${d}',${k})`)).toBe(r));
});

describe('Lo que viene (mínimo comprometido por mes)', () => {
  const HOY = '2026-11-10';
  const visa = { id: 'cc', name: 'Visa', emoji: '💳', type: 'credit', closingDay: 25, dueOffset: 10 };
  const E = (o) => ({ type: 'Egreso', myAmount: o.amount, category: 'Otro', description: o.id, accountId: 'acc_mp', ...o });
  const cargar = () => {
    app.set('accounts', [{ id: 'acc_mp', name: 'MP', emoji: '📱', type: 'wallet' }, visa]);
    app.set('expenses', [
      // tarjeta: una compra del resumen ya cerrado, una cuota 1/3 y un fijo del resumen que viene
      E({ id: 'cerrada', amount: 8000, accountId: 'cc', date: '2026-10-10', ccPaid: false }),
      E({ id: 'cuota', amount: 30000, accountId: 'cc', date: '2026-11-05', cardExpType: 'installment', installmentCurrent: 1, installmentTotal: 3, ccPaid: false }),
      E({ id: 'netflix', amount: 5000, accountId: 'cc', date: '2026-11-05', cardExpType: 'recurring', ccPaid: false }),
      // fijo de billetera (alquiler): el último monto es el del mes pasado
      E({ id: 'alq1', description: 'Alquiler', amount: 380000, date: '2026-09-01', recurring: true }),
      E({ id: 'alq2', description: 'Alquiler', amount: 400000, date: '2026-10-01', recurring: true }),
      // 12 cuotas de la heladera desde el 7/12 (programadas)
      ...Array.from({ length: 12 }, (_, i) => E({ id: 'h' + i, description: 'Heladera', amount: 25000, date: app.run(`dateAddMonths('2026-12-07',${i})`), serieId: 's1', serieIdx: i + 1, serieTotal: 12 })),
      // servicios de los últimos 3 meses (ago, sep, oct) y sueldo
      E({ id: 'l1', category: 'Luz', description: 'Luz', amount: 30000, date: '2026-08-12' }),
      E({ id: 'l2', category: 'Luz', description: 'Luz', amount: 30000, date: '2026-09-12' }),
      E({ id: 'l3', category: 'Luz', description: 'Luz', amount: 30000, date: '2026-10-12' }),
      E({ id: 'g1', category: 'Gas', description: 'Gas', amount: 15000, date: '2026-10-20' }),
      ...['2026-08-01', '2026-09-01', '2026-10-01'].map((d, i) => E({ id: 'sue' + i, type: 'Ingreso', amount: 1000000, date: d, category: 'Salario' })),
    ]);
    app.set('usdTx', []);
  };
  const f = (mk, o = {}) => app.run(`fcForecast('${mk}',${JSON.stringify(o)},'${HOY}')`);

  it('los meses van desde el actual', () => {
    expect(app.run(`fcMonths('${HOY}')`)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04']);
  });
  it('tarjeta: el resumen cerrado vence este mes y lo nuevo, el mes que viene; las cuotas y fijos siguen', () => {
    cargar();
    expect(f('2026-11').tot.tarjeta).toBe(8000); // resumen cerrado sin pagar: vence el 4/11
    expect(f('2026-12').tot.tarjeta).toBe(35000); // cuota 1/3 + netflix
    expect(f('2027-01').tot.tarjeta).toBe(35000); // cuota 2/3 + netflix
    expect(f('2027-02').tot.tarjeta).toBe(35000); // cuota 3/3 + netflix
    expect(f('2027-03').tot.tarjeta).toBe(5000); // terminó la cuota: queda el fijo
    const det = f('2027-01').items.find(i => i.grupo === 'tarjeta').subs.map(s => `${s.label}:${s.nota}`).sort();
    expect(det).toEqual(['cuota:cuota 2/3', 'netflix:fijo']);
  });
  it('cuotas cargadas de varios meses y fijos de billetera', () => {
    cargar();
    expect(f('2026-12').tot.cuotas).toBe(25000);
    expect(f('2027-03').tot.cuotas).toBe(25000);
    expect(f('2026-11').tot.cuotas).toBe(0);
    expect(f('2026-12').items.find(i => i.label === 'Heladera').nota).toBe('cuota 1/12 · hasta 07/11');
    // alquiler: el último monto (400.000) en cada mes que viene; este mes ya se cargó el de octubre, falta el de noviembre
    expect(f('2026-11').tot.fijos).toBe(400000);
    expect(f('2026-12').tot.fijos).toBe(400000);
  });
  it('total: tarjeta + cuotas + fijos, y los servicios solo si se piden (y no en este mes)', () => {
    cargar();
    expect(f('2026-12').total).toBe(35000 + 25000 + 400000);
    expect(app.run(`fcServicios('${HOY}')`).avg).toBe(35000); // (3 × 30.000 + 15.000) / 3
    expect(f('2026-12', { servicios: true }).total).toBe(35000 + 25000 + 400000 + 35000);
    expect(f('2026-11', { servicios: true }).servicios).toBe(0);
    expect(app.run(`fcIngresos('${HOY}')`)).toBe(1000000);
  });
  it('un fijo que dejó de aparecer hace más de un mes no se proyecta', () => {
    cargar();
    app.set('expenses', [E({ id: 'viejo', description: 'Gimnasio', amount: 20000, date: '2026-06-01', recurring: true })]);
    expect(f('2026-12').tot.fijos).toBe(0);
  });
});
