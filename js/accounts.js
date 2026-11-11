// Billeteras, tarjetas, saldos, transferencias y pago del resumen
// --- ACCOUNTS (CUENTAS) ---
const ACC_SK='gp_accounts_v1', TRF_SK='gp_transfers_v1';
const ACC_EMOJIS=['🏦','💳','💵','📱','🏧','💰','🪙','🏠','✈️','💻'];
const DEF_ACCOUNTS=[
  {id:'acc_santander',name:'Santander',emoji:'🏦',type:'wallet',initialBalance:0,createdAt:Date.now()},
  {id:'acc_mp',name:'Mercado Pago',emoji:'📱',type:'wallet',initialBalance:0,createdAt:Date.now()},
  {id:'acc_efectivo',name:'Efectivo',emoji:'💵',type:'wallet',initialBalance:0,createdAt:Date.now()},
];
let accounts=[],transfers=[];

function loadAccounts(){
  try{accounts=JSON.parse(localStorage.getItem(lsKey(ACC_SK)))||[...DEF_ACCOUNTS];}catch{accounts=[...DEF_ACCOUNTS];}
  // migrate old accounts without type field
  accounts=accounts.map(a=>({type:'wallet',...a}));
  try{transfers=JSON.parse(localStorage.getItem(lsKey(TRF_SK)))||[];}catch{transfers=[];}
}
function saveAccounts(){
  try{localStorage.setItem(lsKey(ACC_SK),JSON.stringify(accounts));localStorage.setItem(lsKey(TRF_SK),JSON.stringify(transfers));}catch(e){}
}
function walletAccounts(currency=null){
  const wallets=accounts.filter(a=>a.type==='wallet');
  if(!currency)return wallets;
  return wallets.filter(a=>(a.currency||'ARS')===currency);
}
function ccAccounts(){return accounts.filter(a=>a.type==='credit');}
function arsWallets(){return walletAccounts('ARS');}
function usdWallets(){return walletAccounts('USD');}

function accountBalance(accId){
  const acc=accounts.find(a=>a.id===accId);
  if(!acc||acc.type==='credit')return null;
  const isUSD=(acc.currency||'ARS')==='USD';
  let bal=acc.initialBalance||0;
  if(isUSD){
    // USD wallet: balance from usdTx linkedArsId... no, from usdAccountId field
    // Ingreso USD → goes to usdAccountId
    // Compra USD → goes to usdAccountId  
    // Venta USD → leaves from usdAccountId
    usdTx.forEach(t=>{
      if(t.usdAccountId!==accId)return;
      if(t.type==='ingreso'||t.type==='compra') bal+=t.usdAmount;
      else if(t.type==='venta') bal-=t.usdAmount;
    });
    // Gastos e ingresos en USD con esta billetera (ej. pago del resumen en dólares)
    expenses.forEach(e=>{
      if(e.accountId!==accId||e.currency!=='USD'||esFuturo(e))return;
      if(e.type==='Ingreso')bal+=e.amount;else bal-=e.amount; // sale lo que se pagó, no solo la parte propia
    });
  } else {
    // ARS wallet: balance from expenses
    expenses.forEach(e=>{
      if(e.accountId!==accId||esFuturo(e))return;
      if(e.type==='Ingreso')bal+=amtArs(e);
      else bal-=amtArs(e); // de la billetera sale el total pagado; la parte de otros vuelve cuando la cobrás
    });
    transfers.forEach(t=>{
      if(esFuturo(t))return;
      if(t.fromId===accId)bal-=t.amount;
      if(t.toId===accId)bal+=t.amount;
    });
  }
  return bal;
}

// Returns all unpaid CC expenses for a card, with ARS equivalents
function ccEstimated(accId){
  const items=expenses.filter(e=>
    e.accountId===accId &&
    e.type==='Egreso' &&
    e.ccPaid !== true  // handle both false and undefined (old expenses without field)
  );
  let totalARS=0,totalUSD=0;
  const lines=items.map(e=>{
    const isUSD=e.currency==='USD';
    const arsAmt = isUSD
      ? (e.arsEquiv || (e.amount*(e.exchangeRate||0)))
      : e.amount; // el resumen cobra el total, aunque la compra se haya dividido
    if(isUSD)totalUSD+=e.amount; else totalARS+=arsAmt;
    return{...e,arsAmt};
  });
  return{lines,totalARS,totalUSD};
}

