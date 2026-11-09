// Login, listeners de Firebase y arranque de la sincronización
// --- AUTH ---
function loginGoogle(){
  if(!auth){toast('⚠️ Firebase no inicializado, recargá la página');return;}
  const provider=new firebase.auth.GoogleAuthProvider();
  // Siempre la lista de cuentas: si no, Google entra solo con la que ya está abierta en el navegador
  provider.setCustomParameters({prompt:'select_account'});
  auth.signInWithPopup(provider).catch(e=>{
    // If popup blocked, fall back to redirect
    if(e.code==='auth/popup-blocked'||e.code==='auth/popup-closed-by-user'){
      auth.signInWithRedirect(provider).catch(e2=>
        document.getElementById('login-err').textContent=e2.message
      );
    } else {
      document.getElementById('login-err').textContent=e.message;
    }
  });
}
function loginEmail(){
  if(!auth){toast('⚠️ Firebase no inicializado, recargá la página');return;}
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-pass').value;
  const errEl=document.getElementById('login-err');errEl.textContent='';
  if(!email||!pass){errEl.textContent='Completá email y contraseña.';return;}
  const action=isRegisterMode?auth.createUserWithEmailAndPassword(email,pass):auth.signInWithEmailAndPassword(email,pass);
  action.catch(e=>{const m={'auth/user-not-found':'No existe esa cuenta.','auth/wrong-password':'Contraseña incorrecta.','auth/email-already-in-use':'Email ya registrado.','auth/weak-password':'Mínimo 6 caracteres.','auth/invalid-email':'Email inválido.'};errEl.textContent=m[e.code]||e.message;});
}
function toggleRegister(){isRegisterMode=!isRegisterMode;document.getElementById('btn-email-action').textContent=isRegisterMode?'Crear cuenta':'Iniciar sesión';document.getElementById('toggle-txt').textContent=isRegisterMode?'Ya tengo cuenta':'Registrarse';document.getElementById('login-err').textContent='';}
function doLogout(){
  if(arsListener)db?.ref(arsBase()).off('value',arsListener);
  if(usdListener)db?.ref(usdBase()).off('value',usdListener);
  if(debtListener)db?.ref(debtBase()).off('value',debtListener);
  expenses=[];usdTx=[];debts=[];cats=[...DEF_CATS];persons=[...DEF_PERSONS];
  pendingQ=[];usdPendQ=[];debtPendQ=[];
  hiddenCats=new Set();renamedCats={};catTypes={};
  currentUID=null;
  auth.signOut();
}

// --- FIREBASE INIT + LISTENERS ---
// Firebase vacío: si este dispositivo ya había recibido datos, se borraron en otro
// (borrar el último gasto, "Borrar todos mis datos") y se respeta. Solo si nunca
// recibió nada se suben los datos locales (los de antes de tener sincronización).
function syncedKey(kind){return lsKey('gp_synced_'+kind);}
function onEmptyRemote(kind,list,queue,pathFn){
  if(localStorage.getItem(syncedKey(kind)))return queue.filter(p=>p.op==='set').map(p=>p.data);
  if(fbOnline)list.forEach(x=>fbSet(pathFn(x.id),x));
  return list;
}
function attachListeners(){
  if(!db||!currentUID)return;
  if(arsListener)db.ref(arsBase()).off('value',arsListener);
  if(usdListener)db.ref(usdBase()).off('value',usdListener);
  if(debtListener)db.ref(debtBase()).off('value',debtListener);

  arsListener=db.ref(arsBase()).on('value',snap=>{
    fbReady=true;if(skipNextArs){skipNextArs=false;return;}
    const raw=snap.val();
    if(raw){
      let rows=Object.values(raw).filter(e=>e&&e.id);
      const pRem=new Set(pendingQ.filter(p=>p.op==='remove').map(p=>p.path.split('/').pop()));
      rows=rows.filter(e=>!pRem.has(e.id));
      for(const p of pendingQ.filter(p=>p.op==='set')){const id=p.path.split('/').pop();const i=rows.findIndex(e=>e.id===id);if(i>-1)rows[i]=p.data;else rows.push(p.data);}
      expenses=rows;
      localStorage.setItem(syncedKey('ars'),'1');
      saveLocal();renderAll();
    }else if(expenses.length>0){
      expenses=onEmptyRemote('ars',expenses,pendingQ,arsPath);saveLocal();renderAll();
    }
  },err=>{console.warn('[FB] gastos:',err);fbReady=true;});

  usdListener=db.ref(usdBase()).on('value',snap=>{
    if(skipNextUsd){skipNextUsd=false;return;}
    const raw=snap.val();
    if(raw){
      let rows=Object.values(raw).filter(t=>t&&t.id);
      const pRem=new Set(usdPendQ.filter(p=>p.op==='remove').map(p=>p.path.split('/').pop()));
      rows=rows.filter(t=>!pRem.has(t.id));
      for(const p of usdPendQ.filter(p=>p.op==='set')){const id=p.path.split('/').pop();const i=rows.findIndex(t=>t.id===id);if(i>-1)rows[i]=p.data;else rows.push(p.data);}
      usdTx=rows;localStorage.setItem(syncedKey('usd'),'1');saveLocal();renderAll();
    }else if(usdTx.length>0){usdTx=onEmptyRemote('usd',usdTx,usdPendQ,usdPath);saveLocal();renderAll();}
  },err=>console.warn('[FB] usd:',err));

  debtListener=db.ref(debtBase()).on('value',snap=>{
    if(skipNextDebt){skipNextDebt=false;return;}
    const raw=snap.val();
    if(raw){
      let rows=Object.values(raw).filter(d=>d&&d.id);
      const pRem=new Set(debtPendQ.filter(p=>p.op==='remove').map(p=>p.path.split('/').pop()));
      rows=rows.filter(d=>!pRem.has(d.id));
      for(const p of debtPendQ.filter(p=>p.op==='set')){const id=p.path.split('/').pop();const i=rows.findIndex(d=>d.id===id);if(i>-1)rows[i]=p.data;else rows.push(p.data);}
      debts=rows;localStorage.setItem(syncedKey('debt'),'1');saveLocal();renderAll();
    }else if(debts.length>0){debts=onEmptyRemote('debt',debts,debtPendQ,debtPath);saveLocal();renderAll();}
  },err=>console.warn('[FB] debts:',err));

  // Settings listener — always applies Firebase data when it arrives
  // Echo prevention: ignore updates that WE just pushed (identified by _pushId)
  // Cross-device: Firebase is source of truth — updates from other devices always apply
  db.ref(settingsPath()).on('value',snap=>{
    const raw=snap.val();
    if(!raw)return;

    // Eco de un envío propio: lo local ya está igual o más nuevo
    if(raw._pushId && _myPushIds.has(raw._pushId))return;
    // Hay cambios locales sin subir: no pisarlos; se suben al reconectar
    if(localStorage.getItem('gp_settings_pending'))return;
    applySettings(raw);
  },err=>console.warn('[FB] settings:',err));
}

