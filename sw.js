// 합격마스터 PWA service worker — 오프라인 지원
// HTML 문서: network-first (업데이트 즉시 반영 + 오프라인 폴백)
// 정적 자원(CDN·아이콘): cache-first (빠르고 오프라인)
const CACHE = 'hapgyeok-v2';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  // Firebase 동기화/실시간 데이터는 항상 네트워크 (캐싱하면 동기화 깨짐)
  if (/firebase|firebaseio|googleapis|gstatic|identitytoolkit/.test(url)) return;

  // HTML 문서(navigation): 네트워크 우선 → 실패 시 캐시
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.status === 200) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
        return resp;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html') || caches.match('./')))
    );
    return;
  }

  // 정적 자원(CDN·아이콘): 캐시 우선 → 네트워크 폴백 + 동적 캐싱
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
        return resp;
      }).catch(() => cached)
    )
  );
});