function renderCuentasTab(){
  const mk=nowKey();
  const arsAccs=arsWallets();
  const usdAccs=usdWallets();
  const cards=ccAccounts();

  const makeWalletCard=(a,isUsd)=>{
    const bal=accountBalance(a.id)||0;
    const bc=bal>=0?'p':'r';
    const balStr=isUsd
      ?`<div class="account-bal-val card-val" style="color:var(--gold)">${fmtU(bal)}</div>`
      :`<div class="account-bal-val card-val ${bc}">${bal<0?'-':''}${fmt(bal)}</div>`;
    const negAlert=!isUsd&&bal<0?'<span style="font-size:10px;color:var(--red);font-weight:700">'+ic('warn')+' Negativa</span>':'';
    const movCount=isUsd
      ?usdTx.filter(t=>t.usdAccountId===a.id&&monthKey(t.date)===mk).length
      :expenses.filter(e=>e.accountId===a.id&&monthKey(e.date)===mk).length;
    return`<div class="account-card" onclick="openAccountModal('${a.id}')">
      <div class="account-ava" style="background:${isUsd?'color-mix(in srgb,var(--tint) 10%,transparent)':'color-mix(in srgb,var(--acc) 10%,transparent)'};border-color:${isUsd?'color-mix(in srgb,var(--tint) 20%,transparent)':'color-mix(in srgb,var(--acc) 20%,transparent)'}">${a.emoji}</div>
      <div class="account-info">
        <div class="account-name">${esc(a.name)}${isUsd?' <span style="font-size:10px;color:var(--gold);font-weight:700">USD</span>':''}</div>
        <div class="account-type">${movCount} mov. este mes ${negAlert}</div>
      </div>
      <div class="account-bal">
        ${balStr}
        <button onclick="confirmDeleteAccount('${a.id}',event)" class="btn-ico del" style="margin:2px 0 0 auto;width:44px;height:44px;font-size:14px">${ic('trash')}</button>
      </div>
    </div>`;
  };

  const arsWalletHtml=arsAccs.map(a=>makeWalletCard(a,false)).join('')
    ||'<div class="empty" style="padding:16px 0"><div class="empty-ico" style="font-size:28px">'+ic('wallet')+'</div><p>Sin billeteras ARS</p></div>';
  const usdWalletHtml=usdAccs.map(a=>makeWalletCard(a,true)).join('');

  let ccHtml='';
  cards.forEach(a=>{
    const{lines,totalARS,totalUSD}=ccEstimated(a.id);
    const closingDay=a.closingDay||0;
    const closingDate=closingDay?`Cierra día ${closingDay}`:'Sin fecha configurada';
    const lineItems=lines.slice(0,5).map(e=>{
      const isRec=e.cardExpType==='recurring';
      const isInst=e.cardExpType==='installment';
      const isUSD=e.currency==='USD';
      const badges=[
        isRec?'<span class="cc-line-badge cc-badge-rec">'+ic('repeat')+' fijo</span>':'',
        isInst?`<span class="cc-line-badge cc-badge-inst">${ic('calendar')} ${e.installmentCurrent}/${e.installmentTotal}</span>`:'',
        isUSD?`<span class="cc-line-badge cc-badge-usd">U$D ${e.amount}</span>`:'',
      ].join('');
      const displayAmt=isUSD?`~${fmt(e.arsAmt)}`:`${fmt(e.arsAmt)}`;
      return`<div class="cc-line">
        <span class="cc-line-name">${catIcon(e.category)} ${esc(e.description||e.category)} ${badges}</span>
        <span class="cc-line-amt">${displayAmt}</span>
      </div>`;
    }).join('');
    const moreCount=lines.length-5;
    const usdLine=totalUSD>0?`<div style="font-size:11px;color:var(--gold);margin-top:4px">+ U$D ${totalUSD} en dólares</div>`:'';
    ccHtml+=`<div class="cc-summary-box">
      <div class="cc-summary-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:22px">${a.emoji}</span>
          <div>
            <div class="cc-summary-name">${esc(a.name)}</div>
            <div class="cc-summary-dates">${closingDate} · ${lines.length} consumo${lines.length!==1?'s':''}</div>
          </div>
        </div>
        <div class="cc-estimated">
          <div class="cc-estimated-lbl">Próximo resumen</div>
          <div class="cc-estimated-val">~${fmt(totalARS)}</div>
          ${usdLine}
        </div>
      </div>
      ${lineItems}
      ${moreCount>0?`<div style="font-size:11px;color:var(--txt3);text-align:center;margin-top:6px">+ ${moreCount} más</div>`:''}
      ${cardProjectionHTML(a)}
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn-pay-cc" onclick="openCCPayModal('${a.id}')">${ic('card')} Pagar resumen</button>
        <button onclick="openAccountModal('${a.id}')" class="btn-ico edit" style="width:40px;height:40px;flex-shrink:0;border-radius:10px">${ic('edit')}</button>
        <button onclick="confirmDeleteAccount('${a.id}',event)" class="btn-ico del" style="width:40px;height:40px;flex-shrink:0;border-radius:10px">${ic('trash')}</button>
      </div>
    </div>`;
  });

  const totalARS=arsAccs.reduce((s,a)=>{const b=accountBalance(a.id);return s+(b||0);},0);
  const totalUSD=usdAccs.reduce((s,a)=>{const b=accountBalance(a.id);return s+(b||0);},0);

  document.getElementById('cuentas-list').innerHTML=
    `<div class="div-lbl">Billeteras ARS</div>${arsWalletHtml}`+
    (usdAccs.length?`<div class="div-lbl" style="margin-top:12px;color:var(--gold)">Billeteras USD</div>${usdWalletHtml}`:'') +
    (cards.length?`<div class="div-lbl" style="margin-top:12px">Tarjetas de crédito</div>${ccHtml}`:'') +
    (!arsAccs.length&&!usdAccs.length&&!cards.length?'<div class="empty"><div class="empty-ico">'+ic('wallet')+'</div><p>Sin cuentas. Tocá ＋ para agregar.</p></div>':'');

  if(arsAccs.length||usdAccs.length){
    document.getElementById('cuentas-list').insertAdjacentHTML('beforeend',
      `<button onclick="openAdjustModal(null,null)" style="width:100%;padding:11px;margin-top:8px;background:var(--surf);border:1px solid var(--bdr);border-radius:12px;color:var(--txt3);font-size:13px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px">${ic('scale')} Ajustar saldo de una billetera</button>`
    );
  }

  document.getElementById('cuentas-total-ars').textContent=
    fmt(totalARS)+(totalUSD>0?` + ${fmtU(totalUSD)}`:'');
  const mTf=transfers.filter(t=>monthKey(t.date)===mk);
  document.getElementById('cuentas-transfers-count').textContent=`${mTf.length} transferencia${mTf.length!==1?'s':''}`;
  const tHtml=transfers.length?[...transfers].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,10).map(t=>{
    const fr=accounts.find(a=>a.id===t.fromId),to=accounts.find(a=>a.id===t.toId);
    return`<div class="transfer-box"><div style="font-size:20px">${fr?.emoji||'💼'}</div>
      <div class="exp-info"><div class="exp-desc">${esc(t.description||'Transferencia')}</div><div class="exp-meta">${fmtDate(t.date)} · ${esc(fr?.name||'?')} → ${esc(to?.name||'?')}</div></div>
      <div class="exp-amt e">${fmt(t.amount)}</div>
      <button class="btn-ico del" onclick="deleteTransfer('${t.id}',event)" style="width:28px;height:28px;font-size:12px">${ic('trash')}</button></div>`;
  }).join(''):'<div class="empty"><div class="empty-ico">⇄</div><p>Sin transferencias</p></div>';
  document.getElementById('transfers-list').innerHTML=tHtml;
}

