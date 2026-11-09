// Versión, configuración de Firebase, constantes y estado global
// --- VERSION (única fuente: la usan el encabezado y el service worker) ---
const APP_VERSION='3.9.1';

// --- FIREBASE CONFIG ---
const FB_CONFIG={apiKey:"AIzaSyAMUb7e_ngGiTc9lRTazNf290bKKRGvZN0",authDomain:"gastos-pache.firebaseapp.com",databaseURL:"https://gastos-pache-default-rtdb.firebaseio.com",projectId:"gastos-pache",storageBucket:"gastos-pache.firebasestorage.app",messagingSenderId:"151998147367",appId:"1:151998147367:web:6918969bcadef03048d702"};

// --- CONSTANTS ---
const SK='gp_expenses_v2',CK='gp_cats_v2',PQ='gp_pending_v2';
const USK='gp_usd_v1',UPQ='gp_upending_v1';
const DSK='gp_debts_v1',DPQ='gp_dpending_v1';
const PSK='gp_persons_v1';
const HCK='gp_hidden_cats_v1'; // hidden default cats
const RCK='gp_renamed_cats_v1'; // renamed default cats {original: newName}
const CT_SK='gp_cat_types_v1'; // {categoryName: 'egreso'|'ingreso'}

const DEF_CATS=['Supermercado','Restaurante','Padel','Mascotas','Servicios','Gimnasio','Farmacia','Compras','Salario','Fútbol','Educador Canino','Alquiler','Luz','Gas','Internet','Seguros','Streaming','Zurich','Consultas Médicas','Venta USD','Otro'];
const ICONS={'Supermercado':'🛒','Restaurante':'🍽️','Padel':'🎾','Mascotas':'🐕','Servicios':'⚡','Gimnasio':'💪','Farmacia':'💊','Compras':'🛍️','Salario':'💰','Fútbol':'⚽','Educador Canino':'🐾','Alquiler':'🏠','Luz':'💡','Gas':'🔥','Internet':'📡','Seguros':'🛡️','Streaming':'🎬','Zurich':'🏥','Consultas Médicas':'🩺','Venta USD':'💵','Otro':'📌'};
const DEF_ING_CATS=['Sueldo','SAC','Transferencia','Regalo','Sueldo 2','Freelance / Honorarios','Comisión','Aguinaldo / Bono','Alquiler cobrado','Otros ingresos'];
const ING_ICONS={'Sueldo':'💼','SAC':'🎁','Transferencia':'↘️','Regalo':'🎀','Sueldo 2':'💼','Freelance / Honorarios':'💻','Comisión':'🤝','Aguinaldo / Bono':'🎁','Alquiler cobrado':'🏠','Otros ingresos':'💚'};
Object.assign(ICONS,ING_ICONS);
// Torta por categoría: tonos apagados que se distinguen entre sí en los dos temas
const COLORS=['#7c86f0','#5fa8a0','#c9a25a','#c07a8f','#6f9fd8','#8fb07a','#a98bc9','#cf8a6c','#7d8a99','#a8a06a','#5c7fb8','#b5838d','#6aa38a','#b39a7a','#8c8fb8','#9aa5b1'];

// No default persons — each user creates their own contacts
const DEF_PERSONS=[];

// --- STATE ---
let expenses=[],usdTx=[],debts=[],persons=[];
let cats=[],pendingQ=[],usdPendQ=[],debtPendQ=[];
let hiddenCats=new Set();   // default cats hidden by user
let renamedCats={};          // {originalName: renamedTo}
let catTypes={};              // {categoryName: 'egreso'|'ingreso'}
let chart=null,tcChart=null,monthlyChart=null;
let pendingDel=null;
let dashMk=null; // month shown on dashboard — null means auto (most recent with data or current)
let fbOnline=false,fbReady=false,db=null,auth=null,currentUID=null;
// Device ID — unique per browser/device, persists in localStorage
// Used to identify our own pushSettings echo and ignore it
const DEVICE_ID = (()=>{
  let id = localStorage.getItem('gp_device_id');
  if(!id){ id = 'dev_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); localStorage.setItem('gp_device_id',id); }
  return id;
})();
let skipNextArs=false,skipNextUsd=false,skipNextDebt=false;
let activeTab='dashboard';
let isRegisterMode=false;
let arsListener=null,usdListener=null,debtListener=null;
// Split state for expense modal
let splitRows=[]; // [{personId, personName, emoji, amount}]
let splitPanelOpen=false;

// --- HAPTIC ---
function haptic(p=[50]){if(navigator.vibrate)navigator.vibrate(p);}

