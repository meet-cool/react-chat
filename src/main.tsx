import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppProvider } from './lib/AppContext.tsx';
import { loadAppearance } from './lib/appearance.ts';

// 渲染前恢复外观自定义（圆角/透明），避免首帧闪回默认样式
loadAppearance();

// ===== PWA Service Worker 生命周期 =====
// 生产环境：注册 /sw.js（缓存策略见 public/sw.js）。
// 开发环境：绝不注册。SW 的"缓存优先"会把 Vite dev 模块（/src/*、/@vite/client、
//   /@react-refresh）冻结在 Cache Storage 里，HMR 更新或 dev server 重启后
//   页面拿到陈旧模块 → 白屏 + 控制台空白 + Sources 只剩 sw.js。
//   对历史上已注册过 SW 的浏览器做一次性自愈：注销所有 SW 注册 + 清空全部缓存，
//   若当前页面正被 SW 接管则强制刷新一次脱离控制。
if (import.meta.env.PROD) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Service Worker 注册失败:', err);
      });
    });
  }
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(async (regs) => {
      if (regs.length === 0) return;
      await Promise.all(regs.map((r) => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // 当前文档若仍被旧 SW 控制，刷新一次以脱离其 fetch 拦截
      if (navigator.serviceWorker.controller) {
        location.reload();
      }
    })
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