// Account type toggle in modal
function setAccType(t){
  document.getElementById('acc-type').value=t;
  document.getElementById('acc-btn-wallet').className='type-btn'+(t==='wallet'?' ai':'');
  document.getElementById('acc-btn-cc').className='type-btn'+(t==='credit'?' au':'');
  document.getElementById('acc-initial-wrap').style.display=t==='wallet'?'block':'none';
  document.getElementById('acc-cc-extras').style.display=t==='credit'?'block':'none';
  document.getElementById('acc-currency-wrap').style.display=t==='wallet'?'block':'none';
  document.getElementById('acc-emoji-preview').textContent=t==='credit'?'💳':'🏦';
}

let _editAccId=null;
function openAccountModal(id=null,ev=null){
  ev?.stopPropagation?.();
  _editAccId=id;const a=id?accounts.find(x=>x.id===id):null;
  document.getElementById('account-modal-title').textContent=a?'Editar cuenta':'Nueva cuenta';
  document.getElementById('acc-id').value=id||'';
  document.getElementById('acc-name').value=a?.name||'';
  document.getElementById('acc-emoji-preview').textContent=a?.emoji||(a?.type==='credit'?'💳':'🏦');
  document.getElementById('acc-initial').value=Math.abs(a?.initialBalance||0);
  document.getElementById('acc-initial-neg').checked=(a?.initialBalance||0)<0;
  document.getElementById('acc-closing-day').value=a?.closingDay||'';
  document.getElementById('acc-due-offset').value=a?.dueOffset||10;
  const pw=document.getElementById('acc-pay-wallet');
  pw.innerHTML='<option value="">— Sin asignar —</option>'+
    walletAccounts().filter(w=>w.id!==id).map(w=>`<option value="${w.id}">${w.emoji} ${esc(w.name)}</option>`).join('');
  pw.value=a?.payWalletId||'';
  setAccType(a?.type||'wallet');
  setAccCurrency(a?.currency||'ARS');
  document.getElementById('account-overlay').classList.add('on');history.pushState({modal:true},'');
  setTimeout(()=>document.getElementById('acc-name').focus(),200);
}
function closeAccountModal(){document.getElementById('account-overlay').classList.remove('on');}
function accountOverlayClick(ev){if(ev.target===document.getElementById('account-overlay'))closeAccountModal();}

