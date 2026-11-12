// Pantalla de administración (3.19): resumen de uso, quién entró cada día, lista con filtros y exportar.
// La lógica y los datos están en admin.js. Solo se ve actividad (fechas, versión, cantidad de movimientos), nunca montos.

let adminEstado={d:null,filtro:'todos',texto:''};

function openAdmin(){
  if(!ES_ADMIN||!db)return;
  const pg=document.getElementById('admin-page');
  pg.classList.remove('hidden');
  document.getElementById('admin-body').innerHTML='<div class="sd-ayuda">Cargando…</div>';
  history.pushState({modal:true},'');
  adminCargar();
}
function closeAdmin(){document.getElementById('admin-page')?.classList.add('hidden');}
async function adminCargar(){
  try{adminEstado.d=await adminDatos();adminPintar();}
  catch(e){document.getElementById('admin-body').innerHTML='<div class="sd-ayuda">No se pudo leer: '+esc(e.message)+'</div>';}
}
// Después de autorizar, quitar o prender: se vuelve a leer y se redibuja
function adminRefrescar(){if(!document.getElementById('admin-page').classList.contains('hidden'))adminCargar();}

function adminFiltro(f){adminEstado.filtro=f;adminLista();document.querySelectorAll('#admin-chips button').forEach(b=>b.classList.toggle('on',b.dataset.f===f));}
function adminBuscar(v){adminEstado.texto=v;adminLista();}

function adminBarras(porDia){
  const max=Math.max(1,...porDia.map(x=>x.n));
  return`<div class="ad-bars" role="img" aria-label="Personas que entraron cada día, últimos 30 días">${porDia.map(x=>
    `<span class="ad-bar" title="${esc(fmtDate(x.dia))}: ${x.n}" style="height:${x.n?Math.max(8,Math.round(x.n/max*100)):3}%"></span>`).join('')}</div>
    <div class="ad-axis"><span>${esc(fmtDate(porDia[0].dia))}</span><span>hoy</span></div>`;
}
function adminTira(u,dias,hoy){
  const s=adminDiasDe(u,dias);
  return`<span class="ad-strip" aria-hidden="true">${adminDiasAtras(hoy,30).map(d=>`<i class="${s.has(d)?'on':''}"></i>`).join('')}</span>`;
}
function adminFila(u,dias,hoy){
  const nombre=u.nombre||(u.email?u.email.split('@')[0]:'(sin nombre)');
  const chip=u.yo?'<span class="ad-chip ok">Administrador</span>':u.permitido?'<span class="ad-chip ok">Autorizado</span>':'<span class="ad-chip no">Sin autorizar</span>';
  const s=adminDiasDe(u,dias),activos=adminDiasAtras(hoy,30).filter(d=>s.has(d)).length;
  const lineas=[
    u.email,
    u.ultimo?'Último acceso '+haceCuanto(u.ultimo):'Todavía no usó esta versión',
    u.primero?'Desde el '+fmtDate(new Date(u.primero).toISOString().slice(0,10)):'',
    u.version?'v'+u.version:'',
    u.movs!=null?u.movs+' movimientos':''].filter(Boolean).map(esc).join(' · ');
  const act=u.yo?'':u.permitido
    ?`<button class="sd-act" onclick="adminAutorizar(${jsArg(u.uid)},false)">Quitar acceso</button>`
    :`<button class="sd-act" onclick="adminAutorizar(${jsArg(u.uid)},true)">Autorizar</button>`;
  return`<div class="ad-user"><div class="ad-t"><b>${esc(nombre)}</b> ${chip}</div><div class="ad-s">${lineas}</div>
    <div class="ad-s ad-act">${adminTira(u,dias,hoy)}<span>${activos} de los últimos 30 días</span></div>${act}</div>`;
}
function adminLista(){
  const {d}=adminEstado;if(!d)return;
  const hoy=todayStr(),lista=adminFiltrar(d.users,d.dias,hoy,adminEstado);
  document.getElementById('admin-lista').innerHTML=lista.map(u=>adminFila(u,d.dias,hoy)).join('')
    ||'<div class="sd-ayuda">No hay nadie con ese filtro.</div>';
}
function adminPintar(){
  const {d}=adminEstado,hoy=todayStr(),r=adminResumen(d.users,d.dias,hoy);
  const kpi=(n,l)=>`<div class="ad-kpi"><b>${n}</b><span>${l}</span></div>`;
  const chip=(f,l)=>`<button data-f="${f}" class="${adminEstado.filtro===f?'on':''}" onclick="adminFiltro('${f}')">${l}</button>`;
  document.getElementById('admin-body').innerHTML=`
    <div class="ad-switch ${d.restringido?'on':''}">
      <div><b>Solo personas autorizadas</b><div class="ad-s">${d.restringido?'Prendido: solo entran los autorizados. Quien no lo está ve un aviso y no puede ver ni guardar datos.':'Apagado: cualquier cuenta de Google puede entrar y usar la app.'}</div></div>
      <button class="btn-fecha" onclick="adminRestringir(${d.restringido?'false':'true'})">${d.restringido?'Apagar':'Prender'}</button>
    </div>
    <div class="ad-kpis">${kpi(r.total,'personas')}${kpi(r.hoy,'entraron hoy')}${kpi(r.sem,'en 7 días')}${kpi(r.mes,'en 30 días')}${kpi(r.sinAutorizar,'sin autorizar')}</div>
    <div class="sd-sec">Quién entró cada día · últimos 30 días</div>
    ${adminBarras(adminPorDia(d.users,d.dias,hoy,30))}
    <div class="sd-sec">Personas</div>
    <div class="sd-ayuda">Solo se ve cuándo entró cada una, con qué versión y cuántos movimientos tiene. Nunca montos ni descripciones. El historial diario empieza el día que se publicó esta versión.</div>
    <input type="search" class="f-ctrl" id="admin-buscar" placeholder="Buscar por nombre o email…" value="${esc(adminEstado.texto)}" oninput="adminBuscar(this.value)" aria-label="Buscar persona">
    <div class="ad-chips" id="admin-chips">${chip('todos','Todos')}${chip('autorizados','Autorizados')}${chip('sin','Sin autorizar')}${chip('inactivos','Sin entrar en 30 días')}</div>
    <div id="admin-lista"></div>
    <div class="ad-foot">
      ${r.sinAutorizar?`<button class="btn-hist" onclick="adminAutorizarTodos()">Autorizar a las ${r.sinAutorizar} que faltan</button>`:''}
      <button class="btn-fecha" onclick="adminExportar()">${ic('download')} Exportar lista (CSV)</button>
    </div>`;
  adminLista();
}
function adminExportar(){
  const {d}=adminEstado;if(!d)return;
  const blob=new Blob(['﻿'+adminCSV(d.users,d.dias,todayStr())],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`personas-${todayStr()}.csv`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
