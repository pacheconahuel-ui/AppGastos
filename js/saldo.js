// "¿Por qué este saldo?": el saldo de una billetera desarmado en renglones (3.14)
// El saldo se arma igual que accountBalance (accounts.js); acá cada movimiento cae en un renglón para poder verlo.

function accountBreakdown(accId){
  const acc=accounts.find(a=>a.id===accId);
  if(!acc||acc.type==='credit')return null;
  const isUSD=(acc.currency||'ARS')==='USD';
  const b={isUSD,inicial:acc.initialBalance||0,ingresos:0,gastos:0,porOtros:0,liquidaciones:0,ajustes:0,
    pagosTarjeta:0,cambioMoneda:0,transferencias:0,usd:0,programados:0,porOtrosItems:[],ajusteItems:[]};
  const total=e=>isUSD?e.amount:amtArs(e);   // lo que salió o entró de la billetera
  const mio=e=>isUSD?effAmt(e):effArs(e);     // la parte tuya
  expenses.forEach(e=>{
    if(e.accountId!==accId)return;
    if(isUSD&&e.currency!=='USD')return;
    const ing=e.type==='Ingreso',t=total(e);
    if(esFuturo(e)){b.programados+=ing?t:-t;return;}
    if(e.ajuste){b.ajustes+=ing?t:-t;b.ajusteItems.push(e);return;}
    if(e.liquidacion){b.liquidaciones+=ing?t:-t;return;}
    if(isCCPayment(e)){b.pagosTarjeta+=ing?t:-t;return;}
    if(isFxEntry(e)){b.cambioMoneda+=ing?t:-t;return;}
    if(ing){b.ingresos+=t;return;}
    const m=mio(e),otros=t-m;
    b.gastos-=m;
    if(otros>0.005){b.porOtros-=otros;b.porOtrosItems.push({e,otros});}
  });
  if(isUSD){
    usdTx.forEach(x=>{
      if(x.usdAccountId!==accId)return;
      b.usd+=(x.type==='ingreso'||x.type==='compra')?x.usdAmount:x.type==='venta'?-x.usdAmount:0;
    });
  }else{
    transfers.forEach(x=>{
      if(esFuturo(x))return;
      if(x.fromId===accId)b.transferencias-=x.amount;
      if(x.toId===accId)b.transferencias+=x.amount;
    });
  }
  b.saldo=b.inicial+b.ingresos+b.gastos+b.porOtros+b.liquidaciones+b.ajustes+b.pagosTarjeta+b.cambioMoneda+b.transferencias+b.usd;
  return b;
}

