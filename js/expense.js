// Formulario de gastos: split, contactos, categorías y guardado
// --- LO PAGÓ OTRA PERSONA (3.16) ---
// El gasto no sale de ninguna billetera tuya; tu parte queda como deuda tuya con quien pagó (Saldos, "le debés").
let payerOn=false,payerMineTouched=false;
function payerOptions(sel){
  const el=document.getElementById('f-payer');
  el.innerHTML=debtPeople().map(p=>`<option value="${esc(p.id)}">${esc(p.emoji||'')} ${esc(p.name)}</option>`).join('');
  if(sel)el.value=sel;
}
function setPayerUI(on){
  payerOn=on;
  document.getElementById('payer-panel').classList.toggle('on',on);
  document.getElementById('payer-toggle-btn').classList.toggle('active',on);
  document.getElementById('payer-toggle-ico').textContent=on?'−':'＋';
  const acc=document.getElementById('f-account');
  if(acc){acc.disabled=on;if(on)acc.value='';}
  updatePayerHint();
}
function togglePayer(){
  if(!payerOn){
    if(splitPanelOpen&&splitRows.length){toast('⚠️ Elegí una: dividir con alguien o que lo pagó otra persona');return;}
    if(!debtPeople().length){toast('⚠️ Primero agregá a la persona en Contactos');return;}
    payerOptions();payerMineTouched=false;
    document.getElementById('f-payer-mine').value=document.getElementById('f-amt').value||'';
  }
  setPayerUI(!payerOn);
}
function updatePayerHint(){
  const h=document.getElementById('f-payer-hint');if(!h||!payerOn){if(h)h.textContent='';return;}
  const amt=parseFloat(document.getElementById('f-amt').value)||0,m=document.getElementById('f-payer-mine');
  if(!payerMineTouched)m.value=amt||'';
  const mine=parseFloat(m.value)||0,name=document.getElementById('f-payer').selectedOptions[0]?.textContent.trim()||'esa persona';
  h.textContent=mine>0?`No sale de tu billetera. Le debés ${fmt(mine)} a ${name}.`:'Poné cuánto te corresponde pagar a vos.';
}
// --- SPLIT PANEL ---
function toggleSplitPanel(){
  if(!splitPanelOpen&&payerOn){toast('⚠️ Elegí una: dividir con alguien o que lo pagó otra persona');return;}
  splitPanelOpen=!splitPanelOpen;
  document.getElementById('split-panel').classList.toggle('on',splitPanelOpen);
  document.getElementById('split-toggle-btn').classList.toggle('active',splitPanelOpen);
  document.getElementById('split-toggle-ico').textContent=splitPanelOpen?'−':'＋';
  if(splitPanelOpen&&splitRows.length===0){
    // Auto-add Vicky as first split
    const vicky=persons.find(p=>p.id==='person_vicky');
    if(vicky)splitRows.push({personId:vicky.id,personName:vicky.name,emoji:vicky.emoji,amount:0});
    renderSplitRows();
  }
  recalcSplit();
}

function renderSplitRows(){
  const total=parseFloat(document.getElementById('f-amt').value)||0;
  let html='';
  splitRows.forEach((row,i)=>{
    html+=`<div class="split-person-row">
      <div style="width:28px;text-align:center;font-size:18px">${row.emoji}</div>
      <div class="split-person-name">${esc(row.personName)}</div>
      <div class="split-preset-btns">
        <button class="split-preset ${row._preset==='50'?'on':''}" onclick="setSplitPreset(${i},'50')">50%</button>
        <button class="split-preset ${row._preset==='40'?'on':''}" onclick="setSplitPreset(${i},'40')">40%</button>
        <button class="split-preset ${row._preset==='60'?'on':''}" onclick="setSplitPreset(${i},'60')">60%</button>
      </div>
      <input type="number" class="split-amt-inp" value="${row.amount||''}" placeholder="$0"
        oninput="setSplitAmt(${i},this.value)" inputmode="decimal" min="0">
      <button class="btn-ico del" onclick="removeSplitRow(${i})" style="flex-shrink:0;width:28px;height:28px;font-size:12px">${ic('x')}</button>
    </div>`;
  });
  document.getElementById('split-persons-list').innerHTML=html;
  recalcSplit();
}

