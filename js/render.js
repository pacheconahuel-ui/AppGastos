// Dibujar resumen, lista, USD y saldos
// --- RENDER ALL ---
// Los eventos de Firebase llegan de a varios (gastos, USD, deudas…): se dibuja una sola vez por cuadro
let _rqRender=0;
function renderAllSoon(){
  if(_rqRender)return;
  _rqRender=requestAnimationFrame(()=>{_rqRender=0;try{renderAll();}catch(e){console.error('[render]',e);}});
}
function renderAll(){renderDashboard();renderListSec();renderUsdTab();renderSaldosTab();if(activeTab==='cuentas')renderCuentasTab();try{renderPatrimonioCard();}catch(e){}}

function getDashMk(){
  // If user hasn't navigated, auto-pick: current month if it has data, else most recent month with data
  if(dashMk)return dashMk;
  const cur=nowKey();
  if(expenses.some(e=>monthKey(e.date)===cur))return cur;
  const months=allMonths().filter(m=>expenses.some(e=>monthKey(e.date)===m));
  return months.length?months[0]:cur;
}

function dashGoCurrent(){dashMk=nowKey();renderDashboard();}

function dashNavMonth(dir){
  const months=allMonths();
  const cur=getDashMk();
  const idx=months.indexOf(cur);
  const newIdx=idx+(-dir); // allMonths is desc so ‹ = forward in array = older
  if(newIdx>=0&&newIdx<months.length){dashMk=months[newIdx];renderDashboard();}
}

function renderDashboard(){
  const mk=getDashMk();
  const cur=nowKey();
  const isCurrent=mk===cur;

  // Month navigator — null-safe
  const months=allMonths();
  const idx=months.indexOf(mk);
  const monthLabel_el=document.getElementById('dash-month-label');
  if(monthLabel_el)monthLabel_el.textContent=monthLabel(mk);
  const monthHint_el=document.getElementById('dash-month-hint');
  if(monthHint_el)monthHint_el.innerHTML=isCurrent?'':`No es el mes actual · <button class="sum-go" onclick="dashGoCurrent()">Ir a ${monthLabel(cur)}</button>`;
  const nextBtn=document.getElementById('dash-next-btn');
  if(nextBtn)nextBtn.style.opacity=idx<=0?'.3':'1';

  // Header subtitle
  const hdrSub=document.getElementById('hdr-month');
  if(hdrSub)hdrSub.textContent=`v${APP_VERSION}`;

  const{ing,pag,real,bal,usdNoRate}=calcSummary(mk);
  const ing_el=document.getElementById('c-ing'); if(ing_el)ing_el.textContent=fmt(ing);
  // Los gastos en USD sin cotización no se pueden pasar a pesos: se muestran aparte
  const real_el=document.getElementById('c-real'); if(real_el)real_el.textContent=fmt(real);
  const realUsd=document.getElementById('c-real-usd'); if(realUsd)realUsd.textContent=usdNoRate?'+ '+fmtU(usdNoRate):'';
  // "Pagaste" solo aparece si es distinto de tus gastos (gastos compartidos)
  const pag_el=document.getElementById('c-pag'); if(pag_el)pag_el.textContent=fmt(pag);
  const pagLine=document.getElementById('c-pag-line'); if(pagLine)pagLine.style.display=Math.round(pag)!==Math.round(real)?'':'none';
  const balEl=document.getElementById('c-bal');
  if(balEl){balEl.textContent=(bal<0?'−':'+')+fmt(bal);balEl.className='sum-v '+(bal>=0?'pos':'neg');}

  const chartTitle=document.getElementById('chart-box-title');
  if(chartTitle)chartTitle.textContent=`Distribución — ${monthLabel(mk)}`;

  // Los gráficos son lo más caro de dibujar: con otra pestaña abierta no se ven, se dibujan al volver al Resumen
  if(activeTab==='dashboard'){
    try{renderPieChart(mk);}catch(e){console.warn('pie chart:',e);}
    try{renderMonthlyChart();}catch(e){console.warn('monthly chart:',e);}
  }
  try{renderPatrimonioCard();}catch(e){console.warn('patrimonio:',e);}
  // Los vencimientos dependen de hoy, no del mes que se está mirando
  try{renderCardReminders();}catch(e){console.warn('card reminders:',e);}
  if(isCurrent){
    try{renderProjection();}catch(e){console.warn('projection:',e);}
    try{renderRecurringReminders();}catch(e){console.warn('reminders:',e);}
  } else {
    const pc=document.getElementById('proj-card'); if(pc)pc.style.display='none';
    const rr=document.getElementById('recurring-reminders'); if(rr)rr.innerHTML='';
  }
  try{renderFcLine();}catch(e){console.warn('lo que viene:',e);}
  try{renderBudgetsSection();}catch(e){console.warn('budgets:',e);}
  try{renderGoalsSection();}catch(e){console.warn('goals:',e);}
  try{renderStats(mk);}catch(e){console.warn('stats:',e);}

  // Últimos 5 movimientos — todos los meses (el resto en Lista)
  const recent=[...expenses]
    .sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.createdAt-a.createdAt)
    .slice(0,5);
  const recentEl=document.getElementById('recent-list');
  if(recentEl)recentEl.innerHTML=recent.length
    ?recent.map(e=>expHTML(e,false)).join('')
    :'<div class="empty"><div class="empty-ico">'+ic('inbox')+'</div><p>Sin movimientos cargados</p></div>';
}

