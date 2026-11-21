import { ReactNode } from 'react';
import {
  Sparkles,
  BookUser,
  MoreHorizontal,
  LogOut,
  PlusCircle,
  Settings,
  BookOpen,
  X,
} from 'lucide-react';
import type { SidebarCategory } from './chat-types';

/**
 * 移动端底部 TabBar 组件
 *
 * 三个 Tab（从左到右）：
 *   1. 弧光 (Sparkles)  → 切换到「最近聊天」视图 (category='recent')，收起通讯录面板
 *   2. 通讯录 (BookUser) → 展开/收起通讯录列表面板（含 4 子 Tab）
 *   3. 更多 (MoreHorizontal) → 打开底部 sheet 收纳功能
 *
 * 所有交互状态（contactsPanelOpen / moreSheetOpen / activeTab 等）由父组件管理，
 * 本组件纯展示 + 回调，避免内部 state 与 TabBar z-index 冲突。
 */

export type MobileTab = 'arcle' | 'contacts' | 'more';

export interface MobileTabBarProps {
  /** 当前激活的 Tab（'arcle' | 'contacts' | 'more'） */
  activeTab: MobileTab;
  /** 通讯录面板是否展开 */
  contactsPanelOpen: boolean;
  /** 通讯录面板当前子 Tab */
  contactsSubTab: SidebarCategory;
  /** 未读角标（可选） */
  arcleBadge?: number;
  contactsBadge?: number;
  moreBadge?: number;

  /** 切换到「弧光」Tab：设 category='recent'，收起通讯录面板 */
  onArcle: () => void;
  /** 切换/收起通讯录面板 */
  onContactsToggle: () => void;
  /** 切换通讯录面板子 Tab */
  onContactsSubTab: (tab: SidebarCategory) => void;
  /** 打开/关闭「更多」sheet */
  onMoreToggle: () => void;

  /* 「更多」sheet 功能回调 */
  onNewRoom: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onLogout: () => void;
  /** 通讯录面板列表面容（由 ChatPage 传入，根据 contactsSubTab 渲染对应 ChatSidebarContent） */
  panelContent: ReactNode;
}

const CONTACTS_SUB_TABS: { key: SidebarCategory; label: string }[] = [
  { key: 'rooms', label: '房间' },
  { key: 'recent', label: '私聊' },
  { key: 'contacts', label: '通讯录' },
  { key: 'groups', label: '群聊' },
];

/**
 * 底部 Tab 按钮（≥44px 触摸区）
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
      className="relative flex flex-col items-center gap-1 px-3 py-2 min-h-[44px] min-w-[44px] justify-center cursor-pointer"
      style={{
        background: 'transparent',
        border: 'none',
        color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
        transition: 'color 0.2s ease',
        fontFamily: 'inherit',
        fontSize: 12,
      }}
    >
      <div className="relative">
        <Icon size={20} />
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
      <span>{label}</span>
    </button>
  );
}

/**
 * 移动端底部 TabBar（含通讯录面板 + 更多 sheet）
 *
 * 渲染层次（从下到上 z-index）：
 *   - 通讯录面板内容区：z-40（固定在 TabBar 上方）
 *   - 更多 sheet 遮罩：z-40
 *   - 更多 sheet 主体：z-40
 *   - 底部 TabBar：z-50（始终可点）
 */
export function MobileTabBar({
  activeTab,
  contactsPanelOpen,
  contactsSubTab,
  arcleBadge,
  contactsBadge,
  moreBadge,
  onArcle,
  onContactsToggle,
  onContactsSubTab,
  onMoreToggle,
  onNewRoom,
  onOpenSettings,
  onOpenGuide,
  onLogout,
  panelContent,
}: MobileTabBarProps) {
  return (
    <>
      {/* ===== 通讯录列表面板（从 TabBar 上方升起，仅移动端）===== */}
      {contactsPanelOpen && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-40"
          style={{ background: 'var(--color-card)', borderTop: '1px solid var(--color-divider)' }}
        >
          {/* 子 Tab 栏 */}
          <div
            className="flex border-b flex-shrink-0"
            style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}
          >
            {CONTACTS_SUB_TABS.map((sub) => {
              const active = contactsSubTab === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => onContactsSubTab(sub.key)}
                  className="flex-1 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    background: active ? 'var(--color-card)' : 'transparent',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    border: 'none',
                    borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>

          {/* 列表面板内容区（由 ChatPage 通过 panelContent 传入） */}
          <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: '45vh' }}>
            {panelContent}
          </div>
        </div>
      )}

      {/* ===== 更多 Sheet（仅移动端）===== */}
      {activeTab === 'more' && (
        <>
          {/* 遮罩（z-40 < TabBar z-50） */}
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.35)' }}
            onClick={onMoreToggle}
          />
          {/* 底部 Sheet 主体（z-40，在遮罩之上但在 TabBar 之下，让 TabBar 始终可点） */}
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-40"
            style={{
              background: 'var(--color-card)',
              borderTop: '1px solid var(--color-divider)',
            }}
          >
            {/* Sheet 头部 */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
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

            {/* 功能项列表 */}
            <div className="py-2">
              <button
                onClick={() => { onNewRoom(); onMoreToggle(); }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14,
                }}
              >
                <PlusCircle size={18} style={{ color: 'var(--color-primary)' }} />
                新建聊天室
              </button>
              <button
                onClick={() => { onOpenSettings(); onMoreToggle(); }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14,
                }}
              >
                <Settings size={18} style={{ color: 'var(--color-primary)' }} />
                设置
              </button>
              <button
                onClick={() => { onOpenGuide(); onMoreToggle(); }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14,
                }}
              >
                <BookOpen size={18} style={{ color: 'var(--color-primary)' }} />
                新手指导
              </button>
              <div style={{ borderTop: '1px solid var(--color-divider)' }} />
              <button
                onClick={() => { onLogout(); onMoreToggle(); }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--color-error)', fontFamily: 'inherit', fontSize: 14,
                }}
              >
                <LogOut size={18} />
                退出登录
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== 底部 TabBar（z-50，始终最上层）===== */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-sm"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--color-divider)' }}
      >
        <div className="flex justify-around py-1.5 px-2">
          <TabButton
            icon={Sparkles}
            label="弧光"
            active={activeTab === 'arcle' && !contactsPanelOpen}
            badge={arcleBadge}
            onClick={onArcle}
          />
          <TabButton
            icon={BookUser}
            label="通讯录"
            active={activeTab === 'contacts' && contactsPanelOpen}
            badge={contactsBadge}
            onClick={onContactsToggle}
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
