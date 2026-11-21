import {
  Sparkles,
  Hash,
  UsersRound,
  BookUser,
  MoreHorizontal,
  LogOut,
  PlusCircle,
  Settings,
  BookOpen,
  X,
  Heart,
  SendHorizonal,
  Camera,
  Star,
  Puzzle,
  GraduationCap,
  User,
} from 'lucide-react';
import type { SidebarCategory } from './chat-types';

/**
 * 移动端底部 TabBar 组件（5 Tab）
 *
 * 五个 Tab（从左到右）：
 *   1. 弧光 (Sparkles)   → 最近聊天 (category='recent')
 *   2. 聊天室 (Hash)     → 房间列表 (category='rooms')
 *   3. 群聊 (UsersRound)  → 群聊列表 (category='groups')
 *   4. 通讯录 (BookUser)  → 通讯录 (category='contacts')
 *   5. 更多 (MoreHorizontal) → 底部 sheet 收纳 12 项次要功能
 *
 * 所有交互状态由父组件管理，本组件纯展示 + 回调。
 */

export type MobileTab = 'arcle' | 'rooms' | 'groups' | 'contacts' | 'more';

export interface MobileTabBarProps {
  /** 当前激活的 Tab */
  activeTab: MobileTab;
  /** 各 Tab 的未读/角标（可选） */
  arcleBadge?: number;
  roomsBadge?: number;
  groupsBadge?: number;
  contactsBadge?: number;
  moreBadge?: number;

  /** 切换到「弧光」Tab：设 category='recent'，收起其它面板 */
  onArcle: () => void;
  /** 切换到「聊天室」Tab：设 category='rooms' */
  onRooms: () => void;
  /** 切换到「群聊」Tab：设 category='groups' */
  onGroups: () => void;
  /** 切换到「通讯录」Tab：设 category='contacts' */
  onContacts: () => void;
  /** 打开/关闭「更多」sheet */
  onMoreToggle: () => void;

  /* 「更多」sheet 功能回调（12 项） */
  onNavigateToConfession: () => void;
  onNavigateToBottle: () => void;
  onNavigateToMoments: () => void;
  onNavigateToPoints: () => void;
  onNavigateToAi: () => void;
  onNavigateToPlugins: () => void;
  onNavigateToEnglish: () => void;
  onNewRoom: () => void;
  onNavigateToProfile: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onLogout: () => void;
}

/**
 * 底部 Tab 按钮（≥44px 触摸区，flex-1 均分）
 */