function renderPieChart(mk){
  const data=calcByCat(mk),labels=Object.keys(data),vals=Object.values(data);
  const box=document.getElementById('chart-box');
  if(!labels.length){box.classList.add('hidden');if(chart){chart.destroy();chart=null;}return;}
  box.classList.remove('hidden');
  const ctx=document.getElementById('pie').getContext('2d');
  if(chart){chart.destroy();chart=null;}
  chart=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data:vals,backgroundColor:COLORS.slice(0,labels.length),borderWidth:2,borderColor:chartBorderSep()}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:chartTextColor(),padding:12,font:{family:'Outfit',size:11,weight:'600'},boxWidth:11,boxHeight:11}},tooltip:{callbacks:{label:c=>`  ${fmt(c.raw)}`},bodyFont:{family:'Outfit',size:13},backgroundColor:chartBgColor(),borderColor:tok('bdr2'),borderWidth:1,padding:10,cornerRadius:10}}}});
}

function renderListSec(){
  const el=document.getElementById('fil-month'),prev=el.value;
  const months=allMonths();
  el.innerHTML=months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join('');
  el.value=months.includes(prev)?prev:nowKey();
  const mk=el.value;

  // Cat filter
  const catSel=document.getElementById('fil-cat'),curCat=catSel.value;
  catSel.innerHTML='<option value="">Todas las categorías</option>';
  const used=new Set(expenses.filter(e=>monthKey(e.date)===mk).map(e=>e.category));
  const usedSorted=[...used].sort((a,b)=>{
    const ia=cats.indexOf(a), ib=cats.indexOf(b);
    if(ia>=0&&ib>=0)return ia-ib;
    if(ia>=0)return -1; if(ib>=0)return 1;
    return displayName(a).localeCompare(displayName(b));
  });
  usedSorted.forEach(c=>{
    const o=document.createElement('option');
    o.value=c;o.textContent=`${catIcon(c)} ${displayName(c)}`;
    catSel.appendChild(o);
  });
  if(curCat)catSel.value=curCat;

  // Account filter — populate from accounts used in this month
  const accSel=document.getElementById('fil-account'),curAcc=accSel?.value||'';
  if(accSel){
    const usedAccIds=new Set(expenses.filter(e=>monthKey(e.date)===mk&&e.accountId).map(e=>e.accountId));
    accSel.innerHTML='<option value="">Todas las billeteras</option>'+
      accounts.filter(a=>usedAccIds.has(a.id)).map(a=>`<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`).join('');
    if(curAcc)accSel.value=curAcc;
  }

  // Apply all filters
  const search=(document.getElementById('fil-search')?.value||'').toLowerCase().trim();
  const catFil=catSel.value;
  const typeFil=document.getElementById('fil-type')?.value||'';
  const accFil=accSel?.value||'';

  let rows=expenses.filter(e=>monthKey(e.date)===mk);
  if(search) rows=rows.filter(e=>(e.description||'').toLowerCase().includes(search)||(e.category||'').toLowerCase().includes(search));
  if(catFil) rows=rows.filter(e=>e.category===catFil);
  if(typeFil) rows=rows.filter(e=>e.type===typeFil);
  if(accFil)  rows=rows.filter(e=>e.accountId===accFil);
  rows.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.createdAt-a.createdAt);

  const hasFilter=search||catFil||typeFil||accFil;
  document.getElementById('list-count').textContent=rows.length
    ?`${rows.length} resultado${rows.length>1?'s':''}${hasFilter?' (filtrado)':''}`:'';
  document.getElementById('full-list').innerHTML=rows.length
    ?rows.map(e=>expHTML(e,true)).join('')
    :`<div class="empty"><div class="empty-ico">${ic(hasFilter?'search':'inbox')}</div><p>${hasFilter?'Sin resultados':'Sin movimientos este mes'}</p></div>`;
}

