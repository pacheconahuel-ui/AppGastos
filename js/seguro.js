// Red de seguridad al borrar (3.24): «Deshacer» durante unos segundos y borrado de billeteras sin dejar movimientos huérfanos.

// --- Deshacer ---
let _undoFn=null,_undoTimer=null;
function ofrecerDeshacer(texto,fn,ms=8000){
  const el=document.getElementById('undo-bar');
  if(!el){return;}
  _undoFn=fn;
  el.innerHTML=`<span class="undo-txt">${esc(texto)}</span><button class="undo-btn" onclick="deshacer()">Deshacer</button>`;
  el.classList.add('on');
  document.getElementById('toast')?.classList.remove('on'); // un solo aviso a la vez
  clearTimeout(_undoTimer);
  _undoTimer=setTimeout(cerrarDeshacer,ms);
}
function cerrarDeshacer(){_undoFn=null;clearTimeout(_undoTimer);document.getElementById('undo-bar')?.classList.remove('on');}
async function deshacer(){
  const fn=_undoFn;cerrarDeshacer();
  if(!fn)return;
  try{await fn();haptic();toast('↩️ Listo, quedó como estaba');}
  catch(e){toast('❌ No se pudo deshacer: '+errMsg(e));}
}

// --- Cuántas cosas dependen de una billetera o tarjeta ---
function usoDeCuenta(id){
  return{
    movs:expenses.filter(e=>e.accountId===id),
    usd:usdTx.filter(t=>t.usdAccountId===id),
    transf:transfers.filter(t=>t.fromId===id||t.toId===id),
  };
}
// Billeteras a las que se pueden pasar los movimientos: mismo tipo y misma moneda
function destinosPara(id){
  const a=accounts.find(x=>x.id===id);if(!a)return[];
  return accounts.filter(x=>x.id!==id&&x.type===a.type&&(x.currency||'ARS')===(a.currency||'ARS'));
}

// --- Borrar una billetera o tarjeta ---
function confirmDeleteAccount(id,ev){
  ev?.stopPropagation?.();
  const a=accounts.find(x=>x.id===id);if(!a)return;
  const u=usoDeCuenta(id),n=u.movs.length+u.usd.length;
  if(!n&&!u.transf.length){
    showConf('trash','Eliminar',`¿Eliminar "${a.name}"? No tiene movimientos.`,()=>eliminarCuenta(id,null),'Eliminar');
    return;
  }
  const dest=destinosPara(id);
  const partes=[n?`${n} movimiento${n>1?'s':''}`:'',u.transf.length?`${u.transf.length} transferencia${u.transf.length>1?'s':''}`:''].filter(Boolean).join(' y ');
  lkModal('borrar-cuenta',`<div class="m-title">${ic('trash')} Eliminar ${esc(a.name)}</div>
    <p class="due-note">Tiene <b>${partes}</b>. Elegí qué hacer con eso antes de eliminarla.</p>
    ${dest.length?`<div class="f-grp"><label class="f-lbl" for="del-acc-dest">Pasar todo a</label>
      <select class="f-ctrl" id="del-acc-dest">${dest.map(d=>`<option value="${esc(d.id)}">${esc(d.emoji||'')} ${esc(d.name)}</option>`).join('')}</select></div>
      <button class="btn-save" onclick="eliminarCuenta(${jsArg(id)},document.getElementById('del-acc-dest').value)">Pasar y eliminar</button>`:''}
    <button class="btn-del-acc" style="display:flex" onclick="eliminarCuenta(${jsArg(id)},null)">Eliminar y dejar los movimientos sin billetera</button>
    <p class="sd-nota" style="margin-top:8px">Sin billetera, los movimientos siguen en la Lista y los podés reasignar desde «Disponible ahora». ${u.transf.length?'Las transferencias de esta billetera se borran.':''}</p>`);
}
async function eliminarCuenta(id,destId){
  const a=accounts.find(x=>x.id===id);if(!a)return;
  closeLk();
  const u=usoDeCuenta(id);
  // Foto de lo que se toca, para poder deshacer
  const foto={cuenta:{...a},cuentas:accounts.map(x=>({...x})),transfers:transfers.map(x=>({...x})),movs:u.movs.map(e=>({...e})),usd:u.usd.map(t=>({...t}))};
  const dest=destId?accounts.find(x=>x.id===destId):null;
  u.movs.forEach(e=>{e.accountId=dest?dest.id:null;e.updatedAt=Date.now();if(!dest)delete e.sinBilletera;});
  u.usd.forEach(t=>{t.usdAccountId=dest?dest.id:null;t.updatedAt=Date.now();});
  transfers=dest
    ?transfers.map(t=>({...t,fromId:t.fromId===id?dest.id:t.fromId,toId:t.toId===id?dest.id:t.toId})).filter(t=>t.fromId!==t.toId)
    :transfers.filter(t=>t.fromId!==id&&t.toId!==id);
  accounts=accounts.filter(x=>x.id!==id).map(x=>x.payWalletId===id?{...x,payWalletId:dest?dest.id:null}:x);
  saveAccounts();pushSettings();haptic([30,30,60]);renderAll();renderCuentasTab();
  ofrecerDeshacer(`"${a.name}" eliminada${dest?` · todo pasó a ${dest.name}`:''}`,async()=>{
    accounts=foto.cuentas;transfers=foto.transfers;
    foto.movs.forEach(o=>{const i=expenses.findIndex(e=>e.id===o.id);if(i>-1)expenses[i]=o;});
    foto.usd.forEach(o=>{const i=usdTx.findIndex(t=>t.id===o.id);if(i>-1)usdTx[i]=o;});
    saveAccounts();pushSettings();renderAll();renderCuentasTab();
    for(const e of foto.movs){skipNextArs=fbOnline;await persistArs(e,null);}
    for(const t of foto.usd){skipNextUsd=fbOnline;await persistUsd(t,null);}
  });
  for(const e of u.movs){skipNextArs=fbOnline;await persistArs(e,null);}
  for(const t of u.usd){skipNextUsd=fbOnline;await persistUsd(t,null);}
}

// --- Avisos de presupuesto: al cruzar el 80% o el 100% de una categoría este mes ---
function gastoDeCategoria(cat,mk=nowKey()){return calcByCat(mk)[cat]||0;}
function avisoPresupuesto(cat,antes){
  const limite=budgets&&budgets[cat];
  if(!limite)return null;
  const ahora=gastoDeCategoria(cat),p0=antes/limite,p1=ahora/limite;
  if(p0<1&&p1>=1)return`${cat}: pasaste el presupuesto (${fmt(ahora)} de ${fmt(limite)})`;
  if(p0<0.8&&p1>=0.8)return`${cat}: llevás el ${Math.round(p1*100)}% del presupuesto`;
  return null;
}
