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
      {/* 右上角提示 */}
      {debugInfo && (
        <div
          className="fixed top-4 right-4 z-[9998] flex items-center gap-2 px-4 py-2 text-sm"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-success)',
            boxShadow: 'var(--shadow-lg)',
            animation: 'debugSlideIn 0.25s ease-out',
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: 'var(--color-success)' }}>✓</span>
          <span style={{ color: 'var(--color-text)' }}>已复制路径</span>
          <span style={{ color: 'var(--color-text-muted)' }} className="max-w-[300px] truncate font-mono text-xs">
            {debugInfo.pageName} | {debugInfo.path}
          </span>
        </div>
      )}

      {/* 数字标签容器 - pointer-events-none 确保不阻挡点击 */}
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

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
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
        pointerEvents: 'none',
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* 绿色高亮框 */}
      <div
        className="absolute inset-0 transition-all duration-150"
        style={{
          border: isHovered ? '2px solid var(--color-success)' : '1px solid transparent',
          boxShadow: isHovered ? '0 0 0 1px var(--color-success)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          zIndex: 5,
        }}
      />

      {/* 数字标签 */}
      <div
        className="flex items-center justify-center font-mono text-xs font-bold select-none"
        style={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: 16,
          height: 16,
          background: isHovered ? 'var(--color-success)' : 'var(--color-warning)',
          color: isHovered ? '#fff' : '#000',
          borderRadius: '2px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          zIndex: 10,
          lineHeight: '16px',
          transition: 'all 0.15s ease',
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
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all"
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
