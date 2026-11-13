// Tarjetas: ciclo de cierre y vencimiento, cuotas proyectadas y recordatorios de vencimiento

const MES_CORTO=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function ymd(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function parseYmd(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}
// Día "day" del mes (y, m 0-indexado); si no existe (31 en febrero), el último
function dayInMonth(y,m,day){const last=new Date(y,m+1,0).getDate();return new Date(y,m,Math.min(day,last));}
function daysBetween(a,b){return Math.round((parseYmd(b)-parseYmd(a))/86400000);}

// Vencimiento de un resumen (3.15): la fecha corregida a mano para ese resumen, si no el "día X" de la tarjeta
// (primer día X después del cierre) y, para las tarjetas viejas, N días después del cierre.
function cardDue(a,closing){
  const ov=a.dueOv&&a.dueOv[closing];
  if(ov)return ov;
  const c=parseYmd(closing);
  if(a.dueDay){
    let d=dayInMonth(c.getFullYear(),c.getMonth(),a.dueDay);
    if(d<=c)d=dayInMonth(c.getFullYear(),c.getMonth()+1,a.dueDay);
    return ymd(d);
  }
  c.setDate(c.getDate()+(a.dueOffset||10));
  return ymd(c);
}
function addDays(s,n){const d=parseYmd(s);d.setDate(d.getDate()+n);return ymd(d);}

// Cierre anterior (≤ hoy), próximo cierre (> hoy) y vencimiento del resumen ya cerrado.
// null si la tarjeta no tiene día de cierre.
function cardCycle(a,today=todayStr()){
  if(!a||!a.closingDay)return null;
  const t=parseYmd(today);
  let last=dayInMonth(t.getFullYear(),t.getMonth(),a.closingDay);
  if(last>t)last=dayInMonth(t.getFullYear(),t.getMonth()-1,a.closingDay);
  const next=dayInMonth(last.getFullYear(),last.getMonth()+1,a.closingDay);
  const prev=dayInMonth(last.getFullYear(),last.getMonth()-1,a.closingDay);
  return{lastClosing:ymd(last),nextClosing:ymd(next),prevClosing:ymd(prev),due:cardDue(a,ymd(last)),nextDue:cardDue(a,ymd(next))};
}

// Lo no pagado de una tarjeta, separado en el resumen que ya cerró (hay que pagarlo) y el que está en curso (3.15)
function cardStatements(a,today=todayStr()){
  const cyc=cardCycle(a,today);
  const pend=expenses.filter(e=>e.accountId===a.id&&e.type==='Egreso'&&e.ccPaid!==true);
  const mk=(items,extra)=>{
    let ars=0,usd=0;
    const lines=items.map(e=>{
      const isUSD=e.currency==='USD';
      const arsAmt=isUSD?(e.arsEquiv||(e.amount*(e.exchangeRate||0))):e.amount;
      if(isUSD)usd+=e.amount;else ars+=arsAmt;
      return{...e,arsAmt};
    });
    return{lines,ars,usd,...extra};
  };
  if(!cyc)return{cyc:null,closed:null,open:mk(pend,{})};
  const closedPending=lastCardPayment(a)>=cyc.lastClosing?[]:pend.filter(e=>(e.date||'')<=cyc.lastClosing);
  const ids=new Set(closedPending.map(e=>e.id));
  return{
    cyc,
    closed:closedPending.length?mk(closedPending,{from:addDays(cyc.prevClosing,1),to:cyc.lastClosing,due:cyc.due}):null,
    open:mk(pend.filter(e=>!ids.has(e.id)),{from:addDays(cyc.lastClosing,1),to:cyc.nextClosing,due:cyc.nextDue}),
  };
}

// Lo que va a pagar la tarjeta en los próximos n resúmenes. El 0 es el próximo
// (todo lo no pagado, como ccEstimated); después siguen las cuotas que quedan y los fijos.
function ccProjection(accId,n=6,today=todayStr()){
  const a=accounts.find(x=>x.id===accId);
  const pending=expenses.filter(e=>e.accountId===accId&&e.type==='Egreso'&&e.ccPaid!==true);
  const cyc=cardCycle(a,today);
  // Mes del próximo resumen: el del próximo cierre; sin día de cierre, el mes siguiente
  const base=cyc?parseYmd(cyc.nextClosing):(()=>{const t=parseYmd(today);return new Date(t.getFullYear(),t.getMonth()+1,1);})();
  const out=[];
  for(let k=0;k<n;k++){
    const m=new Date(base.getFullYear(),base.getMonth()+k,1);
    let ars=0,usd=0,count=0;
    pending.forEach(e=>{
      let charged=false;
      if(k===0)charged=true;
      else if(e.cardExpType==='recurring')charged=true;
      else if(e.cardExpType==='installment'&&e.installmentTotal)charged=(e.installmentCurrent||1)+k<=e.installmentTotal;
      if(!charged)return;
      count++;
      // Como en el resumen: lo cargado en dólares va aparte
      if(e.currency==='USD')usd+=e.amount;else ars+=e.amount;
    });
    out.push({label:`${MES_CORTO[m.getMonth()]} ${String(m.getFullYear()).slice(2)}`,ars,usd,count});
  }
  return out;
}

// Último pago del resumen de esta tarjeta: el guardado en la cuenta (lastPaid, desde la 3.1)
// o, para pagos viejos, el último "Pago resumen <nombre>"
function lastCardPayment(a){
  let last=a.lastPaid||'';
  expenses.forEach(e=>{
    if(isCCPayment(e)&&(e.ccCardId===a.id||(e.description||'').startsWith('Pago resumen '+a.name))&&(e.date||'')>last)last=e.date;
  });
  return last;
}

// Resúmenes cerrados sin pagar: desde el cierre hasta 10 días después del vencimiento
function cardReminders(today=todayStr()){
  const out=[];
  ccAccounts().forEach(a=>{
    const cyc=cardCycle(a,today);
    if(!cyc)return;
    const st=cardStatements(a,today).closed;
    if(!st||(st.ars<=0&&st.usd<=0))return;
    const daysLeft=daysBetween(today,cyc.due);
    if(daysLeft<-10)return;
    out.push({acc:a,due:cyc.due,closing:cyc.lastClosing,daysLeft,totalARS:st.ars,totalUSD:st.usd});
  });
  return out.sort((x,y)=>x.daysLeft-y.daysLeft);
}

function renderCardReminders(){
  const el=document.getElementById('card-reminders');
  if(!el)return;
  const list=cardReminders();
  el.innerHTML=list.map(r=>{
    const when=r.daysLeft>1?`vence en ${r.daysLeft} días (${fmtDate(r.due)})`
      :r.daysLeft===1?`vence mañana (${fmtDate(r.due)})`
      :r.daysLeft===0?'vence hoy'
      :`venció hace ${-r.daysLeft} día${r.daysLeft===-1?'':'s'} (${fmtDate(r.due)})`;
    const urgent=r.daysLeft<=2;
    const col=urgent?'var(--red)':'var(--yellow)';
    const bg=urgent?'color-mix(in srgb,var(--neg) 8%,transparent)':'color-mix(in srgb,var(--warn) 8%,transparent)';
    const bd=urgent?'color-mix(in srgb,var(--neg) 25%,transparent)':'color-mix(in srgb,var(--warn) 25%,transparent)';
    const amt=fmt(r.totalARS)+(r.totalUSD?` + ${fmtU(r.totalUSD)}`:'');
    return`<div class="card-reminder" style="background:${bg};border-color:${bd}">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:${col}">${r.acc.emoji} Resumen ${esc(r.acc.name)} · ${when}</div>
        <div style="font-size:12px;color:var(--txt2);margin-top:2px">~${amt}</div>
      </div>
      <button class="card-reminder-btn alt" onclick="openDueModal('${r.acc.id}','${r.closing}')">Fecha</button>
      <button class="card-reminder-btn" onclick="openCCPayModal('${r.acc.id}')">Pagar</button>
    </div>`;
  }).join('');
}

function cardProjectionHTML(a){
  const rows=ccProjection(a.id,6);
  if(!rows.some((r,k)=>k>0&&(r.ars||r.usd)))return'';
  const max=Math.max(...rows.map(r=>r.ars),1);
  return`<details class="cc-proj">
    <summary>${ic('calendar')} Próximos resúmenes (cuotas y fijos)</summary>
    <div class="cc-proj-note">Cada fila es un resumen, por mes de cierre.</div>
    ${rows.map((r,k)=>`<div class="cc-proj-row">
      <span class="cc-proj-lbl">${r.label}${k===0?' · próximo':''}</span>
      <span class="cc-proj-bar"><span style="width:${Math.round(r.ars/max*100)}%"></span></span>
      <span class="cc-proj-amt">${fmt(r.ars)}${r.usd?` <span style="color:var(--gold)">+ ${fmtU(r.usd)}</span>`:''}</span>
    </div>`).join('')}
  </details>`;
}

// Cambiar la fecha de vencimiento de un resumen puntual (feriados, cambios del banco)
function openDueModal(accId,closing){
  const a=accounts.find(x=>x.id===accId);if(!a)return;
  const due=cardDue(a,closing);
  lkModal('due',`<div class="m-title">${ic('calendar')} Vencimiento · ${esc(a.name)}</div>
    <p class="due-note">Resumen que cerró el ${fmtDate(closing)}. Cambiá solo este mes; los demás siguen con el día de siempre.</p>
    <div class="f-grp"><label class="f-lbl" for="due-date">Vence el</label><input type="date" class="f-ctrl" id="due-date" value="${due}"></div>
    <button class="btn-save" onclick="saveDue('${accId}','${closing}')">Guardar</button>
    ${a.dueOv&&a.dueOv[closing]?`<button class="btn-cancel" style="margin-top:8px" onclick="saveDue('${accId}','${closing}',true)">Volver a la fecha habitual</button>`:''}`);
}
function saveDue(accId,closing,reset){
  const a=accounts.find(x=>x.id===accId);if(!a)return;
  const v=document.getElementById('due-date')?.value;
  if(!reset&&!v){toast('⚠️ Elegí una fecha');return;}
  a.dueOv={...(a.dueOv||{})};
  if(reset)delete a.dueOv[closing];else a.dueOv[closing]=v;
  // Solo quedan las correcciones de los últimos resúmenes
  Object.keys(a.dueOv).filter(k=>daysBetween(k,todayStr())>200).forEach(k=>delete a.dueOv[k]);
  saveAccounts();pushSettings();closeLk();renderAll();renderCuentasTab();haptic();toast('✅ Vencimiento actualizado');
}

// Fijos pendientes de confirmar este mes (aviso del Resumen). Lo que ya se confirmó u omitió queda anotado en el propio
// movimiento (fijoOk = el mes), que se sincroniza entre dispositivos; antes solo se anotaba en el dispositivo (3.22).
function fijosPendientes(mk,prevMk,omitidosLocal=new Set()){
  const hecho=e=>e.fijoOk===mk||omitidosLocal.has(e.id);
  const esTarjeta=e=>!!accounts.find(a=>a.id===e.accountId&&a.type==='credit');
  const delMes=new Set(expenses.filter(e=>monthKey(e.date)===mk).map(e=>e.description));
  const faltan=expenses.filter(e=>e.recurring&&monthKey(e.date)===prevMk&&!hecho(e)&&!delMes.has(e.description));
  const fijosTarjeta=expenses.filter(e=>e.cardExpType==='recurring'&&!e.ccPaid&&!hecho(e)&&monthKey(e.date)===mk);
  return{billetera:faltan.filter(e=>!esTarjeta(e)),tarjeta:[...faltan.filter(esTarjeta),...fijosTarjeta]};
}