function setAccCurrency(c){
  document.getElementById('acc-currency').value=c;
  document.getElementById('acc-btn-ars').className='type-btn'+(c==='ARS'?' ai':'');
  document.getElementById('acc-btn-usd').className='type-btn'+(c==='USD'?' au':'');
  const lbl=document.getElementById('acc-initial-lbl');
  if(lbl)lbl.textContent=c==='USD'?'Saldo inicial (U$D)':'Saldo inicial ($)';
}
function pickAccountEmoji(){
  const ex=document.getElementById('acc-emoji-picker');if(ex){ex.remove();return;}
  const g=ACC_EMOJIS.map(e=>`<span onclick="document.getElementById('acc-emoji-preview').textContent='${e}';document.getElementById('acc-emoji-picker').remove()" style="font-size:28px;cursor:pointer;padding:6px;border-radius:8px;display:inline-block">${e}</span>`).join('');
  const d=document.createElement('div');d.id='acc-emoji-picker';d.style.cssText='background:var(--modal-bg);border:1px solid var(--bdr2);border-radius:14px;padding:10px;margin-top:8px;text-align:center';d.innerHTML=g;
  document.getElementById('acc-emoji-preview').parentNode.appendChild(d);
}
function saveAccount(){
  try{
  const id=document.getElementById('acc-id').value;
  const name=document.getElementById('acc-name').value.trim();
  const emoji=document.getElementById('acc-emoji-preview').textContent;
  const type=document.getElementById('acc-type').value;
  const currency=type==='wallet'?(document.getElementById('acc-currency').value||'ARS'):'ARS';
  const neg=document.getElementById('acc-initial-neg').checked?-1:1;
  const initial=(parseFloat(document.getElementById('acc-initial').value)||0)*neg; // el teclado del celular no siempre trae el signo −
  const closingDay=parseInt(document.getElementById('acc-closing-day').value)||0;
  const dueOffset=parseInt(document.getElementById('acc-due-offset').value)||10;
  const payWalletId=document.getElementById('acc-pay-wallet').value||null;
  if(!name){toast('⚠️ Escribí un nombre');return;}
  const acc={
    id:id||'acc_'+newId(),name,emoji,type,currency,
    initialBalance:type==='wallet'?initial:0,
    closingDay:type==='credit'?closingDay:0,
    dueOffset:type==='credit'?dueOffset:10,
    payWalletId:type==='credit'?payWalletId:null,
    lastPaid:type==='credit'?(accounts.find(a=>a.id===id)?.lastPaid||null):null,
    createdAt:id?accounts.find(a=>a.id===id)?.createdAt||Date.now():Date.now()
  };
  if(id){const i=accounts.findIndex(a=>a.id===id);if(i>-1)accounts[i]=acc;else accounts.push(acc);}
  else accounts.push(acc);
  // Block listener BEFORE async push so it can't overwrite what we just saved
  
  saveAccounts();pushSettings();closeAccountModal();renderCuentasTab();haptic();
  toast(`✅ ${type==='credit'?'Tarjeta':'Billetera'} "${name}" ${id?'actualizada':'creada'}`);
  }catch(err){
    toast('❌ '+errMsg(err));
  }
}
function confirmDeleteAccount(id,ev){
  ev?.stopPropagation?.();const a=accounts.find(x=>x.id===id);
  pendingDel={type:'account',id};
  document.getElementById('conf-txt').textContent=`¿Eliminar "${a?.name}"?\nEsta acción no se puede deshacer.`;
  openDeleteConf();
}

