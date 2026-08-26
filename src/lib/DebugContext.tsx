import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface DebugInfo {
  path: string;
  tag: string;
  className: string;
  id: string;
  index: number;
  timestamp: number;
  pageName: string;
}

interface DebugContextValue {
  debugMode: boolean;
  setDebugMode: (v: boolean) => void;
  elementCount: number;
  debugInfo: DebugInfo | null;
  setDebugInfo: (info: DebugInfo | null) => void;
  toggleDebugMode: () => void;
}

const DebugContext = createContext<DebugContextValue | null>(null);

const DEBUG_KEY = 'arcle_debug_mode';
const INFO_KEY = 'arcle_debug_info';

// 页面路由映射
const PAGE_NAMES: Record<string, string> = {
  '/': '门户首页',
  '/chat': '聊天页',
  '/confessions': '表白墙',
  '/confessions/new': '发布表白',
  '/confessions/ranking': '表白排行',
  '/confessions/mine': '我的表白',
  '/confessions/wall': '表白墙',
  '/confessions/bookmarks': '我的收藏',
  '/confessions/:slug': '表白详情',
  '/bottles': '漂流瓶',
  '/points': '积分中心',
  '/ai': 'AI 广场',
  '/moments': '朋友圈',
  '/plugins': '插件市场',
  '/admin': '管理后台',
  '/debug': '开发者调试',
  '/login': '登录页',
  '/terms': '服务条款',
  '/privacy': '隐私政策',
};

function getPageName(pathname: string): string {
  // '/' 必须全等匹配（startsWith 会吞掉所有路径）
  if (pathname === '/') return PAGE_NAMES['/'];
  const rest = Object.entries(PAGE_NAMES).filter(([route]) => route !== '/');
  // 静态路由按长度降序 startsWith，避免短路由遮蔽嵌套路由（如 /confessions 遮蔽 /confessions/new）
  const staticRoutes = rest
    .filter(([route]) => !route.includes(':'))
    .sort((a, b) => b[0].length - a[0].length);
  for (const [route, name] of staticRoutes) {
    if (pathname.startsWith(route)) return name;
  }
  // 动态参数路由（:slug）最后用正则匹配
  for (const [route, name] of rest.filter(([route]) => route.includes(':'))) {
    const pattern = route.replace(/:[^/]+/g, '[^/]+');
    if (new RegExp(`^${pattern}$`).test(pathname)) return name;
  }
  return '未知页面';
}

export function DebugProvider({ children }: { children: ReactNode }) {
  const location = useLocation(); // DebugProvider 位于 BrowserRouter 内部（App.tsx），可安全使用
  const [debugMode, setDebugModeState] = useState(() => {
    const saved = localStorage.getItem(DEBUG_KEY);
    return saved === 'true';
  });
  const [elementCount, setElementCount] = useState(0);
  const [debugInfo, setDebugInfoState] = useState<DebugInfo | null>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(DEBUG_KEY, String(debugMode));
    // 设置全局页面名（供 Shift+Click 使用），随路由变化实时更新
    if (typeof window !== 'undefined') {
      (window as any).__debugPageName = getPageName(location.pathname);
    }
  }, [debugMode, location.pathname]);

  // 从 localStorage 恢复上次复制的信息
  useEffect(() => {
    const saved = localStorage.getItem(INFO_KEY);
    if (saved) {
      try {
        setDebugInfoState(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  const setDebugInfo = useCallback((info: DebugInfo | null) => {
    setDebugInfoState(info);
    if (info) {
      localStorage.setItem(INFO_KEY, JSON.stringify(info));
    } else {
      localStorage.removeItem(INFO_KEY);
    }
  }, []);

  const toggleDebugMode = useCallback(() => {
    setDebugModeState((prev) => !prev);
  }, []);

  const copyElementPath = useCallback((el: HTMLElement, pageName: string) => {
    const tag = el.tagName.toLowerCase();
    const className = (el.className as string) || '';
    const id = el.id || '';
    const path = buildElementPath(el);
    const index = ++counterRef.current;

    const info: DebugInfo = {
      path,
      tag,
      className,
      id,
      index,
      timestamp: Date.now(),
      pageName,
    };

    setDebugInfo(info);

    // 复制到剪贴板
    navigator.clipboard.writeText(path).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = path;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }, []);

  // Shift+Click 监听 - 使用捕获阶段确保在元素自己的点击处理之前执行
  useEffect(() => {
    if (!debugMode) return;

    const handleClick = (e: MouseEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();

      const el = e.target as HTMLElement;
      // 从全局获取当前页面名
      const pageName = (window as any).__debugPageName || '未知页面';
      copyElementPath(el, pageName);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [debugMode, copyElementPath]);

  // 计算可交互元素数量
  useEffect(() => {
    const updateCount = () => {
      if (!debugMode) {
        setElementCount(0);
        return;
      }
      const interactive = document.querySelectorAll('button, a, input, textarea, select, [role="button"], [tabindex]');
      setElementCount(interactive.length);
    };

    updateCount();

    const observer = new MutationObserver(updateCount);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => observer.disconnect();
  }, [debugMode]);

  return (
    <DebugContext.Provider value={{ debugMode, setDebugMode: setDebugModeState, elementCount, debugInfo, setDebugInfo, toggleDebugMode }}>
      {children}
    </DebugContext.Provider>
  );
}

function buildElementPath(el: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    let segment = current.tagName.toLowerCase();
    if (current.id) {
      segment += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (classes.length > 0) {
        segment += `.${classes.join('.')}`;
      }
    }
    parts.unshift(segment);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

export function useDebug(): DebugContextValue {
  const ctx = useContext(DebugContext);
  if (!ctx) {
    throw new Error('useDebug 必须在 DebugProvider 内使用');
  }
  return ctx;
}

export default DebugContext;
