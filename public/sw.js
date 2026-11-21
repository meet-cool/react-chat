/*
 * Arcle PWA Service Worker
 * - 静态资源（带 hash 的构建产物）：缓存优先
 * - 页面导航：网络优先，离线回退缓存的 index.html
 * - 后端 API（/chat /english /moments，含 AI 流式请求）：一律直连，不做缓存
 */
const CACHE_NAME = 'arcle-pwa-v1';
const SHELL_CACHE = 'arcle-shell-v1';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.png',
  '/pwa-192.png',
  '/pwa-512.png',
  '/favicon.svg',
];

// 后端业务路径：直连网络（流式/鉴权/实时数据不经过 SW 缓存）
const API_PREFIXES = ['/chat/', '/english/', '/moments/', '/chat', '/english', '/moments'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== SHELL_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isApiRequest(url) {
  return API_PREFIXES.some(
    (p) => url.pathname === p || url.pathname.startsWith(p + '/')
  );
}

// 开发态直连（不缓存）：Vite dev 模块与带查询串的 URL。
// dev 模块内容随 HMR/重启变化，一旦进缓存就会冻结陈旧代码导致白屏；
// 生产构建产物无查询串且路径为 /assets/*，不受影响。
function isDevOrDynamic(url) {
  return (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/node_modules/') ||
    url.search.length > 0
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域（第三方头像等）直连
  if (isApiRequest(url)) return; // 后端 API 直连
  if (isDevOrDynamic(url)) return; // dev 模块 / 动态 URL 直连，绝不进缓存

  // 页面导航：网络优先，离线回退 shell
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => {
          // 离线回退：先查 shell 缓存；都没有则直连网络重试。
          // 绝不返回 undefined——否则导航请求永不完成，页面挂起（ERR_RESULT_CODE_HUNG）。
          const cached = (await caches.match('/index.html')) || (await caches.match('/'));
          return cached || fetch(req);
        })
    );
    return;
  }

  // 构建产物（/assets/*.hash.js|css 等）：缓存优先
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => undefined);
            return res;
          })
      )
    );
  }
  // 其余同源 GET（图片/字体/声音等）：命中缓存返回，否则直连
  else {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