// --- CC PAYMENT MODAL ---
function setCCPayMode(mode){
  document.getElementById('ccp-pay-mode').value=mode;
  document.getElementById('ccp-btn-ars').className='type-btn'+(mode==='ars'?' ai':'');
  document.getElementById('ccp-btn-mix').className='type-btn'+(mode==='mix'?' au':'');
  document.getElementById('ccp-usd-row').style.display=mode==='mix'?'block':'none';
}

function openCCPayModal(accId){
  const a=accounts.find(x=>x.id===accId);if(!a)return;
  const{lines,totalARS,totalUSD}=ccEstimated(accId);
  document.getElementById('ccp-acc-id').value=accId;
  document.getElementById('cc-pay-title').innerHTML=ic('card')+' Pagar '+esc(a.name);
  document.getElementById('ccp-real-ars').value='';
  document.getElementById('ccp-real-usd').value='';
  document.getElementById('ccp-date').value=todayStr();
  document.getElementById('ccp-subtotal-ars').textContent=fmt(totalARS);
  const usdRow=document.getElementById('ccp-usd-subtotal-row');
  usdRow.style.display=totalUSD>0?'flex':'none';
  document.getElementById('ccp-subtotal-usd').textContent=fmtU(totalUSD);

  // Items list
  const itemsHtml=lines.length?lines.map(e=>{
    const isRec=e.cardExpType==='recurring';
    const isInst=e.cardExpType==='installment';
    const isUSD=e.currency==='USD';
    const badge=isRec?'<span class="cc-line-badge cc-badge-rec">'+ic('repeat')+' fijo</span>':
                 isInst?`<span class="cc-line-badge cc-badge-inst">${ic('calendar')} ${e.installmentCurrent}/${e.installmentTotal}</span>`:'';
    const amt=isUSD?`<span style="color:var(--gold)">U$D ${e.amount}</span>`:fmt(e.arsAmt);
    return`<div class="cc-line"><span class="cc-line-name">${catIcon(e.category)} ${esc(e.description||e.category)} ${badge}</span><span class="cc-line-amt">${amt}</span></div>`;
  }).join(''):'<div style="color:var(--txt3);font-size:12px;text-align:center;padding:8px">Sin consumos pendientes</div>';
  document.getElementById('ccp-items').innerHTML=itemsHtml;

  // Wallet selectors — only wallet-type accounts
  const wallets=walletAccounts();
  const wOpts='<option value="">— Sin asignar —</option>'+
    wallets.map(w=>`<option value="${w.id}">${w.emoji} ${esc(w.name)}</option>`).join('');
  document.getElementById('ccp-wallet-ars').innerHTML=wOpts;
  document.getElementById('ccp-wallet-usd').innerHTML=wOpts;
  if(a.payWalletId){
    document.getElementById('ccp-wallet-ars').value=a.payWalletId;
  }
  // Default pay mode: mix if there are USD items, ars otherwise
  setCCPayMode(totalUSD>0?'mix':'ars');
  document.getElementById('cc-pay-overlay').classList.add('on');history.pushState({modal:true},'');
}
function closeCCPayModal(){document.getElementById('cc-pay-overlay').classList.remove('on');}
function ccPayOverlayClick(ev){if(ev.target===document.getElementById('cc-pay-overlay'))closeCCPayModal();}

