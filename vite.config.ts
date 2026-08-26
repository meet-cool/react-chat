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
    proxy: {
      '/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: htmlBypass,
      },
      // english 英语学习模块（ThinkPHP 多应用 english）
      '/english': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: htmlBypass,
      },
      // moments 朋友圈模块（ThinkPHP 多应用 moments）
      '/moments': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass: htmlBypass,
      },
    },
  },
})
