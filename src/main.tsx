import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppProvider } from './lib/AppContext.tsx';
import { loadAppearance } from './lib/appearance.ts';

// 渲染前恢复外观自定义（圆角/透明），避免首帧闪回默认样式
loadAppearance();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