async function saveCCPayment(){
  const accId=document.getElementById('ccp-acc-id').value;
  const mode=document.getElementById('ccp-pay-mode').value;
  const date=document.getElementById('ccp-date').value;
  const walletArsId=document.getElementById('ccp-wallet-ars').value;
  const walletUsdId=document.getElementById('ccp-wallet-usd').value;
  const a=accounts.find(x=>x.id===accId);
  const{totalARS,totalUSD,lines}=ccEstimated(accId);

  // ARS amount — use entered or estimated
  const enteredARS=parseFloat(document.getElementById('ccp-real-ars').value);
  const payARS=enteredARS>0?enteredARS:totalARS;

  // USD amount — use entered or estimated total USD
  const enteredUSD=parseFloat(document.getElementById('ccp-real-usd').value);
  const payUSD=mode==='mix'?(enteredUSD>0?enteredUSD:totalUSD):0;

  if(!payARS&&!payUSD){toast('⚠️ No hay monto a pagar');return;}
  if(!date){toast('⚠️ Completá la fecha');return;}

  // Create ARS egreso
  if(payARS>0){
    const exp={
      id:newId(),type:'Egreso',date,
      category:'Servicios',
      description:`Pago resumen ${a.name}`,ccPayment:true,ccCardId:accId,
      amount:payARS,myAmount:payARS,
      accountId:walletArsId||null,
      currency:'ARS',shared:false,sharedPercent:100,
      createdAt:Date.now(),updatedAt:Date.now()
    };
    expenses.push(exp);
    skipNextArs=fbOnline;await persistArs(exp,null);
  }

  // Create USD egreso if mix mode
  if(mode==='mix'&&payUSD>0){
    const usdEntry={
      id:newId(),type:'Egreso',date,
      category:'Servicios',
      description:`Pago resumen ${a.name} (USD)`,ccPayment:true,ccCardId:accId,
      amount:payUSD,myAmount:payUSD,
      accountId:walletUsdId||null,
      currency:'USD',shared:false,sharedPercent:100,
      createdAt:Date.now(),updatedAt:Date.now()
    };
    expenses.push(usdEntry);
    skipNextArs=fbOnline;await persistArs(usdEntry,null);
  }

  // Mark all CC expenses as paid
  const ids=new Set(lines.map(e=>e.id));
  expenses=expenses.map(e=>{
    if(!ids.has(e.id))return e;
    if(e.cardExpType==='installment'){
      const nextCurrent=(e.installmentCurrent||1)+1;
      if(nextCurrent>e.installmentTotal){
        // All installments done — keep as paid
        return{...e,ccPaid:true,ccPaidDate:date,updatedAt:Date.now()};
      }
      // Advance to next installment, reset to unpaid
      return{...e,ccPaid:false,ccPaidDate:null,
        installmentCurrent:nextCurrent,
        date:nextMonthDate(e.date),updatedAt:Date.now()};
    }
    if(e.cardExpType==='recurring'){
      // Recurring: reset to unpaid (will appear in next cycle)
      return{...e,ccPaid:false,ccPaidDate:null,
        date:nextMonthDate(e.date),updatedAt:Date.now()};
    }
    // One-time: mark paid permanently
    return{...e,ccPaid:true,ccPaidDate:date,updatedAt:Date.now()};
  });

  // Persist all updated expenses
  for(const e of expenses.filter(e=>ids.has(e.id))){
    skipNextArs=fbOnline;await persistArs(e,null);
  }

  // Para los recordatorios: este resumen ya está pago
  a.lastPaid=date;saveAccounts();pushSettings();
  saveLocal();closeCCPayModal();renderAll();haptic([50,30,50]);
  const arsWallet=walletArsId?walletAccounts().find(w=>w.id===walletArsId)?.name:'';
  const summary=[
    payARS>0?`${fmt(payARS)}${arsWallet?' desde '+arsWallet:''}`:null,
    mode==='mix'&&payUSD>0?`U$D ${payUSD}`:null
  ].filter(Boolean).join(' + ');
  toast(`✅ Pago registrado · ${summary}`);
}

