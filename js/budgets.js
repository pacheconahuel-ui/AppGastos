// Presupuestos, metas, estadísticas, carga rápida y patrimonio
// --- BUDGETS (PRESUPUESTOS) ---
const BDG_SK='gp_budgets_v1';
let budgets={};
function loadBudgets(){try{budgets=JSON.parse(localStorage.getItem(lsKey(BDG_SK)))||{};}catch{budgets={};}}
function saveBudgets(){try{localStorage.setItem(lsKey(BDG_SK),JSON.stringify(budgets));}catch(e){}}
function renderBudgetsSection(){
  const mk=getDashMk(),catData=calcByCat(mk),budgetCats=Object.keys(budgets);
  const el=document.getElementById('budgets-section');
  if(!budgetCats.length){el.innerHTML='<button class="add-row" onclick="openBudgetModal()">＋ Presupuesto por categoría</button>';renderBgCard();return;}
  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div class="div-lbl" style="margin:0;flex:1">Presupuestos</div><button onclick="openBudgetModal()" style="font-size:11px;padding:4px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--surf);color:var(--txt3);cursor:pointer;font-family:'Outfit',sans-serif;margin-left:10px">＋ Agregar</button></div>`;
  budgetCats.forEach(cat=>{
    const limit=budgets[cat],spent=catData[cat]||0,pct=Math.min(100,Math.round((spent/limit)*100));
    const cls=pct>=100?'over':pct>=80?'warn':'ok';
    html+=`<div class="budget-item"><div class="budget-header"><div class="budget-name">${icon(cat)} ${esc(cat)}</div><div class="budget-amounts">${fmt(spent)} / ${fmt(limit)} <button onclick="deleteBudget(${jsArg(cat)})" style="font-size:10px;background:none;border:none;cursor:pointer;color:var(--txt3)">${ic('x')}</button></div></div><div class="budget-bar"><div class="budget-fill ${cls}" style="width:${pct}%"></div></div><div class="budget-pct ${cls}">${pct}%${pct>=100?' · Excedido':pct>=80?' · Cerca del límite':''}</div></div>`;
  });
  el.innerHTML=html;
  renderBgCard();
}
// Tarjeta chica del resumen: las 3 categorías más cerca del tope y hasta 2 metas
let bgDetailOpen=false;
function renderBgCard(){
  const el=document.getElementById('bg-card');
  if(!el)return;
  const det=document.getElementById('bg-detail');
  const cd=calcByCat(getDashMk());
  const rows=Object.keys(budgets).map(c=>({c,pct:Math.round(((cd[c]||0)/budgets[c])*100)})).sort((a,b)=>b.pct-a.pct);
  if(!rows.length&&!goals.length){
    el.innerHTML='<div class="bg-empty"><button class="add-row" onclick="openBudgetModal()">＋ Presupuesto</button><button class="add-row" onclick="openGoalModal()">＋ Meta de ahorro</button></div>';
    if(det)det.classList.add('hidden');
    return;
  }
  const cls=p=>p>=100?'over':p>=80?'warn':'ok';
  const row=(name,pct,w)=>`<div class="bg-row"><span class="bg-name">${name}</span><span class="bg-bar"><i class="${cls(pct)}" style="width:${Math.min(100,w)}%"></i></span><span class="bg-pct ${cls(pct)}">${pct}%</span></div>`;
  const bShown=rows.slice(0,3),gShown=goals.slice(0,2);
  const more=(rows.length-bShown.length)+(goals.length-gShown.length);
  el.innerHTML=`<div class="bg-card">
    <div class="bg-head"><span>Presupuestos y metas</span><button class="sec-link" onclick="toggleBgDetail()">${bgDetailOpen?'Listo':'Editar ›'}</button></div>
    ${bShown.map(r=>row(icon(r.c)+' '+esc(r.c),r.pct,r.pct)).join('')}
    ${gShown.map(g=>{const p=Math.round((g.current/g.target)*100);return row(g.emoji+' '+esc(g.name),p,p).replace(/bg-pct (over|warn)/,'bg-pct ok').replace(/<i class="(over|warn)"/,'<i class="ok"');}).join('')}
    ${more>0&&!bgDetailOpen?`<div class="bg-more">y ${more} más · tocá Editar</div>`:''}
  </div>`;
  if(det)det.classList.toggle('hidden',!bgDetailOpen);
}
function toggleBgDetail(){bgDetailOpen=!bgDetailOpen;renderBgCard();}
function deleteBudget(cat){delete budgets[cat];saveBudgets();pushSettings();renderBudgetsSection();}
function openBudgetModal(){
  document.getElementById('bdg-cat').innerHTML=cats.filter(c=>catTypeFor(c)!=='ingreso').map(c=>`<option value="${esc(c)}">${icon(c)} ${esc(c)}${budgets[c]?' · '+fmt(budgets[c]):''}</option>`).join('');
  document.getElementById('bdg-amt').value='';
  document.getElementById('budget-overlay').classList.add('on');history.pushState({modal:true},'');
  setTimeout(()=>document.getElementById('bdg-amt').focus(),200);
}
function closeBudgetModal(){document.getElementById('budget-overlay').classList.remove('on');}
function budgetOverlayClick(ev){if(ev.target===document.getElementById('budget-overlay'))closeBudgetModal();}
function saveBudget(){
  const cat=document.getElementById('bdg-cat').value,amt=parseFloat(document.getElementById('bdg-amt').value);
  if(!cat){toast('⚠️ Elegí una categoría');return;}if(!amt||amt<=0){toast('⚠️ Ingresá un monto');return;}
  budgets[cat]=amt;saveBudgets();pushSettings();closeBudgetModal();renderBudgetsSection();haptic();toast(`✅ Presupuesto de ${fmt(amt)}/mes para ${cat}`);
}

// --- GOALS (METAS) ---
const GOAL_SK='gp_goals_v1';
const GOAL_EMOJIS=['🎯','✈️','🏠','🚗','💻','📱','🏖️','🎓','💍','🏋️','🐾','🎸','🏡','⛵','🛍️'];
let goals=[];
function loadGoals(){try{goals=JSON.parse(localStorage.getItem(lsKey(GOAL_SK)))||[];}catch{goals=[];}}
function saveGoals(){try{localStorage.setItem(lsKey(GOAL_SK),JSON.stringify(goals));}catch(e){}}
function renderGoalsSection(){
  const el=document.getElementById('goals-section');
  if(!goals.length){el.innerHTML='<button class="add-row" onclick="openGoalModal()">＋ Meta de ahorro</button>';renderBgCard();return;}
  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div class="div-lbl" style="margin:0;flex:1">Metas de ahorro</div><button onclick="openGoalModal()" style="font-size:11px;padding:4px 10px;border-radius:8px;border:1px solid var(--bdr);background:var(--surf);color:var(--txt3);cursor:pointer;font-family:'Outfit',sans-serif;margin-left:10px">＋ Nueva</button></div>`;
  goals.forEach(g=>{
    const pct=Math.min(100,Math.round((g.current/g.target)*100)),done=pct>=100,remaining=Math.max(0,g.target-g.current);
    html+=`<div class="goal-card"><div class="goal-header"><div class="goal-ava">${g.emoji}</div><div><div class="goal-name">${esc(g.name)} ${done?ic('check'):''}</div><div class="goal-target">Meta: ${fmt(g.target)}</div></div><div style="margin-left:auto;display:flex;gap:5px"><button class="btn-ico edit" onclick="openGoalModal('${g.id}')">${ic('edit')}</button><button class="btn-ico del" onclick="deleteGoal('${g.id}')">${ic('trash')}</button></div></div><div class="goal-progress"><div class="goal-bar"><div class="goal-fill ${done?'done':''}" style="width:${pct}%"></div></div><div class="goal-stats"><span>Acumulado: ${fmt(g.current)}</span><span>${done?'¡Completado!':'Faltan '+fmt(remaining)}</span><span>${pct}%</span></div></div><div class="goal-actions"><button class="btn-goal-add" onclick="addToGoal('${g.id}')">＋ Agregar ahorro</button></div></div>`;
  });
  el.innerHTML=html;
  renderBgCard();
}
let _editGoalId=null;
function openGoalModal(id=null){
  _editGoalId=id;const g=id?goals.find(x=>x.id===id):null;
  document.getElementById('goal-modal-title').textContent=g?'Editar meta':'Nueva meta';
  document.getElementById('gl-id').value=id||'';document.getElementById('gl-name').value=g?.name||'';
  document.getElementById('gl-target').value=g?.target||'';document.getElementById('gl-current').value=g?.current||0;
  document.getElementById('gl-emoji-preview').textContent=g?.emoji||'🎯';
  document.getElementById('goal-overlay').classList.add('on');history.pushState({modal:true},'');setTimeout(()=>document.getElementById('gl-name').focus(),200);
}
function closeGoalModal(){document.getElementById('goal-overlay').classList.remove('on');}
function goalOverlayClick(ev){if(ev.target===document.getElementById('goal-overlay'))closeGoalModal();}
function pickGoalEmoji(){
  const ex=document.getElementById('gl-emoji-picker');if(ex){ex.remove();return;}
  const g=GOAL_EMOJIS.map(e=>`<span onclick="document.getElementById('gl-emoji-preview').textContent='${e}';document.getElementById('gl-emoji-picker').remove()" style="font-size:28px;cursor:pointer;padding:6px;border-radius:8px;display:inline-block">${e}</span>`).join('');
  const d=document.createElement('div');d.id='gl-emoji-picker';d.style.cssText='background:var(--modal-bg);border:1px solid var(--bdr2);border-radius:14px;padding:10px;margin-top:8px;text-align:center';d.innerHTML=g;
  document.getElementById('gl-emoji-preview').parentNode.appendChild(d);
}
function saveGoal(){
  const id=document.getElementById('gl-id').value,name=document.getElementById('gl-name').value.trim();
  const target=parseFloat(document.getElementById('gl-target').value),current=parseFloat(document.getElementById('gl-current').value)||0;
  const emoji=document.getElementById('gl-emoji-preview').textContent;
  if(!name){toast('⚠️ Escribí un nombre');return;}if(!target||target<=0){toast('⚠️ Ingresá la meta');return;}
  const g={id:id||'goal_'+newId(),name,emoji,target,current,createdAt:id?goals.find(x=>x.id===id)?.createdAt||Date.now():Date.now()};
  if(id){const i=goals.findIndex(x=>x.id===id);if(i>-1)goals[i]=g;else goals.push(g);}else goals.push(g);
  saveGoals();pushSettings();closeGoalModal();renderGoalsSection();haptic();toast(`✅ Meta "${name}" ${id?'actualizada':'creada'}`);
}
function addToGoal(id){
  const g=goals.find(x=>x.id===id);if(!g)return;
  const amt=parseFloat(prompt(`¿Cuánto agregás a "${g.name}"?\nActual: ${fmt(g.current)} / ${fmt(g.target)}`));
  if(!amt||amt<=0||isNaN(amt))return;
  g.current=Math.min(g.target,g.current+amt);saveGoals();pushSettings();renderGoalsSection();haptic();toast(`✅ +${fmt(amt)} a "${g.name}"`);
}
function deleteGoal(id){
  const g=goals.find(x=>x.id===id);pendingDel={type:'goal',id};
  document.getElementById('conf-txt').textContent=`¿Eliminar la meta "${g?.name}"?\nEsta acción no se puede deshacer.`;
  openDeleteConf();
}

