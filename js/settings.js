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
  if(has('customCats'))  cats=armarCats(raw.customCats||[]);
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
// Qué sección de la configuración hay en el servidor (3.27): solo se sube lo que cambió, así dos dispositivos que
// tocan secciones distintas (transferencias y presupuestos, por ejemplo) no se pisan. Vacío y ausente son lo mismo.
const _CFG_CLAVES=['customCats','hiddenCats','renamedCats','catTypes','catIcons','budgets','persons','accounts','transfers','goals'];
let _cfgBase={};
function _cfgNorm(v){
  if(v==null)return'';
  if(Array.isArray(v))return v.length?JSON.stringify(v):'';
  if(typeof v==='object')return Object.keys(v).length?JSON.stringify(v):'';
  return JSON.stringify(v);
}
// Lo que llegó del servidor es la base contra la que se compara
function cfgRecordarBase(raw){_cfgBase={};_CFG_CLAVES.forEach(k=>{_cfgBase[k]=_cfgNorm(raw[k]);});}
// Devuelve solo las secciones que difieren de la base. Si no se sabe qué hay en el servidor (base desconocida) se suben
// las secciones con contenido, pero una sección vacía NO se manda: sería borrar algo que no se sabe si existe.
function cambiosDeConfig(full,base=_cfgBase,forzar=false){
  const out={};
  _CFG_CLAVES.forEach(k=>{
    const n=_cfgNorm(full[k]);
    if(base[k]===undefined){if(n!==''||forzar)out[k]=full[k];}
    else if(base[k]!==n)out[k]=full[k];
  });
  return out;
}
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
  const full=buildSettingsPayload(ts);
  const cambios=cambiosDeConfig(full);
  // update() escribe solo estas claves y deja las demás como están en el servidor
  const payload={...cambios,v:full.v,updatedAt:full.updatedAt,_pushId:pushId};
  const ok=await fbUpdate(settingsPath(),payload);
  if(ok){
    _CFG_CLAVES.forEach(k=>{if(k in cambios)_cfgBase[k]=_cfgNorm(full[k]);});
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

