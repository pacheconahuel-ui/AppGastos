// Gráfico por período: meses, trimestres o años, con comparación contra el anterior

const PERIOD_MODES={mes:{n:6,title:'Últimos 6 meses'},trim:{n:4,title:'Últimos 4 trimestres'},anio:{n:3,title:'Últimos 3 años'}};

// Períodos que terminan en el actual (incluido), del más viejo al más nuevo
function periodList(mode,n,today=todayStr()){
  const t=parseYmd(today),y=t.getFullYear(),m=t.getMonth();
  const out=[];
  for(let i=n-1;i>=0;i--){
    let months=[],label;
    if(mode==='mes'){
      const d=new Date(y,m-i,1);
      months=[d];label=MES_CORTO[d.getMonth()];
    }else if(mode==='trim'){
      const q0=Math.floor(m/3)*3;
      const d=new Date(y,q0-3*i,1);
      months=[0,1,2].map(k=>new Date(d.getFullYear(),d.getMonth()+k,1));
      label=`T${Math.floor(d.getMonth()/3)+1} ${String(d.getFullYear()).slice(2)}`;
    }else{
      const yy=y-i;
      months=Array.from({length:12},(_,k)=>new Date(yy,k,1));label=String(yy);
    }
    out.push({label,keys:months.map(d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)});
  }
  return out;
}

// Gastos (mi parte, en pesos) e ingresos de cada período, con las mismas reglas que el resumen del mes
function periodTotals(mode,n,today=todayStr()){
  return periodList(mode,n,today).map(p=>{
    const ks=new Set(p.keys);
    let gastos=0,ingresos=0;
    expenses.forEach(e=>{
      if(!ks.has(monthKey(e.date))||!countsInMonth(e))return;
      if(e.type==='Ingreso')ingresos+=amtArs(e);else gastos+=effArs(e);
    });
    return{label:p.label,gastos,ingresos};
  });
}

function pctChange(cur,prev){if(!prev)return null;return Math.round((cur-prev)/prev*100);}

function getPeriodMode(){try{const m=localStorage.getItem('gp_period_mode');return PERIOD_MODES[m]?m:'mes';}catch{return'mes';}}
function setPeriodMode(m){try{localStorage.setItem('gp_period_mode',m);}catch{}renderMonthlyChart();}

function renderPeriodCompare(rows,mode){
  const el=document.getElementById('period-compare');
  if(!el)return;
  const cur=rows[rows.length-1],prev=rows[rows.length-2];
  if(!prev||(!prev.gastos&&!prev.ingresos)){el.innerHTML='';return;}
  const arrow=(p,goodWhenUp)=>{
    if(p===null)return'<span style="color:var(--txt3)">—</span>';
    const col=p===0?'var(--txt3)':(p>0)===goodWhenUp?'var(--green)':'var(--red)';
    return`<span style="color:${col}">${p>0?'▲':p<0?'▼':''}${Math.abs(p)}%</span>`;
  };
  el.innerHTML=`<div class="period-compare">
    <div class="period-compare-ttl">${esc(cur.label)} <span style="color:var(--txt3)">(en curso)</span> vs ${esc(prev.label)}</div>
    <div>Gastos ${fmt(cur.gastos)} ${arrow(pctChange(cur.gastos,prev.gastos),false)}</div>
    <div>Ingresos ${fmt(cur.ingresos)} ${arrow(pctChange(cur.ingresos,prev.ingresos),true)}</div>
  </div>`;
}