// --- STATS ---
function renderStats(mk){
  const rows=expenses.filter(e=>monthKey(e.date)===mk&&e.type==='Egreso'&&countsInMonth(e));
  const el=document.getElementById('sum-stats');
  if(!rows.length){el.textContent='';return;}
  const{ing,real}=calcSummary(mk);
  const rate=ing>0?Math.round((1-real/ing)*100):0;
  // Gasto por día sin contar los fijos (que se pagan una vez por mes)
  const today=new Date().getDate();
  const variable=rows.filter(e=>!e.recurring&&!esFuturo(e)).reduce((s,e)=>s+effArs(e),0);
  const dailyAvg=today>0?Math.round(variable/today):0;
  // Una línea: ahorro y gasto por día
  const parts=[];
  if(ing>0)parts.push(rate>=0?`Ahorrás el ${rate}%`:`Gastaste ${-rate}% más de lo que entró`);
  if(dailyAvg>0&&mk===nowKey())parts.push(`${fmt(dailyAvg)}/día sin fijos`);
  el.textContent=parts.join(' · ');
}

// --- QUICK ADD ---
let _qaCat='';
function openQuickAdd(){
  document.getElementById('qa-amt').value='';_qaCat='';
  document.getElementById('qa-cat-grid').innerHTML=cats.filter(c=>!hiddenCats.has(c)&&catTypeFor(c)!=='ingreso').map(c=>`<button class="qa-cat-btn" id="qa_${c.replace(/[^a-z]/gi,'_')}" onclick="selectQaCat(${jsArg(c)})" title="${esc(displayName(c))}"><span class="qa-ico">${catIcon(c)}</span>${esc(displayName(c).length>7?displayName(c).slice(0,7)+'…':displayName(c))}</button>`).join('');
  document.getElementById('qa-overlay').classList.add('on');history.pushState({modal:true},'');
  setTimeout(()=>document.getElementById('qa-amt').focus(),200);
}
function closeQuickAdd(){document.getElementById('qa-overlay').classList.remove('on');}
function qaOverlayClick(ev){if(ev.target===document.getElementById('qa-overlay'))closeQuickAdd();}
function selectQaCat(cat){
  _qaCat=cat;
  document.querySelectorAll('.qa-cat-btn').forEach(b=>b.classList.remove('on'));
  const btn=document.getElementById('qa_'+cat.replace(/[^a-z]/gi,'_'));if(btn)btn.classList.add('on');
}
async function saveQuickAdd(){
  const amt=parseFloat(document.getElementById('qa-amt').value);
  if(!amt||amt<=0){toast('⚠️ Ingresá el monto');return;}
  if(!_qaCat){toast('⚠️ Elegí una categoría');return;}
  const exp={id:newId(),type:'Egreso',date:todayStr(),category:_qaCat,description:_qaCat,amount:amt,myAmount:amt,notes:null,splits:null,recurring:false,shared:false,sharedPercent:100,createdAt:Date.now(),updatedAt:Date.now()};
  expenses.push(exp);haptic();closeQuickAdd();renderAll();toast(`✅ ${icon(_qaCat)} ${fmt(amt)} en ${_qaCat}`);
  skipNextArs=fbOnline;await persistArs(exp,null);
}

