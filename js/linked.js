// Vínculo con otras personas que usan la app y avisos de deudas y pagos (3.9)
// Cada persona tiene un código de contacto (su uid + un secreto). Quien lo recibe lo pega en su contacto y la otra
// persona acepta; desde ahí se mandan avisos de deudas y pagos por Firebase (reglas en database.rules.json).
// Los avisos no se editan: lo que pasa después (pagué, confirmé, borré) es otro aviso.

const LK_OUT_SK='gp_avisos_out_v1';
let avisosIn=[],vinculosIn={},avisosOut=[],avisosRef=null,vinculosRef=null,_lkSeen=new Set();

function lkLoadOut(){try{avisosOut=JSON.parse(localStorage.getItem(lsKey(LK_OUT_SK)))||[];}catch{avisosOut=[];}}
function lkSaveOut(){try{localStorage.setItem(lsKey(LK_OUT_SK),JSON.stringify(avisosOut));}catch(e){}}
function lkMyName(){const u=typeof auth!=='undefined'&&auth?auth.currentUser:null;return(u?.displayName||u?.email?.split('@')[0]||'Alguien').slice(0,60);}
function lkNuevoSecreto(){const a=new Uint8Array(16);crypto.getRandomValues(a);return[...a].map(b=>'abcdefghijklmnopqrstuvwxyz0123456789'[b%36]).join('');}
// Código: "<uid>.<secreto>"
function parseCodigo(c){const m=/^([A-Za-z0-9_-]{6,60})\.([a-z0-9]{12,40})$/.exec((c||'').trim());return m?{uid:m[1],secreto:m[2]}:null;}

// --- ESTADO DE UN AVISO (lógica pura, con pruebas) ---
// Una deuda avisada pasa por: abierta → (yo pagué) esperando → saldada | rechazada; o cancelada si la borraron
function estadoDeuda(a,lista){
  let tFin=0,fin=null;
  lista.forEach(x=>{
    if(x.de===a.de&&x.ref===a.ref&&['baja','confirmado','rechazado'].includes(x.tipo)&&x.creado>a.creado&&x.creado>=tFin){tFin=x.creado;fin=x.tipo;}
  });
  const tPago=a.pagadoEn||0;
  if(fin==='baja')return'cancelada';
  if(fin==='confirmado')return'saldada';
  if(fin==='rechazado'&&tPago&&tFin>tPago)return'rechazada';
  return tPago?'esperando':'abierta';
}
// Solo el último aviso de cada deuda ofrece acciones
function avisoVigente(a,lista){return!lista.some(x=>x.de===a.de&&x.ref===a.ref&&['deuda','cambio'].includes(x.tipo)&&x.creado>a.creado);}
function lkNombre(uid,fallback){return persons.find(p=>p.linkedUid===uid)?.name||fallback||'Alguien';}
function avisoTexto(a){
  const n=lkNombre(a.de,a.deNombre),m=fmt(Math.abs(a.monto||0)),d=a.desc?` · ${a.desc}`:'';
  switch(a.tipo){
    case'deuda':return a.monto>0?`${n} registró una deuda tuya: ${m}${d}`:`${n} registró que te debe ${m}${d}`;
    case'cambio':return a.monto>0?`${n} cambió una deuda tuya: ahora ${m}${d}`:`${n} cambió lo que te debe: ahora ${m}${d}`;
    case'baja':return`${n} borró la deuda de ${m}${d}`;
    case'pago':return`${n} dice que te pagó ${m}${d}`;
    case'confirmado':return`${n} confirmó que recibió ${m}${d}`;
    case'rechazado':return`${n} dice que no recibió el pago de ${m}${d}`;
  }
  return'';
}

// --- MI CÓDIGO Y VÍNCULOS ---
async function miCodigo(){
  if(!db||!currentUID)return null;
  let s=(await db.ref(`vinculos/${currentUID}/secreto`).once('value')).val();
  if(!s){s=lkNuevoSecreto();await db.ref(`vinculos/${currentUID}/secreto`).set(s);}
  return currentUID+'.'+s;
}
// Cambiar el código no saca a nadie ya vinculado; evita que alguien nuevo se vincule con el viejo
async function cambiarMiCodigo(){
  await db.ref(`vinculos/${currentUID}/secreto`).set(lkNuevoSecreto());
}
async function vincularContacto(personId,codigo){
  const p=personById(personId),c=parseCodigo(codigo);
  if(!p)return false;
  if(!c){toast('⚠️ Ese código no parece válido');return false;}
  if(c.uid===currentUID){toast('⚠️ Ese es tu propio código');return false;}
  if(persons.some(x=>x.id!==personId&&x.linkedUid===c.uid)){toast('⚠️ Ese código ya está en otro contacto');return false;}
  if(!db||!fbOnline){toast('⚠️ Necesitás conexión para vincular');return false;}
  try{
    const mio=await miCodigo();
    await db.ref(`vinculos/${c.uid}/aceptados/${currentUID}`).set({nombre:lkMyName(),secreto:c.secreto,miCodigo:mio});
  }catch(e){console.warn('[vincular]',e);toast('⚠️ No se pudo vincular: el código puede haber cambiado. Pedile uno nuevo.');return false;}
  p.linkedUid=c.uid;saveLocal();pushSettings();lkRender();
  toast(`✅ ${p.name} vinculado · queda esperando que acepte`);
  return true;
}
// Alguien pegó mi código: lo acepto (queda como contacto vinculado) o lo rechazo
async function aceptarVinculo(uid){
  const req=vinculosIn[uid],c=parseCodigo(req?.miCodigo);
  if(!req||!c||c.uid!==uid)return;
  try{
    await db.ref(`vinculos/${uid}/aceptados/${currentUID}`).set({nombre:lkMyName(),secreto:c.secreto,miCodigo:await miCodigo()});
  }catch(e){console.warn('[aceptar]',e);toast('⚠️ No se pudo aceptar. Probá de nuevo.');return;}
  const nom=String(req.nombre||'Contacto').trim();
  const same=persons.find(x=>!x.linkedUid&&x.name.trim().toLowerCase()===nom.toLowerCase());
  if(same)same.linkedUid=uid;
  else persons.push({id:'person_'+newId(),name:nom,emoji:'👤',isRecurrent:true,linkedUid:uid});
  saveLocal();pushSettings();renderAll();lkRender();
  toast(`✅ ${nom} vinculado`);
}
async function sacarVinculo(uid){
  // Se borra su entrada y se cambia mi código, para que no pueda volver a entrar con el viejo
  await db.ref(`vinculos/${currentUID}`).update({[`aceptados/${uid}`]:null,secreto:lkNuevoSecreto()});
}
async function rechazarVinculo(uid){try{await sacarVinculo(uid);}catch(e){console.warn(e);}toast('Solicitud rechazada');lkRender();}
async function desvincularContacto(personId){
  const p=personById(personId);if(!p||!p.linkedUid)return;
  const uid=p.linkedUid;delete p.linkedUid;
  saveLocal();pushSettings();
  try{if(vinculosIn[uid])await sacarVinculo(uid);}catch(e){console.warn(e);}
  renderContactsList();lkRender();toast(`${p.name} ya no está vinculado`);
}

