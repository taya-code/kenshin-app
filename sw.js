// 共用部検針アプリ用のオフラインキャッシュ（Service Worker）
// アプリ本体（index.html）をキャッシュし、電波が無い状態でも開けるようにする。
// Firebase/Firestoreへの通信（オンライン同期）はこの対象外で、通信できない場合はアプリ側の
// ローカル保存（localStorage）にそのままフォールバックする。

const CACHE_NAME = 'kenshin-app-v1';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 別ドメイン（Firebase/Google等）への通信はService Workerで横取りしない。
  // オンライン同期の失敗・成功判定はアプリ本体（fetch/XHR）に任せる。
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
