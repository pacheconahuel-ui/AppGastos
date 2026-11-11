// USD, deudas, saldar y borrar movimientos
// --- MODAL USD ---
function openUsdModal(data){
  document.getElementById('usd-m-title').textContent=data?'Editar movimiento USD':'Nuevo movimiento USD';
  document.getElementById('uf-id').value=data?.id||'';
  document.getElementById('uf-date').value=data?.date||todayStr();
  document.getElementById('uf-usd').value=data?.usdAmount||'';
  document.getElementById('uf-ars').value=data?.arsAmount||'';
  document.getElementById('uf-desc').value=data?.description||'';
  document.getElementById('uf-autoars').checked=true;

  // ARS wallets
  const arsWalletOpts='<option value="">— Sin asignar —</option>'+
    arsWallets().map(a=>`<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`).join('');
  // USD wallets
  const usdWalletOpts='<option value="">— Sin asignar —</option>'+
    usdWallets().map(a=>`<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`).join('');

  document.getElementById('uf-usd-acc').innerHTML=usdWalletOpts;
  document.getElementById('uf-acc-ingreso').innerHTML=arsWalletOpts;
  document.getElementById('uf-acc-compra').innerHTML=arsWalletOpts;
  document.getElementById('uf-acc-venta').innerHTML=arsWalletOpts;

  // Restore saved values
  document.getElementById('uf-usd-acc').value=data?.usdAccountId||'';
  document.getElementById('uf-acc-ingreso').value=data?.accountId||'';
  document.getElementById('uf-acc-compra').value=data?.arsAccountId||'';
  document.getElementById('uf-acc-venta').value=data?.arsAccountId||'';

  setUsdType(data?.type||'ingreso');calcTC();
  document.getElementById('usd-overlay').classList.add('on');history.pushState({modal:true},'');
  setTimeout(()=>document.getElementById('uf-usd').focus(),200);
}
function closeUsdModal(){document.getElementById('usd-overlay').classList.remove('on');}
function usdOverlayClick(ev){if(ev.target===document.getElementById('usd-overlay'))closeUsdModal();}
function setUsdType(t){
  document.getElementById('uf-type').value=t;
  document.getElementById('ubtn-in').className='type-btn'+(t==='ingreso'?' au':'');
  document.getElementById('ubtn-buy').className='type-btn'+(t==='compra'?' au':'');
  document.getElementById('ubtn-sell').className='type-btn'+(t==='venta'?' av':'');
  document.getElementById('uf-ars-wrap').style.display=(t==='venta'||t==='compra')?'block':'none';
  showUsdRates(t);
  if(t==='compra'){
    document.getElementById('uf-ars-lbl').textContent='ARS pagados';
    document.getElementById('uf-autoars-lbl').textContent='Registrar ARS como Egreso automático';
    document.getElementById('uf-usd-acc-lbl').innerHTML=ic('dollar')+' USD van a (billetera USD)';
  } else if(t==='venta'){
    document.getElementById('uf-ars-lbl').textContent='ARS recibidos';
    document.getElementById('uf-autoars-lbl').textContent='Registrar ARS como Ingreso automático';
    document.getElementById('uf-usd-acc-lbl').innerHTML=ic('dollar')+' USD salen de (billetera USD)';
  } else {
    document.getElementById('uf-usd-acc-lbl').innerHTML=ic('dollar')+' USD van a (billetera USD)';
  }
  // USD wallet: always show
  document.getElementById('uf-usd-acc-wrap').style.display='block';
  // ARS wallet selectors
  document.getElementById('uf-acc-ingreso-wrap').style.display=t==='ingreso'?'block':'none';
  document.getElementById('uf-acc-compra-wrap').style.display=t==='compra'?'block':'none';
  document.getElementById('uf-acc-venta-wrap').style.display=t==='venta'?'block':'none';
  calcTC();
}
function calcTC(){
  const usd=parseFloat(document.getElementById('uf-usd').value);
  const ars=parseFloat(document.getElementById('uf-ars').value);
  const preview=document.getElementById('tc-preview');
  if(usd>0&&ars>0){document.getElementById('tc-val').textContent=fmtTC(ars/usd)+' / U$D';document.getElementById('tc-sub').textContent=`${fmtU(usd)} × ${fmtTC(ars/usd)} = ${fmt(ars)}`;preview.classList.add('on');}
  else preview.classList.remove('on');
}
async function saveUsdTx(){
  const id=document.getElementById('uf-id').value;
  const type=document.getElementById('uf-type').value;
  const date=document.getElementById('uf-date').value;
  const usd=parseFloat(document.getElementById('uf-usd').value);
  const ars=parseFloat(document.getElementById('uf-ars').value);
  const desc=document.getElementById('uf-desc').value.trim();
  const autoArs=document.getElementById('uf-autoars').checked;
  const usdAccountId=document.getElementById('uf-usd-acc')?.value||null;
  const arsAccountId=type==='venta'
    ? (document.getElementById('uf-acc-venta')?.value||null)
    : type==='compra'
    ? (document.getElementById('uf-acc-compra')?.value||null)
    : null;
  const accountId=type==='ingreso'
    ? (document.getElementById('uf-acc-ingreso')?.value||null)
    : null;
  if(!date){toast('⚠️ Completá la fecha');return;}
  if(!usd||usd<=0||isNaN(usd)){toast('⚠️ Ingresá los USD');return;}
  if((type==='venta'||type==='compra')&&(!ars||ars<=0||isNaN(ars))){
    toast(`⚠️ Ingresá los ARS ${type==='compra'?'pagados':'recibidos'}`);return;
  }
  const tx={
    id:id||newId(),type,date,
    usdAmount:usd,
    arsAmount:(type==='venta'||type==='compra')?ars:null,
    exchangeRate:(type==='venta'||type==='compra')?Math.round(ars/usd):null,
    description:desc||(type==='ingreso'?'Ingreso USD':type==='compra'?'Compra USD':'Venta USD P2P'),
    linkedArsId:null,
    accountId:accountId||null,
    arsAccountId:arsAccountId||null,
    usdAccountId:usdAccountId||null,
    createdAt:id?(usdTx.find(t=>t.id===id)?.createdAt||Date.now()):Date.now(),
    updatedAt:Date.now()
  };
  if(id){const prev=usdTx.find(t=>t.id===id);tx.linkedArsId=prev?.linkedArsId||null;}

  // Venta: create ARS ingreso
  if(type==='venta'&&autoArs){
    let arsId=tx.linkedArsId||newId();tx.linkedArsId=arsId;
    const arsEntry={id:arsId,type:'Ingreso',date,category:'Venta USD',
      description:`Venta ${fmtU(usd)} @ ${fmtTC(ars/usd)}`,
      amount:ars,myAmount:ars,shared:false,sharedPercent:100,
      accountId:arsAccountId||null,
      createdAt:expenses.find(e=>e.id===arsId)?.createdAt||Date.now(),
      updatedAt:Date.now(),autoGenerated:true,fxOp:true};
    const ei=expenses.findIndex(e=>e.id===arsId);if(ei>-1)expenses[ei]=arsEntry;else expenses.push(arsEntry);
    skipNextArs=fbOnline;await persistArs(arsEntry,null);

  // Compra: create ARS egreso (pesos that left the wallet)
  } else if(type==='compra'&&autoArs){
    let arsId=tx.linkedArsId||newId();tx.linkedArsId=arsId;
    const arsEntry={id:arsId,type:'Egreso',date,category:'Otro',
      description:`Compra ${fmtU(usd)} @ ${fmtTC(ars/usd)}`,
      amount:ars,myAmount:ars,shared:false,sharedPercent:100,
      accountId:arsAccountId||null,   // pesos leave this wallet
      createdAt:expenses.find(e=>e.id===arsId)?.createdAt||Date.now(),
      updatedAt:Date.now(),autoGenerated:true,fxOp:true};
    const ei=expenses.findIndex(e=>e.id===arsId);if(ei>-1)expenses[ei]=arsEntry;else expenses.push(arsEntry);
    skipNextArs=fbOnline;await persistArs(arsEntry,null);

  } else if(type==='ingreso'&&tx.linkedArsId){
    // Removed auto ARS — clean up linked entry
    expenses=expenses.filter(e=>e.id!==tx.linkedArsId);
    const lid=tx.linkedArsId;tx.linkedArsId=null;
    skipNextArs=fbOnline;await persistArs(null,lid);
  }

  if(id&&type==='ingreso'){const prev=usdTx.find(t=>t.id===id);if(prev?.linkedArsId){expenses=expenses.filter(e=>e.id!==prev.linkedArsId);skipNextArs=fbOnline;await persistArs(null,prev.linkedArsId);tx.linkedArsId=null;}}
  if(id){const i=usdTx.findIndex(t=>t.id===id);if(i>-1)usdTx[i]=tx;else usdTx.push(tx);}else usdTx.push(tx);
  haptic();closeUsdModal();renderAll();
  const tcStr=ars&&usd?` · TC ${fmtTC(ars/usd)}/U$D`:'';
  toast(type==='compra'?`✅ Compra ${fmtU(usd)}${tcStr}`:type==='venta'?`✅ Venta ${fmtU(usd)}${tcStr}`:'✅ Ingreso USD guardado');
  skipNextUsd=fbOnline;await persistUsd(tx,null);
}