function setSplitPreset(i,pct){
  const total=parseFloat(document.getElementById('f-amt').value)||0;
  splitRows[i].amount=Math.round(total*(parseInt(pct)/100));
  splitRows[i]._preset=pct;
  renderSplitRows();
}
function setSplitAmt(i,val){
  splitRows[i].amount=parseFloat(val)||0;
  splitRows[i]._preset=null;
  recalcSplit();
}
function removeSplitRow(i){
  splitRows.splice(i,1);
  renderSplitRows();
  if(splitRows.length===0){
    splitPanelOpen=false;
    document.getElementById('split-panel').classList.remove('on');
    document.getElementById('split-toggle-btn').classList.remove('active');
    document.getElementById('split-toggle-ico').textContent='＋';
    document.getElementById('split-toggle-lbl').textContent='Dividir con alguien';
  }
}
function recalcSplit(){
  if(!splitPanelOpen)return;
  const total=parseFloat(document.getElementById('f-amt').value)||0;
  const theirTotal=splitRows.reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const myPart=Math.max(0,total-theirTotal);
  document.getElementById('split-my-val').textContent=fmt(myPart);
  // Update toggle label
  const names=splitRows.map(r=>r.personName).join(', ');
  document.getElementById('split-toggle-lbl').textContent=splitPanelOpen&&names?`Dividido con ${names}`:'Dividir con alguien';
}
function addSplitPerson(){
  const used=new Set(splitRows.map(r=>r.personId));
  const available=persons.filter(p=>!used.has(p.id));
  if(available.length===0){
    openAddContactModal(null,true);return;
  }
  const names=available.map((p,i)=>`${i+1}. ${p.emoji} ${p.name}`).join('\n');
  const idx=prompt(`Elegí una persona (número):\n${names}\n${available.length+1}. + Nueva persona`);
  const n=parseInt(idx);
  if(n===available.length+1){openAddContactModal(null,true);return;}
  if(n>=1&&n<=available.length){
    const p=available[n-1];
    splitRows.push({personId:p.id,personName:p.name,emoji:p.emoji,amount:0});
    renderSplitRows();
  }
}
function addDebtPersonPrompt(forSplit=false){
  // Open proper contacts flow instead of basic prompt
  openAddContactModal(null, forSplit);
}

// --- CONTACTS MANAGER ---
let _contactForSplit=false; // flag: opened from split panel

function openContactsModal(){
  renderContactsList();
  document.getElementById('contacts-overlay').classList.add('on');history.pushState({modal:true},'');
}
function closeContactsModal(){document.getElementById('contacts-overlay').classList.remove('on');}
function contactsOverlayClick(ev){if(ev.target===document.getElementById('contacts-overlay'))closeContactsModal();}

function renderContactsList(){
  const favs=persons.filter(p=>p.isRecurrent);
  const occ=persons.filter(p=>!p.isRecurrent);
  let html='';

  if(persons.length===0){
    html=`<div class="empty" style="padding:24px 0"><div class="empty-ico">${ic('users')}</div><p>No tenés contactos aún.<br>Agregá a las personas con las que solés dividir gastos.</p></div>`;
  } else {
    if(favs.length>0){
      html+=`<div class="cat-section-lbl">${ic('star')} Favoritos (${favs.length})</div>`;
      favs.forEach(p=>{ html+=contactItemHTML(p); });
    }
    if(occ.length>0){
      html+=`<div class="cat-section-lbl">${ic('users')} Ocasionales (${occ.length})</div>`;
      occ.forEach(p=>{ html+=contactItemHTML(p); });
    }
  }
  document.getElementById('contacts-body').innerHTML=html;
}

function contactItemHTML(p){
  return`<div class="cat-manager-item">
    <div style="font-size:24px;width:36px;text-align:center">${p.emoji}</div>
    <div class="cat-manager-name custom">${esc(p.name)}${p.linkedUid?` <span class="lk-chip" title="Vinculado con otra persona">${ic('link')} ${vinculosIn[p.linkedUid]?'vinculado':'esperando'}</span>`:''}</div>
    <div style="font-size:10px;padding:2px 7px;border-radius:10px;background:${p.isRecurrent?'color-mix(in srgb,var(--acc) 10%,transparent)':'color-mix(in srgb,var(--tint) 5%,transparent)'};color:${p.isRecurrent?'var(--teal)':'var(--txt3)'};border:1px solid ${p.isRecurrent?'color-mix(in srgb,var(--acc) 20%,transparent)':'var(--bdr)'};font-weight:600;flex-shrink:0">${p.isRecurrent?ic('star')+' Fav':'Ocasional'}</div>
    <div class="cat-manager-actions">
      <button class="cat-mgr-btn rename" onclick="openVincular('${p.id}')" title="Vincular con otra persona">${ic('link')}</button>
      <button class="cat-mgr-btn rename" onclick="openAddContactModal('${p.id}')" title="Editar">${ic('edit')}</button>
      <button class="cat-mgr-btn delete" onclick="confirmDeleteContact('${p.id}')" title="Eliminar">${ic('trash')}</button>
    </div>
  </div>`;
}

function confirmDeleteContact(personId){
  const p=personById(personId);
  if(!p)return;
  const hasDebts=debts.some(d=>d.personId===personId&&!d.settled);
  pendingDel={type:'contact',id:personId};
  document.getElementById('conf-txt').textContent=
    (hasDebts?`"${p.name}" tiene saldos pendientes. Las deudas siguen apareciendo en Saldos.\n`:``) +
    `¿Eliminar el contacto "${p.name}"?\nEsta acción no se puede deshacer.`;
  openDeleteConf();
}

// Add contact type to doDelete — handled below in doDelete