function renderUsdTab(){
  const stock=usdTx.reduce((s,t)=>s+(t.type==='ingreso'?t.usdAmount:-t.usdAmount),0);
  const txCount=usdTx.length;
  document.getElementById('usd-stock').textContent=fmtU(Math.max(0,stock));
  document.getElementById('usd-stock-sub').textContent=`${txCount} transacción${txCount!==1?'es':''}`;
  const mk=nowKey();
  const rows=usdTx.filter(t=>monthKey(t.date)===mk);
  let inAmt=0,soldAmt=0,arsAmt=0;
  rows.forEach(t=>{if(t.type==='ingreso')inAmt+=t.usdAmount;else{soldAmt+=t.usdAmount;arsAmt+=t.arsAmount||0;}});
  document.getElementById('usd-c-in').textContent=fmtU(inAmt);
  document.getElementById('usd-c-sold').textContent=fmtU(soldAmt);
  document.getElementById('usd-c-ars').textContent=fmt(arsAmt);
  document.getElementById('usd-c-tc').textContent=soldAmt>0?fmtTC(arsAmt/soldAmt):'—';
  renderTcChart();
  const sorted=[...usdTx].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.createdAt-a.createdAt);
  document.getElementById('usd-list').innerHTML=sorted.length?sorted.map(t=>usdTxHTML(t)).join(''):'<div class="empty"><div class="empty-ico">'+ic('dollar')+'</div><p>Sin movimientos USD</p></div>';
}

function renderTcChart(){
  const ventas=usdTx.filter(t=>t.type==='venta'&&t.arsAmount&&t.usdAmount).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const box=document.getElementById('usd-chart-box');
  if(ventas.length<1){box.classList.add('hidden');if(tcChart){tcChart.destroy();tcChart=null;}return;}
  box.classList.remove('hidden');
  const labels=ventas.map(v=>{const[,m,d]=v.date.split('-');return`${d}/${m}`;});
  const tcs=ventas.map(v=>Math.round(v.arsAmount/v.usdAmount));
  const avg=Math.round(tcs.reduce((a,b)=>a+b,0)/tcs.length);
  document.getElementById('usd-chart-sub').textContent=`promedio: ${fmtTC(avg)}/U$D`;
  const ctx=document.getElementById('tc-chart').getContext('2d');
  if(tcChart){tcChart.destroy();tcChart=null;}
  tcChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'TC',data:tcs,borderColor:tok('acc'),backgroundColor:tokA('acc',.1),borderWidth:2.5,pointBackgroundColor:tok('acc'),pointRadius:5,pointHoverRadius:7,fill:true,tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`  ${fmtTC(c.raw)}/U$D`,afterLabel:c=>{const v=ventas[c.dataIndex];return`  ${fmtU(v.usdAmount)} → ${fmt(v.arsAmount)}`;}},bodyFont:{family:'Outfit',size:12},backgroundColor:chartBgColor(),borderColor:tok('bdr2'),borderWidth:1,padding:10,cornerRadius:10}},scales:{x:{grid:{color:chartGridColor()},ticks:{color:chartTextColor(),font:{family:'Outfit',size:11}}},y:{grid:{color:chartGridColor()},ticks:{color:chartTextColor(),font:{family:'Outfit',size:11},callback:v=>'$'+Math.round(v/1000)+'k'}}}}});
}