// --- MODAL DEUDA MANUAL ---
function openDebtModal(data){
  document.getElementById('df-id').value=data?.id||'';
  document.getElementById('df-date').value=data?.date||todayStr();
  document.getElementById('df-amt').value=data?Math.abs(data.amount):'';
  document.getElementById('df-desc').value=data?.description||'';
  buildDebtPersonSelect();
  if(data?.personId)document.getElementById('df-person').value=data.personId;
  setDebtDir(data?(data.amount>0?'me-deben':'yo-debo'):'me-deben');
  document.getElementById('debt-overlay').classList.add('on');history.pushState({modal:true},'');
  setTimeout(()=>document.getElementById('df-amt').focus(),200);
}
function closeDebtModal(){document.getElementById('debt-overlay').classList.remove('on');}
function debtOverlayClick(ev){if(ev.target===document.getElementById('debt-overlay'))closeDebtModal();}
function buildDebtPersonSelect(){
  const sel=document.getElementById('df-person'),cur=sel.value;
  sel.innerHTML=persons.map(p=>`<option value="${p.id}">${p.emoji} ${esc(p.name)}</option>`).join('');
  if(cur&&persons.find(p=>p.id===cur))sel.value=cur;
}
function debtPersonChange(){}
function setDebtDir(dir){
  document.getElementById('df-dir').value=dir;
  document.getElementById('df-btn-medb').className='type-btn'+(dir==='me-deben'?' ai':'');
  document.getElementById('df-btn-debo').className='type-btn'+(dir==='yo-debo'?' ae':'');
}
async function saveDebt(){
  const id=document.getElementById('df-id').value;
  const personId=document.getElementById('df-person').value;
  const dir=document.getElementById('df-dir').value;
  const date=document.getElementById('df-date').value;
  const amt=parseFloat(document.getElementById('df-amt').value);
  const desc=document.getElementById('df-desc').value.trim();
  if(!personId){toast('⚠️ Elegí una persona');return;}
  if(!date){toast('⚠️ Completá la fecha');return;}
  if(!amt||amt<=0||isNaN(amt)){toast('⚠️ Ingresá el monto');return;}
  if(!desc){toast('⚠️ Agregá una descripción');return;}
  const p=personById(personId);
  const debt={
    id:id||newId(),personId,personName:p?.name||'',
    description:desc,
    amount:dir==='me-deben'?amt:-amt,
    date,settled:false,settledDate:null,linkedExpenseId:null,
    createdAt:id?(debts.find(d=>d.id===id)?.createdAt||Date.now()):Date.now(),
    updatedAt:Date.now()
  };
  if(id){const i=debts.findIndex(d=>d.id===id);if(i>-1)debts[i]=debt;else debts.push(debt);}
  else debts.push(debt);
  haptic();closeDebtModal();renderSaldosTab();
  toast('✅ Deuda guardada');
  skipNextDebt=fbOnline;await persistDebt(debt,null);
  avisarDeuda(debt,id?'cambio':'deuda');
}
function deleteDebt(id,ev){
  ev?.stopPropagation();
  pendingDel={type:'debt',id};
  const d=debts.find(x=>x.id===id);
  document.getElementById('conf-txt').textContent=d
    ?`"${d.description}" · ${fmt(Math.abs(d.amount))}\nEsta acción no se puede deshacer.`
    :'Esta acción no se puede deshacer.';
  openDeleteConf();
}