let _editingContactId=null;
function openAddContactModal(personId=null, forSplit=false){
  _contactForSplit=forSplit;
  _editingContactId=personId;
  const p=personId?personById(personId):null;
  document.getElementById('add-contact-title').textContent=p?'Editar contacto':'Nuevo contacto';
  document.getElementById('ac-id').value=personId||'';
  document.getElementById('ac-name').value=p?.name||'';
  document.getElementById('ac-emoji-preview').textContent=p?.emoji||'👤';
  setContactType(p?(p.isRecurrent?'recurrent':'occasional'):'recurrent');
  document.getElementById('add-contact-overlay').classList.add('on');history.pushState({modal:true},'');
  setTimeout(()=>document.getElementById('ac-name').focus(),200);
}
function closeAddContactModal(){document.getElementById('add-contact-overlay').classList.remove('on');}
function addContactOverlayClick(ev){if(ev.target===document.getElementById('add-contact-overlay'))closeAddContactModal();}

function setContactType(t){
  document.getElementById('ac-type').value=t;
  document.getElementById('ac-btn-fav').className='type-btn'+(t==='recurrent'?' ai':'');
  document.getElementById('ac-btn-occ').className='type-btn'+(t==='occasional'?' ae':'');
  document.getElementById('ac-type-hint').textContent=t==='recurrent'
    ?'Favorito: siempre visible en Saldos aunque esté en cero'
    :'Ocasional: se oculta en Saldos cuando el saldo es cero';
}

const CONTACT_EMOJIS=['👤','👨','👩','🧑','🧔','👦','👧','👴','👵','🧒','💁','🙋','🤷','🧑‍💼','🧑‍🔧','🧑‍🍳','🧑‍⚕️','👮','🧑‍🎓','🧑‍🎨'];
let _emojiPickerOpen=false;
function pickContactEmoji(){
  const grid=CONTACT_EMOJIS.map((e,i)=>`<span onclick="selectContactEmoji('${e}')" style="font-size:28px;cursor:pointer;padding:6px;border-radius:8px;display:inline-block" onmouseover="this.style.background='color-mix(in srgb,var(--tint) 10%,transparent)'" onmouseout="this.style.background=''">${e}</span>`).join('');
  const existing=document.getElementById('emoji-picker-inline');
  if(existing){existing.remove();return;}
  const div=document.createElement('div');
  div.id='emoji-picker-inline';
  div.style.cssText='background:var(--modal-bg);border:1px solid color-mix(in srgb,var(--tint) 10%,transparent);border-radius:14px;padding:10px;margin-top:8px;text-align:center;line-height:1';
  div.innerHTML=grid;
  document.getElementById('ac-emoji-preview').parentNode.insertBefore(div,document.getElementById('ac-emoji-preview').nextSibling.nextSibling);
}
function selectContactEmoji(e){
  document.getElementById('ac-emoji-preview').textContent=e;
  const picker=document.getElementById('emoji-picker-inline');
  if(picker)picker.remove();
}

function saveContact(){
  const id=document.getElementById('ac-id').value;
  const name=document.getElementById('ac-name').value.trim();
  const emoji=document.getElementById('ac-emoji-preview').textContent;
  const type=document.getElementById('ac-type').value;
  if(!name){toast('⚠️ Escribí un nombre');return;}
  if(!id&&persons.find(p=>p.name.toLowerCase()===name.toLowerCase())){toast('⚠️ Ya existe ese nombre');return;}

  const p={
    id:id||'person_'+newId(),
    name,emoji,
    isRecurrent:type==='recurrent'
  };

  if(id){const i=persons.findIndex(x=>x.id===id);if(i>-1)persons[i]=p;else persons.push(p);}
  else persons.push(p);
  saveLocal();pushSettings();

  closeAddContactModal();
  // If opened from split panel, add to split
  if(_contactForSplit&&!id){
    splitRows.push({personId:p.id,personName:p.name,emoji:p.emoji,amount:0});
    renderSplitRows();
  }
  // If contacts modal was open, refresh it
  const picker=document.getElementById('emoji-picker-inline');
  if(picker)picker.remove();
  renderContactsList();
  buildDebtPersonSelect();
  renderSaldosTab();
  toast(`✅ Contacto "${name}" ${id?'actualizado':'agregado'}`);
}

