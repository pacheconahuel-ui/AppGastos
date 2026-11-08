// Configuración: armarla, aplicarla y subirla (categorías, billeteras, presupuestos…)
// --- SETTINGS: armar y aplicar en un solo lugar ---
// Firebase no acepta . # $ / [ ] en las claves. Se codifican de forma reversible
// (antes se cambiaban por "_" y se perdía el nombre real, ej. "Freelance / Honorarios").
function encKey(k){return String(k).replace(/[%.#$/\[\]]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0'));}
function decKey(k){try{return decodeURIComponent(k);}catch{return k;}}
function encKeys(obj){const o={};Object.entries(obj||{}).forEach(([k,v])=>{o[encKey(k)]=v;});return o;}
function decKeys(obj){const o={};Object.entries(obj||{}).forEach(([k,v])=>{o[decKey(k)]=v;});return o;}
// v2: el payload siempre trae todas las listas, así que una que falta significa vacía
// (Firebase no guarda listas vacías). Sin v (versiones viejas) no se pisa lo local.
const SETTINGS_V=2;
function buildSettingsPayload(ts){
  return{
    v:SETTINGS_V,
    customCats:cats.filter(c=>!DEF_CATS.includes(c)&&!DEF_ING_CATS.includes(c)),
    hiddenCats:[...hiddenCats],
    renamedCats:encKeys(renamedCats),
    catTypes:encKeys(catTypes),
    catIcons:encKeys(loadIconOverrides()),
    budgets:encKeys(budgets),
    persons,accounts,transfers,goals,
    updatedAt:ts
  };
}
function applySettings(raw){
  const full=(raw.v||0)>=2;
  const has=k=>full||raw[k]!=null;
  if(has('customCats'))  cats=[...new Set([...DEF_CATS,...DEF_ING_CATS,...(raw.customCats||[])])];
  if(has('hiddenCats'))  hiddenCats=new Set(raw.hiddenCats||[]);
  if(has('renamedCats')) renamedCats=decKeys(raw.renamedCats);
  if(has('catTypes'))    catTypes=normalizeCatTypes(decKeys(raw.catTypes));
  if(has('catIcons'))    saveIconOverrides(decKeys(raw.catIcons));
  if(has('persons'))     persons=raw.persons||[];
  if(raw.accounts!=null) accounts=raw.accounts;else if(full)accounts=[];
  if(has('transfers'))   transfers=raw.transfers||[];
  if(has('budgets'))     budgets=decKeys(raw.budgets);
  if(has('goals'))       goals=raw.goals||[];
  if(raw.updatedAt) localStorage.setItem(lsKey('gp_settings_ts'),String(raw.updatedAt));
  localStorage.removeItem('gp_settings_pending');
  saveLocal();saveAccounts();saveBudgets();saveGoals();
  renderAll();
  if(activeTab==='cuentas')renderCuentasTab();
}
// Todos los envíos de esta pestaña: su eco se ignora aunque lleguen varios seguidos
const _myPushIds=new Set();
async function pushSettings(){
  if(!db||!currentUID)return;
  const ts=Date.now();
  // Save timestamp locally BEFORE pushing so listener knows local is authoritative
  localStorage.setItem(lsKey('gp_settings_ts'), String(ts));
  saveLocal();
  if(!fbOnline){
    localStorage.setItem('gp_settings_pending','1');
    return;
  }
  const pushId=DEVICE_ID+'_'+ts+'_'+Math.random().toString(36).slice(2,6);
  _myPushIds.add(pushId);
  const payload={...buildSettingsPayload(ts),_pushId:pushId};
  const ok=await fbSet(settingsPath(),payload);
  if(ok){
    localStorage.removeItem('gp_settings_pending');
    setStatus('online','● Sincronizado');
  } else {
    console.warn('[FB] pushSettings failed');
    localStorage.setItem('gp_settings_pending','1');
    setStatus('offline','⚙ Config pendiente');
  }
}

async function persistDebt(debt,removeId){  saveLocal();
  if(!fbOnline||!currentUID){if(removeId)enqueue('debt','remove',debtPath(removeId),null);else if(debt)enqueue('debt','set',debtPath(debt.id),debt);return;}
  setStatus('syncing','↑ Guardando…');
  const ok=removeId?await fbRemove(debtPath(removeId)):await fbSet(debtPath(debt.id),debt);
  if(ok){debtPendQ=debtPendQ.filter(p=>p.path!==debtPath(removeId||debt?.id));saveLocal();setStatus('online','● Sincronizado');}
  else{if(removeId)enqueue('debt','remove',debtPath(removeId),null);else if(debt)enqueue('debt','set',debtPath(debt.id),debt);setStatus('offline','⚠ Offline');}
}

