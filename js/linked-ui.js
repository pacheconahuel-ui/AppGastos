// Pantallas del vínculo con otras personas: avisos, pagos, mi código y vincular un contacto (3.9)
function lkModal(vista,html){
  let o=document.getElementById('lk-overlay');
  if(!o){
    o=document.createElement('div');o.id='lk-overlay';o.className='m-overlay';
    o.onclick=e=>{if(e.target===o)closeLk();};
    o.innerHTML='<div class="modal" style="max-height:86vh;overflow-y:auto"><div class="m-handle"></div><div id="lk-body"></div><button class="btn-cancel" onclick="closeLk()">Cerrar</button></div>';
    document.body.appendChild(o);
  }
  if(!o.classList.contains('on')){o.classList.add('on');history.pushState({modal:true},'');}
  const b=document.getElementById('lk-body');b.dataset.vista=vista;b.innerHTML=html;
}
function closeLk(){document.getElementById('lk-overlay')?.classList.remove('on');}

// --- BANDEJA DE AVISOS ---
function openAvisos(){
  _lkSeen=new Set(avisosIn.filter(a=>!a.visto).map(a=>a.id));
  renderAvisos();
  if(db&&fbOnline)avisosIn.filter(a=>!a.visto).forEach(a=>db.ref(`avisos/${currentUID}/${a.id}/visto`).set(true).catch(()=>{}));
}
const LK_ETQ={esperando:'Esperando que confirme',saldada:'Saldada',rechazada:'Dice que no lo recibió',cancelada:'Cancelada'};
function renderAvisos(){
  const idOk=s=>/^[A-Za-z0-9_-]+$/.test(s);
  let h=`<div class="m-title">${ic('bell')} Avisos</div>`;
  lkSolicitudes().forEach(uid=>{
    h+=`<div class="aviso-card nuevo"><div class="aviso-txt"><b>${esc(vinculosIn[uid].nombre||'Alguien')}</b> quiere vincularse con vos. Si aceptás, se van a poder avisar deudas y pagos.</div>
      <div class="aviso-btns"><button class="btn-settle" onclick="aceptarVinculo('${uid}')">Aceptar</button><button class="btn-hist" onclick="rechazarVinculo('${uid}')">Rechazar</button></div></div>`;
  });
  const lista=[...avisosIn].filter(a=>idOk(a.id)).sort((a,b)=>b.creado-a.creado).slice(0,60);
  let n=0;
  lista.forEach(a=>{
    const deuda=['deuda','cambio'].includes(a.tipo);
    if(deuda&&!avisoVigente(a,avisosIn))return; // lo reemplazó un cambio posterior
    n++;
    const est=deuda?estadoDeuda(a,avisosIn):'';
    let btns='',etq='';
    if(deuda){
      if(est==='abierta'||est==='rechazada'){if(a.monto>0)btns=`<button class="btn-settle" onclick="abrirPago('${a.id}','pagar')">Ya pagué</button>`;}
      etq=LK_ETQ[est]||'';
    }else if(a.tipo==='pago'){
      if(!a.estado)btns=`<button class="btn-settle" onclick="abrirPago('${a.id}','cobrar')">Recibí el pago</button><button class="btn-hist" onclick="rechazarPago('${a.id}')">No lo recibí</button>`;
      else etq=a.estado==='confirmado'?'Confirmado':'Rechazado';
    }
    h+=`<div class="aviso-card${_lkSeen.has(a.id)?' nuevo':''}"><div class="aviso-txt">${esc(avisoTexto(a))}</div>
      <div class="aviso-meta">${a.fecha?fmtDate(a.fecha):''}${etq?` · <b>${etq}</b>`:''}</div>${btns?`<div class="aviso-btns">${btns}</div>`:''}</div>`;
  });
  if(!n&&!lkSolicitudes().length)h+=`<div class="empty" style="padding:24px 0"><div class="empty-ico">${ic('bell')}</div><p>No hay avisos<br><small>Acá te llegan las deudas y pagos de tus contactos vinculados</small></p></div>`;
  lkModal('avisos',h);
}

