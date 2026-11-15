// Diálogos de la app para pedir un texto, un número o elegir una opción (3.26). Reemplazan a prompt(), que se ve mal en el celular,
// algunos navegadores lo bloquean y no se puede probar ni usar con teclado y lector de pantalla.
let _askRes=null,_askOpts=null;
function _askEl(){
  let o=document.getElementById('ask-overlay');
  if(!o){
    o=document.createElement('div');o.id='ask-overlay';o.className='conf-overlay';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
    o.innerHTML='<div class="conf-dlg ask-dlg"><div class="conf-ttl" id="ask-ttl"></div><div class="conf-txt" id="ask-msg"></div><div id="ask-body"></div><div class="ask-err" id="ask-err" role="alert"></div><div class="conf-btns" id="ask-btns"></div></div>';
    o.addEventListener('mousedown',e=>{if(e.target===o)cerrarAsk(null);});
    document.body.appendChild(o);
  }
  return o;
}
function cerrarAsk(valor=null){
  const r=_askRes;_askRes=null;_askOpts=null;
  document.getElementById('ask-overlay')?.classList.remove('on');
  if(r)r(valor);
}
function _askAbrir(titulo,mensaje){
  if(_askRes)cerrarAsk(null); // si había otro abierto, se cancela
  const o=_askEl();
  document.getElementById('ask-ttl').textContent=titulo||'';
  const m=document.getElementById('ask-msg');m.textContent=mensaje||'';m.style.display=mensaje?'':'none';
  document.getElementById('ask-err').textContent='';
  o.classList.add('on');history.pushState({modal:true},'');
}
// Devuelve el texto escrito, o null si se cancela. validar(texto) puede devolver un mensaje de error para no cerrar.
function pedirTexto(o={}){
  return new Promise(res=>{
    _askAbrir(o.titulo,o.mensaje);
    _askRes=res;_askOpts=o;
    const num=o.tipo==='number';
    document.getElementById('ask-body').innerHTML=`<input class="f-ctrl ask-inp" id="ask-inp" type="${num?'number':o.tipo==='email'?'email':'text'}" ${num?'inputmode="decimal" step="any" min="0"':''} placeholder="${esc(o.placeholder||'')}" value="${esc(o.valor==null?'':o.valor)}" aria-label="${esc(o.titulo||'Valor')}" autocomplete="off">`;
    document.getElementById('ask-btns').innerHTML=`<button class="btn-no" onclick="cerrarAsk(null)">Cancelar</button><button class="btn-yes" id="ask-ok" onclick="aceptarAsk()">${esc(o.ok||'Aceptar')}</button>`;
    const inp=document.getElementById('ask-inp');
    inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();aceptarAsk();}};
    setTimeout(()=>{inp.focus();inp.select();},50);
  });
}
function aceptarAsk(){
  if(!_askRes)return;
  const v=document.getElementById('ask-inp').value;
  const err=_askOpts?.validar?_askOpts.validar(v):'';
  if(err){document.getElementById('ask-err').textContent=err;document.getElementById('ask-inp').focus();return;}
  cerrarAsk(v);
}
// opciones: [{id, texto}]. Devuelve el id elegido o null.
function elegirOpcion(o={}){
  return new Promise(res=>{
    _askAbrir(o.titulo,o.mensaje);
    _askRes=res;_askOpts=o;
    document.getElementById('ask-body').innerHTML=`<div class="ask-list">${(o.opciones||[]).map((x,i)=>`<button class="ask-opt" onclick="cerrarAsk(${jsArg(x.id)})" ${i===0?'id="ask-first"':''}>${esc(x.texto)}</button>`).join('')}</div>`;
    document.getElementById('ask-btns').innerHTML=`<button class="btn-no" onclick="cerrarAsk(null)">${esc(o.cancelar||'Cancelar')}</button>`;
    setTimeout(()=>document.getElementById('ask-first')?.focus(),50);
  });
}
