// Botón atrás, perfil, diagnóstico, borrar todo y diálogo de confirmación
// --- BACK BUTTON HANDLER (Android PWA) ---
// Push a state when any modal opens, pop it on close
// Double-back to exit when no modal is open

let _backExitTimer = null;
let _modalOpen = false;

function pushModalState(){
  _modalOpen = true;
  history.pushState({modal:true}, '');
}
function popModalState(){
  // Only pop if we pushed (avoid double-pop)
  if(_modalOpen){
    _modalOpen = false;
    // Don't call history.back() here — let the popstate handler do it
  }
}

window.addEventListener('popstate', e => {
  // Only handle back button when user is logged in
  if(!currentUID){ return; }

  const anyOpen = [
    'm-overlay','usd-overlay','debt-overlay','settle-overlay',
    'cat-overlay','contacts-overlay','add-contact-overlay',
    'gsearch-overlay','qa-overlay','transfer-overlay','account-overlay',
    'goal-overlay','budget-overlay','cc-pay-overlay','profile-overlay',
    'help-overlay','adjust-overlay','conf-overlay','new-overlay'
  ].some(id => document.getElementById(id)?.classList.contains('on'));

  if(anyOpen){
    closeModal();closeUsdModal();closeDebtModal();closeSettleModal();
    closeConf();closeCatManager();closeContactsModal();closeAddContactModal();
    closeGlobalSearch();closeQuickAdd();closeTransferModal();closeAccountModal();
    closeGoalModal();closeBudgetModal();closeCCPayModal();closeProfilePanel();
    closeHelpModal();closeAdjustModal();closeNewSheet();
    history.pushState({modal:true}, '');
    return;
  }

  // No modal — double-back to exit
  if(_backExitTimer){
    clearTimeout(_backExitTimer);
    _backExitTimer = null;
    return;
  }
  toast('↩ Tocá atrás de nuevo para salir', 2000);
  history.pushState({app:true}, '');
  _backExitTimer = setTimeout(() => { _backExitTimer = null; }, 2000);
});

// Replace (not push) initial state — avoids adding login to history stack
history.replaceState({app:true}, '');


function openProfilePanel(){
  const user=firebase.auth().currentUser;
  const name=user?.displayName||user?.email?.split('@')[0]||'Usuario';
  const email=user?.email||'';
  const initial=name.charAt(0).toUpperCase();
  const isLight=document.body.classList.contains('light');
  document.getElementById('profile-panel-body').innerHTML=`
    <div class="m-title" style="margin-bottom:16px">👤 Perfil</div>
    <div class="profile-user-card">
      <div class="profile-user-ava">${initial}</div>
      <div class="profile-user-info">
        <div class="profile-user-name">${esc(name)}</div>
        <div class="profile-user-email">${esc(email)}</div>
      </div>
    </div>
    <div class="profile-sec-lbl">Configuración</div>
    <button class="profile-action-row" onclick="toggleTheme();renderProfileThemeRow()">
      <span class="par-ico" id="par-theme-ico">${isLight?'🌙':'☀️'}</span>
      <span id="par-theme-lbl">${isLight?'Modo oscuro':'Modo claro'}</span>
      <span class="par-chevron">›</span>
    </button>
    <button class="profile-action-row" onclick="closeProfilePanel();openCatManager()">
      <span class="par-ico">🏷️</span>Gestionar categorías<span class="par-chevron">›</span>
    </button>
    <button class="profile-action-row" onclick="closeProfilePanel();openContactsModal()">
      <span class="par-ico">👥</span>Contactos<span class="par-chevron">›</span>
    </button>
    <button class="profile-action-row" onclick="closeProfilePanel();switchTab('cuentas')">
      <span class="par-ico">💼</span>Cuentas y tarjetas<span class="par-chevron">›</span>
    </button>
    <div class="profile-sec-lbl">Ayuda</div>
    <button class="profile-action-row" onclick="closeProfilePanel();openHelpModal()">
      <span class="par-ico">❓</span>Guía rápida<span class="par-chevron">›</span>
    </button>
    <button class="profile-action-row" onclick="closeProfilePanel();openGlobalSearch()">
      <span class="par-ico">🔍</span>Búsqueda global<span class="par-chevron">›</span>
    </button>
    <div class="profile-sec-lbl">Diagnóstico</div>
    <button class="profile-action-row" onclick="runDiagnostics()">
      <span class="par-ico">🔬</span>Verificar datos en Firebase<span class="par-chevron">›</span>
    </button>
    <button class="profile-action-row" onclick="forceSyncSettings(this)">
      <span class="par-ico">⬇️</span>Traer config del servidor<span class="par-chevron" id="force-sync-status">›</span>
    </button>
    <button class="profile-action-row" onclick="forcePushSettings(this)">
      <span class="par-ico">⬆️</span>Subir mi config al servidor<span class="par-chevron" id="force-push-status">›</span>
    </button>
    <div id="diag-result"></div>
    <div class="profile-sec-lbl">Respaldo</div>
    <button class="profile-action-row" onclick="exportBackup()">
      <span class="par-ico">💾</span>Descargar respaldo completo<span class="par-chevron">›</span>
    </button>
    <button class="profile-action-row" onclick="document.getElementById('backup-file').click()">
      <span class="par-ico">♻️</span>Restaurar un respaldo<span class="par-chevron">›</span>
    </button>
    <div class="profile-sec-lbl">Cuenta</div>
    <button class="profile-action-row" onclick="confirmResetAll()" style="color:var(--red)">
      <span class="par-ico">🗑️</span>Borrar todos mis datos<span class="par-chevron">›</span>
    </button>
    <button class="profile-action-row" onclick="doLogout()" style="color:var(--txt3)">
      <span class="par-ico">⏏</span>Cerrar sesión<span class="par-chevron">›</span>
    </button>
  `;
  document.getElementById('profile-overlay').classList.add('on');history.pushState({modal:true},'');
}
function renderProfileThemeRow(){
  const isLight=document.body.classList.contains('light');
  const ico=document.getElementById('par-theme-ico');
  const lbl=document.getElementById('par-theme-lbl');
  if(ico)ico.textContent=isLight?'🌙':'☀️';
  if(lbl)lbl.textContent=isLight?'Modo oscuro':'Modo claro';
}
function closeProfilePanel(){document.getElementById('profile-overlay').classList.remove('on');}
function profileOverlayClick(ev){if(ev.target===document.getElementById('profile-overlay'))closeProfilePanel();}

