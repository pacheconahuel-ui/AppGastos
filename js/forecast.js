// Lo que viene: lo mínimo que ya está comprometido para los próximos meses (3.11).
// Todo es aproximado: se arma con lo que hay cargado (tarjetas, cuotas y gastos programados, fijos de cada mes).
// Lo que cambia de un mes a otro (luz, gas) queda aparte y se suma solo si se pide. Lógica sin pantalla, con pruebas.

const FC_SERV_CATS=['Luz','Gas','Servicios'];
const FC_N=6; // este mes y los 5 que siguen

// Claves de mes: el actual y los siguientes
function fcMonths(today=todayStr(),n=FC_N){
  const t=parseYmd(today);
  return Array.from({length:n},(_,i)=>monthKey(ymd(new Date(t.getFullYear(),t.getMonth()+i,1))));
}
// Los n meses completos anteriores al actual (el más cercano primero)
function fcPrevMonths(today,n){
  const t=parseYmd(today);
  return Array.from({length:n},(_,i)=>monthKey(ymd(new Date(t.getFullYear(),t.getMonth()-1-i,1))));
}
function fcIsCard(e){return ccAccounts().some(a=>a.id===e.accountId);}

// Tarjetas: lo que se paga en cada vencimiento. Cada compra cuenta en el resumen donde cae y, si es una cuota o un fijo,
// también en los siguientes. Un resumen cerrado y sin pagar se paga en su vencimiento; lo nuevo, en el del próximo cierre.
function fcCards(today=todayStr()){
  const out={},t=parseYmd(today);
  ccAccounts().forEach(a=>{
    const pend=expenses.filter(e=>e.accountId===a.id&&e.type==='Egreso'&&e.ccPaid!==true);
    if(!pend.length)return;
    const cyc=cardCycle(a,today);
    const next=cyc?parseYmd(cyc.nextClosing):new Date(t.getFullYear(),t.getMonth()+1,1);
    const dueOf=m=>{
      if(!cyc)return ymd(new Date(next.getFullYear(),next.getMonth()+m,1));
      if(m<0)return cyc.due;
      const c=dayInMonth(next.getFullYear(),next.getMonth()+m,a.closingDay);
      c.setDate(c.getDate()+(a.dueOffset||10));
      return ymd(c);
    };
    // m=-1: resumen ya cerrado; m=0: el próximo; m=1…: los que siguen
    const startOf=e=>cyc&&(e.date||'')<=cyc.lastClosing?-1:0;
    const nota=(e,m)=>{
      if(e.cardExpType==='recurring')return'fijo';
      if(e.cardExpType==='installment'&&e.installmentTotal)return`cuota ${(e.installmentCurrent||1)+(m-startOf(e))}/${e.installmentTotal}`;
      return'';
    };
    const charged=(e,m)=>{
      const s=startOf(e);
      if(m<s)return false;
      if(m===s)return true;
      if(e.cardExpType==='recurring')return true;
      if(e.cardExpType==='installment'&&e.installmentTotal)return(e.installmentCurrent||1)+(m-s)<=e.installmentTotal;
      return false;
    };
    for(let m=-1;m<=FC_N;m++){
      let ars=0,usd=0;const subs=[];
      pend.filter(e=>charged(e,m)).forEach(e=>{
        const v=effAmt(e),isUsd=e.currency==='USD';
        if(isUsd)usd+=v;else ars+=v;
        subs.push({label:e.description||e.category,amount:isUsd?0:v,usd:isUsd?v:0,nota:nota(e,m)});
      });
      if(!subs.length)continue;
      const due=dueOf(m);
      (out[monthKey(due)]??=[]).push({grupo:'tarjeta',label:`${a.emoji} ${a.name}`,amount:ars,usd,subs,nota:`vence ${fmtDate(due)}`});
    }
  });
  return out;
}

