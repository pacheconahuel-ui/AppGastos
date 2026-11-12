// Pantalla de "Lo que viene": mínimo comprometido del mes que viene, los próximos meses y el detalle (3.11)
let fcSel=null;
const FC_LBL={tarjeta:'Tarjetas',cuotas:'Cuotas y programados',fijos:'Fijos'};
function fcOpt(k){try{return localStorage.getItem(lsKey('gp_fc_'+k))==='1';}catch{return false;}}
function fcSetOpt(k,v){try{localStorage.setItem(lsKey('gp_fc_'+k),v?'1':'0');}catch(e){}}
function fcShort(v){
  if(v>=1e6)return'$'+(Math.round(v/1e5)/10).toString().replace('.',',')+'M';
  if(v>=1000)return'$'+Math.round(v/1000)+'k';
  return v>0?'$'+Math.round(v):'—';
}

// Línea del Resumen: lo mínimo del mes que viene, y toca para ver todo
function renderFcLine(){
  const el=document.getElementById('fc-line');
  if(!el)return;
  const all=fcAll({servicios:fcOpt('serv')});
  if(!all.some(m=>m.items.length)){el.style.display='none';return;}
  el.style.display='';
  el.innerHTML=`<span class="fc-line-lbl">${ic('calendar')} Mes que viene</span><span class="fc-line-val">${fmt(all[1].total)}</span><span class="fc-line-chev">${ic('chevron')}</span>`;
}

function openForecast(mk){
  const all=fcAll({servicios:fcOpt('serv')});
  fcSel=mk||all[1].mk;
  renderForecast();
}
function fcSelect(mk){fcSel=mk;renderForecast();}
function fcToggle(k){fcSetOpt(k,!fcOpt(k));renderForecast();renderFcLine();}

function renderForecast(){
  const all=fcAll({servicios:fcOpt('serv')});
  const sel=all.find(m=>m.mk===fcSel)||all[1];
  const modal=document.querySelector('#lk-overlay .modal'),keep=modal?modal.scrollTop:0;
  const strip=all.map(m=>`<button class="fc-mes${m.mk===sel.mk?' on':''}" onclick="fcSelect('${m.mk}')" aria-label="${monthLabel(m.mk)}: ${fmt(m.total)}">
      <span class="fc-m">${MES_CORTO[parseInt(m.mk.slice(5),10)-1]}</span><span class="fc-v">${fcShort(m.total)}</span></button>`).join('');
  const rows=['tarjeta','cuotas','fijos'].map(g=>{
    const v=sel.tot[g],pct=sel.total>0?Math.round(v/sel.total*100):0;
    return v>0?`<div class="fc-row"><span>${FC_LBL[g]}</span><span class="fc-row-bar"><i style="width:${pct}%"></i></span><b>${fmt(v)}</b></div>`:'';
  }).join('')+(sel.servicios>0?`<div class="fc-row"><span>Servicios (promedio)</span><span class="fc-row-bar"><i style="width:${Math.round(sel.servicios/sel.total*100)}%"></i></span><b>${fmt(sel.servicios)}</b></div>`:'');
  const ing=fcIngresos(),libre=ing-sel.total;
  const comparar=fcOpt('ing')&&ing>0?`<div class="fc-libre ${libre<0?'neg':'pos'}">Entran ~${fmt(ing)} por mes (promedio de los últimos 3) · ${libre<0?`faltan ${fmt(-libre)}`:`te quedan libres ~${fmt(libre)}`}</div>`:(fcOpt('ing')?'<div class="fc-libre">Todavía no hay ingresos de los últimos 3 meses para comparar.</div>':'');
  const groups=['tarjeta','cuotas','fijos'].map(g=>{
    const its=sel.items.filter(i=>i.grupo===g);
    if(!its.length)return'';
    // Lo que tiene detalle (cada compra de una tarjeta) va plegado: se ve la tarjeta y su total, y se abre si hace falta
    return`<div class="fc-sec">${FC_LBL[g]}</div>`+its.map(i=>{
      const top=`<span class="fc-item-name">${esc(i.label)}</span><b>${fmt(i.amount)}${i.usd?` <span class="fc-usd">+ ${fmtU(i.usd)}</span>`:''}</b>`;
      const nota=i.nota?`<div class="fc-item-nota">${esc(i.nota)}</div>`:'';
      const subs=(i.subs||[]).map(s=>`<div class="fc-sub"><span>${esc(s.label)}${s.nota?` · ${esc(s.nota)}`:''}</span><span>${s.usd?fmtU(s.usd):fmt(s.amount)}</span></div>`).join('');
      return subs?`<details class="fc-item"><summary class="fc-item-top">${top}</summary>${nota}${subs}</details>`:`<div class="fc-item"><div class="fc-item-top">${top}</div>${nota}</div>`;
    }).join('');
  }).join('');
  lkModal('forecast',`<div class="m-title">${ic('calendar')} Lo que viene</div>
    <div class="fc-strip">${strip}</div>
    <div class="fc-kpi"><div class="fc-kpi-lbl">${sel.actual?'Lo que falta pagar de':'Mínimo de'} ${monthLabel(sel.mk)}</div>
      <div class="fc-kpi-val">${fmt(sel.total)}</div>
      ${sel.usd?`<div class="fc-usd">+ ${fmtU(sel.usd)} en dólares</div>`:''}
      <div class="fc-kpi-sub">Es aproximado: tarjetas, cuotas y fijos ya cargados.</div></div>
    ${rows?`<div class="fc-rows">${rows}</div>`:''}
    <button class="fc-tog" role="switch" aria-checked="${fcOpt('serv')}" onclick="fcToggle('serv')"><span class="fc-sw${fcOpt('serv')?' on':''}"></span><span>Sumar luz y gas <small>(promedio de 3 meses: ${fmt(sel.serv.avg)})</small></span></button>
    <button class="fc-tog" role="switch" aria-checked="${fcOpt('ing')}" onclick="fcToggle('ing')"><span class="fc-sw${fcOpt('ing')?' on':''}"></span><span>Comparar con mis ingresos</span></button>
    ${comparar}
    ${groups||'<div class="empty" style="padding:20px 0"><p>Todavía no hay nada cargado para este mes<br><small>Aparecen las cuotas y fijos de tarjeta, los gastos programados y los fijos de cada mes</small></p></div>'}`);
  const m2=document.querySelector('#lk-overlay .modal');if(m2)m2.scrollTop=keep;
}
