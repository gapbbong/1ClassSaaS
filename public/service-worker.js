// ✅ service-worker.js (v6)

const CACHE_NAME = "photo-cache-v10";
const urlsToCache = [
  "/",
  "/index.html",
  "/stu-list.html",
  "/record.html",
  "/search.html",
  "/bulk-record.html",
  "/total-records.html"
];

// 1. 설치
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 2. 활성화
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. 요청 가로채기
self.addEventListener("fetch", event => {
  const request = event.request;

  // Google Drive 썸네일: 캐시 우선
  if (request.url.includes("drive.google.com/thumbnail")) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          return response;
        }).catch(err => {
          console.warn("[SW] Thumbnail fetch failed:", err);
          // 실패 시 404 Response 객체를 명확히 반환
          return new Response("Not Found", { status: 404 });
        });
      })
    );
    return;
  }

  // HTML 및 JS 파일: 네트워크 우선 (개발 중 캐시 꼬임 방지)
  if (request.mode === 'navigate' || request.url.endsWith('.html') || request.url.endsWith('.js')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // 기타 자원: 캐시 우선
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).catch(err => {
        console.warn("[SW] Fetch failed for:", request.url, err);
        // 캐시도 없고 네트워크도 안되면 404 Response 반환
        return new Response("Not Found", { status: 404 });
      });
    })
  );
});