// --- PATRIMONIO ---
let patrimonioExpanded = false;

function renderPatrimonioCard(){
  const el=document.getElementById('patrimonio-card');
  if(!el)return;
  const arsAccs=arsWallets();
  const usdAccs=usdWallets();
  if(!arsAccs.length&&!usdAccs.length){
    el.innerHTML=`<div class="pat-card" onclick="switchTab('cuentas')">
      <div class="pat-header"><span class="pat-label">${ic('wallet')} Disponible ahora</span></div>
      <div class="pat-setup">No tenés billeteras creadas.<br><b style="color:var(--p1)">Tocá para agregar tus cuentas →</b></div>
    </div>`;
    return;
  }
  let totalARS=0,totalUSD=0;
  const makeRow=(a,isUsd)=>{
    const bal=accountBalance(a.id)||0;
    if(isUsd)totalUSD+=bal; else totalARS+=bal;
    const cls=bal>0?'pos':bal<0?'neg':'zero';
    const balStr=isUsd?`<span style="color:var(--gold)">${fmtU(bal)}</span>`:`<span class="pat-acc-bal ${cls}">${bal<0?'-':''}${fmt(bal)}</span>`;
    return`<div class="pat-row">
      <div class="pat-acc-left"><span class="pat-acc-ico">${a.emoji}</span><span class="pat-acc-name">${esc(a.name)}</span></div>
      <div style="display:flex;align-items:center;gap:8px">
        ${balStr}
        <button onclick="openAdjustModal('${a.id}',event)" title="Ajustar" style="width:24px;height:24px;border-radius:6px;border:1px solid var(--bdr);background:transparent;color:var(--txt3);cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center">${ic('sliders')}</button>
      </div>
    </div>`;
  };
  const arsRows=arsAccs.map(a=>makeRow(a,false)).join('');
  const usdRows=usdAccs.map(a=>makeRow(a,true)).join('');
  const unassigned=expenses.filter(e=>!e.accountId&&e.type==='Egreso').length+expenses.filter(e=>!e.accountId&&e.type==='Ingreso').length;
  const warn=unassigned>0?`<div onclick="openUnassigned(event)" style="font-size:11px;color:var(--yellow);margin-top:6px;padding:7px 10px;min-height:44px;display:flex;align-items:center;cursor:pointer;background:color-mix(in srgb,var(--warn) 8%,transparent);border-radius:8px;border:1px solid color-mix(in srgb,var(--warn) 20%,transparent)">${ic('warn')} ${unassigned} movimiento${unassigned>1?'s':''} sin billetera · asignar ›</div>`:'';
  el.innerHTML=`<div class="pat-card" onclick="togglePatrimonio()">
    <div class="pat-header"><span class="pat-label">${ic('wallet')} Disponible ahora</span><span class="pat-chevron ${patrimonioExpanded?'open':''}" id="pat-chev">${ic('chevron')}</span></div>
    <div style="display:flex;gap:16px;align-items:baseline;flex-wrap:wrap;margin-bottom:4px">
      <div class="pat-total">${fmt(totalARS)}</div>
      ${totalUSD>0?`<div style="font-family:var(--num);font-size:22px;font-weight:700;color:var(--gold)">${fmtU(totalUSD)}</div>`:''}
    </div>
    <div class="pat-hint">${arsAccs.length+usdAccs.length} billetera${arsAccs.length+usdAccs.length!==1?'s':''}</div>
    ${warn}
    <div class="pat-detail ${patrimonioExpanded?'open':''}" id="pat-detail">
      <div class="pat-divider"></div>
      ${arsRows?`<div style="font-size:10px;font-weight:700;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Pesos ARS</div>${arsRows}`:''}
      ${usdRows?`<div style="font-size:10px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 6px">Dolares USD</div>${usdRows}`:''}
      <div class="pat-actions">
        <button class="pat-btn primary" onclick="switchTab('cuentas');event.stopPropagation()">${ic('wallet')} Gestionar</button>
        <button class="pat-btn secondary" onclick="openAdjustModal(null,event)">${ic('scale')} Ajustar saldo</button>
      </div>
    </div>
  </div>`;
}

function togglePatrimonio(){
  patrimonioExpanded = !patrimonioExpanded;
  const detail = document.getElementById('pat-detail');
  const chev = document.getElementById('pat-chev');
  if(detail) detail.classList.toggle('open', patrimonioExpanded);
  if(chev) chev.classList.toggle('open', patrimonioExpanded);
}

// Adjust modal — for fixing balance discrepancies
function openAdjustModal(accId, ev){
  ev?.stopPropagation();
  const wallets = walletAccounts();
  if(!wallets.length){ toast('⚠️ Primero creá una billetera en la tab Cuentas'); return; }

  const opts = wallets.map(w =>
    `<option value="${w.id}" ${w.id === accId ? 'selected' : ''}>${w.emoji} ${esc(w.name)}</option>`
  ).join('');
  document.getElementById('adj-acc').innerHTML = opts;
  document.getElementById('adj-real').value = '';
  document.getElementById('adj-hint').textContent = 'Escribí el saldo real para ver la diferencia';
  document.getElementById('adjust-overlay').classList.add('on');history.pushState({modal:true},'');
  setTimeout(() => document.getElementById('adj-real')?.focus(), 200);
}
function closeAdjustModal(){ document.getElementById('adjust-overlay').classList.remove('on'); }
function adjustOverlayClick(ev){ if(ev.target === document.getElementById('adjust-overlay')) closeAdjustModal(); }

function updateAdjHint(){
  const accId = document.getElementById('adj-acc')?.value;
  const realVal = parseFloat(document.getElementById('adj-real')?.value);
  const hint = document.getElementById('adj-hint');
  if(!hint || !accId || isNaN(realVal)) { if(hint) hint.textContent = ''; return; }
  const appBal = accountBalance(accId);
  const diff = realVal - appBal;
  if(diff === 0){ hint.innerHTML = ic('check')+' El saldo ya coincide'; hint.style.color = 'var(--green)'; return; }
  const acc = accounts.find(a => a.id === accId);
  hint.style.color = 'var(--yellow)';
  hint.textContent = diff > 0
    ? `Se va a registrar un ajuste de +${fmt(diff)} en ${acc?.name} (no suma a tus ingresos del mes)`
    : `Se va a registrar un ajuste de −${fmt(Math.abs(diff))} en ${acc?.name} (no suma a tus gastos del mes)`;
}

async function saveAdjust(){
  const accId = document.getElementById('adj-acc')?.value;
  const realVal = parseFloat(document.getElementById('adj-real')?.value);
  if(!accId || isNaN(realVal)){ toast('⚠️ Completá los datos'); return; }
  const appBal = accountBalance(accId);
  const diff = realVal - appBal;
  if(diff === 0){ closeAdjustModal(); toast('✅ Sin diferencia, el saldo ya coincide'); return; }
  const acc = accounts.find(a => a.id === accId);
  const exp = {
    id: newId(),
    type: diff > 0 ? 'Ingreso' : 'Egreso',
    date: todayStr(),
    category: diff > 0 ? 'Otros ingresos' : 'Otro',
    ajuste: true,
    description: `Ajuste de saldo — ${acc?.name}`,
    amount: Math.abs(diff), myAmount: Math.abs(diff),
    accountId: accId,
    currency: 'ARS', shared: false, sharedPercent: 100,
    notes: 'Ajuste manual para corregir diferencia de saldo',
    createdAt: Date.now(), updatedAt: Date.now()
  };
  expenses.push(exp);
  closeAdjustModal(); haptic(); renderAll();
  toast(`✅ Ajuste de ${fmt(Math.abs(diff))} registrado en ${acc?.name}`);
  skipNextArs = fbOnline; await persistArs(exp, null);
}