// Mismo día del mes siguiente; si no existe (31 → febrero), el último día de ese mes.
// Antes new Date(y,m,31) se pasaba a marzo y la cuota salteaba un mes.
function nextMonthDate(dateStr){
  const[y,m,d]=dateStr.split('-').map(Number);
  const first=new Date(y,m,1); // month is 0-indexed, m is already next month
  const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
  return`${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;
}
function openTransferModal(){
  const wallets=walletAccounts();
  if(wallets.length<2){toast('⚠️ Necesitás al menos 2 billeteras para transferir');return;}
  const opts=wallets.map(a=>`<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`).join('');
  document.getElementById('tf-from').innerHTML=opts;
  document.getElementById('tf-to').innerHTML=opts;
  // Fix: use wallets.length not accounts.length
  if(wallets.length>1)document.getElementById('tf-to').selectedIndex=1;
  document.getElementById('tf-amt').value='';
  document.getElementById('tf-desc').value='';
  document.getElementById('tf-date').value=todayStr();
  document.getElementById('transfer-overlay').classList.add('on');history.pushState({modal:true},'');
  setTimeout(()=>document.getElementById('tf-amt').focus(),200);
}
function closeTransferModal(){document.getElementById('transfer-overlay').classList.remove('on');}
function transferOverlayClick(ev){if(ev.target===document.getElementById('transfer-overlay'))closeTransferModal();}
function saveTransfer(){
  const fromId=document.getElementById('tf-from').value;
  const toId=document.getElementById('tf-to').value;
  const amt=parseFloat(document.getElementById('tf-amt').value);
  const date=document.getElementById('tf-date').value;
  const desc=document.getElementById('tf-desc').value.trim();
  if(fromId===toId){toast('⚠️ Elegí billeteras distintas');return;}
  if(!amt||amt<=0){toast('⚠️ Ingresá el monto');return;}
  if(!date){toast('⚠️ Completá la fecha');return;}
  const fromAcc=accounts.find(a=>a.id===fromId);
  const toAcc=accounts.find(a=>a.id===toId);
  showConf('transfer','Confirmar transferencia',
    `${fromAcc?.emoji||''} ${fromAcc?.name||''} → ${toAcc?.emoji||''} ${toAcc?.name||''}\nMonto: ${fmt(amt)}`,
    ()=>{
      transfers.push({id:'tf_'+newId(),fromId,toId,amount:amt,date,
        description:desc||'Transferencia',createdAt:Date.now()});
      saveAccounts();pushSettings();
      closeTransferModal();renderCuentasTab();haptic();
      toast(`✅ ${fromAcc?.name} → ${toAcc?.name} · ${fmt(amt)}`);
    },'Confirmar');
}
function deleteTransfer(id,ev){
  ev?.stopPropagation?.();const t=transfers.find(x=>x.id===id);
  pendingDel={type:'transfer',id};
  document.getElementById('conf-txt').textContent=t?`¿Eliminar transferencia "${t.description}"?\nEsta acción no se puede deshacer.`:'Esta acción no se puede deshacer.';
  openDeleteConf();
}

