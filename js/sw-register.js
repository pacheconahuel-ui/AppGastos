// Registro del service worker y aviso de versión nueva
// --- SERVICE WORKER (PWA) ---

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js?v='+APP_VERSION).then(reg=>{
      // Check for updates every time the page loads
      reg.update();
      // When a new SW is found, prompt user to refresh
      reg.addEventListener('updatefound',()=>{
        const newWorker=reg.installing;
        newWorker.addEventListener('statechange',()=>{
          if(newWorker.state==='installed'&&navigator.serviceWorker.controller){
            // New version available — show update banner
            showUpdateBanner();
          }
        });
      });
    }).catch(e=>console.warn('[PWA] SW error:',e));
  });
}

function showUpdateBanner(){
  const existing=document.getElementById('update-banner');
  if(existing)return;
  const banner=document.createElement('div');
  banner.id='update-banner';
  banner.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg,rgba(102,126,234,.95),rgba(118,75,162,.95));border-radius:14px;padding:12px 18px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);white-space:nowrap;max-width:calc(100vw - 32px)';
  banner.innerHTML=`<span style="font-size:14px;font-weight:600;color:#fff">🆕 Nueva versión disponible</span>
    <button onclick="window.location.reload()" style="padding:7px 14px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif">Actualizar</button>`;
  document.body.appendChild(banner);
  // Auto-hide after 30s if not clicked
  setTimeout(()=>banner.remove(),30000);
}

