// Copia local (localStorage), rutas de Firebase, cola sin conexión y guardado
// --- LOCAL STORAGE ---
function lsKey(b){return currentUID?`${b}_${currentUID}`:b;}
function loadLocal(){
  try{expenses=JSON.parse(localStorage.getItem(lsKey(SK)))||[];}catch{expenses=[];}
  try{usdTx=JSON.parse(localStorage.getItem(lsKey(USK)))||[];}catch{usdTx=[];}
  try{debts=JSON.parse(localStorage.getItem(lsKey(DSK)))||[];}catch{debts=[];}
  try{
    const custom=JSON.parse(localStorage.getItem(lsKey(CK)))||[];
    cats=[...new Set([...DEF_CATS,...DEF_ING_CATS,...custom])];
  }catch{cats=[...new Set([...DEF_CATS,...DEF_ING_CATS])];}
  try{
    const saved=JSON.parse(localStorage.getItem(lsKey(PSK)))||[];
    persons=saved;
  }catch{persons=[];}
  try{pendingQ=JSON.parse(localStorage.getItem(lsKey(PQ)))||[];}catch{pendingQ=[];}
  try{usdPendQ=JSON.parse(localStorage.getItem(lsKey(UPQ)))||[];}catch{usdPendQ=[];}
  try{debtPendQ=JSON.parse(localStorage.getItem(lsKey(DPQ)))||[];}catch{debtPendQ=[];}
  try{hiddenCats=new Set(JSON.parse(localStorage.getItem(lsKey(HCK)))||[]);}catch{hiddenCats=new Set();}
  try{renamedCats=JSON.parse(localStorage.getItem(lsKey(RCK)))||{};}catch{renamedCats={};}
  loadCatTypes();
  // Load new modules
  setTimeout(()=>{if(typeof loadAccounts==='function'){loadAccounts();loadBudgets();loadGoals();}},0);
}
function saveLocal(){
  if(!currentUID)return;
  try{
    localStorage.setItem(lsKey(SK),JSON.stringify(expenses));
    localStorage.setItem(lsKey(USK),JSON.stringify(usdTx));
    localStorage.setItem(lsKey(DSK),JSON.stringify(debts));
    localStorage.setItem(lsKey(PSK),JSON.stringify(persons));
    const custom=cats.filter(c=>!DEF_CATS.includes(c)&&!DEF_ING_CATS.includes(c));
    localStorage.setItem(lsKey(CK),JSON.stringify(custom));
    localStorage.setItem(lsKey(HCK),JSON.stringify([...hiddenCats]));
    localStorage.setItem(lsKey(RCK),JSON.stringify(renamedCats));
    localStorage.setItem(lsKey(CT_SK),JSON.stringify(catTypes));
    localStorage.setItem(lsKey(PQ),JSON.stringify(pendingQ));
    localStorage.setItem(lsKey(UPQ),JSON.stringify(usdPendQ));
    localStorage.setItem(lsKey(DPQ),JSON.stringify(debtPendQ));
  }catch(e){console.warn('localStorage error:',e);}
}

// --- FIREBASE PATHS ---
function arsPath(id){return`usuarios/${currentUID}/gastos/${id}`;}
function usdPath(id){return`usuarios/${currentUID}/usd/${id}`;}
function debtPath(id){return`usuarios/${currentUID}/debts/${id}`;}
function arsBase(){return`usuarios/${currentUID}/gastos`;}
function usdBase(){return`usuarios/${currentUID}/usd`;}
function debtBase(){return`usuarios/${currentUID}/debts`;}
function settingsPath(){return`usuarios/${currentUID}/settings`;}
// --- SYNC STATUS ---
function setStatus(state,label){
  const pill=document.getElementById('sync-pill');
  const span=document.getElementById('sync-label');
  ['connecting','online','offline','syncing'].forEach(s=>pill.classList.remove(s));
  pill.classList.add(state);span.textContent=label;
  // If settings are pending, add warning to the pill
  const settingsPending=currentUID&&localStorage.getItem('gp_settings_pending');
  if(settingsPending&&state==='online'){
    pill.classList.remove('online');pill.classList.add('syncing');
    span.textContent='⚙ Config pendiente';
  }
  // El encabezado muestra solo el punto de color; el texto queda para lectores de pantalla y para el toque
  pill.setAttribute('aria-label','Estado de sincronización: '+span.textContent.replace(/^[●⚠↑⚙]\s*/,''));
}
function showSyncStatus(){toast(document.getElementById('sync-label').textContent.replace(/^[●]\s*/,'● '));}

