// Pestañas, aviso, migración, teclado, tema, CSV, recurrentes, gráficos, búsqueda, deslizar
// --- "+" (agregar) ---
function openNewSheet(){document.getElementById('new-overlay').classList.add('on');history.pushState({modal:true},'');}
function closeNewSheet(){document.getElementById('new-overlay').classList.remove('on');}

// --- TAB SWITCH ---
function switchTab(t){
  activeTab=t;
  // data-tab puede tener varias secciones: "Cuentas" queda marcada también en USD
  document.querySelectorAll('.tab[data-tab],.bnav-item[data-tab]').forEach(b=>{
    b.classList.toggle('on',b.dataset.tab.split(' ').includes(t));
  });
  ['dashboard','lista','usd','saldos','cuentas'].forEach(s=>{
    const el=document.getElementById('tab-'+s);if(el)el.classList.toggle('on',s===t);
  });
  window.scrollTo(0,0);
  if(t==='lista')renderListSec();
  if(t==='dashboard')renderDashboard();
  if(t==='usd')renderUsdTab();
  if(t==='saldos')renderSaldosTab();
  if(t==='cuentas'){loadAccounts();renderCuentasTab();}
}

// --- TOAST ---
let toastTimer;
function toast(msg,ms=2500){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),ms);}

// --- MIGRATION ---
async function checkMigration(){
  if(!db||!currentUID)return;
  try{
    const snap=await db.ref('gastos').once('value');
    const snapUsd=await db.ref('usd').once('value');
    if(snap.val()||snapUsd.val())document.getElementById('mig-banner').classList.add('on');
  }catch(e){console.warn('Migration check:',e);}
}
async function runMigration(){
  const banner=document.getElementById('mig-banner');
  banner.querySelector('.mig-title').textContent='⏳ Migrando datos…';
  banner.querySelector('.mig-btns').style.display='none';
  try{
    let ma=0,mu=0;
    const sA=await db.ref('gastos').once('value');const aD=sA.val();
    if(aD){for(const e of Object.values(aD).filter(e=>e&&e.id)){await db.ref(arsPath(e.id)).set(e);ma++;}await db.ref('gastos').remove();}
    const sU=await db.ref('usd').once('value');const uD=sU.val();
    if(uD){for(const t of Object.values(uD).filter(t=>t&&t.id)){await db.ref(usdPath(t.id)).set(t);mu++;}await db.ref('usd').remove();}
    banner.classList.remove('on');toast(`✅ Migración: ${ma} gastos + ${mu} USD importados`,4000);
  }catch(e){console.error('Migration error:',e);banner.querySelector('.mig-title').textContent='⚠️ Error en la migración';banner.querySelector('.mig-btns').style.display='flex';toast('❌ Error al migrar');}
}
function dismissMigration(){document.getElementById('mig-banner').classList.remove('on');}

// --- KEYBOARD ---
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeNewSheet();closeModal();closeUsdModal();closeDebtModal();closeSettleModal();closeConf();closeCatManager();closeContactsModal();closeAddContactModal();closeGlobalSearch();closeQuickAdd();closeTransferModal();closeAccountModal();closeGoalModal();closeBudgetModal();closeCCPayModal();closeProfilePanel();closeHelpModal();closeAdjustModal();}
  if(e.key==='Enter'&&(document.activeElement.id==='login-email'||document.activeElement.id==='login-pass'))loginEmail();
});

// --- THEME TOGGLE ---
function toggleTheme(){
  const light=document.body.classList.toggle('light');
  document.getElementById('btn-theme').textContent=light?'☀️':'🌙';
  localStorage.setItem('gp_theme',light?'light':'dark');
  syncThemeColor();
  // los gráficos toman los colores del tema al dibujarse
  if(currentUID)renderAll();
}
function loadTheme(){
  const t=localStorage.getItem('gp_theme');
  if(t==='light'){document.body.classList.add('light');document.getElementById('btn-theme').textContent='☀️';}
  syncThemeColor();
}
// Barra del sistema del color del fondo
function syncThemeColor(){const m=document.getElementById('theme-color-meta');if(m)m.setAttribute('content',tok('bg'));}