// Gastos con fecha futura que no son de tarjeta: los programados y las cuotas cargadas de varios meses
function fcProgramados(today=todayStr()){
  const out={};
  expenses.filter(e=>e.type==='Egreso'&&e.date>today&&countsInMonth(e)&&!fcIsCard(e)&&!(e.currency==='USD'&&!usdRate(e))).forEach(e=>{
    let nota='';
    if(e.serieTotal>1){
      const fin=expenses.filter(x=>x.serieId===e.serieId).map(x=>x.date).sort().pop();
      nota=`cuota ${e.serieIdx}/${e.serieTotal} · hasta ${fmtDate(fin)}`;
    }
    (out[monthKey(e.date)]??=[]).push({grupo:'cuotas',label:e.description||e.category,amount:effArs(e),nota,fin:e.serieTotal>1?e.serieIdx===e.serieTotal:false});
  });
  return out;
}

// Fijos de cada mes que no son de tarjeta (alquiler, internet, el curso): se estiman con el último monto que se confirmó.
// Cuentan solo mientras sigan apareciendo (el mes pasado o este), igual que los recordatorios del resumen.
function fcFijos(today=todayStr()){
  const out={},months=fcMonths(today),cur=months[0],prev=fcPrevMonths(today,1)[0];
  const fam={};
  expenses.filter(e=>e.recurring&&e.type==='Egreso'&&e.date<=today&&!fcIsCard(e)&&!(e.currency==='USD'&&!usdRate(e))).forEach(e=>{
    const k=(e.description||e.category||'').trim().toLowerCase()+'|'+(e.accountId||'');
    if(!fam[k]||e.date>fam[k].date)fam[k]=e;
  });
  Object.values(fam).forEach(e=>{
    const last=monthKey(e.date);
    if(last<prev)return;
    months.forEach(mk=>{
      if(mk<=last)return; // ya se cargó en ese mes (o antes)
      (out[mk]??=[]).push({grupo:'fijos',label:e.description||e.category,amount:effArs(e),nota:'último monto'});
    });
  });
  return out;
}

// Servicios que cambian cada mes: promedio de los últimos 3 meses completos (sin contar lo que ya es un fijo)
function fcServicios(today=todayStr()){
  const ms=fcPrevMonths(today,3);
  const fijos=new Set(expenses.filter(e=>e.recurring).map(e=>(e.description||e.category||'').trim().toLowerCase()));
  const sum=expenses.filter(e=>e.type==='Egreso'&&FC_SERV_CATS.includes(e.category)&&ms.includes(monthKey(e.date))&&countsInMonth(e)&&!fijos.has((e.description||e.category||'').trim().toLowerCase())&&!(e.currency==='USD'&&!usdRate(e)))
    .reduce((s,e)=>s+effArs(e),0);
  return{avg:Math.round(sum/3),cats:FC_SERV_CATS};
}
// Ingresos: promedio de los últimos 3 meses completos
function fcIngresos(today=todayStr()){
  const ms=fcPrevMonths(today,3);
  const sum=expenses.filter(e=>e.type==='Ingreso'&&ms.includes(monthKey(e.date))&&countsInMonth(e)&&!(e.currency==='USD'&&!usdRate(e))).reduce((s,e)=>s+amtArs(e),0);
  return Math.round(sum/3);
}

// Todos los meses de una vez: items por grupo, subtotales y el total mínimo (con los servicios variables si se pide)
function fcAll(opts={},today=todayStr()){
  const c=fcCards(today),p=fcProgramados(today),f=fcFijos(today),serv=fcServicios(today),months=fcMonths(today);
  return months.map((mk,i)=>{
    const items=[...(c[mk]||[]),...(p[mk]||[]),...(f[mk]||[])];
    const tot={tarjeta:0,cuotas:0,fijos:0};
    items.forEach(it=>{tot[it.grupo]+=it.amount;});
    const servicios=opts.servicios&&i>0?serv.avg:0; // en el mes en curso no se estima: ya está pasando
    const usd=items.reduce((s,it)=>s+(it.usd||0),0);
    return{mk,actual:i===0,items,tot,servicios,serv,usd,total:tot.tarjeta+tot.cuotas+tot.fijos+servicios};
  });
}
function fcForecast(mk,opts={},today=todayStr()){return fcAll(opts,today).find(m=>m.mk===mk);}
