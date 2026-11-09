// La versión llega en la URL del registro (sw.js?v=X.Y, desde APP_VERSION en js/config.js)
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'gastos-v' + VERSION;

// Librerías externas (versión fija en la URL, no cambian): caché primero.
// Archivos de la app (index.html, js/, css/): red primero, caché solo sin conexión.
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-database-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(CDN_ASSETS.map(url => c.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function networkFirst(request, key) {
  return fetch(request, { cache: 'no-cache' })
    .then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key || request, copy)); }
      return res;
    })
    .catch(() => caches.match(key || request));
}

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (e.request.method !== 'GET') return;

  // Nunca interceptar Firebase ni el login de Google (las librerías /firebasejs/ y las fuentes sí se guardan)
  if ((url.includes('firebase') && !url.includes('/firebasejs/')) ||
      (url.includes('googleapis.com') && !url.includes('fonts.googleapis.com')) ||
      url.includes('accounts.google.com') ||
      url.includes('__/auth/') ||
      url.includes('apiKey=') ||
      url.includes('identitytoolkit') ||
      url.includes('dolarapi.com')) {
    return;
  }

  // La página: siempre de la red (cada versión se ve al toque); la última buena queda para sin conexión
  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst(e.request, new URL('index.html', self.registration.scope).href));
    return;
  }

  // js/, css/, manifest e íconos de la app: red primero (cambian con cada versión)
  if (url.startsWith(self.registration.scope)) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Librerías externas: caché primero
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
