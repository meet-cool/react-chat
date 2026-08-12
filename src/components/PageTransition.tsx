import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * 页面切换淡入动画组件
 * 每次路由变化时淡出→淡入（200ms），首次加载立即显示
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [opacity, setOpacity] = useState(1);
  const [version, setVersion] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setOpacity(0);
    const timer = setTimeout(() => {
      setVersion((v) => v + 1);
      setOpacity(1);
    }, 180);
    return () => clearTimeout(timer);
  }, [location.pathname, location.key]);

  return (
    <div
      key={version}
      style={{
        opacity,
        transition: 'opacity 0.2s ease',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
