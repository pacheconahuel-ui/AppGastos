// Formatos y cálculos: montos, USD, resumen del mes, deudas
// --- HELP MODAL ---
function openHelpModal(){document.getElementById('help-overlay').classList.add('on');history.pushState({modal:true},'');}
function closeHelpModal(){document.getElementById('help-overlay').classList.remove('on');}
function helpOverlayClick(ev){if(ev.target===document.getElementById('help-overlay'))closeHelpModal();}

// --- HELPERS ---
// Con signo: fmt() devuelve siempre el valor sin signo
function fmtS(n){return(n<0?'−':'')+fmt(n);}
function fmt(n){return'$'+Math.round(Math.abs(n)).toLocaleString('es-AR');}
function fmtU(n){return'U$D '+(Math.round(n*100)/100).toLocaleString('es-AR');}
function fmtTC(n){return'$'+Math.round(n).toLocaleString('es-AR');}
function fmtDate(d){if(!d)return'';const[,m,day]=d.split('-');return`${day}/${m}`;}
function monthKey(d){return d?d.slice(0,7):'';}
// Fecha de hoy (YYYY-MM-DD) en la hora del celular; toISOString() da la de UTC y después de las 21 h en Argentina ya es mañana
// Misma fecha k meses después; si el mes no tiene ese día (31 en febrero) queda el último
function dateAddMonths(s,k){
  const[y,m,d]=s.split('-').map(Number);
  const t=new Date(y,m-1+k,1),last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
  return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;
}
// Movimiento programado: con fecha de hoy en adelante todavía no pasó; no resta ni suma en las billeteras hasta ese día
function esFuturo(x){return!!x&&!!x.date&&x.date>todayStr();}
function todayStr(){const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;}
function nowKey(){const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;}
function monthLabel(mk){if(!mk)return'';const[y,m]=mk.split('-');const N=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];return`${N[parseInt(m)-1]} ${y}`;}
function effAmt(e){return e.myAmount!=null?e.myAmount:(e.shared?e.amount*(e.sharedPercent/100):e.amount);}
// Movimientos en USD: pesos según la cotización cargada (0 si no tiene). Antes se sumaban U$D como si fueran $.
function usdRate(e){if(e.currency!=='USD')return 1;if(e.arsEquiv&&e.amount)return e.arsEquiv/e.amount;return e.exchangeRate||0;}
function effArs(e){return effAmt(e)*usdRate(e);}
// Movimientos que mueven plata entre cuentas pero no son gasto ni ingreso del mes:
// el pago del resumen de la tarjeta (las compras ya se contaron) y la compra/venta de USD.
// Siguen sumando y restando en el saldo de cada billetera.
function isCCPayment(e){return !!e.ccPayment||(e.description||'').startsWith('Pago resumen ');}
function isFxEntry(e){return !!e.fxOp||usdTx.some(t=>t.linkedArsId===e.id);}
// Liquidar una deuda (lo que te devuelven o devolvés) y los ajustes de saldo mueven plata pero no son gasto ni ingreso
// Los ajustes viejos (antes de la 3.12) se cargaron como un gasto común llamado "Ajuste de saldo — <billetera>"
function isAjuste(e){return !!e.ajuste||(!e.liquidacion&&/^Ajuste de saldo( —|$)/.test(e.description||''));}
function isLiquidation(e){return !!e.liquidacion||isAjuste(e);}
function countsInMonth(e){return !isCCPayment(e)&&!isFxEntry(e)&&!isLiquidation(e);}
function amtArs(e){return e.amount*usdRate(e);}
function allMonths(){const s=new Set(expenses.map(e=>monthKey(e.date)).filter(Boolean));s.add(nowKey());return[...s].sort((a,b)=>b.localeCompare(a));}
// Texto como argumento de un onclick="...": comillas de JS + escape HTML (un ' en el nombre ya no rompe el botón)
function jsArg(s){return esc(JSON.stringify(String(s)));}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function newId(){return String(Date.now())+Math.random().toString(36).slice(2,6);}
function customCats(){return cats.filter(c=>!DEF_CATS.includes(c)&&!DEF_ING_CATS.includes(c));}
function displayName(cat){return renamedCats[cat]||cat;} // show renamed label for default cats
function normalizeCatTypes(map={}){
  const out={...map};
  [...DEF_ING_CATS,'Salario','Venta USD'].forEach(c=>{if(!out[c])out[c]='ingreso';});
  cats.forEach(c=>{if(!out[c])out[c]=DEF_ING_CATS.includes(c)||c==='Salario'||c==='Venta USD'?'ingreso':'egreso';});
  return out;
}
function loadCatTypes(){try{catTypes=normalizeCatTypes(JSON.parse(localStorage.getItem(lsKey(CT_SK)))||{});}catch{catTypes=normalizeCatTypes({});}}
function saveCatTypes(){try{localStorage.setItem(lsKey(CT_SK),JSON.stringify(catTypes));}catch{}}
function catTypeFor(cat){return normalizeCatTypes(catTypes)[cat]||'egreso';}
function setCatType(cat,type){catTypes[cat]=type==='ingreso'?'ingreso':'egreso';saveCatTypes();}
function catVisibleForCurrentType(cat){
  const currentType=document.getElementById('f-type')?.value||'Egreso';
  return currentType==='Ingreso'?catTypeFor(cat)==='ingreso':catTypeFor(cat)!=='ingreso';
}