// --- MAGIC LINK ---
async function sendMagicLink(){
  const email=document.getElementById('login-email').value.trim();
  if(!email){document.getElementById('login-err').textContent='Escribí tu email primero.';return;}
  try{
    const url=window.location.href;
    await auth.sendSignInLinkToEmail(email,{url,handleCodeInApp:true});
    localStorage.setItem('gp_magic_email',email);
    document.getElementById('magic-link-sent').style.display='block';
    document.getElementById('login-err').textContent='';
  }catch(e){document.getElementById('login-err').textContent=e.message;}
}
function checkMagicLink(){
  if(!auth||!firebase.auth().isSignInWithEmailLink(window.location.href))return;
  let email=localStorage.getItem('gp_magic_email');
  if(!email)email=prompt('Confirma tu email:');
  if(email){
    auth.signInWithEmailLink(email,window.location.href)
      .then(()=>{localStorage.removeItem('gp_magic_email');window.history.replaceState({},'',window.location.pathname);})
      .catch(e=>console.warn('Magic link error:',e));
  }
}

// --- EXPORT CSV ---
function exportCSV(){
  const mk=document.getElementById('fil-month')?.value||nowKey();
  const rows=expenses.filter(e=>monthKey(e.date)===mk);
  if(!rows.length){toast('⚠️ No hay gastos para exportar');return;}
  const headers=['Fecha','Tipo','Categoría','Descripción','Notas','Monto Total','Mi Parte','Compartido','Recurrente'];
  const lines=[headers.join(',')];
  rows.sort((a,b)=>(a.date||'').localeCompare(b.date||'')).forEach(e=>{
    const splitNames=e.splits?e.splits.map(s=>s.personName).join('+'):'';
    lines.push([
      e.date, e.type, e.category,
      `"${(e.description||'').replace(/"/g,'""')}"`,
      `"${(e.notes||'').replace(/"/g,'""')}"`,
      e.amount, effAmt(e),
      splitNames, e.recurring?'Sí':'No'
    ].join(','));
  });
  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`gastos_${mk}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast('📥 CSV descargado');
}

// --- RECURRING REMINDERS ---
// Track which recurring items were skipped this month
const SKIP_SK='gp_skipped_rec_v1';
function skippedRecurring(){
  const mk=nowKey();
  try{return new Set(JSON.parse(localStorage.getItem(lsKey(SKIP_SK+mk)))||[]);}catch{return new Set();}
}
function skipRecurring(templateId){
  const mk=nowKey();
  const set=skippedRecurring();set.add(templateId);
  localStorage.setItem(lsKey(SKIP_SK+mk),JSON.stringify([...set]));
  renderRecurringReminders();
  toast('⏭ Saltado este mes');
}

function renderRecurringReminders(){
  const mk=nowKey();
  const prevMk=getPrevMonth(mk);
  const skipped=skippedRecurring();

  // All recurring templates from last month
  const templates=expenses.filter(e=>e.recurring&&monthKey(e.date)===prevMk&&!skipped.has(e.id));
  const thisMonthDescs=new Set(expenses.filter(e=>monthKey(e.date)===mk).map(e=>e.description));
  const missing=templates.filter(e=>!thisMonthDescs.has(e.description));

  // Also include CC fijos from any CC card that are due this month (ccPaid=false, recurring)
  const ccFijos=expenses.filter(e=>
    e.cardExpType==='recurring' &&
    !e.ccPaid &&
    !skipped.has(e.id) &&
    monthKey(e.date)===mk
  );

  const el=document.getElementById('recurring-reminders');
  if(!missing.length&&!ccFijos.length){el.innerHTML='';return;}

  // Separate CC vs wallet recurring
  const walletMissing=missing.filter(e=>!accounts.find(a=>a.id===e.accountId&&a.type==='credit'));
  const ccMissing=missing.filter(e=>!!accounts.find(a=>a.id===e.accountId&&a.type==='credit'));

  let html='';

  // --- Wallet recurring ---
  if(walletMissing.length){
    html+=`<div style="background:color-mix(in srgb,var(--acc) 8%,transparent);border:1px solid color-mix(in srgb,var(--acc) 20%,transparent);border-radius:14px;padding:14px 16px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:10px">🔁 Movimientos recurrentes pendientes</div>
      ${walletMissing.map(e=>recurringItemHTML(e)).join('')}
    </div>`;
  }

  // --- CC fijos ---
  const allCCItems=[...ccMissing,...ccFijos];
  if(allCCItems.length){
    // Group by card
    const byCard={};
    allCCItems.forEach(e=>{
      const cardId=e.accountId||'_';
      if(!byCard[cardId])byCard[cardId]=[];
      byCard[cardId].push(e);
    });
    html+=`<div style="background:color-mix(in srgb,var(--tint) 8%,transparent);border:1px solid color-mix(in srgb,var(--tint) 20%,transparent);border-radius:14px;padding:14px 16px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:10px">💳 Fijos de tarjeta pendientes de agregar</div>`;
    Object.entries(byCard).forEach(([cardId,items])=>{
      const card=accounts.find(a=>a.id===cardId);
      if(card)html+=`<div style="font-size:11px;color:var(--txt3);margin-bottom:6px">${card.emoji} ${esc(card.name)}</div>`;
      html+=items.map(e=>recurringItemHTML(e)).join('');
    });
    html+=`</div>`;
  }

  el.innerHTML=html;
}

function recurringItemHTML(e){
  const acc=e.accountId?accounts.find(a=>a.id===e.accountId):null;
  const amtDisplay=e.currency==='USD'?`U$S ${e.amount}`:`${fmt(e.amount)}`;
  return`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${catIcon(e.category)} ${esc(e.description||e.category)}</div>
      <div style="font-size:11px;color:var(--txt3);margin-top:2px">${amtDisplay}${acc?' · '+esc(acc.name):''}</div>
    </div>
    <div style="display:flex;gap:5px;flex-shrink:0">
      <button onclick="confirmRecurring('${e.id}')"
        style="padding:6px 12px;background:color-mix(in srgb,var(--pos) 15%,transparent);border:1px solid color-mix(in srgb,var(--pos) 30%,transparent);border-radius:8px;color:var(--green);font-size:12px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif">
        ✅ Confirmar
      </button>
      <button onclick="editRecurringAmt('${e.id}')"
        style="padding:6px 10px;background:color-mix(in srgb,var(--acc) 12%,transparent);border:1px solid color-mix(in srgb,var(--acc) 30%,transparent);border-radius:8px;color:var(--p1);font-size:12px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif">
        ✏️
      </button>
      <button onclick="skipRecurring('${e.id}')"
        style="padding:6px 10px;background:var(--surf);border:1px solid var(--bdr);border-radius:8px;color:var(--txt3);font-size:12px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif">
        ⏭
      </button>
    </div>
  </div>`;
}

async function confirmRecurring(templateId){
  const tmpl=expenses.find(e=>e.id===templateId);
  if(!tmpl)return;

  // CC fijo recurrente — el gasto original YA está en el estimado del resumen
  // Solo hay que sacarlo del banner (skip). No crear duplicado.
  if(tmpl.cardExpType==='recurring'&&tmpl.accountId){
    const acc=accounts.find(a=>a.id===tmpl.accountId);
    if(acc?.type==='credit'){
      skipRecurring(templateId);
      haptic();
      toast(`✅ ${esc(tmpl.description||tmpl.category)} — ya figura en el resumen de ${esc(acc.name)}`);
      return;
    }
  }

  // Wallet recurring — crear copia para este mes
  const today=todayStr();
  const exp={
    ...tmpl,
    id:newId(),
    date:today,
    ccPaid:false,
    // Make the copy a one-time expense so it doesn't re-appear in banner
    cardExpType:tmpl.cardExpType==='recurring'?'one':tmpl.cardExpType,
    createdAt:Date.now(),updatedAt:Date.now()
  };
  expenses.push(exp);
  haptic();renderAll();
  toast(`✅ ${esc(exp.description||exp.category)} confirmado`);
  skipNextArs=fbOnline;await persistArs(exp,null);
  renderRecurringReminders();
}

function editRecurringAmt(templateId){
  const tmpl=expenses.find(e=>e.id===templateId);
  if(!tmpl)return;
  const today=todayStr();
  // Open pre-filled modal — user can change amount, then save
  openModal({...tmpl,id:null,date:today,ccPaid:false});
  // After save, the new expense is added and won't show in reminders
  toast('✏️ Editá el monto y guardá');
}

function getPrevMonth(mk){
  const[y,m]=mk.split('-');
  const d=new Date(parseInt(y),parseInt(m)-2,1);
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function preloadRecurring(templateId){
  const tmpl=expenses.find(e=>e.id===templateId);
  if(!tmpl)return;
  openModal({...tmpl,id:null,date:todayStr()});
}

// --- MONTH COMPARISON CHART ---
// monthlyChart declared in state above
// Meses, trimestres o años (js/periods.js); la elección queda guardada en el dispositivo
function renderMonthlyChart(){
  const mode=getPeriodMode();
  const rows=periodTotals(mode,PERIOD_MODES[mode].n);
  const labels=rows.map(r=>r.label);
  const gastos=rows.map(r=>r.gastos);
  const ingresos=rows.map(r=>r.ingresos);
  const box=document.getElementById('monthly-chart-box');
  // Si no hay nada en ningún período (ni en el año), la caja no aparece
  if(gastos.every(v=>v===0)&&ingresos.every(v=>v===0)&&periodTotals('anio',1).every(r=>!r.gastos&&!r.ingresos)){box.classList.add('hidden');return;}
  box.classList.remove('hidden');
  document.getElementById('monthly-chart-title').textContent=PERIOD_MODES[mode].title;
  document.querySelectorAll('#period-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
  const avgGasto=Math.round(gastos.slice(0,-1).filter(v=>v>0).reduce((s,v)=>s+v,0)/Math.max(1,gastos.slice(0,-1).filter(v=>v>0).length));
  document.getElementById('monthly-chart-sub').textContent=avgGasto>0?`· promedio ${fmt(avgGasto)}`:'';
  renderPeriodCompare(rows,mode);
  const ctx=document.getElementById('monthly-chart').getContext('2d');
  if(monthlyChart){monthlyChart.destroy();monthlyChart=null;}
  monthlyChart=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[
      {label:'Ingresos',data:ingresos,backgroundColor:tokA('pos',.35),borderColor:tokA('pos',.9),borderWidth:1.5,borderRadius:6},
      {label:'Gastos',data:gastos,backgroundColor:tokA('txt3',.35),borderColor:tokA('txt3',.8),borderWidth:1.5,borderRadius:6}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{color:chartTextColor(),font:{family:'Outfit',size:11},boxWidth:11,boxHeight:11}},
        tooltip:{bodyFont:{family:'Outfit',size:12},backgroundColor:chartBgColor(),borderColor:tok('bdr2'),borderWidth:1,padding:10,cornerRadius:10,callbacks:{label:c=>`  ${fmt(c.raw)}`}}},
      scales:{x:{grid:{display:false},ticks:{color:chartTextColor(),font:{family:'Outfit',size:11}}},
        y:{grid:{color:chartGridColor()},ticks:{color:chartTextColor(),font:{family:'Outfit',size:11},callback:v=>v>=1e6?'$'+(Math.round(v/1e5)/10)+'M':v>=1000?'$'+Math.round(v/1000)+'k':fmt(v)}}}}
  });
}

// --- PROJECTION CARD ---
function renderProjection(){
  const mk=getDashMk();
  const cur=nowKey();
  if(mk!==cur){document.getElementById('proj-card').style.display='none';return;}
  const today=new Date();
  const dayOfMonth=today.getDate();
  const daysInMonth=new Date(today.getFullYear(),today.getMonth()+1,0).getDate();
  if(dayOfMonth<3){document.getElementById('proj-card').style.display='none';return;}
  const spentSoFar=expenses.filter(e=>monthKey(e.date)===mk&&e.type==='Egreso'&&countsInMonth(e)).reduce((s,e)=>s+effArs(e),0);
  const dailyRate=spentSoFar/dayOfMonth;
  const projected=Math.round(dailyRate*daysInMonth);
  const ing=expenses.filter(e=>monthKey(e.date)===mk&&e.type==='Ingreso'&&countsInMonth(e)).reduce((s,e)=>s+amtArs(e),0);
  const projCard=document.getElementById('proj-card');
  const projVal=document.getElementById('c-proj');
  const projHint=document.getElementById('c-proj-hint');
  projCard.style.display='';
  projVal.textContent=fmt(projected);
  projVal.className=projected>ing&&ing>0?'neg':'';
  const remaining=Math.round(dailyRate*(daysInMonth-dayOfMonth));
  projHint.textContent=`~${fmt(remaining)} más hasta fin de mes`;
}

// --- OLD DEBT NOTIFICATIONS ---
function oldDebtAlerts(){
  const thirtyDaysAgo=new Date();thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);
  return debts.filter(d=>{
    if(d.settled)return false;
    if(!d.date)return false;
    return new Date(d.date)<thirtyDaysAgo;
  });
}

// --- GLOBAL SEARCH ---
function openGlobalSearch(){
  document.getElementById('gsearch-overlay').classList.add('on');history.pushState({modal:true},'');
  document.getElementById('gsearch-inp').value='';
  document.getElementById('gsearch-results').innerHTML='<div class="empty" style="padding:24px 0"><div class="empty-ico">🔍</div><p>Escribí para buscar en todo</p></div>';
  setTimeout(()=>document.getElementById('gsearch-inp').focus(),200);
}
// Movimientos sin billetera (de todos los meses): tocar uno abre la edición para elegirla
function openUnassigned(ev){
  ev?.stopPropagation();
  const rows=expenses.filter(e=>!e.accountId).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  document.getElementById('gsearch-overlay').classList.add('on');history.pushState({modal:true},'');
  document.getElementById('gsearch-inp').value='';
  document.getElementById('gsearch-results').innerHTML=rows.length
    ?`<div class="div-lbl" style="margin-top:0">Sin billetera (${rows.length})</div>
      <div style="font-size:12px;color:var(--txt3);margin-bottom:10px">No suman ni restan en ningún saldo. Tocá uno y elegí la billetera.</div>
      <div id="unassigned-list">${rows.map(e=>expHTML(e,false)).join('')}</div>`
    :'<div class="empty" style="padding:24px 0"><div class="empty-ico">✅</div><p>Todos los movimientos tienen billetera</p></div>';
  // En captura: editExp frena la propagación y la lista taparía el formulario
  document.getElementById('unassigned-list')?.addEventListener('click',closeGlobalSearch,{capture:true});
}
function closeGlobalSearch(){document.getElementById('gsearch-overlay').classList.remove('on');}
function gsearchOverlayClick(ev){if(ev.target===document.getElementById('gsearch-overlay'))closeGlobalSearch();}

function runGlobalSearch(){
  const q=(document.getElementById('gsearch-inp').value||'').toLowerCase().trim();
  const el=document.getElementById('gsearch-results');
  if(q.length<2){el.innerHTML='<div style="color:var(--txt3);font-size:12px;text-align:center;padding:16px">Escribí al menos 2 caracteres</div>';return;}

  const matchExp=expenses.filter(e=>(e.description||'').toLowerCase().includes(q)||(e.category||'').toLowerCase().includes(q)||(e.notes||'').toLowerCase().includes(q));
  const matchUsd=usdTx.filter(t=>(t.description||'').toLowerCase().includes(q));
  const matchDebt=debts.filter(d=>!d.settled&&((d.description||'').toLowerCase().includes(q)||(d.personName||'').toLowerCase().includes(q)));

  if(!matchExp.length&&!matchUsd.length&&!matchDebt.length){
    el.innerHTML='<div class="empty" style="padding:24px 0"><div class="empty-ico">🔍</div><p>Sin resultados para "'+esc(q)+'"</p></div>';
    return;
  }

  let html='';
  if(matchExp.length){
    html+=`<div class="div-lbl" style="margin-top:0">Gastos (${matchExp.length})</div>`;
    html+=matchExp.slice(0,8).map(e=>expHTML(e,false)).join('');
  }
  if(matchUsd.length){
    html+=`<div class="div-lbl">USD (${matchUsd.length})</div>`;
    html+=matchUsd.slice(0,5).map(t=>usdTxHTML(t)).join('');
  }
  if(matchDebt.length){
    html+=`<div class="div-lbl">Deudas (${matchDebt.length})</div>`;
    matchDebt.slice(0,5).forEach(d=>{
      const p=personById(d.personId);
      html+=`<div class="exp-item"><div class="exp-ico teal-bg">🤝</div><div class="exp-info"><div class="exp-desc">${esc(d.description)}</div><div class="exp-meta"><span>${fmtDate(d.date)}</span>·<span>${esc(d.personName)}</span></div></div><div class="exp-right"><div class="exp-amt ${d.amount>0?'i':'r'}">${d.amount>0?'+':'-'}${fmt(d.amount)}</div></div></div>`;
    });
  }
  el.innerHTML=html;
}

// --- SWIPE TO DELETE ---
let _swipeEl=null,_swipeStartX=0,_swipeCurX=0;
document.addEventListener('touchstart',ev=>{
  const el=ev.target.closest('.swipeable');
  if(!el)return;
  _swipeEl=el; _swipeStartX=ev.touches[0].clientX; _swipeCurX=_swipeStartX;
  el.classList.add('swiping');
},{ passive:true });
document.addEventListener('touchmove',ev=>{
  if(!_swipeEl)return;
  _swipeCurX=ev.touches[0].clientX;
  const dx=_swipeCurX-_swipeStartX;
  if(dx<0&&dx>-100){_swipeEl.style.transform=`translateX(${dx}px)`;_swipeEl.classList.toggle('revealed',dx<-55);}
},{ passive:true });
document.addEventListener('touchend',()=>{
  if(!_swipeEl)return;
  const dx=_swipeCurX-_swipeStartX;
  _swipeEl.classList.remove('swiping');
  if(dx<-70){
    const id=_swipeEl.dataset.id;
    _swipeEl.style.transform='';
    _swipeEl.classList.remove('revealed');
    if(id) delExp(id,{stopPropagation:()=>{}});
  } else {
    _swipeEl.style.transform='';
    _swipeEl.classList.remove('revealed');
  }
  _swipeEl=null;
});