// --- MODAL GASTOS ARS ---
function onAmtOrCurrencyChange(){
  const currency=document.getElementById('f-currency').value;
  const amt=parseFloat(document.getElementById('f-amt').value)||0;
  const tcWrap=document.getElementById('f-tc-wrap');
  const wasHidden=tcWrap.style.display!=='block';
  tcWrap.style.display=currency==='USD'?'block':'none';
  if(currency==='USD'&&wasHidden)showExpenseRates();
  if(currency==='USD'){
    const tc=parseFloat(document.getElementById('f-tc').value)||0;
    if(tc>0&&amt>0){
      document.getElementById('f-ars-equiv').value=Math.round(amt*tc);
      document.getElementById('f-tc-preview').textContent=`U$D ${amt} × $${tc} = ${fmt(amt*tc)}`;
    }
  }
  recalcSplit();
}
function onEquivChange(){
  const amt=parseFloat(document.getElementById('f-amt').value)||0;
  const equiv=parseFloat(document.getElementById('f-ars-equiv').value)||0;
  if(amt>0&&equiv>0){
    const tc=equiv/amt;
    document.getElementById('f-tc').value=Math.round(tc);
    document.getElementById('f-tc-preview').textContent=`TC implícito: $${Math.round(tc)} / U$D`;
  }
}
function setCardExpType(t){
  document.getElementById('f-card-exp-type').value=t;
  // En cuotas, el monto es el de cada cuota: es lo que entra en cada resumen
  document.getElementById('f-amt-lbl').textContent=t==='installment'?'Monto de cada cuota ($)':'Monto total ($)';
  ['one','rec','inst'].forEach(x=>{
    document.getElementById('fct-'+x).className='type-btn'+(t===({'one':'one','recurring':'rec','installment':'inst'}[t]===x?t:'')?' au':'');
  });
  // simpler active state
  document.getElementById('fct-one').className='type-btn'+(t==='one'?' au':'');
  document.getElementById('fct-rec').className='type-btn'+(t==='recurring'?' au':'');
  document.getElementById('fct-inst').className='type-btn'+(t==='installment'?' au':'');
  document.getElementById('f-installment-wrap').style.display=t==='installment'?'block':'none';
  // Auto-check recurring if fijo
  if(t==='recurring')document.getElementById('f-recur').checked=true;
}
// Guardar sin billetera pide un segundo toque: ese movimiento no suma ni resta en ningún saldo
let _noAccConfirmed=false;
function onAccountSelected(){
  _noAccConfirmed=false;
  renderAccChips();
  const accId=document.getElementById('f-account').value;
  const acc=accId?accounts.find(a=>a.id===accId):null;
  const cardWrap=document.getElementById('f-card-type-wrap');
  if(acc?.type==='credit'){
    cardWrap.style.display='block';
    setCardExpType(document.getElementById('f-card-exp-type').value||'one');
  } else {
    cardWrap.style.display='none';
    document.getElementById('f-amt-lbl').textContent='Monto total ($)';
  }
}
function openModal(data=null){
  document.getElementById('m-title').textContent=data?'Editar movimiento':'Nuevo movimiento';
  document.getElementById('f-id').value=data?.id||'';
  document.getElementById('f-date').value=data?.date||todayStr();
  updateFutureHint();
  document.getElementById('f-desc').value=data?.description||'';
  document.getElementById('f-notes').value=data?.notes||'';
  document.getElementById('f-amt').value=data?.amount||'';
  document.getElementById('f-recur').checked=data?.recurring||false;
  document.getElementById('f-serie').value='';
  document.getElementById('f-serie-wrap').style.display=data?.id?'none':'';
  updateSerieHint();
  // Currency
  document.getElementById('f-currency').value=data?.currency||'ARS';
  document.getElementById('f-tc').value=data?.exchangeRate||'';
  document.getElementById('f-ars-equiv').value=data?.arsEquiv||'';
  document.getElementById('f-tc-wrap').style.display=(data?.currency==='USD')?'block':'none';
  document.getElementById('f-tc-rates').innerHTML='';
  if(data?.currency==='USD')showExpenseRates();
  // Card type
  document.getElementById('f-card-exp-type').value=data?.cardExpType||'one';
  document.getElementById('f-inst-current').value=data?.installmentCurrent||1;
  document.getElementById('f-inst-total').value=data?.installmentTotal||'';
  setType(data?.type||'Egreso');
  // Account selector — always visible
  const accSel=document.getElementById('f-account');
  const accHint=document.getElementById('f-account-hint');
  const wallets=walletAccounts();
  const cards=ccAccounts();
  let accOpts='<option value="">— Sin asignar —</option>';
  if(wallets.length){
    accOpts+='<optgroup label="Billeteras">'+wallets.map(a=>`<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`).join('')+'</optgroup>';
  }
  if(cards.length){
    accOpts+='<optgroup label="Tarjetas">'+cards.map(a=>`<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`).join('')+'</optgroup>';
  }
  accSel.innerHTML=accOpts;
  // Smart default: use existing accountId, or only wallet if there's just one, or last used
  const lastUsed=localStorage.getItem(lsKey('gp_last_acc'))||'';
  const defaultAcc = data?.accountId
    || (wallets.length===1 ? wallets[0].id : (lastUsed||''));
  accSel.value=defaultAcc;
  accHint.style.display=(accounts&&accounts.length)?'none':'block';
  onAccountSelected(); // show/hide card type section
  buildCatSelect(data?.category||null);
  // Restore split state
  splitRows=data?.splits?data.splits.map(s=>({...s})):[];
  splitPanelOpen=splitRows.length>0;
  // "Más opciones" se abre solo si el movimiento ya usa algo de adentro
  document.getElementById('f-more').open=!!(data?.notes||data?.recurring||splitPanelOpen);
  document.getElementById('split-panel').classList.toggle('on',splitPanelOpen);
  document.getElementById('split-toggle-btn').classList.toggle('active',splitPanelOpen);
  document.getElementById('split-toggle-ico').textContent=splitPanelOpen?'−':'＋';
  if(splitPanelOpen)renderSplitRows();
  recalcSplit();
  // Lo pagó otra persona
  payerMineTouched=!!data?.pagoPor;
  if(data?.pagoPor){payerOptions(data.pagoPor.personId);document.getElementById('f-payer-mine').value=data.myAmount??data.amount;}
  setPayerUI(!!data?.pagoPor);
  if(data?.pagoPor)document.getElementById('f-more').open=true;
  document.getElementById('m-overlay').classList.add('on');history.pushState({modal:true},'');
  setTimeout(()=>document.getElementById('f-amt').focus(),200);
}
// Monto con puntos de miles debajo del campo: "20990" se lee peor que "20.990"
function updateAmtFmt(){
  const el=document.getElementById('f-amt-fmt');if(!el)return;
  const v=parseFloat(document.getElementById('f-amt').value)||0;
  el.textContent=v>=10000?v.toLocaleString('es-AR',{maximumFractionDigits:2}):'';
}
// Con fecha futura el movimiento queda programado: no toca el saldo hasta ese día
function updateFutureHint(){
  const el=document.getElementById('f-future-hint');if(!el)return;
  const d=document.getElementById('f-date').value;
  el.textContent=d&&d>todayStr()?`Programado para el ${fmtDate(d)}: no resta de tu saldo hasta ese día.`:'';
  updateSerieHint();
}
// Repetir mes a mes: cuántos movimientos se cargan y hasta cuándo
function fechaLarga(s){return s.split('-').reverse().join('/');}
function serieCount(){return Math.max(1,Math.min(36,parseInt(document.getElementById('f-serie')?.value)||1));}
function updateSerieHint(){
  const el=document.getElementById('f-serie-hint');if(!el)return;
  const n=serieCount(),d=document.getElementById('f-date').value,a=parseFloat(document.getElementById('f-amt').value)||0;
  el.textContent=n>1&&d?`Se cargan ${n} movimientos, del ${fechaLarga(d)} al ${fechaLarga(dateAddMonths(d,n-1))}${a?` (${fmt(a*n)} en total)`:''}. Los de fecha futura quedan programados.`:'';
}
function closeModal(){document.getElementById('m-overlay').classList.remove('on');splitRows=[];splitPanelOpen=false;setPayerUI(false);backToUnassigned();}
function overlayClick(ev){if(ev.target===document.getElementById('m-overlay'))closeModal();}
function setType(t){
  document.getElementById('f-type').value=t;
  document.getElementById('btn-eg').className='type-btn'+(t==='Egreso'?' ae':'');
  document.getElementById('btn-in').className='type-btn'+(t==='Ingreso'?' ai':'');
  buildCatSelect(null);
}
function buildCatSelect(selectedCat){
  // Hidden select — still used internally for value
  const visible=cats.filter(c=>!hiddenCats.has(c)&&catVisibleForCurrentType(c));
  // Set the search input display text to selected cat (if any)
  const searchEl=document.getElementById('f-cat-search');
  const hiddenEl=document.getElementById('f-cat');
  if(selectedCat&&visible.includes(selectedCat)){
    if(searchEl)searchEl.value=catIcon(selectedCat)+' '+displayName(selectedCat);
    if(hiddenEl)hiddenEl.value=selectedCat;
  } else {
    if(searchEl)searchEl.value='';
    if(hiddenEl)hiddenEl.value='';
  }
  renderCatChips();
  if(searchEl&&document.getElementById('f-cat-chips')?.querySelector('.chip.on'))searchEl.value='';
}