async function forcePushSettings(btn){
  const statusEl=document.getElementById('force-push-status');
  if(statusEl)statusEl.textContent='⏳';
  if(btn)btn.style.opacity='.6';
  try{
    // Re-check auth state in case session was restored after page load
    const currentUser=firebase.auth().currentUser;
    if(!currentUser){
      throw new Error('No hay sesión activa — cerrá sesión y volvé a entrar con Google');
    }
    if(!currentUID) currentUID=currentUser.uid;
    if(!db) throw new Error('Firebase no inicializado');
    if(!fbOnline) throw new Error('Sin conexión a internet');

    // Force token refresh before writing
    await currentUser.getIdToken(true);

    
    const ts=Date.now();
    const pushId=DEVICE_ID+'_'+ts+'_'+Math.random().toString(36).slice(2,6);
    _myPushIds.add(pushId);
    localStorage.setItem(lsKey('gp_settings_ts'),String(ts));
    const ok=await fbSet(settingsPath(),{...buildSettingsPayload(ts),_pushId:pushId});
    if(!ok)throw Object.assign(new Error('fbSet failed'),{userMsg:'No se pudo subir la configuración. Cerrá sesión y volvé a entrar.'});
    localStorage.removeItem('gp_settings_pending');
    if(statusEl)statusEl.textContent='✅';
    if(btn)btn.style.opacity='1';
    toast(`✅ Config subida — ${transfers.length} transferencia${transfers.length!==1?'s':''}${accounts.length?' · '+accounts.length+' cuentas':''}`);
    setTimeout(()=>{ if(statusEl)statusEl.textContent='›'; },3000);
  }catch(e){
    
    if(statusEl)statusEl.textContent='❌';
    if(btn)btn.style.opacity='1';
    toast('❌ '+errMsg(e));
  }
}

async function forceSyncSettings(btn){
  const statusEl=document.getElementById('force-sync-status');
  if(statusEl)statusEl.textContent='⏳';
  if(btn)btn.style.opacity='.6';
  try{
    if(!db||!currentUID)throw new Error('Sin conexión a Firebase');
    // PULL from Firebase — read and apply server settings
    const snap=await db.ref(settingsPath()).once('value');
    const raw=snap.val();
    if(raw){
      applySettings(raw);
      toast('✅ Datos actualizados desde el servidor');
    } else {
      toast('ℹ Sin configuración en el servidor aún');
    }
    if(statusEl)statusEl.textContent='✅';
    if(btn)btn.style.opacity='1';
    setTimeout(()=>{ if(statusEl)statusEl.textContent='›'; },3000);
  }catch(e){
    if(statusEl)statusEl.textContent='❌';
    if(btn)btn.style.opacity='1';
    toast('❌ '+errMsg(e,'No se pudo traer la configuración. Probá de nuevo en un rato.'));
  }
}