// --- PAGAR / COBRAR ---
function abrirPago(id,modo){
  const a=avisosIn.find(x=>x.id===id);if(!a)return;
  const n=lkNombre(a.de,a.deNombre),w=arsWallets();
  const pagar=modo==='pagar';
  lkModal('pago',`<div class="m-title">${ic(pagar?'check':'download')} ${pagar?'Ya pagué':'Recibí el pago'}</div>
    <div class="aviso-txt" style="margin-bottom:12px">${pagar?`Le pagaste ${fmt(Math.abs(a.monto))} a <b>${esc(n)}</b>${a.desc?' · '+esc(a.desc):''}. La plata sale de tu billetera y ${esc(n)} tiene que confirmar que la recibió.`:`<b>${esc(n)}</b> dice que te pagó ${fmt(Math.abs(a.monto))}${a.desc?' · '+esc(a.desc):''}. Si la recibiste, se suma a la billetera que elijas y la deuda queda saldada.`}</div>
    <div class="m-lbl">${ic('wallet')} ${pagar?'Pagué desde':'La recibí en'}</div>
    <select id="lk-acc" class="f-ctrl" style="width:100%;margin-bottom:10px">${w.length?w.map(x=>`<option value="${x.id}">${x.emoji} ${esc(x.name)}</option>`).join(''):''}<option value="">— Sin asignar —</option></select>
    <div class="m-lbl">${ic('calendar')} Fecha</div>
    <input type="date" id="lk-date" class="f-ctrl" style="width:100%;margin-bottom:14px" value="${todayStr()}">
    <button class="btn-save" id="lk-go" onclick="hacerPago('${a.id}','${modo}')">${pagar?'Confirmar pago':'Confirmar que lo recibí'}</button>`);
}
function lkPatch(a,patch){Object.assign(a,patch);return db.ref(`avisos/${currentUID}/${a.id}`).update(patch);}
async function hacerPago(id,modo){
  const a=avisosIn.find(x=>x.id===id);if(!a)return;
  if(!db||!fbOnline){toast('⚠️ Necesitás conexión para avisarle a la otra persona');return;}
  const accountId=document.getElementById('lk-acc')?.value||null,date=document.getElementById('lk-date')?.value||todayStr();
  const n=lkNombre(a.de,a.deNombre),amt=Math.abs(a.monto),pagar=modo==='pagar';
  const e={id:newId(),type:pagar?'Egreso':'Ingreso',date,category:'Otro',
    description:pagar?`Pago a ${n}${a.desc?': '+a.desc:''}`:`Cobro de ${n}${a.desc?': '+a.desc:''}`,
    amount:amt,myAmount:amt,shared:false,sharedPercent:100,accountId,createdAt:Date.now(),updatedAt:Date.now(),autoGenerated:true,liquidacion:true};
  document.getElementById('lk-go').disabled=true;
  try{
    if(pagar){
      await lkPatch(a,{estado:'pagado',pagadoEn:Date.now()});
      enviarAviso(a.de,{tipo:'pago',ref:a.ref,dueno:a.dueno||a.de,monto:amt,desc:a.desc||'',fecha:date});
    }else{
      await lkPatch(a,{estado:'confirmado'});
      // Si la deuda es mía, queda saldada
      if(a.dueno===currentUID){
        const mias=debts.filter(d=>d.id===a.ref&&!d.settled);
        debts=debts.map(d=>mias.includes(d)?{...d,settled:true,settledDate:date,updatedAt:Date.now()}:d);
        for(const d of mias){skipNextDebt=fbOnline;await persistDebt(debts.find(x=>x.id===d.id),null);}
      }
      enviarAviso(a.de,{tipo:'confirmado',ref:a.ref,dueno:a.dueno||currentUID,monto:amt,desc:a.desc||'',fecha:date});
    }
  }catch(err){console.warn('[pago]',err);toast('⚠️ No se pudo avisar. Probá de nuevo.');document.getElementById('lk-go').disabled=false;return;}
  expenses.push(e);skipNextArs=fbOnline;await persistArs(e,null);
  haptic();renderAll();renderAvisos();
  toast(pagar?`✅ Pago a ${n} registrado · esperando que confirme`:`✅ Cobro de ${n} confirmado`);
}
async function rechazarPago(id){
  const a=avisosIn.find(x=>x.id===id);if(!a)return;
  if(!db||!fbOnline){toast('⚠️ Necesitás conexión');return;}
  try{await lkPatch(a,{estado:'rechazado'});}catch(e){toast('⚠️ No se pudo. Probá de nuevo.');return;}
  enviarAviso(a.de,{tipo:'rechazado',ref:a.ref,dueno:a.dueno||a.de,monto:Math.abs(a.monto),desc:a.desc||'',fecha:todayStr()});
  renderAvisos();toast('Le avisamos que no lo recibiste');
}