// --- RENDER SALDOS TAB ---
function renderSaldosTab(){
  // Summary
  let meDeben=0,yoDebo=0;
  debtPeople().forEach(p=>{const bal=personBalance(p.id);if(bal>0)meDeben+=bal;else yoDebo+=Math.abs(bal);});
  const neto=meDeben-yoDebo;
  document.getElementById('sum-me-deben').textContent=fmt(meDeben);
  document.getElementById('sum-yo-debo').textContent=fmt(yoDebo);
  const netoEl=document.getElementById('sum-neto');
  netoEl.textContent=(neto<0?'-':'')+fmt(neto);
  netoEl.style.color=neto>0?'var(--green)':neto<0?'var(--red)':'var(--txt3)';

  // Build person cards
  // Show: recurrent always, eventuales only if balance != 0
  const visiblePersons=debtPeople().filter(p=>{
    if(p.isRecurrent)return true;
    return personBalance(p.id)!==0;
  });

  let html='';
  const dups=duplicateSplitDebts();
  if(dups.length){
    const total=dups.reduce((s,d)=>s+d.amount,0);
    html+=`<div onclick="confirmCleanDuplicates()" style="cursor:pointer;font-size:12px;color:var(--yellow);margin-bottom:12px;padding:10px 12px;min-height:44px;display:flex;align-items:center;background:color-mix(in srgb,var(--warn) 8%,transparent);border-radius:12px;border:1px solid color-mix(in srgb,var(--warn) 25%,transparent)">${ic('warn')} ${dups.length} deuda${dups.length>1?'s':''} repetida${dups.length>1?'s':''} de gastos compartidos editados (${fmt(Math.abs(total))}) · tocá para revisar y limpiar ›</div>`;
  }
  if(visiblePersons.length===0){
    html+='<div class="empty"><div class="empty-ico">'+ic('users')+'</div><p>Sin cuentas pendientes<br><small>Agregá una deuda con el botón ＋</small></p></div>';
  } else {
    visiblePersons.forEach(p=>{
      const bal=personBalance(p.id);
      const activeDebts=personDebtsActive(p.id);
      const hasHistory=personDebtsSettled(p.id).length>0;
      const balClass=bal>0?'pos':bal<0?'neg':'zero';
      const balLbl=bal>0?'te debe':bal<0?'le debés':'en cero';
      const cardId=`pc_${p.id}`;
      const histId=`ph_${p.id}`;

      html+=`<div class="person-card" id="${cardId}">
        <div class="person-header">
          <div class="person-ava">${p.emoji}</div>
          <div class="person-info">
            <div class="person-name">${esc(p.name)}</div>
            <div class="person-sub">${activeDebts.length} movimiento${activeDebts.length!==1?'s':''} activo${activeDebts.length!==1?'s':''}${p.orphan?' · ya no está en tus contactos':''}</div>
          </div>
          <div class="person-balance">
            <div class="person-bal-val ${balClass}">${bal===0?'$0':((bal>0?'':'-')+fmt(bal))}</div>
            <div class="person-bal-lbl">${balLbl}</div>
          </div>
        </div>`;

      // Active debts list
      if(activeDebts.length>0){
        html+=`<div class="person-debts">`;
        activeDebts.forEach(d=>{
          const amtClass=d.amount>0?'pos':'neg';
          const dir=d.amount>0?'↙ te deben':'↗ vos debés';
          html+=`<div class="debt-item">
            <div class="debt-info">
              <div class="debt-desc">${esc(d.description)}</div>
              <div class="debt-meta">${fmtDate(d.date)} · ${dir}</div>
            </div>
            <div class="debt-amt ${amtClass}">${d.amount>0?'+':'-'}${fmt(d.amount)}</div>
            <button class="btn-ico del" onclick="deleteDebt('${d.id}',event)" style="width:28px;height:28px;font-size:12px">${ic('trash')}</button>
          </div>`;
        });
        html+=`</div>`;
      }

      // Actions
      html+=`<div class="person-actions">`;
      // Sin deudas activas no hay nada que saldar: el botón no se muestra
      if(activeDebts.length>0)html+=`<button class="btn-settle" onclick="openSettleModal('${p.id}')">
          ${bal>0?ic('download')+' Marcar cobrado':bal<0?ic('check')+' Marcar pagado':ic('check')+' Cerrar deudas'}
        </button>`;
      if(p.orphan)html+=`<button class="btn-hist" onclick="restoreOrphan('${p.id}')">${ic('users')} ${persons.some(x=>x.name.trim().toLowerCase()===p.name.trim().toLowerCase())?'Unir con '+esc(p.name):'Agregar a contactos'}</button>`;
      if(hasHistory){
        html+=`<button class="btn-hist" onclick="toggleHistory('${p.id}')">${ic('clock')} Historial</button>`;
      }
      html+=`</div>`;

      // History (hidden by default)
      const settled=personDebtsSettled(p.id);
      if(settled.length>0){
        html+=`<div id="${histId}" style="display:none;margin-top:10px">
          <div style="font-size:11px;color:var(--txt3);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Historial saldado</div>
          <div style="display:flex;flex-direction:column;gap:5px">`;
        settled.forEach(d=>{
          html+=`<div class="debt-item settled">
            <div class="debt-info">
              <div class="debt-desc">${esc(d.description)}</div>
              <div class="debt-meta">${fmtDate(d.date)} · Saldado ${fmtDate(d.settledDate)}</div>
            </div>
            <div class="debt-amt" style="color:var(--txt3)">${fmt(Math.abs(d.amount))}</div>
            <span class="debt-settled-ico">${ic('check')}</span>
          </div>`;
        });
        html+=`</div></div>`;
      }

      html+=`</div>`;// end person-card
    });
  }

  // Eventuales with zero balance — show "ver historial" section
  const hiddenPersons=debtPeople().filter(p=>!p.isRecurrent&&personBalance(p.id)===0&&debts.some(d=>d.personId===p.id));
  if(hiddenPersons.length>0){
    html+=`<div style="text-align:center;margin-top:8px"><button class="btn-hist" onclick="toggleZeroPersons()" id="btn-zero-toggle">+ ${hiddenPersons.length} persona${hiddenPersons.length>1?'s':''} saldada${hiddenPersons.length>1?'s':''}</button></div>`;
    html+=`<div id="zero-persons" style="display:none;margin-top:8px">`;
    hiddenPersons.forEach(p=>{
      html+=`<div class="person-card" style="opacity:.5">
        <div class="person-header">
          <div class="person-ava">${p.emoji}</div>
          <div class="person-info"><div class="person-name">${esc(p.name)}</div><div class="person-sub">Saldo en cero</div></div>
          <div class="person-balance"><div class="person-bal-val zero">$0</div></div>
        </div>
      </div>`;
    });
    html+=`</div>`;
  }

  document.getElementById('saldos-list').innerHTML=html;

  // Old debt alerts — grouped by person
  const old=oldDebtAlerts();
  if(old.length){
    // Group by person
    const byPerson={};
    old.forEach(d=>{
      if(!byPerson[d.personId])byPerson[d.personId]={name:personOf(d.personId).name,debts:[]};
      byPerson[d.personId].debts.push(d);
    });
    const alertHtml=`<div style="background:color-mix(in srgb,var(--warn) 8%,transparent);border:1px solid color-mix(in srgb,var(--warn) 25%,transparent);border-radius:14px;padding:13px 15px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:var(--yellow);margin-bottom:8px;display:flex;align-items:center;gap:6px">${ic('clock')} Deudas sin saldar hace más de 30 días</div>
      ${Object.entries(byPerson).map(([pid,{name,debts}])=>{
        const total=debts.reduce((s,d)=>s+d.amount,0);
        return`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding:6px 8px;background:rgba(0,0,0,.1);border-radius:8px">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--txt)">${esc(name)}</div>
            <div style="font-size:11px;color:var(--txt3)">${debts.length} deuda${debts.length!==1?'s':''} · ${total>0?'te deben':'le debés'} ${fmt(Math.abs(total))}</div>
          </div>
          <button onclick="openSettleModal('${pid}')" style="padding:6px 12px;background:color-mix(in srgb,var(--warn) 15%,transparent);border:1px solid color-mix(in srgb,var(--warn) 30%,transparent);border-radius:8px;color:var(--yellow);font-size:12px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif">
            ${total>0?ic('download')+' Cobrar':ic('check')+' Pagar'}
          </button>
        </div>`;
      }).join('')}
    </div>`;
    document.getElementById('saldos-list').insertAdjacentHTML('afterbegin',alertHtml);
  }
}

