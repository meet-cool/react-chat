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
  const countersRef = useRef<Map<HTMLElement, number>>(new Map());
  const location = useLocation();

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

  useEffect(() => {
    if (!debugMode) {
      setElements([]);
      setHoveredIndex(null);
      return;
    }

    const updateElements = () => {
      const elements = findInteractiveElements();
      const pageName = getPageName(location.pathname);
      const info: ElementInfo[] = elements.map((el, index) => ({
        element: el,
        index,
        path: buildPath(el),
        pageName,
      }));
      setElements(info);

      // 更新计数器
      info.forEach(({ element, index }) => {
        countersRef.current.set(element, index + 1);
      });
    };

    updateElements();

    // 监听 DOM 变化
    const observer = new MutationObserver(() => {
      updateElements();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      observer.disconnect();
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
            path={path}
            pageName={pageName}
            isHovered={hoveredIndex === index}
            onHover={() => setHoveredIndex(index)}
            onLeave={() => setHoveredIndex(null)}
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
  path,
  pageName,
  isHovered,
  onHover,
  onLeave,
}: {
  element: HTMLElement;
  number: number;
  path: string;
  pageName: string;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // 用 ResizeObserver 监听元素自身尺寸变化（布局变化时自动跟随，避免标签漂移）
  useEffect(() => {
    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left,
      });
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    // 布局/尺寸变化时重新定位；无 ResizeObserver 的浏览器直接跳过
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updatePosition);
      ro.observe(element);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      if (ro) ro.disconnect();
    };
  }, [element]);

  return (
    <div
      className="absolute"
      style={{
        top: position.top,
        left: position.left,
        width: element.offsetWidth || 40,
        height: element.offsetHeight || 24,
        // 覆盖元素本体才能接收 hover（父容器仍保持 pointer-events:none，不阻挡 Shift+Click 复制）
        pointerEvents: 'auto',
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* 边框：仅 hover 时显示 */}
      <div
        className="absolute inset-0"
        style={{
          border: isHovered ? '2px solid var(--color-success)' : '1px solid transparent',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.15s ease, border-color 0.15s ease',
          zIndex: 5,
        }}
      />

      {/* 数字标签：仅 hover 时显示 */}
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
          opacity: isHovered ? 1 : 0,
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

  return (
    <button
      onClick={() => navigate('/debug')}
      className="fixed bottom-16 right-4 z-[9999] max-md:hidden flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all"
      style={{
        background: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '0',
        boxShadow: 'var(--shadow-md)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
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