function openCatDropdown(){
  const inp=document.getElementById('f-cat-search');
  const dd=document.getElementById('cat-dropdown');
  if(inp&&dd){
    const rect=inp.getBoundingClientRect();
    dd.style.top=(rect.bottom+4)+'px';
    dd.style.left=rect.left+'px';
    dd.style.width=rect.width+'px';
  }
  renderCatDropdown('');
}

function filterCatDropdown(){
  const q=document.getElementById('f-cat-search').value.toLowerCase().trim();
  renderCatDropdown(q);
}

function renderCatDropdown(q){
  const dd=document.getElementById('cat-dropdown');
  if(!dd)return;
  const visible=cats.filter(c=>!hiddenCats.has(c)&&catVisibleForCurrentType(c));
  const filtered=q
    ? visible.filter(c=>
        displayName(c).toLowerCase().includes(q)||
        c.toLowerCase().includes(q)||
        catIcon(c).includes(q))
    : visible;

  if(!filtered.length){
    dd.innerHTML=`<div class="cat-drop-empty">Sin resultados — tocá ＋ para crear "${q}"</div>`;
  } else {
    dd.innerHTML=filtered.map(c=>`
      <div class="cat-drop-item" onclick="selectCat(${jsArg(c)})">
        <span class="cat-drop-ico">${catIcon(c)}</span>
        <span>${esc(displayName(c))}</span>
      </div>`).join('');
  }
  dd.style.display='block';

  // Close on outside click
  setTimeout(()=>{
    const close=ev=>{
      if(!ev.target.closest('#cat-dropdown')&&ev.target.id!=='f-cat-search'){
        dd.style.display='none';
        document.removeEventListener('click',close);
      }
    };
    document.addEventListener('click',close);
  },100);
}