// --- Pantalla ---
function sdMonto(b,v){return(v<0?'−':v>0?'+':'')+(b.isUSD?fmtU(v):fmt(v));}
function openSaldoDetalle(accId,ev){
  ev?.stopPropagation?.();
  const a=accounts.find(x=>x.id===accId),b=accountBreakdown(accId);
  if(!a||!b)return;
  const fm=v=>b.isUSD?fmtU(v):fmt(v);
  const fila=(lbl,v,nota)=>v?`<div class="sd-row"><div><div>${lbl}</div>${nota?`<div class="sd-nota">${nota}</div>`:''}</div><b class="${v<0?'neg':'pos'}">${sdMonto(b,v)}</b></div>`:'';
  const nOtros=b.porOtrosItems.length,nAj=b.ajusteItems.length;
  const rows=[
    `<div class="sd-row"><div>Saldo inicial</div><b>${(b.inicial<0?'−':'')+fm(Math.abs(b.inicial))}</b></div>`,
    fila('Ingresos',b.ingresos),
    fila('Tus gastos',b.gastos,'solo tu parte de cada gasto'),
    fila('Lo que pagaste por otros',b.porOtros,nOtros?`${nOtros} gasto${nOtros>1?'s':''} dividido${nOtros>1?'s':''}: la parte de los demás sale de tu billetera hasta que te la devuelvan`:''),
    fila('Cobros y pagos de deudas',b.liquidaciones),
    fila('Ajustes de saldo',b.ajustes,nAj?`${nAj} ajuste${nAj>1?'s':''} hecho${nAj>1?'s':''} con "Ajustar saldo"`:''),
    fila('Pagos de tarjeta',b.pagosTarjeta),
    fila('Compra y venta de dólares',b.cambioMoneda),
    fila(b.isUSD?'Ingresos, compras y ventas de USD':'Transferencias',b.isUSD?b.usd:b.transferencias),
  ].join('');
  // Cuánto de lo que pagaste por otros todavía te lo deben (según Saldos)
  const ids=new Set(b.porOtrosItems.map(x=>x.e.id));
  const debenTodavia=debts.filter(d=>!d.settled&&d.amount>0&&ids.has(d.linkedExpenseId)).reduce((s,d)=>s+d.amount,0);
  const lista=(its,fn)=>its.map(fn).join('');
  const itemFila=(e,derecha,nota,accion)=>`<div class="sd-box"><button class="sd-item" onclick="closeLk();editExp('${e.id}',event)"><span class="sd-item-t"><span>${esc(e.description||e.category)}</span><span class="sd-nota">${fmtDate(e.date)}${nota?' · '+nota:''}</span></span><b>${derecha}</b></button>${accion||''}</div>`;
  const otros=[...b.porOtrosItems].sort((x,y)=>y.otros-x.otros).slice(0,10);
  lkModal('saldo',`<div class="m-title">${ic('scale')} ${esc(a.name)}</div>
    <div class="sd-ttl">¿Por qué este saldo?</div>
    ${rows}
    <div class="sd-row sd-total"><div>Saldo</div><b class="${b.saldo<0?'neg':'pos'}">${(b.saldo<0?'−':'')+fm(Math.abs(b.saldo))}</b></div>
    <button class="btn-hist sd-real" onclick="corregirSaldoReal('${accId}')">${ic('scale')} Corregir con el saldo real</button>
    ${b.programados?`<div class="sd-nota" style="margin-top:6px">Hay ${sdMonto(b,b.programados)} programado para más adelante: todavía no cuenta.</div>`:''}
    ${nOtros?`<div class="sd-sec">Gastos divididos que pesan en este saldo</div>
      <div class="sd-ayuda">Si ya te devolvieron esa plata, entrá a Saldos y marcá la deuda como cobrada: vuelve a tu billetera.${debenTodavia?` Según Saldos, todavía te deben ${fm(debenTodavia)}; el resto ya figura cobrado o no tiene deuda cargada.`:' En Saldos no figura ninguna deuda pendiente de estos gastos.'}</div>
      ${lista(otros,x=>itemFila(x.e,'−'+fm(x.otros),`pagaste ${fm(total_(x.e,b))} · tu parte ${fm(mio_(x.e,b))}`,`<button class="sd-act" onclick="sacarDeBilletera('${accId}','${x.e.id}')">Sacar de esta billetera</button>`))}`:''}
    ${nAj?`<div class="sd-sec">Ajustes de saldo</div>
      <div class="sd-ayuda">Si los hiciste para igualar el banco antes de que el saldo de los gastos divididos se arreglara (versión 3.12), pueden estar restando de más. Tocá uno para verlo o borrarlo.</div>
      ${lista(b.ajusteItems,e=>itemFila(e,(e.type==='Ingreso'?'+':'−')+fm(b.isUSD?e.amount:amtArs(e)),'',`<button class="sd-act" onclick="borrarAjuste('${accId}','${e.id}')">Borrar este ajuste</button>`))}`:''}`);
}
function total_(e,b){return b.isUSD?e.amount:amtArs(e);}
function mio_(e,b){return b.isUSD?effAmt(e):effArs(e);}

// --- Acciones desde la pantalla (3.14.1) ---
function corregirSaldoReal(accId){closeLk();openAdjustModal(accId);}
// El gasto deja de restar de la billetera (queda "fuera de las billeteras"); la deuda de los demás sigue en Saldos
function sacarDeBilletera(accId,id){
  const e=expenses.find(x=>x.id===id),a=accounts.find(x=>x.id===accId);
  if(!e||!a)return;
  showConf('wallet','Sacar de esta billetera',`"${e.description||e.category}" deja de restar de ${a.name} y queda fuera de las billeteras. Si se dividió con otras personas, su deuda sigue en Saldos.`,async()=>{
    e.accountId=null;e.sinBilletera=true;e.updatedAt=Date.now();
    renderAll();skipNextArs=fbOnline;await persistArs(e,null);
    openSaldoDetalle(accId);toast(`✅ "${e.description||e.category}" ya no resta de ${a.name}`);
  },'Sacar');
}
function borrarAjuste(accId,id){
  const e=expenses.find(x=>x.id===id);
  if(!e)return;
  showConf('trash','Borrar ajuste',`Se borra "${e.description}" (${fmt(e.amount)}). El saldo de la billetera se recalcula sin él.`,async()=>{
    expenses=expenses.filter(x=>x.id!==id);
    renderAll();skipNextArs=fbOnline;await persistArs(null,id);
    openSaldoDetalle(accId);toast('🗑️ Ajuste borrado');
  },'Borrar');
}
