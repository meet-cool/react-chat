import {
  MessageSquare,
  Hash,
  UsersRound,
  BookUser,
  Heart,
  SendHorizonal,
  Star,
  Sparkles,
  Puzzle,
  Camera,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  Menu as MenuIcon,
  BookOpen,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SidebarCategory } from './chat-types';

interface ChatSidebarNavProps {
  category: SidebarCategory;
  showLabels: boolean;
  indicatorTop: number;
  categoryBtnRefs: React.RefObject<Map<string, HTMLButtonElement>>;
  onCategoryClick: (k: SidebarCategory) => void;
  onToggleLabels: () => void;
  onNavigateToProfile: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenMbti: () => void;
}

const CATEGORIES: { k: SidebarCategory; label: string; icon: typeof MessageSquare }[] = [
  { k: 'recent', label: '最近', icon: MessageSquare },
  { k: 'rooms', label: '聊天室', icon: Hash },
  { k: 'groups', label: '群聊', icon: UsersRound },
  { k: 'contacts', label: '通讯录', icon: BookUser },
  { k: 'confession', label: '表白墙', icon: Heart },
  { k: 'bottle', label: '漂流瓶', icon: SendHorizonal },
  { k: 'moments', label: '朋友圈', icon: Camera },
  { k: 'points', label: '积分中心', icon: Star },
  { k: 'extensions', label: 'AI 广场', icon: Sparkles },
  { k: 'plugins', label: '插件市场', icon: Puzzle },
  { k: 'english', label: '英语学习', icon: GraduationCap },
];

export function ChatSidebarNav({
  category,
  showLabels,
  indicatorTop,
  categoryBtnRefs,
  onCategoryClick,
  onToggleLabels,
  onNavigateToProfile,
  onOpenSettings,
  onOpenGuide,
  onOpenMbti,
}: ChatSidebarNavProps) {
  // 底部菜单栏（个人主页 / 设置 / 新手指导）
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const menuItems: { label: string; icon: typeof User; onClick: () => void }[] = [
    { label: '个人主页', icon: User, onClick: onNavigateToProfile },
    { label: '设置', icon: Settings, onClick: onOpenSettings },
    { label: '新手指导', icon: BookOpen, onClick: onOpenGuide },
  ];

  return (
    <div
      className="flex flex-col items-center py-4 gap-2 border-r flex-shrink-0 relative transition-all duration-200"
      style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}
    >
      {/* 左侧活跃指示条 */}
      <div
        className="absolute left-0 w-1 rounded-r"
        style={{
          height: 56,
          background: 'var(--color-primary)',
          opacity: 0.8,
          boxShadow: '0 0 6px var(--color-primary)',
          top: indicatorTop,
          transition: 'top 0.2s ease-out',
        }}
      />

      {/* 分类按钮 */}
      {CATEGORIES.map((c) => {
        const Icon = c.icon;
        const isActive = category === c.k;
        return (
          <button
            key={c.k}
            ref={(el) => {
              if (el) {
                (categoryBtnRefs as React.RefObject<Map<string, HTMLButtonElement>>).current?.set(c.k, el);
              }
            }}
            onClick={() => onCategoryClick(c.k)}
            className={`flex items-center gap-3 px-2 py-2.5 rounded-sm transition-all duration-150 w-full ${
              showLabels ? 'justify-start' : 'justify-center'
            }`}
            style={
              isActive
                ? {
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    borderLeft: '3px solid var(--color-primary)',
                  }
                : {
                    color: 'var(--color-text-light)',
                    background: 'transparent',
                  }
            }
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'var(--color-hover-bg)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
            title={c.label}
          >
            <Icon size={20} />
            {showLabels && <span className="text-sm font-medium truncate">{c.label}</span>}
          </button>
        );
      })}

      {/* 切换标签显示 */}
      <button
        onClick={onToggleLabels}
        className={`flex items-center gap-2 px-2 py-2 rounded-sm transition-all duration-150 w-full text-xs ${
          showLabels ? 'justify-start' : 'justify-center'
        }`}
        style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title={showLabels ? '收起文字' : '显示文字'}
      >
        {showLabels ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        {showLabels && <span>收起</span>}
      </button>

      <div className="flex-1" />

      {/* 菜单栏：个人主页 / 设置 / 新手指导 */}
      <div ref={menuRef} className="relative w-full flex justify-center">
        {menuOpen && (
          <div
            className="absolute bottom-14 left-1 w-44 shadow-[var(--shadow-lg)] overflow-hidden"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, zIndex: 60 }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--color-divider)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>菜单</span>
              <button onClick={() => setMenuOpen(false)} className="p-0.5" style={{ color: 'var(--color-text-muted)' }} aria-label="关闭菜单">
                <X size={13} />
              </button>
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => { setMenuOpen(false); item.onClick(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left"
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={16} style={{ color: 'var(--color-primary)' }} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex items-center gap-3 px-2 py-2.5 rounded-sm transition-all duration-150 w-full ${
            showLabels ? 'justify-start' : 'justify-center'
          }`}
          style={{ color: 'var(--color-text-light)', background: menuOpen ? 'var(--color-hover-bg)' : 'transparent' }}
          onMouseEnter={(e) => { if (!menuOpen) e.currentTarget.style.background = 'var(--color-hover-bg)'; }}
          onMouseLeave={(e) => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; }}
          title="菜单"
        >
          <MenuIcon size={22} />
          {showLabels && <span className="text-sm font-medium truncate">菜单</span>}
        </button>
      </div>
    </div>
  );
}