function selectCat(cat){
  const searchEl=document.getElementById('f-cat-search');
  const hiddenEl=document.getElementById('f-cat');
  if(searchEl)searchEl.value=catIcon(cat)+' '+displayName(cat);
  if(hiddenEl)hiddenEl.value=cat;
  const dd=document.getElementById('cat-dropdown');
  if(dd)dd.style.display='none';
  renderCatChips();
  // con la categoría en un botón, el buscador queda limpio para buscar otra
  if(searchEl&&document.getElementById('f-cat-chips')?.querySelector('.chip.on'))searchEl.value='';
}
function addCatPrompt(){
  const name=prompt('Nombre de la nueva categoría:');if(!name?.trim())return;
  const t=name.trim();if(cats.includes(t)){toast('⚠️ Ya existe');return;}
  const type=(document.getElementById('f-type')?.value||'Egreso')==='Ingreso'?'ingreso':'egreso';
  cats.push(t);setCatType(t,type);saveLocal();pushSettings();buildCatSelect(t);document.getElementById('f-cat').value=t;toast(`✅ Categoría "${t}" creada como ${type==='ingreso'?'ingreso':'egreso'}`);
}
function openCatManager(){renderCatManager();document.getElementById('cat-overlay').classList.add('on');history.pushState({modal:true},'');}
function closeCatManager(){document.getElementById('cat-overlay').classList.remove('on');}
function catOverlayClick(ev){if(ev.target===document.getElementById('cat-overlay'))closeCatManager();}
function renderCatManager(){
  catTypes=normalizeCatTypes(catTypes);
  const byType=type=>cats.filter(c=>catTypeFor(c)===type);
  const row=(c)=>{
    const isHidden=hiddenCats.has(c);
    const isDefault=DEF_CATS.includes(c)||DEF_ING_CATS.includes(c);
    const renamed=renamedCats[c];
    const moveTo=catTypeFor(c)==='ingreso'?'egreso':'ingreso';
    return`<div class="cat-manager-item" style="${isHidden?'opacity:.5':''}">
      <div class="cat-manager-ico">${catIcon(c)}</div>
      <div class="cat-manager-name ${isDefault?'default':'custom'}" title="${renamed?`Original: ${esc(c)}`:''}">
        ${esc(displayName(c))}${isHidden?`<span style="font-size:9px;color:var(--txt3);margin-left:6px">oculta</span>`:''}
      </div>
      <span class="cat-manager-badge">${catTypeFor(c)==='ingreso'?'Ingreso':'Egreso'}</span>
      <div class="cat-manager-actions">
        <button class="cat-mgr-btn ico" onclick="editCatIcon(${jsArg(c)})" title="Cambiar ícono">${ic('palette')}</button>
        <button class="cat-mgr-btn rename" onclick="${isDefault&&DEF_CATS.includes(c)?`renameDefCat(${jsArg(c)})`:`renameCat(${jsArg(c)})`}" title="Renombrar">${ic('edit')}</button>
        <button class="cat-mgr-btn" onclick="toggleCatType(${jsArg(c)})" title="Mover a ${moveTo==='ingreso'?'Ingreso':'Egreso'}" style="font-size:12px">${ic(moveTo==='ingreso'?'download':'upload')}</button>
        <button class="cat-mgr-btn" onclick="toggleHideCat(${jsArg(c)})" title="${isHidden?'Mostrar':'Ocultar'}" style="font-size:12px">${isHidden?ic('plus'):ic('eye')}</button>
        ${isDefault?'':`<button class="cat-mgr-btn delete" onclick="confirmDeleteCat(${jsArg(c)})" title="Eliminar">${ic('trash')}</button>`}
      </div>
    </div>`;
  };
  const egresoCats=byType('egreso');
  const ingresoCats=byType('ingreso');
  let html=`<div class="cat-section-lbl">${ic('upload')} Categorías de egreso (${egresoCats.length})</div><div class="cat-manager-list">`;
  html+=egresoCats.length?egresoCats.map(row).join(''):`<div class="empty" style="padding:14px 0"><p>Sin categorías de egreso</p></div>`;
  html+=`</div><button class="btn-save" onclick="addCatTyped('egreso')" style="margin:0 0 10px;padding:11px;font-size:13px">＋ Agregar egreso</button>`;
  html+=`<div class="cat-section-lbl">${ic('download')} Categorías de ingreso (${ingresoCats.length})</div><div class="cat-manager-list">`;
  html+=ingresoCats.length?ingresoCats.map(row).join(''):`<div class="empty" style="padding:14px 0"><p>Sin categorías de ingreso</p></div>`;
  html+=`</div><button class="btn-save" onclick="addCatTyped('ingreso')" style="margin:0;padding:11px;font-size:13px;background:var(--pos)">＋ Agregar ingreso</button>`;
  document.getElementById('cat-manager-body').innerHTML=html;
}
function addCatTyped(type='egreso'){
  const name=prompt(`Nueva categoría de ${type==='ingreso'?'ingreso':'egreso'}:`);
  if(!name?.trim())return;
  const t=name.trim();if(cats.includes(t)){toast('⚠️ Ya existe');return;}
  cats.push(t);setCatType(t,type);saveLocal();pushSettings();renderCatManager();buildCatSelect(t);toast(`✅ Categoría "${t}" creada`);
}
function toggleCatType(cat){
  const next=catTypeFor(cat)==='ingreso'?'egreso':'ingreso';
  setCatType(cat,next);saveLocal();pushSettings();renderCatManager();buildCatSelect(null);
  toast(`✅ "${displayName(cat)}" ahora es ${next==='ingreso'?'Ingreso':'Egreso'}`);
}
function renameCat(oldName){
  const newName=prompt(`Renombrar "${oldName}" a:`,oldName);if(!newName?.trim()||newName.trim()===oldName)return;
  const t=newName.trim();if(cats.includes(t)){toast('⚠️ Ya existe');return;}
  const idx=cats.indexOf(oldName);if(idx>-1)cats[idx]=t;
  catTypes[t]=catTypeFor(oldName);delete catTypes[oldName];
  expenses=expenses.map(e=>e.category===oldName?{...e,category:t}:e);
  saveLocal();pushSettings();expenses.filter(e=>e.category===t).forEach(e=>{skipNextArs=fbOnline;persistArs(e,null);});
  buildCatSelect(t);renderCatManager();renderAll();toast(`✅ "${oldName}" → "${t}"`);
}

