// Quién usa la app (3.17): acceso restringido opcional, pantalla de administración y aviso de respaldo.
// Solo se guarda actividad (último acceso, versión, cantidad de movimientos): nunca montos ni descripciones.
// Las reglas de Firebase (database.rules.json) son las que hacen cumplir el acceso; esto es la parte visible.

let ES_ADMIN=false;

// "hace 5 min", "ayer", "hace 12 días"
function haceCuanto(ms,ahora=Date.now()){
  if(!ms)return'nunca';
  const m=Math.floor((ahora-ms)/60000);
  if(m<1)return'recién';
  if(m<60)return`hace ${m} min`;
  const h=Math.floor(m/60);
  if(h<24)return`hace ${h} h`;
  const d=Math.floor(h/24);
  if(d===1)return'ayer';
  if(d<60)return`hace ${d} días`;
  return`hace ${Math.floor(d/30)} meses`;
}
function conTimeout(p,ms){return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);}

// --- Acceso ---
// Con la restricción apagada (lo normal) entra cualquiera. Prendida, solo quien figura en "permitidos" y el administrador.
// Si no se puede consultar (sin conexión, reglas viejas) no se bloquea a nadie: las reglas son las que mandan.
async function verificarAcceso(){
  if(!db||!currentUID)return true;
  try{
    const [r,p,a]=await conTimeout(Promise.all([
      db.ref('config/restringido').once('value'),
      db.ref('permitidos/'+currentUID).once('value'),
      db.ref('admin/uid').once('value')]),7000);
    ES_ADMIN=a.val()===currentUID;
    return r.val()!==true||p.val()===true||ES_ADMIN;
  }catch(e){return true;}
}
function bloquearAcceso(){
  if(arsListener)db?.ref(arsBase()).off('value',arsListener);
  if(usdListener)db?.ref(usdBase()).off('value',usdListener);
  if(debtListener)db?.ref(debtBase()).off('value',debtListener);
  try{lkDetach();}catch(e){}
  document.getElementById('app').classList.add('hidden');
  document.getElementById('sin-acceso').classList.remove('hidden');
  const u=auth?.currentUser;
  const el=document.getElementById('sin-acceso-cuenta');
  if(el)el.textContent=u?.email||'';
  window.SIN_ACCESO=true;
}
async function reintentarAcceso(){
  const btn=document.getElementById('sin-acceso-retry');if(btn)btn.disabled=true;
  const ok=await verificarAcceso();
  if(btn)btn.disabled=false;
  if(ok)location.reload();else toast('Todavía no te autorizaron');
}
function salirSinAcceso(){doLogout();document.getElementById('sin-acceso').classList.add('hidden');}

// Al entrar: una vez cada 6 horas por dispositivo. Sirve también para que quien todavía no tiene acceso figure en la lista del administrador.
async function registrarActividad(){
  if(!db||!currentUID||!fbOnline)return;
  const k='gp_act_ts_'+currentUID,last=parseInt(localStorage.getItem(k))||0;
  if(Date.now()-last<6*3600*1000)return;
  const u=auth?.currentUser;
  try{
    const ref=db.ref('actividad/'+currentUID);
    await ref.update({
      ultimo:Date.now(),version:APP_VERSION,
      nombre:(u?.displayName||'').slice(0,80),email:(u?.email||'').slice(0,120),
      movs:expenses.length+usdTx.length+debts.length});
    await ref.child('primero').transaction(v=>v||Date.now());
    localStorage.setItem(k,String(Date.now()));
  }catch(e){console.warn('[Actividad]',e.message);}
}

// Una marca por día y por persona (solo la fecha): alcanza para saber quién usa la app y con qué frecuencia
async function registrarDia(){
  if(!db||!currentUID||!fbOnline)return;
  const hoy=todayStr(),k='gp_dia_'+currentUID;
  if(localStorage.getItem(k)===hoy)return;
  try{await db.ref('actividad_dias/'+currentUID+'/'+hoy).set(true);localStorage.setItem(k,hoy);}
  catch(e){console.warn('[Actividad día]',e.message);}
}

// --- Cálculos de la pantalla del administrador (sin pantalla, con pruebas) ---
// Los n días hasta hoy, del más viejo al más nuevo
function adminDiasAtras(hoy,n){
  const t=parseYmd(hoy);
  return Array.from({length:n},(_,i)=>ymd(new Date(t.getFullYear(),t.getMonth(),t.getDate()-(n-1-i))));
}
// Días en que entró una persona: las marcas diarias y, para quien todavía no las tiene, el día de su último acceso
function adminDiasDe(u,dias){
  const set=new Set(Object.keys((dias&&dias[u.uid])||{}));
  if(u.ultimo)set.add(ymd(new Date(u.ultimo)));
  return set;
}
function adminResumen(users,dias,hoy){
  const activos=n=>{const ds=adminDiasAtras(hoy,n);return users.filter(u=>{const s=adminDiasDe(u,dias);return ds.some(d=>s.has(d));}).length;};
  return{total:users.length,hoy:activos(1),sem:activos(7),mes:activos(30),sinAutorizar:users.filter(u=>!u.permitido&&!u.yo).length};
}
// Cuántas personas entraron cada uno de los últimos n días
function adminPorDia(users,dias,hoy,n=30){
  return adminDiasAtras(hoy,n).map(d=>({dia:d,n:users.filter(u=>adminDiasDe(u,dias).has(d)).length}));
}
function adminFiltrar(users,dias,hoy,{filtro='todos',texto=''}={}){
  const q=texto.trim().toLowerCase();
  const mes=adminDiasAtras(hoy,30);
  return users.filter(u=>{
    if(filtro==='autorizados'&&!(u.permitido||u.yo))return false;
    if(filtro==='sin'&&(u.permitido||u.yo))return false;
    if(filtro==='inactivos'){const s=adminDiasDe(u,dias);if(mes.some(d=>s.has(d)))return false;}
    return !q||[u.nombre,u.email].some(x=>(x||'').toLowerCase().includes(q));
  });
}
function adminCSV(users,dias,hoy){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',mes=adminDiasAtras(hoy,30);
  const f=ms=>ms?new Date(ms).toISOString().slice(0,10):'';
  const rows=users.map(u=>{const s=adminDiasDe(u,dias);return[u.nombre,u.email,u.yo?'administrador':u.permitido?'autorizado':'sin autorizar',f(u.primero),f(u.ultimo),u.version,u.movs,mes.filter(d=>s.has(d)).length];});
  return[['nombre','email','estado','primer_acceso','ultimo_acceso','version','movimientos','dias_activos_30'],...rows].map(r=>r.map(q).join(',')).join('\n');
}