// --- ENVIAR AVISOS (con cola si no hay conexión) ---
function enviarAviso(toUid,datos){
  if(!toUid||!currentUID)return;
  const a={id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),de:currentUID,deNombre:lkMyName(),creado:Date.now(),...datos};
  if(a.desc)a.desc=String(a.desc).slice(0,120);
  avisosOut.push({to:toUid,aviso:a});lkSaveOut();flushAvisos();
}
async function flushAvisos(){
  if(!db||!fbOnline||!currentUID||!avisosOut.length)return;
  for(const o of [...avisosOut]){
    try{await db.ref(`avisos/${o.to}/${o.aviso.id}`).set(o.aviso);}
    catch(e){
      if(e&&e.code==='PERMISSION_DENIED'){console.warn('[aviso] no permitido',e);toast('⚠️ No se pudo avisar: esa persona todavía no aceptó el vínculo');}
      else break; // sin conexión o error de red: queda en la cola
    }
    avisosOut=avisosOut.filter(x=>x!==o&&x.aviso.id!==o.aviso.id);lkSaveOut();
  }
}
// Una deuda con un contacto vinculado se creó, cambió o se borró
function avisarDeuda(d,tipo){
  const p=personById(d.personId);
  if(!p?.linkedUid)return;
  enviarAviso(p.linkedUid,{tipo,ref:d.id,dueno:currentUID,monto:d.amount,desc:d.description||'',fecha:d.date||todayStr()});
}
// Se saldó con un contacto vinculado: lo que yo debía va como "pagué"; lo que me debían, como "confirmado"
function avisarSaldado(p,deudas,fecha){
  if(!p?.linkedUid)return;
  deudas.forEach(d=>enviarAviso(p.linkedUid,{tipo:d.amount<0?'pago':'confirmado',ref:d.id,dueno:currentUID,monto:Math.abs(d.amount),desc:d.description||'',fecha}));
}

// --- RECIBIR ---
function lkAttach(){
  lkDetach();
  if(!db||!currentUID)return;
  lkLoadOut();
  avisosRef=db.ref(`avisos/${currentUID}`);
  avisosRef.on('value',s=>{avisosIn=Object.values(s.val()||{}).filter(a=>a&&a.id);lkLimpiar();lkRender();},e=>console.warn('[FB] avisos:',e&&e.code));
  vinculosRef=db.ref(`vinculos/${currentUID}/aceptados`);
  vinculosRef.on('value',s=>{vinculosIn=s.val()||{};lkRender();},e=>console.warn('[FB] vinculos:',e&&e.code));
  flushAvisos();
}
// Avisos ya vistos con más de 60 días: se borran (una vez por sesión)
const LK_VIDA=60*86400000;
let _lkLimpio=false;
function lkLimpiar(){
  if(_lkLimpio||!avisosRef||!fbOnline)return;
  _lkLimpio=true;
  avisosIn.filter(a=>a.visto&&a.creado<Date.now()-LK_VIDA).forEach(a=>avisosRef.child(a.id).remove().catch(()=>{}));
}
function lkDetach(){
  _lkLimpio=false;
  if(avisosRef){avisosRef.off();avisosRef=null;}
  if(vinculosRef){vinculosRef.off();vinculosRef=null;}
  avisosIn=[];vinculosIn={};
}
function lkSolicitudes(){return Object.keys(vinculosIn).filter(u=>!persons.some(p=>p.linkedUid===u));}
function lkNoVistos(){return avisosIn.filter(a=>!a.visto).length+lkSolicitudes().length;}
function lkRender(){
  const n=lkNoVistos();
  document.getElementById('btn-profile')?.classList.toggle('has-badge',n>0);
  const b=document.getElementById('avisos-banner');
  if(b)b.innerHTML=n>0?`<button class="avisos-banner-btn" onclick="openAvisos()">${ic('bell')} ${n} aviso${n!==1?'s':''} nuevo${n!==1?'s':''} · ver ›</button>`:'';
  if(document.getElementById('lk-overlay')?.classList.contains('on')&&document.getElementById('lk-body')?.dataset.vista==='avisos')renderAvisos();
}