function renameDefCat(originalName){
  const current=renamedCats[originalName]||originalName;
  const newLabel=prompt(`Renombrar "${current}" a:`,current);
  if(!newLabel?.trim()||newLabel.trim()===current)return;
  renamedCats[originalName]=newLabel.trim();
  saveLocal();pushSettings();buildCatSelect(null);renderCatManager();
  renderAll(); // update existing expenses, charts, filters
  toast(`✅ Listo — ahora se llama "${newLabel.trim()}" en todos lados`);
}

function toggleHideCat(cat){
  if(hiddenCats.has(cat)){
    hiddenCats.delete(cat);
    toast(`👁 "${displayName(cat)}" visible`);
  } else {
    hiddenCats.add(cat);
    toast(`🙈 "${displayName(cat)}" oculta`);
  }
  saveLocal();pushSettings();buildCatSelect(null);renderCatManager();
}

// --- SAVE EXPENSE  (with split logic) ---
async function saveExpense(){
  const id=document.getElementById('f-id').value;
  const type=document.getElementById('f-type').value;
  const date=document.getElementById('f-date').value;
  const cat=document.getElementById('f-cat').value;
  const desc=document.getElementById('f-desc').value.trim();
  const notes=document.getElementById('f-notes').value.trim();
  const amt=parseFloat(document.getElementById('f-amt').value);
  const recurring=document.getElementById('f-recur').checked;
  const accountId=payerOn?null:(document.getElementById('f-account')?.value||null);
  if(accountId&&currentUID) localStorage.setItem(lsKey('gp_last_acc'), accountId);
  const currency=document.getElementById('f-currency')?.value||'ARS';
  const exchangeRate=currency==='USD'?(parseFloat(document.getElementById('f-tc').value)||null):null;
  const arsEquiv=currency==='USD'?(parseFloat(document.getElementById('f-ars-equiv').value)||null):null;
  const cardExpType=document.getElementById('f-card-exp-type')?.value||'one';
  const installmentCurrent=parseInt(document.getElementById('f-inst-current')?.value)||1;
  const installmentTotal=parseInt(document.getElementById('f-inst-total')?.value)||null;
  const acc=accountId?accounts.find(a=>a.id===accountId):null;
  if(!date){toast('⚠️ Completá la fecha');return;}
  if(!amt||amt<=0||isNaN(amt)){toast('⚠️ Ingresá un monto válido');return;}
  const serieN=id?1:serieCount();
  if(serieN>1&&acc?.type==='credit'){toast('⚠️ Con tarjeta usá "Cuotas" arriba, no repetir meses');return;}
  if(serieN>1&&splitPanelOpen&&splitRows.length){toast('⚠️ No se puede repetir un gasto dividido con otras personas');return;}
  const payerSel=payerOn&&type==='Egreso'?debtPeople().find(p=>p.id===document.getElementById('f-payer').value):null;
  const payerMine=payerSel?(parseFloat(document.getElementById('f-payer-mine').value)||0):0;
  if(payerOn&&type!=='Egreso'){toast('⚠️ «Lo pagó otra persona» es solo para gastos');return;}
  if(payerOn&&(!payerSel||payerMine<=0||payerMine>amt)){toast('⚠️ Elegí quién pagó y tu parte (hasta el total)');return;}
  if(payerOn&&serieN>1){toast('⚠️ No se puede repetir meses con «Lo pagó otra persona»');return;}
  if(!accountId&&!payerSel&&walletAccounts().length&&!_noAccConfirmed){
    _noAccConfirmed=true;
    document.getElementById('f-account').focus();
    toast('⚠️ Sin billetera, no cuenta en ningún saldo. Elegí una o tocá Guardar de nuevo.',5000);
    return;
  }

  // Calculate my amount from split
  const splits=splitPanelOpen&&splitRows.length>0?splitRows.map(r=>({personId:r.personId,personName:r.personName,emoji:r.emoji,amount:parseFloat(r.amount)||0})):[];
  const theirTotal=splits.reduce((s,r)=>s+r.amount,0);
  const myAmount=payerSel?payerMine:(splitPanelOpen&&splits.length>0?Math.max(0,amt-theirTotal):amt);

  const prev=id?expenses.find(e=>e.id===id):null;
  // Editar un gasto de tarjeta ya pagado no lo vuelve a poner en el próximo resumen
  const keepPaid=!!(prev&&prev.ccPaid===true&&prev.accountId===accountId);
  const exp={
    id:id||newId(),type,date,category:cat,
    description:desc||cat,notes:notes||null,amount:amt,myAmount,
    splits:splits.length>0?splits:null,
    recurring:serieN>1?false:(recurring||false),
    accountId:accountId||null,
    currency:currency||'ARS',
    exchangeRate,arsEquiv,
    cardExpType:acc?.type==='credit'?cardExpType:'one',
    installmentCurrent:cardExpType==='installment'?installmentCurrent:null,
    installmentTotal:cardExpType==='installment'?installmentTotal:null,
    ccPaid:keepPaid,ccPaidDate:keepPaid?(prev.ccPaidDate||null):null,
    ...((prev?.sinBilletera||payerSel)&&!accountId?{sinBilletera:true}:{}),
    ...(prev?.fijoOk?{fijoOk:prev.fijoOk}:{}), // ya confirmado este mes: editar el monto no lo vuelve a pedir
    ...(payerSel?{pagoPor:{personId:payerSel.id,personName:payerSel.name}}:{}),
    shared:false,sharedPercent:100,
    createdAt:id?(expenses.find(e=>e.id===id)?.createdAt||Date.now()):Date.now(),
    updatedAt:Date.now()
  };

  // Varios meses de una vez: el primero es este y los demás llevan la fecha de cada mes
  const serie=[exp];
  if(serieN>1){
    const sid='serie_'+newId();
    exp.serieId=sid;exp.serieIdx=1;exp.serieTotal=serieN;
    for(let k=1;k<serieN;k++)serie.push({...exp,id:newId(),date:dateAddMonths(date,k),serieIdx:k+1,createdAt:Date.now(),updatedAt:Date.now()});
  }

  const gastadoAntes=type==='Egreso'?gastoDeCategoria(cat):0;
  if(id){const i=expenses.findIndex(e=>e.id===id);if(i>-1)expenses[i]=exp;else expenses.push(exp);}
  else expenses.push(...serie);

  haptic();closeModal();renderAll();
  toast(id?'✅ Gasto actualizado':serieN>1?`✅ ${serieN} movimientos cargados, hasta el ${fechaLarga(serie[serieN-1].date)}`:'✅ Gasto guardado');
  const avisoP=type==='Egreso'?avisoPresupuesto(cat,gastadoAntes):null;
  if(avisoP)setTimeout(()=>toast('⚠️ '+avisoP,5000),1200);
  for(const x of serie){skipNextArs=fbOnline;await persistArs(x,null);}

  // Deudas del split: al editar se actualizan las que ya existían (antes se creaban
  // de nuevo y la persona quedaba debiendo el doble). Las ya saldadas no se tocan.
  const linked=id?debts.filter(d=>d.linkedExpenseId===exp.id&&!d.settled):[];
  // Si lo pagó otra persona, la deuda va en negativo: es tuya con ella ("le debés")
  const wanted=payerSel?[{personId:payerSel.id,personName:payerSel.name,amount:-payerMine}]:(type==='Egreso'?splits.filter(s=>s.amount>0):[]);
  if(wanted.length||linked.length){
    for(const s of wanted){
      const old=linked.find(d=>d.personId===s.personId);
      const debt={
        id:old?.id||newId(),personId:s.personId,personName:s.personName,
        description:desc||cat,amount:s.amount, // positive = they owe me
        date,settled:false,settledDate:null,
        linkedExpenseId:exp.id,
        createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()
      };
      const i=debts.findIndex(d=>d.id===debt.id);
      if(i>-1)debts[i]=debt;else debts.push(debt);
      skipNextDebt=fbOnline;
      await persistDebt(debt,null);
      if(debt.amount>0&&(!old||old.amount!==debt.amount||old.description!==debt.description))avisarDeuda(debt,old?'cambio':'deuda');
    }
    for(const d of linked.filter(d=>!wanted.some(s=>s.personId===d.personId))){
      debts=debts.filter(x=>x.id!==d.id);
      skipNextDebt=fbOnline;
      await persistDebt(null,d.id);
      if(d.amount>0)avisarDeuda(d,'baja');
    }
    renderSaldosTab();
  }
}

