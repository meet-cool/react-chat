import {
  MessageSquare,
  Hash,
  UsersRound,
  BookUser,
  Heart,
  SendHorizonal,
  Star,
  Sparkles,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
} from 'lucide-react';
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
}

const CATEGORIES: { k: SidebarCategory; label: string; icon: typeof MessageSquare }[] = [
  { k: 'recent', label: '最近', icon: MessageSquare },
  { k: 'rooms', label: '聊天室', icon: Hash },
  { k: 'groups', label: '群聊', icon: UsersRound },
  { k: 'contacts', label: '通讯录', icon: BookUser },
  { k: 'confession', label: '表白墙', icon: Heart },
  { k: 'bottle', label: '漂流瓶', icon: SendHorizonal },
  { k: 'points', label: '积分中心', icon: Star },
  { k: 'extensions', label: '插件', icon: Sparkles },
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
}: ChatSidebarNavProps) {
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
            className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150 w-full ${
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
        className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-150 w-full text-xs ${
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

      {/* 个人主页 */}
      <button
        onClick={onNavigateToProfile}
        className="w-12 h-12 flex items-center justify-center transition-all duration-150 rounded-xl"
        style={{ color: 'var(--color-text-light)', background: 'transparent' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="个人主页"
      >
        <User size={22} />
      </button>

      {/* 设置按钮 */}
      <button
        onClick={onOpenSettings}
        className="w-14 h-14 flex items-center justify-center transition-all duration-150 rounded-xl"
        style={{ color: 'var(--color-text-light)', background: 'transparent' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="设置"
      >
        <Settings size={24} />
      </button>
    </div>
  );
}