function toggleHistory(personId){
  const el=document.getElementById(`ph_${personId}`);
  if(el)el.style.display=el.style.display==='none'?'block':'none';
}
function toggleZeroPersons(){
  const el=document.getElementById('zero-persons');
  const btn=document.getElementById('btn-zero-toggle');
  if(el){el.style.display=el.style.display==='none'?'block':'none';}
}

// --- EXPENSE HTML ---
function expHTML(e,actions){
  const ing=e.type==='Ingreso';
  const hasSplit=e.splits&&e.splits.length>0;
  const splitBadge=hasSplit?`<span class="badge sh">${ic('users')} ${esc(e.splits.map(s=>s.personName).join(', '))}</span>`:'';
  const ingBadge=ing?'<span class="badge ing">Ingreso</span>':'';
  const moveBadge=!countsInMonth(e)?`<span class="badge" style="background:color-mix(in srgb,var(--tint) 5%,transparent);color:var(--txt3);border-color:var(--bdr)">${isCCPayment(e)?ic('card')+' Pago de tarjeta':e.ajuste?ic('sliders')+' Ajuste de saldo':isLiquidation(e)?ic('transfer')+' Liquidación':ic('transfer')+' Cambio de moneda'} · no suma al mes</span>`:'';
  const progBadge=esFuturo(e)?`<span class="badge" style="background:color-mix(in srgb,var(--acc) 10%,transparent);color:var(--blue);border-color:color-mix(in srgb,var(--acc) 25%,transparent)">${ic('calendar')} Programado</span>`:'';
  const serieBadge=e.serieTotal>1?`<span class="badge" style="background:color-mix(in srgb,var(--warn) 10%,transparent);color:var(--yellow);border-color:color-mix(in srgb,var(--warn) 25%,transparent)">${e.serieIdx}/${e.serieTotal}</span>`:'';
  const recurBadge=e.recurring?'<span class="badge" style="background:color-mix(in srgb,var(--acc) 10%,transparent);color:var(--blue);border-color:color-mix(in srgb,var(--acc) 25%,transparent)">'+ic('repeat')+'</span>':'';
  const usdBadge=e.currency==='USD'?`<span class="badge" style="background:color-mix(in srgb,var(--tint) 10%,transparent);color:var(--gold);border-color:color-mix(in srgb,var(--tint) 25%,transparent)">U$D ${e.amount}</span>`:'';
  const instBadge=e.cardExpType==='installment'&&e.installmentTotal?`<span class="badge" style="background:color-mix(in srgb,var(--warn) 10%,transparent);color:var(--yellow);border-color:color-mix(in srgb,var(--warn) 25%,transparent)">${e.installmentCurrent}/${e.installmentTotal}</span>`:'';
  const acc=e.accountId?accounts?.find(a=>a.id===e.accountId):null;
  const accBadge=acc?`<span class="badge" style="background:color-mix(in srgb,var(--tint) 5%,transparent);color:var(--txt2);border-color:var(--bdr)">${acc.emoji} ${esc(acc.name)}</span>`
    :(accounts?.length?'<span class="badge" style="background:color-mix(in srgb,var(--warn) 8%,transparent);color:var(--yellow);border-color:color-mix(in srgb,var(--warn) 25%,transparent)">Sin billetera</span>':'');
  const pending=pendingQ.some(p=>p.path===arsPath(e.id))?'<span style="color:var(--yellow);font-size:10px">'+ic('clock')+'</span>':'';
  const notesLine=e.notes?`<div style="font-size:11px;color:var(--txt3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ic('note')} ${esc(e.notes)}</div>`:'';
  const btns=actions?`<div class="exp-actions"><button class="btn-ico del" onclick="delExp('${e.id}',event)" aria-label="Borrar">${ic('trash')}</button></div>`:'';
  return`<div class="exp-item swipeable" data-id="${e.id}" onclick="editExp('${e.id}',event)">
    <div class="exp-ico purple-bg">${icon(e.category)}</div>
    <div class="exp-info">
      <div class="exp-desc">${esc(displayName(e.description||e.category))} ${pending}</div>
      ${notesLine}
      <div class="exp-meta"><span>${fmtDate(e.date)}</span><span style="color:var(--txt3)">·</span><span>${esc(displayName(e.category))}</span>${splitBadge}${ingBadge}${progBadge}${serieBadge}${recurBadge}${usdBadge}${instBadge}${accBadge}${moveBadge}</div>
    </div>
    <div class="exp-right"><div class="exp-amt ${ing?'i':'e'}">${ing?'+':'-'}${e.currency==='USD'&&!usdRate(e)?fmtU(effAmt(e)):fmt(effArs(e))}</div>${btns}</div>
  </div>`;
}