// Contacto borrado con deudas pendientes: lo vuelve a crear con el mismo id (las deudas se reconectan solas),
// o, si ya hay un contacto con ese nombre, pasa las deudas a ese contacto
async function restoreOrphan(personId){
  const o=personOf(personId);
  const same=persons.find(x=>x.id!==personId&&x.name.trim().toLowerCase()===o.name.trim().toLowerCase());
  if(!same){
    persons.push({id:personId,name:o.name,emoji:o.emoji,isRecurrent:false});
    saveLocal();pushSettings();renderAll();toast(`✅ ${o.name} vuelve a estar en tus contactos`);
    return;
  }
  const mine=debts.filter(d=>d.personId===personId);
  debts=debts.map(d=>d.personId===personId?{...d,personId:same.id,personName:same.name,updatedAt:Date.now()}:d);
  renderAll();
  for(const m of mine){const d=debts.find(x=>x.id===m.id);skipNextDebt=fbOnline;await persistDebt(d,null);}
  toast(`✅ Deudas unidas con ${same.name}`);
}

// --- SETTLE MODAL ---
function openSettleModal(personId){
  const p=personOf(personId);
  const bal=personBalance(personId);
  const activeDebts=personDebtsActive(personId);
  // Allow settling even if net balance is 0, as long as there are active debts
  if(bal===0&&activeDebts.length===0){toast('Saldo en cero, no hay nada que saldar');return;}
  document.getElementById('settle-pid').value=personId;
  document.getElementById('settle-ava').textContent=p.emoji;
  document.getElementById('settle-name').textContent=p.name;
  document.getElementById('settle-bal-txt').textContent=
    bal>0?`Te debe ${fmt(bal)}`:
    bal<0?`Le debés ${fmt(Math.abs(bal))}`:
    `${activeDebts.length} deuda${activeDebts.length!==1?'s':''} activa${activeDebts.length!==1?'s':''} (saldo neto $0)`;
  document.getElementById('settle-amt').value=Math.abs(bal)||activeDebts.reduce((s,d)=>s+Math.abs(d.amount),0);
  document.getElementById('settle-date').value=todayStr();
  const accSel=document.getElementById('settle-acc');
  const accWrap=document.getElementById('settle-acc-wrap');
  document.getElementById('settle-acc-lbl').innerHTML=ic('wallet')+(bal<0?' Pagar desde':' Acreditar en');
  if(arsWallets().length>0){
    accSel.innerHTML='<option value="">— Sin asignar —</option>'+
      arsWallets().map(a=>`<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`).join('');
    accWrap.style.display='block';
  } else { accWrap.style.display='none'; }
  setSettleType('transfer');
  document.getElementById('settle-overlay').classList.add('on');history.pushState({modal:true},'');
}
function closeSettleModal(){document.getElementById('settle-overlay').classList.remove('on');}
function settleOverlayClick(ev){if(ev.target===document.getElementById('settle-overlay'))closeSettleModal();}
function setSettleType(t){
  document.getElementById('settle-type').value=t;
  document.getElementById('stype-transfer').className='settle-type-btn'+(t==='transfer'?' on':'');
  document.getElementById('stype-comp').className='settle-type-btn'+(t==='comp'?' on':'');
  // Account selector only relevant for transfers
  const accWrap=document.getElementById('settle-acc-wrap');
  if(accWrap)accWrap.style.display=t==='transfer'?'block':'none';
}
async function doSettle(){
  const personId=document.getElementById('settle-pid').value;
  const type=document.getElementById('settle-type').value;
  const amt=parseFloat(document.getElementById('settle-amt').value);
  const date=document.getElementById('settle-date').value;
  const accountId=document.getElementById('settle-acc')?.value||null;
  if(!amt||amt<=0||isNaN(amt)){toast('⚠️ Ingresá el monto');return;}
  const p=personOf(personId);
  const bal=personBalance(personId);

  // Se salda contra el saldo neto: si el pago lo cubre (o el neto es 0) se cierran
  // todas las deudas activas; si no, queda un "Pago parcial" que lo descuenta.
  // Antes se cerraban deudas de a una y lo que no alcanzaba se perdía.
  const activeDebts=personDebtsActive(personId);
  const settledIds=[];
  let partial=null;
  if(bal===0||amt>=Math.abs(bal)-0.005){
    for(const d of activeDebts){
      debts=debts.map(x=>x.id===d.id?{...x,settled:true,settledDate:date,updatedAt:Date.now()}:x);
      settledIds.push(d.id);
    }
  }else{
    partial={
      id:newId(),personId,personName:p?.name||'',
      description:'Pago parcial',amount:bal>0?-amt:amt,
      date,settled:false,settledDate:null,linkedExpenseId:null,
      createdAt:Date.now(),updatedAt:Date.now()
    };
    debts.push(partial);
  }

  // Create ARS ingreso if they were paying me and it's a transfer
  if(bal>0&&type==='transfer'){
    const accName=accountId?(' → '+(accounts.find(a=>a.id===accountId)?.name||'')):'';
    const arsEntry={
      id:newId(),type:'Ingreso',date,category:'Otro',
      description:`Liquidación ${p.name}${accName}`,
      amount:amt,myAmount:amt,shared:false,sharedPercent:100,
      accountId:accountId||null,
      createdAt:Date.now(),updatedAt:Date.now(),autoGenerated:true,liquidacion:true
    };
    expenses.push(arsEntry);
    skipNextArs=fbOnline;await persistArs(arsEntry,null);
  }
  // Si el que paga soy yo, la plata sale de la billetera elegida
  if(bal<0&&type==='transfer'){
    const accName=accountId?(' desde '+(accounts.find(a=>a.id===accountId)?.name||'')):'';
    const arsEntry={
      id:newId(),type:'Egreso',date,category:'Otro',
      description:`Liquidación ${p.name}${accName}`,
      amount:amt,myAmount:amt,shared:false,sharedPercent:100,
      accountId:accountId||null,
      createdAt:Date.now(),updatedAt:Date.now(),autoGenerated:true,liquidacion:true
    };
    expenses.push(arsEntry);
    skipNextArs=fbOnline;await persistArs(arsEntry,null);
  }

  // Persist settled debts
  for(const id of settledIds){
    const d=debts.find(x=>x.id===id);
    skipNextDebt=fbOnline;await persistDebt(d,null);
  }
  if(partial){skipNextDebt=fbOnline;await persistDebt(partial,null);}

  if(settledIds.length)avisarSaldado(p,activeDebts.filter(d=>settledIds.includes(d.id)),date);
  haptic();closeSettleModal();renderAll();
  const accLabel=accountId?' a '+(accounts.find(a=>a.id===accountId)?.name||''):'';
  const mov=type!=='transfer'?'':bal>0?` · Ingreso${accLabel} creado`:bal<0?` · Egreso${accLabel} creado`:'';
  toast(partial?`✅ Pago parcial de ${fmt(amt)} · queda ${fmt(Math.abs(personBalance(personId)))}${mov}`:`✅ Saldo con ${p.name} saldado${mov}`);
}

