import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 页面导航（Accept: text/html）不走后端代理，交给 SPA 路由处理
const htmlBypass = (req: { headers: { accept?: string } }) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    return '/index.html';
  }
};

// 后端入口：当前用单实例 http://127.0.0.1:8000（_restart_backend.ps1 的 backend.pid 方式）。
// 注意：必须用 127.0.0.1 而非 localhost——Windows 下 Node 把 localhost 解析为 IPv6 ::1，
// 而 php -S 0.0.0.0:8000 只监听 IPv4，用 localhost 会 ECONNREFUSED（代理 500）。
// Nginx :8080 多 worker 栈（start-nginx-stack.ps1）待 agent-3 收尾验证后再切。
const backendTarget = 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // english 模块内部别名（原 english 项目使用 @/ 指向其 src 根）
      '@eng': path.resolve(__dirname, './src/english'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    // 放行 Cloudflare 隧道域名（web.met.cc.cd → 本机 5174），否则 Vite 默认 403
    allowedHosts: ['web.met.cc.cd'],
    proxy: {
      '/chat': {
        target: backendTarget, // fallback: 'http://localhost:8000'（旧单实例 php -S）
        changeOrigin: true,
        bypass: htmlBypass,
      },
      // english 英语学习模块（ThinkPHP 多应用 english）
      '/english': {
        target: backendTarget, // fallback: 'http://localhost:8000'
        changeOrigin: true,
        bypass: htmlBypass,
      },
      // moments 朋友圈模块（ThinkPHP 多应用 moments）
      '/moments': {
        target: backendTarget, // fallback: 'http://localhost:8000'
        changeOrigin: true,
        bypass: htmlBypass,
      },
      // 表情包搜索（根路由 /meme/search，外部 xiaoapi 代理 + 60s 缓存）
      '/meme': {
        target: backendTarget,
        changeOrigin: true,
        bypass: htmlBypass,
      },
      // 安装中心（公开：GET /install、POST /install/test-db、POST /install/run；
      // dev 走同源代理到本地后端，前端 getApiBaseUrl() 为空串时请求即打到这里）
      '/install': {
        target: backendTarget,
        changeOrigin: true,
        bypass: htmlBypass,
      },
    },
  },
})
