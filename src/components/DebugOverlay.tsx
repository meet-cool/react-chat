import { useEffect, useRef, useState } from 'react';
import { useDebug } from '../lib/DebugContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';

interface ElementInfo {
  element: HTMLElement;
  index: number;
  path: string;
  pageName: string;
}

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
  '/profile/:username': '个人主页',
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
  for (const [route, name] of Object.entries(PAGE_NAMES)) {
    if (route.includes(':')) {
      // 动态路由匹配
      const pattern = route.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(pathname)) return name;
    } else if (pathname.startsWith(route)) {
      return name;
    }
  }
  return '未知页面';
}

export function DebugOverlay() {
  const { debugMode, debugInfo } = useDebug();
  const [elements, setElements] = useState<ElementInfo[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [positions, setPositions] = useState<{ top: number; left: number; w: number; h: number }[]>([]);
  const countersRef = useRef<Map<HTMLElement, number>>(new Map());
  const location = useLocation();
  // 用 ref 持有最新 elements，避免 effect 因 elements 变化而反复重建（编号漂移根因）
  const elementsRef = useRef<ElementInfo[]>([]);
  elementsRef.current = elements;

  // 查找所有可交互元素
  const findInteractiveElements = (): HTMLElement[] => {
    const selectors = [
      'button',
      'a[href]',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[tabindex]:not([tabindex="-1"])',
      '.btn',
      '[data-debug-target]',
    ];
    return Array.from(document.querySelectorAll(selectors.join(', '))) as HTMLElement[];
  };

  // 统一位置刷新：常驻 rAF 循环 + 脏标记。
  // 平时空转（零开销）；检测到 scroll/resize/DOM 结构变化/mousemove 时置脏，
  // 下一帧才重算所有 badge 视口坐标 —— 弹窗打开/Tab 切换/滚动任何布局变化
  // 都因触发 MutationObserver/scroll 而置脏，badge 立即贴合，不再漂移或停留旧位置。
  useEffect(() => {
    if (!debugMode) {
      setPositions([]);
      return;
    }
    let rafId = 0;
    let running = true;
    let dirty = true; // 首帧必算
    const compute = () => {
      dirty = false;
      const els = elementsRef.current;
      if (els.length === 0) {
        setPositions((prev) => (prev.length === 0 ? prev : []));
        return;
      }
      const next = els.map(({ element }) => {
        const r = element.getBoundingClientRect();
        // 视口外（被滚动隐藏）的元素不显示 badge，避免叠在 top:0
        const inViewport =
          r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
        return inViewport
          ? { top: r.top, left: r.left, w: r.width, h: r.height }
          : { top: 0, left: 0, w: 0, h: 0 };
      });
      setPositions((prev) => {
        if (prev.length === next.length) {
          let same = true;
          for (let i = 0; i < next.length; i++) {
            const a = prev[i];
            const b = next[i];
            if (a.top !== b.top || a.left !== b.left || a.w !== b.w || a.h !== b.h) { same = false; break; }
          }
          if (same) return prev;
        }
        return next;
      });
    };
    const tick = () => {
      if (!running) return;
      rafId = requestAnimationFrame(tick);
      if (dirty) compute();
    };
    rafId = requestAnimationFrame(tick);

    // 置脏条件：任何可能引起布局变化的事件
    const markDirty = () => { dirty = true; };
    window.addEventListener('scroll', markDirty, true);
    document.addEventListener('scroll', markDirty, true);
    window.addEventListener('resize', markDirty);
    window.addEventListener('mousemove', markDirty);
    // 字体/图片加载引起的位移也会触发 resize 兜底；DOM 结构变化由下方
    // 元素重扫 effect 的 MutationObserver 触发 setElements → 这里用独立 observer 置脏
    const layoutObserver = new MutationObserver(markDirty);
    layoutObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', markDirty, true);
      document.removeEventListener('scroll', markDirty, true);
      window.removeEventListener('resize', markDirty);
      window.removeEventListener('mousemove', markDirty);
      layoutObserver.disconnect();
    };
  }, [debugMode]);

  // DOM 结构变化时重扫元素（仅 debugMode/路由变化时重建，不依赖 elements/hoveredIndex）
  useEffect(() => {
    if (!debugMode) {
      setElements([]);
      setHoveredIndex(null);
      return;
    }

    const updateElements = () => {
      const found = findInteractiveElements();
      const pageName = getPageName(location.pathname);
      const info: ElementInfo[] = found.map((el, index) => ({
        element: el,
        index,
        path: buildPath(el),
        pageName,
      }));
      elementsRef.current = info;
      setElements(info);
      countersRef.current.clear();
      info.forEach(({ element, index }) => {
        countersRef.current.set(element, index + 1);
      });
    };

    updateElements();

    // 监听 DOM 结构变化（不含 attributes，降低重扫频率）
    const observer = new MutationObserver(() => {
      updateElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 鼠标命中检测：badge 本体 pointer-events:none（不挡按钮），
    // 故高亮改由顶层 mousemove 命中谁的可交互元素驱动。用 ref 读最新 elements。
    const INTERACTIVE = 'button, a[href], input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])';
    let mouseRaf = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (mouseRaf) return;
      mouseRaf = requestAnimationFrame(() => {
        mouseRaf = 0;
        const t = e.target as HTMLElement;
        if (t.closest?.('[data-debug-widget]')) {
          setHoveredIndex((cur) => (cur === null ? cur : null));
          return;
        }
        const interactive = t.closest(INTERACTIVE) as HTMLElement | null;
        const idx = interactive
          ? elementsRef.current.findIndex((el) => el.element === interactive)
          : -1;
        setHoveredIndex((cur) => {
          if (idx === -1) return cur === null ? cur : null;
          return cur === idx ? cur : idx;
        });
      });
    };
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      observer.disconnect();
      document.removeEventListener('mousemove', handleMouseMove);
      if (mouseRaf) cancelAnimationFrame(mouseRaf);
    };
  }, [debugMode, location.pathname]);

  return (
    <>
      {/* 右上角提示：显示 2.5s 后自动淡出，避免常驻遮挡；每次复制后 key 变化重新计时 */}
      {debugInfo && <CopyToast debugInfo={debugInfo} />}

      {/* 数字标签容器：默认不显示编号/边框（零视觉噪音），hover 到元素时才显现；pointer-events:none 不阻挡 Shift+Click 复制 */}
      <div
        className="fixed inset-0 pointer-events-none z-[9996]"
        style={{ overflow: 'hidden' }}
      >
        {elements.map(({ element, index, path, pageName }) => (
          <DebugBadge
            key={`${index}-${path}`}
            element={element}
            number={index + 1}
            isHovered={hoveredIndex === index}
            position={positions[index] || { top: 0, left: 0, w: 0, h: 0 }}
          />
        ))}
      </div>

      {/* 开发者选项按钮 */}
      {debugMode && <DebugButton />}
    </>
  );
}