// --- EDIT / DELETE ARS & USD ---
function editExp(id,ev){ev?.stopPropagation();const e=expenses.find(x=>x.id===id);if(e)openModal(e);}
function delExp(id,ev){
  ev?.stopPropagation();pendingDel={type:'ars',id};
  const e=expenses.find(x=>x.id===id);
  // Una cuota de varios meses: se puede borrar solo esa o también las que siguen
  const sig=e&&e.serieId?expenses.filter(x=>x.serieId===e.serieId&&x.serieIdx>e.serieIdx):[];
  if(sig.length){
    showConf('trash','Borrar cuota',`"${e.description}" · cuota ${e.serieIdx} de ${e.serieTotal}.\nDespués hay ${sig.length} más. ¿Qué borrás?`,()=>{pendingDel={type:'ars',id};doDelete();},'Solo esta');
    document.getElementById('conf-btns').insertAdjacentHTML('beforeend',`<button class="btn-yes" onclick="borrarSerie('${id}')">Esta y las siguientes (${sig.length+1})</button>`);
    return;
  }
  document.getElementById('conf-txt').textContent=e?`"${e.description}" · ${fmt(e.amount)}\nEsta acción no se puede deshacer.`:'Esta acción no se puede deshacer.';
  openDeleteConf();
}
async function borrarSerie(id){
  closeConf();
  const e=expenses.find(x=>x.id===id);if(!e)return;
  const ids=expenses.filter(x=>x.serieId===e.serieId&&x.serieIdx>=e.serieIdx).map(x=>x.id);
  expenses=expenses.filter(x=>!ids.includes(x.id));
  renderAll();toast(`🗑️ ${ids.length} cuotas eliminadas`);
  for(const x of ids){skipNextArs=fbOnline;await persistArs(null,x);}
}
function editUsdTx(id,ev){ev?.stopPropagation();const t=usdTx.find(x=>x.id===id);if(t)openUsdModal(t);}
function delUsdTx(id,ev){
  ev?.stopPropagation();pendingDel={type:'usd',id};
  const t=usdTx.find(x=>x.id===id);
  document.getElementById('conf-txt').textContent=t?`"${t.description}" · ${fmtU(t.usdAmount)}${t.linkedArsId?'\n(también se eliminará el ingreso ARS asociado)':''}\nEsta acción no se puede deshacer.`:'Esta acción no se puede deshacer.';
  openDeleteConf();
}
function closeConf(){
  pendingDel=null;_confCb=null;
  document.getElementById('conf-overlay').classList.remove('on');
}