// --- FIREBASE OPS ---
// Mensaje para el usuario a partir de un error técnico (el detalle va a la consola)
function errMsg(e,fallback='No se pudo guardar. Probá de nuevo en un rato.'){
  console.error(e);
  if(e&&e.userMsg)return e.userMsg;
  const code=String((e&&(e.code||e.message))||'').toLowerCase();
  if(!navigator.onLine||code.includes('network'))return'Sin conexión. Probá de nuevo cuando vuelva internet.';
  if(code.includes('permission'))return'No tenés permiso para guardar. Cerrá sesión y volvé a entrar.';
  return fallback;
}
async function fbSet(path,data){if(!db)return false;try{await db.ref(path).set(data==null?data:JSON.parse(JSON.stringify(data)));return true;}catch(e){console.warn('[fbSet]',e.code||e.message);return false;}}
async function fbRemove(path){if(!db)return false;try{await db.ref(path).remove();return true;}catch(e){console.warn('fbRemove',path,e);return false;}}

// --- QUEUE HELPERS ---
function enqueue(q,op,path,data){
  let arr=q==='ars'?pendingQ:q==='usd'?usdPendQ:debtPendQ;
  arr=arr.filter(p=>p.path!==path);
  arr.push({op,path,data:op==='set'?data:null,ts:Date.now()});
  if(q==='ars')pendingQ=arr;else if(q==='usd')usdPendQ=arr;else debtPendQ=arr;
  saveLocal();
}
async function flushQueueFor(q){
  const arr=q==='ars'?pendingQ:q==='usd'?usdPendQ:debtPendQ;
  if(!arr.length||!fbOnline)return;
  setStatus('syncing','↑ Sincronizando…');
  const snap=[...arr];
  for(const item of snap){
    const ok=item.op==='set'?await fbSet(item.path,item.data):await fbRemove(item.path);
    if(ok){
      if(q==='ars')pendingQ=pendingQ.filter(p=>p.ts!==item.ts);
      else if(q==='usd')usdPendQ=usdPendQ.filter(p=>p.ts!==item.ts);
      else debtPendQ=debtPendQ.filter(p=>p.ts!==item.ts);
      saveLocal();
    }else break;
  }
  if(!pendingQ.length&&!usdPendQ.length&&!debtPendQ.length){setStatus('online','● Sincronizado');if(snap.length>0)toast('☁️ Cambios offline sincronizados');}
}

// --- PERSIST ---
async function persistArs(exp,removeId){
  saveLocal();
  if(!fbOnline||!currentUID){if(removeId)enqueue('ars','remove',arsPath(removeId),null);else if(exp)enqueue('ars','set',arsPath(exp.id),exp);return;}
  setStatus('syncing','↑ Guardando…');
  const ok=removeId?await fbRemove(arsPath(removeId)):await fbSet(arsPath(exp.id),exp);
  if(ok){pendingQ=pendingQ.filter(p=>p.path!==arsPath(removeId||exp?.id));saveLocal();setStatus('online','● Sincronizado');}
  else{if(removeId)enqueue('ars','remove',arsPath(removeId),null);else if(exp)enqueue('ars','set',arsPath(exp.id),exp);setStatus('offline','⚠ Offline');}
}
async function persistUsd(tx,removeId){
  saveLocal();
  if(!fbOnline||!currentUID){if(removeId)enqueue('usd','remove',usdPath(removeId),null);else if(tx)enqueue('usd','set',usdPath(tx.id),tx);return;}
  setStatus('syncing','↑ Guardando…');
  const ok=removeId?await fbRemove(usdPath(removeId)):await fbSet(usdPath(tx.id),tx);
  if(ok){usdPendQ=usdPendQ.filter(p=>p.path!==usdPath(removeId||tx?.id));saveLocal();setStatus('online','● Sincronizado');}
  else{if(removeId)enqueue('usd','remove',usdPath(removeId),null);else if(tx)enqueue('usd','set',usdPath(tx.id),tx);setStatus('offline','⚠ Offline');}
}
