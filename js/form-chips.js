// Formulario de movimiento: categorías y billeteras como botones.
// El valor real sigue en #f-cat (oculto) y en el select #f-account; los botones solo los cambian.

const CHIPS_CAT=6;

// Las categorías más usadas en los últimos 4 meses para este tipo (gasto o ingreso);
// si hay pocas, completa con las de la lista. La elegida siempre aparece.
function topCats(){
  const isIng=(document.getElementById('f-type')?.value||'Egreso')==='Ingreso';
  const visible=cats.filter(c=>!hiddenCats.has(c)&&catVisibleForCurrentType(c));
  const desde=(()=>{const d=new Date();d.setMonth(d.getMonth()-4);return ymd(d);})();
  const uso={};
  expenses.forEach(e=>{if((e.type==='Ingreso')===isIng&&(e.date||'')>=desde)uso[e.category]=(uso[e.category]||0)+1;});
  const orden=[...visible].sort((a,b)=>(uso[b]||0)-(uso[a]||0));
  const top=orden.slice(0,CHIPS_CAT);
  const sel=document.getElementById('f-cat')?.value;
  if(sel&&!top.includes(sel))top.unshift(sel);
  return top.slice(0,CHIPS_CAT+1);
}
function renderCatChips(){
  const el=document.getElementById('f-cat-chips');if(!el)return;
  const sel=document.getElementById('f-cat')?.value||'';
  el.innerHTML=topCats().map(c=>`<button type="button" class="chip${c===sel?' on':''}" aria-pressed="${c===sel}" onclick="selectCat(${jsArg(c)})">${catIcon(c)} ${esc(displayName(c))}</button>`).join('');
}
function renderAccChips(){
  const el=document.getElementById('f-acc-chips');if(!el)return;
  const cur=document.getElementById('f-account')?.value||'';
  const list=[...walletAccounts(),...ccAccounts()];
  el.innerHTML=list.map(a=>`<button type="button" class="chip${a.id===cur?' on':''}" aria-pressed="${a.id===cur}" onclick="pickAccount('${a.id}')">${a.emoji||''} ${esc(a.name)}</button>`).join('')
    +(list.length?`<button type="button" class="chip chip-muted${cur===''?' on':''}" aria-pressed="${cur===''}" onclick="pickAccount('')">Sin billetera</button>`:'');
}
function pickAccount(id){
  const sel=document.getElementById('f-account');
  sel.value=id;onAccountSelected();
}
