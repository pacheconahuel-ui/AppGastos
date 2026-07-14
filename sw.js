const CACHE = 'gastos-v2.8';
const ASSETS = [
  '/AppGastos/',
  '/AppGastos/index.html',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(url => c.add(url).catch(() => {})))
    )
  );
  // Take control immediately — don't wait for old SW to die
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // Take control of all open tabs immediately
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never intercept: Firebase, Google auth, or any URL with auth params
  if (url.includes('firebase') ||
      url.includes('googleapis.com') ||
      url.includes('accounts.google.com') ||
      url.includes('__/auth/') ||
      url.includes('apiKey=') ||
      url.includes('oauthToken=') ||
      url.includes('identitytoolkit')) {
    return; // Let network handle it
  }

  if (e.request.mode === 'navigate' || url.endsWith('/AppGastos/') || url.endsWith('/AppGastos/index.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/AppGastos/index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (e.request.method === 'GET' && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