// --- MI CÓDIGO ---
async function openMiCodigo(){
  if(!db||!fbOnline){toast('⚠️ Necesitás conexión');return;}
  let c;try{c=await miCodigo();}catch(e){toast('⚠️ No se pudo generar el código');return;}
  lkModal('codigo',`<div class="m-title">${ic('link')} Mi código de contacto</div>
    <div class="aviso-txt" style="margin-bottom:12px">Pasale este código a una persona que use la app. Ella lo pega en su contacto tuyo y vos aceptás: desde ahí se avisan las deudas y los pagos entre ustedes. Solo se ven lo que cada uno carga con el otro, nada más.</div>
    <input id="lk-code" class="f-ctrl" readonly value="${esc(c)}" style="width:100%;margin-bottom:10px" onclick="this.select()">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="btn-save" style="flex:1" onclick="copiarCodigo()">Copiar</button>
      ${navigator.share?`<button class="btn-hist" style="flex:1" onclick="compartirCodigo()">Compartir</button>`:''}
    </div>
    <button class="btn-hist" style="width:100%" onclick="renovarCodigo()">Cambiar mi código</button>
    <div class="aviso-meta" style="margin-top:6px">Al cambiarlo, el código viejo deja de servir para vincular gente nueva. Los vínculos que ya hiciste siguen.</div>`);
}
async function copiarCodigo(){
  const c=document.getElementById('lk-code').value;
  try{await navigator.clipboard.writeText(c);toast('✅ Código copiado');}catch{document.getElementById('lk-code').select();toast('Seleccionado: copialo');}
}
function compartirCodigo(){navigator.share({title:'Mi código en Mis Gastos',text:document.getElementById('lk-code').value}).catch(()=>{});}
async function renovarCodigo(){
  try{await cambiarMiCodigo();}catch(e){toast('⚠️ No se pudo cambiar');return;}
  closeLk();openMiCodigo();
}

// --- VINCULAR UN CONTACTO ---
function openVincular(personId){
  const p=personById(personId);if(!p)return;
  if(p.linkedUid){
    const mutuo=!!vinculosIn[p.linkedUid];
    lkModal('vincular',`<div class="m-title">${ic('link')} ${esc(p.name)}</div>
      <div class="aviso-txt" style="margin-bottom:12px">${mutuo?'Está vinculado: cuando le cargues una deuda le llega un aviso, y puede pagarte desde la app.':'Pediste vincularlo. Falta que acepte desde su app.'}</div>
      <button class="btn-hist" style="width:100%" onclick="desvincularContacto('${p.id}');closeLk()">Desvincular</button>`);
    return;
  }
  lkModal('vincular',`<div class="m-title">${ic('link')} Vincular a ${esc(p.name)}</div>
    <div class="aviso-txt" style="margin-bottom:12px">Pedile su <b>código de contacto</b> (lo ve en Perfil → Mi código de contacto) y pegalo acá. Cuando acepte, le van a llegar los avisos de las deudas que le cargues.</div>
    <input id="lk-in" class="f-ctrl" placeholder="Pegá su código" autocapitalize="off" autocomplete="off" style="width:100%;margin-bottom:12px">
    <button class="btn-save" onclick="vincularDesdeModal('${p.id}')">Vincular</button>`);
}
async function vincularDesdeModal(personId){
  const ok=await vincularContacto(personId,document.getElementById('lk-in').value);
  if(ok){closeLk();if(document.getElementById('contacts-overlay')?.classList.contains('on'))renderContactsList();}
}