// Chart color helpers — adapt to light/dark mode
// Los gráficos (canvas) no entienden var(--x): leen el color del token y, si hace falta, le ponen transparencia
function tok(name){return getComputedStyle(document.body).getPropertyValue('--'+name).trim();}
function tokA(name,a){const h=tok(name).replace('#','');if(h.length!==6)return tok(name);return`rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;}
function chartTextColor(){return tok('txt3');}
function chartGridColor(){return tokA('txt',.06);}
function chartBgColor(){return tok('modal-bg');}
function chartBorderSep(){return tok('surf');}
function loadIconOverrides(){try{return JSON.parse(localStorage.getItem(lsKey('gp_icons_v1')))||{};}catch{return{};}}
function saveIconOverrides(map){try{localStorage.setItem(lsKey('gp_icons_v1'),JSON.stringify(map));}catch{}}
function catIcon(cat){const ov=loadIconOverrides();return ov[cat]||ICONS[cat]||'📌';}
// Override the global icon() call used in expHTML etc.
function icon(cat){return catIcon(cat);}

function editCatIcon(catName){
  const current=catIcon(catName);
  const newIco=prompt(`Cambiar ícono de "${catName}"\nActual: ${current}\n\nPegá un emoji nuevo:`,current);
  if(!newIco?.trim()||newIco.trim()===current)return;
  const t=newIco.trim();
  const ov=loadIconOverrides();
  ov[catName]=t;
  saveIconOverrides(ov);pushSettings();
  renderCatManager();
  renderAll();
  toast(`✅ Ícono de "${catName}" cambiado a ${t}`);
}

function confirmDeleteCat(name){
  const inUse=expenses.some(e=>e.category===name);
  pendingDel={type:'cat',name};
  document.getElementById('conf-txt').textContent=inUse
    ?`"${name}" se usa en gastos existentes.\nSe eliminará solo la categoría, los gastos quedan intactos.\n¿Eliminar igual?`
    :`¿Eliminar la categoría "${name}"?\nEsta acción no se puede deshacer.`;
  openDeleteConf();
}
function personById(id){return persons.find(p=>p.id===id);}
// Persona de una deuda: el contacto, o (si lo borraron y las deudas quedaron) una ficha armada con el nombre guardado en la deuda
function personOf(personId){
  const p=personById(personId);
  if(p)return p;
  const d=debts.find(x=>x.personId===personId);
  return{id:personId,name:d?.personName||'Sin nombre',emoji:'👤',isRecurrent:false,orphan:true};
}
// Contactos más los que se borraron pero siguen con deudas (cuentan igual en los saldos)
function debtPeople(){
  const known=new Set(persons.map(p=>p.id));
  const out=[...persons];
  debts.forEach(d=>{if(d.personId&&!known.has(d.personId)){known.add(d.personId);out.push(personOf(d.personId));}});
  return out;
}

// --- CALC ARS ---
function calcSummary(mk){
  const rows=expenses.filter(e=>monthKey(e.date)===mk&&countsInMonth(e));
  let ing=0,pag=0,real=0;
  let usdNoRate=0;
  rows.forEach(e=>{
    if(e.currency==='USD'&&!usdRate(e)&&e.type!=='Ingreso')usdNoRate+=effAmt(e);
    if(e.type==='Ingreso'){ing+=amtArs(e);}else{pag+=amtArs(e);real+=effArs(e);}
  });
  return{ing,pag,real,bal:ing-real,usdNoRate};
}
function calcByCat(mk){
  const map={};
  expenses.filter(e=>monthKey(e.date)===mk&&e.type==='Egreso'&&countsInMonth(e)).forEach(e=>{map[e.category]=(map[e.category]||0)+effArs(e);});
  return map;
}

// --- DEUDAS REPETIDAS ---
// Hasta la 2.8, editar un gasto compartido creaba otra deuda por persona cada vez.
// Por cada gasto y persona queda la más nueva (la del último guardado); las demás
// sin saldar son repetidas.
function duplicateSplitDebts(){
  const groups={};
  debts.filter(d=>d.linkedExpenseId&&!d.settled).forEach(d=>{(groups[d.linkedExpenseId+'|'+d.personId]??=[]).push(d);});
  const out=[];
  Object.values(groups).forEach(g=>{
    if(g.length<2)return;
    g.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    out.push(...g.slice(1));
  });
  return out;
}
function confirmCleanDuplicates(){
  const dups=duplicateSplitDebts();
  if(!dups.length)return;
  const byPerson={};dups.forEach(d=>{byPerson[d.personName||'?']=(byPerson[d.personName||'?']||0)+d.amount;});
  const lines=Object.entries(byPerson).map(([n,a])=>`• ${n}: ${a>0?'te debe':'le debés'} ${fmt(Math.abs(a))} de más`).join('\n');
  showConf('trash','Limpiar deudas repetidas',
    `Se borran ${dups.length} deuda${dups.length>1?'s':''} repetida${dups.length>1?'s':''}. De cada gasto queda la última versión.\n\n${lines}`,
    async()=>{
      const ids=new Set(dups.map(d=>d.id));
      debts=debts.filter(d=>!ids.has(d.id));
      renderAll();
      for(const id of ids){skipNextDebt=fbOnline;await persistDebt(null,id);}
      toast(`🧹 ${ids.size} deuda${ids.size>1?'s':''} repetida${ids.size>1?'s':''} borrada${ids.size>1?'s':''}`);
    },'Limpiar');
}

// --- CALC DEBTS ---
function personBalance(personId){
  // positive = they owe me, negative = I owe them
  return debts.filter(d=>d.personId===personId&&!d.settled).reduce((s,d)=>s+d.amount,0);
}
function personDebtsActive(personId){return debts.filter(d=>d.personId===personId&&!d.settled).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.createdAt-a.createdAt);}
function personDebtsSettled(personId){return debts.filter(d=>d.personId===personId&&d.settled).sort((a,b)=>(b.settledDate||'').localeCompare(a.settledDate||'')||0);}