async function doDelete(){
  if(!pendingDel){closeConf();return;}
  const{type,id,name}=pendingDel;closeConf();
  if(type==='cat'){
    haptic([30,30,60]);
    cats=cats.filter(c=>c!==name);delete catTypes[name];saveLocal();pushSettings();buildCatSelect(null);renderCatManager();toast(`🗑️ Categoría "${name}" eliminada`);
    return;
  }
  if(type==='contact'){
    haptic([30,30,60]);
    persons=persons.filter(p=>p.id!==id);saveLocal();pushSettings();
    renderContactsList();renderSaldosTab();buildDebtPersonSelect();
    toast('🗑️ Contacto eliminado');return;
  }
  if(type==='account'){
    haptic([30,30,60]);
    accounts=accounts.filter(a=>a.id!==id);saveAccounts();pushSettings();renderCuentasTab();toast('🗑️ Billetera eliminada');return;
  }
  if(type==='transfer'){
    haptic([30,30,60]);
    transfers=transfers.filter(x=>x.id!==id);saveAccounts();pushSettings();renderCuentasTab();toast('🗑️ Transferencia eliminada');return;
  }
  if(type==='goal'){
    haptic([30,30,60]);
    goals=goals.filter(x=>x.id!==id);saveGoals();pushSettings();renderGoalsSection();toast('🗑️ Meta eliminada');return;
  }
  haptic([30,30,60]);
  if(type==='debt'){
    const borrada=debts.find(d=>d.id===id);
    if(borrada&&!borrada.settled)avisarDeuda(borrada,'baja');
    debts=debts.filter(d=>d.id!==id);renderSaldosTab();toast('🗑️ Deuda eliminada');
    skipNextDebt=fbOnline;await persistDebt(null,id);
  }else if(type==='ars'){
    // Las deudas del split que todavía no se saldaron se van con el gasto
    const linked=debts.filter(d=>d.linkedExpenseId===id&&!d.settled);
    expenses=expenses.filter(e=>e.id!==id);
    debts=debts.filter(d=>!linked.includes(d));
    renderAll();toast(linked.length?`🗑️ Gasto eliminado (y ${linked.length} deuda${linked.length>1?'s':''} del split)`:'🗑️ Gasto eliminado');
    skipNextArs=fbOnline;await persistArs(null,id);
    for(const d of linked){skipNextDebt=fbOnline;await persistDebt(null,d.id);avisarDeuda(d,'baja');}
  }else{
    const t=usdTx.find(x=>x.id===id);
    if(t?.linkedArsId){expenses=expenses.filter(e=>e.id!==t.linkedArsId);skipNextArs=fbOnline;await persistArs(null,t.linkedArsId);}
    usdTx=usdTx.filter(x=>x.id!==id);renderAll();toast('🗑️ Movimiento USD eliminado');
    skipNextUsd=fbOnline;await persistUsd(null,id);
  }
}

