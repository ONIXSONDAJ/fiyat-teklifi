/* AKKOYUNLU Fiyat Teklifi - cevrimdisi calisma
   Program dosyasi ve Firebase kitapligi cihaza alinir; internet yokken
   uygulama yine acilir. Teklif verisi Firestore'un kendi cevrimdisi
   deposunda tutulur ve baglanti gelince kendiliginden esitlenir. */
const SURUM = 'teklif-v1';
const SDK = 'https://www.gstatic.com/firebasejs/11.0.2';
const KABUK = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  `${SDK}/firebase-app.js`,
  `${SDK}/firebase-firestore.js`
];

self.addEventListener('install', olay => {
  olay.waitUntil((async () => {
    const kutu = await caches.open(SURUM);
    /* Tek tek ekleniyor: biri basarisiz olursa kurulum komple cokmesin. */
    await Promise.all(KABUK.map(u => kutu.add(u).catch(e => console.warn('onbellege alinamadi:', u, e))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', olay => {
  olay.waitUntil((async () => {
    const adlar = await caches.keys();
    await Promise.all(adlar.filter(a => a !== SURUM).map(a => caches.delete(a)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', olay => {
  const istek = olay.request;
  if (istek.method !== 'GET') return;
  const url = new URL(istek.url);

  /* Firestore trafigi asla onbellege alinmaz: canli veri. */
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('firebaseio.com')) return;

  /* Firebase kitapligi: once onbellek (surum sabit, degismez). */
  if (url.href.startsWith(SDK)) {
    olay.respondWith((async () => {
      const bulunan = await caches.match(istek);
      if (bulunan) return bulunan;
      const yanit = await fetch(istek);
      if (yanit.ok) (await caches.open(SURUM)).put(istek, yanit.clone());
      return yanit;
    })());
    return;
  }

  /* Programin kendisi: once ag (guncelleme gelsin), olmazsa onbellek. */
  if (url.origin === location.origin) {
    olay.respondWith((async () => {
      try {
        const yanit = await fetch(istek);
        if (yanit.ok) (await caches.open(SURUM)).put(istek, yanit.clone());
        return yanit;
      } catch (e) {
        const bulunan = await caches.match(istek) || await caches.match('./index.html');
        if (bulunan) return bulunan;
        throw e;
      }
    })());
  }
});