function usdTxHTML(t){
  const isIn=t.type==='ingreso';
  const isBuy=t.type==='compra';
  const isSell=t.type==='venta';
  const badge=isIn?'<span class="badge usd-in">'+ic('download')+' Ingreso</span>':
               isBuy?'<span class="badge" style="background:color-mix(in srgb,var(--acc) 12%,transparent);color:var(--blue);border-color:color-mix(in srgb,var(--acc) 30%,transparent)">'+ic('bank')+' Compra</span>':
               '<span class="badge usd-sell">'+ic('upload')+' Venta</span>';
  const tc=(isSell||isBuy)&&t.arsAmount&&t.usdAmount?`<span>TC: ${fmtTC(t.arsAmount/t.usdAmount)}</span>`:'';
  const arsLine=isSell&&t.arsAmount?`<div class="exp-amt-sub">→ ${fmt(t.arsAmount)} ARS</div>`:
                isBuy&&t.arsAmount?`<div class="exp-amt-sub">← ${fmt(t.arsAmount)} ARS</div>`:'';
  const ico=ic(isIn?'dollar':isBuy?'bank':'refresh');
  const amtClass=isIn?'gold':isBuy?'r':'r';
  const amtSign=isIn?'+':'-';
  return`<div class="exp-item" onclick="editUsdTx('${t.id}',event)">
    <div class="exp-ico gold-bg">${ico}</div>
    <div class="exp-info">
      <div class="exp-desc">${esc(t.description||(isIn?'Ingreso USD':isBuy?'Compra USD':'Venta USD'))}</div>
      <div class="exp-meta"><span>${fmtDate(t.date)}</span><span style="color:var(--txt3)">·</span>${badge}${tc}</div>
    </div>
    <div class="exp-right">
      <div><div class="exp-amt ${amtClass}">${amtSign}${fmtU(t.usdAmount)}</div>${arsLine}</div>
      <div class="exp-actions"><button class="btn-ico edit" onclick="editUsdTx('${t.id}',event)">${ic('edit')}</button><button class="btn-ico del" onclick="delUsdTx('${t.id}',event)">${ic('trash')}</button></div>
    </div>
  </div>`;
}