function initFirebase(){
  if(typeof firebase==='undefined'){setStatus('offline','⚠ Sin Firebase');fbReady=true;showApp(null);return;}
  try{
    firebase.initializeApp(FB_CONFIG);
    db=firebase.database();auth=firebase.auth();
    // Solo pruebas (npm run test:firebase): window.FB_EMULATOR lo pone Playwright antes de cargar
    if(window.FB_EMULATOR){db.useEmulator('127.0.0.1',9000);auth.useEmulator('http://127.0.0.1:9099',{disableWarnings:true});}
    db.ref('.info/connected').on('value',async snap=>{
      const was=fbOnline;fbOnline=!!snap.val();
      if(fbOnline){
        setStatus('online','● Sincronizado');
        if(!was&&fbReady&&currentUID){
          await flushQueueFor('ars');
          await flushQueueFor('usd');
          await flushQueueFor('debt');
          // Flush pending settings if any
          if(localStorage.getItem('gp_settings_pending')){
            localStorage.removeItem('gp_settings_pending');
            await pushSettings();
            toast('☁️ Configuración sincronizada');
            setStatus('online','● Sincronizado');
          }
        }
      }
      else setStatus('offline','⚠ Offline');
    });
    auth.onAuthStateChanged(user=>{
      if(user){
        currentUID=user.uid;
        loadLocal();
        try{renderAll();}catch(e){console.error('[render] Error on auth load:',e);}
        attachListeners();
        showApp(user);
        // Push a state now that we're inside the app — back button stays here
        history.replaceState({app:true}, '');
        setTimeout(checkMigration,1500);
        // Only push settings on login if there are LOCAL changes pending upload
        // (don't push on every login — it would overwrite Firebase with stale local data
        //  before the settings listener has a chance to pull the latest from server)
        setTimeout(async()=>{
          // Lo cargado sin conexión en la sesión anterior: .info/connected suele llegar
          // antes que los datos (fbReady), así que esa subida no se hacía al entrar
          if(fbOnline&&currentUID){await flushQueueFor('ars');await flushQueueFor('usd');await flushQueueFor('debt');}
          if(localStorage.getItem('gp_settings_pending')){
            console.log('[Settings] Pending changes found — pushing to Firebase');
            pushSettings();
          }
        }, 4000); // 4s gives the settings listener time to fire first
      }else showApp(null);
    });
    // Handle redirect result (from signInWithRedirect on mobile)
    auth.getRedirectResult().then(result=>{
      if(result?.user) console.log('[Auth] Redirect sign-in OK:', result.user.email);
    }).catch(e=>{
      if(e.code!=='auth/no-current-user'){
        console.warn('[Auth] Redirect error:',e.message);
        document.getElementById('login-err').textContent=e.message;
      }
    });
  }catch(e){console.error('[Firebase] Init failed:',e);setStatus('offline','⚠ Sin Firebase');fbReady=true;showApp(null);}
}

function showApp(user){
  document.getElementById('login-screen').classList.toggle('hidden',!!user);
  document.getElementById('app').classList.toggle('hidden',!user);
  if(user){
    const name=user.displayName||user.email?.split('@')[0]||'Usuario';
    document.getElementById('hdr-badge').textContent=name;
    const ava=document.getElementById('profile-avatar-ico');
    if(ava)ava.textContent=name.charAt(0).toUpperCase();
    loadTheme();
  }
}

