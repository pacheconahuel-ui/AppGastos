// Respaldo completo (JSON), ayuda
// --- RESPALDO COMPLETO (JSON) ---
function backupData(){
  return{
    app:'AppGastos',backupVersion:1,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),
    expenses,usdTx,debts,
    settings:{customCats:cats.filter(c=>!DEF_CATS.includes(c)&&!DEF_ING_CATS.includes(c)),
      hiddenCats:[...hiddenCats],renamedCats,catTypes,catIcons:loadIconOverrides(),
      budgets,persons,accounts,transfers,goals}
  };
}
function downloadJSON(obj,name){
  const blob=new Blob([JSON.stringify(obj,null,1)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportBackup(){
  downloadJSON(backupData(),`mis-gastos-respaldo-${todayStr()}.json`);
  backupMarcar();
  toast(`💾 Respaldo descargado · ${expenses.length} movimientos`);
}
function onBackupFile(input){
  const file=input.files&&input.files[0];input.value='';
  if(!file)return;
  const rd=new FileReader();
  rd.onload=()=>{
    let b;
    try{b=JSON.parse(rd.result);}catch{toast('⚠️ El archivo no es un respaldo válido');return;}
    if(!b||b.app!=='AppGastos'||!Array.isArray(b.expenses)||!Array.isArray(b.usdTx)||!Array.isArray(b.debts)||!b.settings){
      toast('⚠️ El archivo no es un respaldo de Mis Gastos');return;
    }
    if(!fbOnline||!db||!currentUID){toast('⚠️ Necesitás conexión para restaurar');return;}
    const when=b.exportedAt?new Date(b.exportedAt).toLocaleDateString('es-AR'):'?';
    closeProfilePanel();
    showConf('restore','Restaurar respaldo',
      `Respaldo del ${when}: ${b.expenses.length} movimientos, ${b.usdTx.length} en USD, ${b.debts.length} deudas, ${(b.settings.accounts||[]).length} billeteras.\n\nReemplaza TODOS tus datos actuales. Antes se descarga un respaldo de lo que tenés hoy.`,
      ()=>restoreBackup(b),'Restaurar');
  };
  rd.readAsText(file);
}
async function restoreBackup(b){
  downloadJSON(backupData(),`mis-gastos-antes-de-restaurar-${todayStr()}.json`);
  setStatus('syncing','↑ Restaurando…');
  const byId=arr=>{const o={};arr.filter(x=>x&&x.id).forEach(x=>{o[x.id]=x;});return o;};
  try{
    const st=b.settings;
    expenses=b.expenses.filter(x=>x&&x.id);usdTx=b.usdTx.filter(x=>x&&x.id);debts=b.debts.filter(x=>x&&x.id);
    pendingQ=[];usdPendQ=[];debtPendQ=[];
    cats=[...new Set([...DEF_CATS,...DEF_ING_CATS,...(st.customCats||[])])];
    hiddenCats=new Set(st.hiddenCats||[]);renamedCats=st.renamedCats||{};
    catTypes=normalizeCatTypes(st.catTypes||{});saveIconOverrides(st.catIcons||{});
    budgets=st.budgets||{};persons=st.persons||[];accounts=st.accounts||[];
    transfers=st.transfers||[];goals=st.goals||[];
    saveLocal();saveAccounts();saveBudgets();saveGoals();
    const sets=[[arsBase(),byId(expenses)],[usdBase(),byId(usdTx)],[debtBase(),byId(debts)]];
    let failed=0;
    for(const[path,data]of sets){
      if(await fbSet(path,Object.keys(data).length?data:null))continue;
      // Si algún registro viejo no pasa las reglas, se sube de a uno y se cuentan los que no
      if(!await fbSet(path,null))throw new Error('restore '+path);
      for(const[id,x]of Object.entries(data)){if(!await fbSet(path+'/'+id,x))failed++;}
    }
    await pushSettings();
    renderAll();if(activeTab==='cuentas')renderCuentasTab();
    toast(failed?`⚠️ Respaldo restaurado, pero ${failed} registro${failed>1?'s':''} no se pudo subir (queda solo en este dispositivo)`:`✅ Respaldo restaurado · ${expenses.length} movimientos`,5000);
  }catch(e){
    toast('❌ '+errMsg(e,'No se pudo terminar de restaurar. Probá de nuevo: el respaldo de antes quedó descargado.'),5000);
  }
}

function confirmResetAll(){
  closeProfilePanel();
  // First confirmation
  showConf(
    'trash',
    'Borrar todos mis datos',
    'Esto eliminará TODOS tus gastos, ingresos, deudas, billeteras y configuración.\n\nEsta acción no se puede deshacer.',
    ()=>{
      // Second confirmation with typed word
      const word=prompt('Para confirmar, escribí exactamente: BORRAR');
      if(word?.trim().toUpperCase()==='BORRAR'){
        resetAllData();
      } else if(word!==null){
        toast('❌ Cancelado — palabra incorrecta');
      }
    },
    'Sí, borrar todo',
    'Cancelar'
  );
}

async function resetAllData(){
  setStatus('syncing','Borrando…');
  try{
    if(db&&currentUID){
      // Delete all Firebase data for this user
      await db.ref(`usuarios/${currentUID}`).remove();
    }
    // Clear all localStorage keys for this user
    lsForget();
    const keysToRemove=Object.keys(localStorage).filter(k=>k.includes(currentUID)||k.includes('gp_'));
    keysToRemove.forEach(k=>localStorage.removeItem(k));
    toast('✅ Todos los datos eliminados');
    // Logout so they start fresh
    setTimeout(()=>doLogout(),1000);
  }catch(e){
    toast('❌ '+errMsg(e,'No se pudieron borrar los datos. Probá de nuevo en un rato.'));
    setStatus('online','● Sincronizado');
  }
}

// Diálogo de confirmación único. La función se guarda (no se pasa como texto),
// así puede usar las variables del lugar que la llama.
let _confCb=null;
function showConf(ico,title,msg,onConfirm,confirmLabel='Confirmar',cancelLabel='Cancelar'){
  document.getElementById('conf-ico').innerHTML=ICO_PATHS[ico]?ic(ico):esc(ico);
  document.getElementById('conf-ttl').textContent=title;
  if(msg!=null)document.getElementById('conf-txt').textContent=msg;
  document.getElementById('conf-btns').innerHTML=`
    <button class="btn-no" onclick="closeConf()">${esc(cancelLabel)}</button>
    <button class="btn-yes" onclick="confYes()">${esc(confirmLabel)}</button>`;
  _confCb=onConfirm;
  document.getElementById('conf-overlay').classList.add('on');
  history.pushState({modal:true},'');
}
function confYes(){const cb=_confCb;closeConf();if(cb)cb();}
// Para borrar: el texto ya lo puso quien llama (conf-txt) junto con pendingDel
function openDeleteConf(){
  const pd=pendingDel;
  showConf('trash','¿Eliminar?',null,()=>{pendingDel=pd;doDelete();},'Eliminar');
}

async function runDiagnostics(){
  const el=document.getElementById('diag-result');
  if(!el)return;
  el.innerHTML=`<div style="color:var(--txt3);font-size:12px;padding:8px 0">${ic('clock')} Consultando Firebase…</div>`;
  try{
    const uid=firebase.auth().currentUser?.uid||'sin sesión';
    const email=firebase.auth().currentUser?.email||'';
    const [snapG, snapU, snapD] = await Promise.all([
      db.ref(`usuarios/${uid}/gastos`).once('value'),
      db.ref(`usuarios/${uid}/usd`).once('value'),
      db.ref(`usuarios/${uid}/debts`).once('value'),
    ]);
    const fbG=snapG.val()?Object.keys(snapG.val()).length:0;
    const fbU=snapU.val()?Object.keys(snapU.val()).length:0;
    const fbD=snapD.val()?Object.keys(snapD.val()).length:0;
    const colorD=fbD>0?'var(--green)':'var(--txt3)';
    const colorG=fbG>0?'var(--green)':'var(--red)';
    const fbS=await db.ref(settingsPath()).once('value');
    const rawS=fbS.val();
    const fbAccounts=rawS?.accounts?.length||0;
    let msg='';
    if(fbG>expenses.length) msg='<div style="color:var(--yellow);font-size:11px;margin-top:6px">'+ic('warn')+' Hay más gastos en Firebase que en pantalla — cerrá sesión, volvé a entrar</div>';
    else if(fbG===0&&expenses.length===0) msg='<div style="color:var(--red);font-size:11px;margin-top:6px">'+ic('x')+' Sin gastos — revisá que sea la cuenta correcta</div>';
    else if(fbG>0&&expenses.length===0) msg='<div style="color:var(--yellow);font-size:11px;margin-top:6px">'+ic('warn')+' Gastos en Firebase pero no cargados — cerrá sesión y volvé a entrar</div>';
    else msg='<div style="color:var(--green);font-size:11px;margin-top:6px">'+ic('check')+' Todo sincronizado</div>';
    el.innerHTML=`<div style="background:var(--surf);border:1px solid var(--bdr);border-radius:12px;padding:12px;margin-top:8px;font-size:12px;line-height:2">
      <div>Email: <b>${esc(email)}</b></div>
      <div>UID: <code style="font-size:10px;color:var(--txt3)">${uid.substring(0,20)}…</code></div>
      <div style="margin-top:4px;border-top:0.5px solid var(--bdr);padding-top:4px">
      <div>Gastos Firebase: <b style="color:${colorG}">${fbG}</b> · pantalla: <b>${expenses.length}</b></div>
      <div>Deudas Firebase: <b style="color:${colorD}">${fbD}</b> · pantalla: <b>${debts.length}</b></div>
      <div>Cuentas Firebase: <b style="color:${fbAccounts>0?'var(--green)':'var(--red)'}">${fbAccounts}</b> · pantalla: <b>${accounts.length}</b></div>
      <div>Transferencias Firebase: <b style="color:var(--txt3)">${rawS?.transfers?.length||0}</b> · pantalla: <b>${transfers.length}</b></div>
      <div>USD Firebase: <b>${fbU}</b></div>
      <div>Online: <b style="color:${fbOnline?'var(--green)':'var(--red)'}">${fbOnline?'Sí':'No'}</b></div>
      </div>
      ${msg}
    </div>`;
  }catch(e){
    el.innerHTML=`<div style="color:var(--red);font-size:12px;margin-top:6px;padding:8px;background:var(--surf);border-radius:10px">${ic('x')} Error al consultar: ${esc(e.message)}</div>`;
  }
}