/** 已复制提示条：key={timestamp} 随每次复制重新挂载，显示 2.5s 后淡出 0.3s 隐藏 */
function CopyToast({ debugInfo }: { debugInfo: { pageName: string; path: string; url?: string; timestamp: number } }) {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2500);
    const t2 = setTimeout(() => setGone(true), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9998] flex items-center gap-2 px-4 py-2 text-sm"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-success)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'debugSlideIn 0.25s ease-out',
        pointerEvents: 'none',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      <span style={{ color: 'var(--color-success)' }}>✓</span>
      <span style={{ color: 'var(--color-text)' }}>已复制路径</span>
      <span style={{ color: 'var(--color-text-muted)' }} className="max-w-[300px] truncate font-mono text-xs" title={debugInfo.url || ''}>
        {debugInfo.pageName} · {debugInfo.url || ''}
      </span>
    </div>
  );
}

function DebugBadge({
  element,
  number,
  isHovered,
  position,
}: {
  element: HTMLElement;
  number: number;
  isHovered: boolean;
  /** 由 DebugOverlay 顶层统一计算的视口坐标（单一 rAF 批量刷新，含内部滚动容器） */
  position: { top: number; left: number; w: number; h: number };
}) {
  // 是否高亮（由 DebugOverlay 顶层的鼠标命中检测驱动，badge 本体 pointer-events:none）
  const hovered = isHovered;

  // 元素不在视口内（w/h 为 0）→ 不渲染，避免 badge 叠在左上角
  if (position.w === 0 && position.h === 0) return null;

  return (
    <div
      data-debug-widget="badge"
      className="absolute"
      style={{
        top: position.top,
        left: position.left,
        width: position.w,
        height: position.h,
        // 完全透明：调试层不阻挡任何真实交互（按钮可正常点击/输入）。
        // hover 高亮由 DebugOverlay 顶层的鼠标命中检测驱动 isHovered。
        pointerEvents: 'none',
      }}
    >
      {/* 边框：hover 时显示 */}
      <div
        className="absolute inset-0"
        style={{
          border: hovered ? '2px solid var(--color-success)' : '2px solid transparent',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s ease',
          zIndex: 5,
        }}
      />

      {/* 数字标签：hover 时显示 */}
      <div
        className="flex items-center justify-center font-mono text-xs font-bold select-none"
        style={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: 16,
          height: 16,
          background: 'var(--color-warning)',
          color: '#000',
          borderRadius: 3,
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          zIndex: 10,
          lineHeight: '16px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        {number}
      </div>
    </div>
  );
}

function DebugButton() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      data-debug-widget="debug-button"
      onClick={() => navigate('/debug')}
      className="fixed bottom-16 right-4 z-[9999] max-md:hidden flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all"
      style={{
        background: hovered ? 'var(--color-primary-hover)' : 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '0',
        boxShadow: 'var(--shadow-md)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="开发者调试选项"
    >
      <Settings size={14} />
      开发者选项
    </button>
  );
}

function buildPath(el: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    let segment = current.tagName.toLowerCase();
    if (current.id) {
      segment += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (classes.length > 0) {
        segment += `.${classes.join('.')}`;
      }
    }
    parts.unshift(segment);
    current = current.parentElement;
  }

  return parts.join(' > ');
}
