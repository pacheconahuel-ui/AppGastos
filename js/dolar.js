// Cotización del dólar del día (dolarapi.com): botones para completar el tipo de cambio
// en gastos en USD y en compra/venta de dólares. Sin conexión usa la última guardada.

const DOLAR_URL='https://dolarapi.com/v1/dolares';
const DOLAR_TTL=30*60*1000;
const DOLAR_CASAS={tarjeta:'Tarjeta',oficial:'Oficial',blue:'Blue',bolsa:'MEP'};
let _dolarReq=null;

function readDolarCache(){try{return JSON.parse(localStorage.getItem('gp_dolar'))||null;}catch{return null;}}

// {rates:{casa:{compra,venta}}, at:fecha de la cotización, fetchedAt} o null si nunca se pudo traer
async function getDolar(){
  const cached=readDolarCache();
  if(cached&&Date.now()-cached.fetchedAt<DOLAR_TTL)return cached;
  if(!_dolarReq){
    _dolarReq=(async()=>{
      try{
        const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),6000);
        const res=await fetch(DOLAR_URL,{signal:ctl.signal});clearTimeout(tm);
        if(!res.ok)throw new Error('dolarapi '+res.status);
        const list=await res.json();
        const rates={};let at='';
        list.forEach(x=>{if(DOLAR_CASAS[x.casa]&&x.venta){rates[x.casa]={compra:x.compra,venta:x.venta};if((x.fechaActualizacion||'')>at)at=x.fechaActualizacion;}});
        const data={rates,at,fetchedAt:Date.now()};
        try{localStorage.setItem('gp_dolar',JSON.stringify(data));}catch{}
        return data;
      }catch(e){console.warn('[dolar]',e);return cached;}
      finally{_dolarReq=null;}
    })();
  }
  return _dolarReq;
}

function rateChipsHTML(data,side,casas,onPick){
  if(!data||!data.rates)return'';
  const when=data.at?new Date(data.at).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
  const chips=casas.filter(c=>data.rates[c]).map(c=>{
    const v=data.rates[c][side];
    return`<button type="button" class="rate-chip" onclick="${onPick}(${v})">${DOLAR_CASAS[c]} <b>${fmtTC(v)}</b></button>`;
  }).join('');
  return`<div class="rate-chips">${chips}</div><div class="rate-src">Cotización ${side} · dolarapi.com${when?' · '+when:''}</div>`;
}

// Gasto en USD: botones que completan el tipo de cambio. En un gasto nuevo con el
// tipo de cambio vacío, propone el dólar tarjeta para tarjetas y el oficial para el resto
// (al editar no se completa solo: una compra en dólares puede no tener cotización todavía).
async function showExpenseRates(){
  const el=document.getElementById('f-tc-rates');
  if(!el)return;
  const data=await getDolar();
  if(document.getElementById('f-currency').value!=='USD'){el.innerHTML='';return;}
  el.innerHTML=rateChipsHTML(data,'venta',['tarjeta','oficial','blue','bolsa'],'pickExpenseRate');
  const tc=document.getElementById('f-tc');
  if(data&&data.rates&&!tc.value&&!document.getElementById('f-id').value){
    const acc=accounts.find(a=>a.id===document.getElementById('f-account').value);
    const casa=acc?.type==='credit'&&data.rates.tarjeta?'tarjeta':'oficial';
    if(data.rates[casa])pickExpenseRate(data.rates[casa].venta);
  }
}
function pickExpenseRate(v){
  document.getElementById('f-tc').value=v;
  onAmtOrCurrencyChange();
}

// Compra de USD: se paga el precio de venta; venta de USD: se cobra el de compra
async function showUsdRates(type){
  const el=document.getElementById('uf-rates');
  if(!el)return;
  if(type!=='compra'&&type!=='venta'){el.innerHTML='';return;}
  const data=await getDolar();
  if(document.getElementById('uf-type').value!==type)return;
  el.innerHTML=rateChipsHTML(data,type==='compra'?'venta':'compra',['oficial','blue','bolsa'],'pickUsdRate');
}
function pickUsdRate(v){
  const usd=parseFloat(document.getElementById('uf-usd').value);
  if(!usd){toast('⚠️ Cargá primero cuántos USD');document.getElementById('uf-usd').focus();return;}
  document.getElementById('uf-ars').value=Math.round(usd*v);
  calcTC();
}