// --- Pantalla del administrador (la pantalla está en admin-ui.js) ---
async function adminDatos(){
  const [r,p,a,dd]=await Promise.all([db.ref('config/restringido').once('value'),db.ref('permitidos').once('value'),db.ref('actividad').once('value'),db.ref('actividad_dias').once('value')]);
  const perm=p.val()||{},act=a.val()||{},dias=dd.val()||{};
  const uids=new Set([...Object.keys(perm),...Object.keys(act)]);
  const users=[...uids].map(uid=>({uid,...(act[uid]||{}),permitido:perm[uid]===true,yo:uid===currentUID}))
    .sort((x,y)=>(y.ultimo||0)-(x.ultimo||0));
  return{restringido:r.val()===true,users,dias};
}
async function adminAutorizar(uid,si){
  try{
    if(si)await db.ref('permitidos/'+uid).set(true);else await db.ref('permitidos/'+uid).remove();
    toast(si?'✅ Autorizada':'Acceso quitado');
  }catch(e){toast('❌ '+errMsg(e));}
  adminRefrescar();
}
async function adminAutorizarTodos(){
  try{
    const d=await adminDatos(),upd={};
    d.users.filter(u=>!u.permitido&&!u.yo).forEach(u=>{upd['permitidos/'+u.uid]=true;});
    await db.ref().update(upd);
    toast('✅ Autorizadas');
  }catch(e){toast('❌ '+errMsg(e));}
  adminRefrescar();
}
async function adminRestringir(si){
  const hacer=async()=>{
    try{await db.ref('config/restringido').set(si);toast(si?'🔒 Solo personas autorizadas':'🔓 Entra cualquiera');}
    catch(e){toast('❌ '+errMsg(e));}
    adminRefrescar();
  };
  if(!si){hacer();return;}
  const d=await adminDatos(),quedan=d.users.filter(u=>!u.permitido&&!u.yo);
  showConf('warn','Prender la restricción',
    quedan.length?`Estas ${quedan.length} persona${quedan.length>1?'s':''} no van a poder entrar hasta que las autorices: ${quedan.map(u=>u.nombre||u.email||'sin nombre').join(', ')}.`:'Desde ahora solo entran las personas autorizadas.',hacer,'Prender');
}

// --- Aviso de respaldo (cada 30 días) ---
const BACKUP_DIAS=30;
function backupKey(){return lsKey('gp_last_backup');}
function backupMarcar(){try{localStorage.setItem(backupKey(),String(Date.now()));localStorage.removeItem(lsKey('gp_backup_snooze'));}catch(e){}renderBackupAviso();}
// Hace cuántos días no se baja un respaldo; null si todavía no hay datos que valga la pena respaldar
function backupPendiente(ahora=Date.now()){
  if(expenses.length+usdTx.length+debts.length<5)return null;
  const snooze=parseInt(localStorage.getItem(lsKey('gp_backup_snooze')))||0;
  if(ahora<snooze)return null;
  const last=parseInt(localStorage.getItem(backupKey()))||0;
  if(!last)return Infinity;
  const dias=Math.floor((ahora-last)/86400000);
  return dias>=BACKUP_DIAS?dias:null;
}
function backupPosponer(){try{localStorage.setItem(lsKey('gp_backup_snooze'),String(Date.now()+7*86400000));}catch(e){}renderBackupAviso();}
function renderBackupAviso(){
  const el=document.getElementById('backup-aviso');if(!el)return;
  const d=backupPendiente();
  if(d===null){el.innerHTML='';return;}
  el.innerHTML=`<div class="card-reminder" style="background:color-mix(in srgb,var(--warn) 8%,transparent);border-color:color-mix(in srgb,var(--warn) 25%,transparent)">
    <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--yellow)">${ic('save')} ${d===Infinity?'Todavía no bajaste un respaldo':'Hace '+d+' días que no bajás un respaldo'}</div>
    <div style="font-size:12px;color:var(--txt2);margin-top:2px">Es un archivo con todos tus datos. Si algo sale mal, se restaura.</div></div>
    <button class="card-reminder-btn alt" onclick="backupPosponer()">Después</button>
    <button class="card-reminder-btn" onclick="exportBackup()">Descargar</button></div>`;
}