function TabButton({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: typeof Sparkles;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[36px] cursor-pointer"
      style={{
        background: 'transparent',
        border: 'none',
        color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
        transition: 'color 0.2s ease',
        fontFamily: 'inherit',
      }}
    >
      <div className="relative">
        <Icon size={18} />
        {badge && badge > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center text-[9px] text-white"
            style={{
              minWidth: 14,
              height: 14,
              borderRadius: 9999,
              background: 'var(--color-error)',
              padding: '0 3px',
            }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span style={{ fontSize: 9, lineHeight: 1.2 }}>{label}</span>
    </button>
  );
}

/** 「更多」sheet 功能项定义（图标 + 文字 + 回调 key） */
interface MoreItem {
  key:
    | 'confession' | 'bottle' | 'moments' | 'points'
    | 'ai' | 'plugins' | 'english' | 'newRoom'
    | 'profile' | 'settings' | 'guide' | 'logout';
  label: string;
  icon: typeof Heart;
  danger?: boolean;
}

const MORE_ITEMS: MoreItem[] = [
  { key: 'confession', label: '表白墙', icon: Heart },
  { key: 'bottle', label: '漂流瓶', icon: SendHorizonal },
  { key: 'moments', label: '朋友圈', icon: Camera },
  { key: 'points', label: '积分中心', icon: Star },
  { key: 'ai', label: 'AI 广场', icon: Sparkles },
  { key: 'plugins', label: '插件市场', icon: Puzzle },
  { key: 'english', label: '英语学习', icon: GraduationCap },
  { key: 'newRoom', label: '新建聊天室', icon: PlusCircle },
  { key: 'profile', label: '个人主页', icon: User },
  { key: 'settings', label: '设置', icon: Settings },
  { key: 'guide', label: '新手指导', icon: BookOpen },
  { key: 'logout', label: '退出登录', icon: LogOut, danger: true },
];

/**
 * 移动端底部 TabBar（5 Tab + 更多 sheet，仅移动端显示）
 *
 * 渲染层次（从下到上 z-index）：
 *   - 更多 sheet 遮罩：z-40
 *   - 更多 sheet 主体：z-40
 *   - 底部 TabBar：z-50（始终可点）
 */
export function MobileTabBar({
  activeTab,
  arcleBadge,
  roomsBadge,
  groupsBadge,
  contactsBadge,
  moreBadge,
  onArcle,
  onRooms,
  onGroups,
  onContacts,
  onMoreToggle,
  onNavigateToConfession,
  onNavigateToBottle,
  onNavigateToMoments,
  onNavigateToPoints,
  onNavigateToAi,
  onNavigateToPlugins,
  onNavigateToEnglish,
  onNewRoom,
  onNavigateToProfile,
  onOpenSettings,
  onOpenGuide,
  onLogout,
}: MobileTabBarProps) {
  // 构建回调映射表
  const moreCallbacks: Record<MoreItem['key'], () => void> = {
    confession: onNavigateToConfession,
    bottle: onNavigateToBottle,
    moments: onNavigateToMoments,
    points: onNavigateToPoints,
    ai: onNavigateToAi,
    plugins: onNavigateToPlugins,
    english: onNavigateToEnglish,
    newRoom: onNewRoom,
    profile: onNavigateToProfile,
    settings: onOpenSettings,
    guide: onOpenGuide,
    logout: onLogout,
  };

  return (
    <>
      {/* ===== 更多 Sheet（仅移动端）===== */}
      {activeTab === 'more' && (
        <>
          {/* 遮罩（z-40 < TabBar z-50） */}
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.35)' }}
            onClick={onMoreToggle}
          />
          {/* 底部 Sheet 主体（z-40，停到底部 TabBar 上方，避免被遮挡；高度匹配 TabBar 含 safe-area） */}
          <div
            className="md:hidden fixed left-0 right-0 z-40 overflow-hidden"
            style={{
              // 与 TabBar 实际高度对齐：按钮 36 + 上 padding 4 + 底 padding max(4px, safe-area)
              bottom: 'calc(40px + max(4px, env(safe-area-inset-bottom)))',
              background: 'var(--color-card)',
              borderTop: '1px solid var(--color-divider)',
              maxHeight: 'calc(70vh - 40px)',
            }}
          >
            {/* Sheet 头部 */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: 'var(--color-divider)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                更多功能
              </span>
              <button
                onClick={onMoreToggle}
                className="p-1 cursor-pointer"
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 功能项列表（可滚动） */}
            <div className="overflow-y-auto py-2">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => { moreCallbacks[item.key](); onMoreToggle(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: item.danger ? 'var(--color-error)' : 'var(--color-text)',
                      fontFamily: 'inherit',
                      fontSize: 14,
                    }}
                  >
                    <Icon size={18} style={{ color: item.danger ? 'var(--color-error)' : 'var(--color-primary)' }} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ===== 底部 TabBar（z-50，始终最上层）===== */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-sm"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--color-divider)' }}
      >
        <div className="flex py-1 px-2" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
          <TabButton
            icon={Sparkles}
            label="弧光"
            active={activeTab === 'arcle'}
            badge={arcleBadge}
            onClick={onArcle}
          />
          <TabButton
            icon={Hash}
            label="聊天室"
            active={activeTab === 'rooms'}
            badge={roomsBadge}
            onClick={onRooms}
          />
          <TabButton
            icon={UsersRound}
            label="群聊"
            active={activeTab === 'groups'}
            badge={groupsBadge}
            onClick={onGroups}
          />
          <TabButton
            icon={BookUser}
            label="通讯录"
            active={activeTab === 'contacts'}
            badge={contactsBadge}
            onClick={onContacts}
          />
          <TabButton
            icon={MoreHorizontal}
            label="更多"
            active={activeTab === 'more'}
            badge={moreBadge}
            onClick={onMoreToggle}
          />
        </div>
      </nav>
    </>
  );
}
