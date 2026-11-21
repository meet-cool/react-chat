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
  /** 复制元素路径时记录当前页面地址（window.location.href） */
  url?: string;
  /** 自动捕获的页面布局快照：该页面所有可交互元素的 CSS 路径列表（跳转时自动复制） */
  layoutElements?: string[];
  /** 是否为「页面跳转自动复制」（而非 Shift+Click 单元素） */
  isLayoutSnapshot?: boolean;
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

  // 说明：debugInfo 不再从 localStorage 恢复（避免刷新/跳转页面时 CopyToast 自动弹出，
  // 误以为在自动复制）。它只由「本次会话内」的 Ctrl+C / Shift+Click 复制动作驱动，
  // 复制内容仍写入 storage（INFO_KEY）供调试页展示历史记录，但不影响 CopyToast 的弹出。

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

    const url = typeof window !== 'undefined' ? window.location.href : '';

    // 多行结构化文本：页面名 + 页面地址 + 元素路径，方便把「在哪个页面 + 哪个元素」一起交给 AI
    const copyText = [
      `页面: ${pageName}`,
      `URL: ${url}`,
      `元素: ${path}`,
    ].join('\n');

    const info: DebugInfo = {
      path,
      tag,
      className,
      id,
      index,
      timestamp: Date.now(),
      pageName,
      url,
    };

    setDebugInfo(info);

    // 复制到剪贴板
    navigator.clipboard.writeText(copyText).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = copyText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }, []);

  /**
   * 捕获当前页面的布局快照：收集所有可交互元素的 CSS 路径，写成多行文本复制到剪贴板。
   * 由 Ctrl+C（调试模式下）触发——把「这个页面有哪些按钮/控件、分别在哪」一次性交给 AI。
   */
  const captureLayoutForPage = useCallback((pageName: string) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const sel = 'button, a[href], input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])';
    const paths: string[] = [];
    document.querySelectorAll(sel).forEach((el) => {
      const he = el as HTMLElement;
      if (he.closest('[data-debug-widget]')) return; // 跳过调试层自身
      const p = buildElementPath(he);
      if (p && !paths.includes(p)) paths.push(p);
    });

    const copyText = [
      `页面: ${pageName}`,
      `URL: ${url}`,
      `可交互元素（${paths.length}）:`,
      ...paths.map((p, i) => `  ${i + 1}. ${p}`),
    ].join('\n');

    const info: DebugInfo = {
      path: `[layout-snapshot] ${pageName}`,
      tag: '',
      className: '',
      id: '',
      index: ++counterRef.current,
      timestamp: Date.now(),
      pageName,
      url,
      layoutElements: paths,
      isLayoutSnapshot: true,
    };
    setDebugInfo(info);

    navigator.clipboard.writeText(copyText).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = copyText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    return true;
  }, []);

  const captureLayoutForPageRef = useRef(captureLayoutForPage);
  captureLayoutForPageRef.current = captureLayoutForPage;

  // Ctrl + 鼠标左键点击（调试模式下）→ 复制「当前页面完整布局快照」（所有可交互元素路径）。
  // 与 Shift+Click（复制单个元素路径）互补：Ctrl+Click 拿整页布局。
  // 焦点在输入框/可编辑元素时不拦截，避免影响正常操作。
  useEffect(() => {
    if (!debugMode) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return; // 仅 Ctrl + 左键
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      // 点的是调试工具自身（badge / 悬浮按钮）→ 不拦截，让它正常处理
      if (target && target.closest('[data-debug-widget]')) return;
      const pageName = (window as any).__debugPageName || '未知页面';
      if (captureLayoutForPageRef.current(pageName)) {
        e.preventDefault(); // 阻止 Ctrl+Click 默认的「多选」行为
        e.stopPropagation();
      }
    };
    document.addEventListener('mousedown', handleMouseDown, true); // 捕获阶段，先于元素自身 onClick
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [debugMode]);

  // Shift+Click 监听 - 使用捕获阶段确保在元素自己的点击处理之前执行
  useEffect(() => {
    if (!debugMode) return;

    const INTERACTIVE_SELECTOR = 'button, a[href], input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])';

    const isDebugWidget = (n: Node | null): boolean => {
      // 调试工具自身（数字标签 / 悬浮按钮）的 DOM 节点：Shift+Click 落在其上不算「点页面元素」
      const el = (n as HTMLElement | null)?.closest?.('[data-debug-widget]');
      return !!el;
    };

    const handleClick = (e: MouseEvent) => {
      if (!e.shiftKey) return;

      const target = e.target as HTMLElement;
      // 点的是调试工具自身（badge / 悬浮按钮）→ 不当作复制，也不拦截真实点击
      if (isDebugWidget(target)) return;

      // 从 target 向上找最近的「可交互元素」——点中图标/SVG/文本 span 时能归到真正可交互的父级，
      // 避免 e.target 是非交互节点（或调试层）导致赋值错乱
      const interactive = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
      if (!interactive) return;

      // preventDefault + 捕获阶段：阻止按钮真实 onClick / 链接跳转 / 表单提交，
      // 让 Shift+Click 只用于「复制路径」，不会顺带触发被点击按钮的功能
      e.preventDefault();
      e.stopPropagation();

      // 从全局获取当前页面名
      const pageName = (window as any).__debugPageName || '未知页面';
      copyElementPath(interactive, pageName);
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
