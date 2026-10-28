/* Service worker: offline spuštění aplikace.
 * - Při instalaci uloží index.html a všechny soubory, které z něj vedou (JS, CSS, ikony, písma).
 * - Stránky: nejdřív síť, při výpadku uložená verze.
 * - Vlastní soubory a písma: nejdřív cache, na pozadí se obnoví.
 * - Požadavky na Supabase a jiné cizí adresy NIKDY nezachytává: data se nekešují mimo zašifrované úložiště aplikace.
 * Při nové verzi změňte VERSION, stará cache se smaže.
 */
const VERSION = 'v1';
const CACHE = `kali-gravka-${VERSION}`;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

const scopeUrl = (p) => new URL(p, self.registration.scope).href;

async function precache() {
  const cache = await caches.open(CACHE);
  const shell = [scopeUrl('./'), scopeUrl('manifest.json'), scopeUrl('favicon.png'), scopeUrl('icons/icon-192.png'), scopeUrl('icons/icon-512.png'), scopeUrl('icons/apple-touch-icon.png')];
  const res = await fetch(scopeUrl('./'), { cache: 'reload' });
  const html = await res.clone().text();
  await cache.put(scopeUrl('./'), res);
  // soubory z index.html (hashované JS a CSS ze sestavení)
  const assets = new Set(shell);
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = new URL(m[1], scopeUrl('./'));
    if (u.origin === self.location.origin) assets.add(u.href);
  }
  // písma z Google Fonts: nejdřív CSS, z něj pak soubory s písmem
  const fontCss = [...html.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  for (const url of fontCss) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      await cache.put(url, r.clone());
      const css = await r.text();
      for (const f of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
        try { await cache.add(f[1]); } catch (e) { /* písmo není nutné */ }
      }
    } catch (e) { /* offline při instalaci: písma se dodají později */ }
  }
  await Promise.all([...assets].map((u) => cache.add(u).catch(() => {})));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kali-gravka-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return; // Supabase a ostatní: přímo na síť

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(scopeUrl('./'), copy)); return res; })
        .catch(() => caches.match(scopeUrl('./'), { ignoreSearch: true }).then((r) => r || caches.match(req, { ignoreSearch: true })))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
