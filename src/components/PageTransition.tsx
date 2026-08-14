import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const ANIM_KEY = 'page-transition-styles';

// 注入动画 CSS（只执行一次）
if (typeof document !== 'undefined' && !document.getElementById(ANIM_KEY)) {
  const s = document.createElement('style');
  s.id = ANIM_KEY;
  s.textContent = `
    @keyframes arclePageIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(s);
}

/**
 * 页面切换动画组件
 * 每次路由变化时滑入+淡入（300ms ease-out），首次加载立即显示
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [key, setKey] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // 路由变化时重置动画
    setKey((k) => k + 1);
  }, [location.key]);

  return (
    <div
      key={key}
      style={{
        animation: 'arclePageIn 0.3s ease-out',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}