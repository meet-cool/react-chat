import { useEffect, useRef, useState } from 'react';
import { UserPlus, UserMinus, AtSign, MessageSquare, X, User, Ban, Loader2 } from 'lucide-react';
import type { FollowStatus } from '../types';
import { followApi, socialApi } from '../lib/api';
import { Avatar } from './Avatar';
import { useApp } from '../lib/AppContext';

interface UserActionMenuProps {
  open: boolean;
  // 触发菜单的元素位置（相对视口）
  anchorRect: DOMRect | null;
  user: {
    id: number;
    username: string;
    avatar?: string;
  };
  currentUserId: number;
  onClose: () => void;
  onMention?: (username: string) => void;
  onMessage?: (userId: number) => void;
  onFollowChange?: (followed: boolean, mutual: boolean) => void;
  onViewProfile?: (username: string) => void;
  /** 拉黑该用户（可选；传则显示拉黑/取消拉黑按钮） */
  onBlock?: (userId: number, username: string) => void;
  /** 拉黑状态变化后通知父级（isNowBlocked）；可选，不传则仅菜单内更新显示 */
  onBlockedChange?: (isNowBlocked: boolean) => void;
}

export function UserActionMenu({
  open,
  anchorRect,
  user,
  currentUserId,
  onClose,
  onMention,
  onMessage,
  onFollowChange,
  onViewProfile,
  onBlock,
  onBlockedChange,
}: UserActionMenuProps) {
  const { addToast } = useApp();
  const [status, setStatus] = useState<FollowStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 不对自己显示菜单
  const isSelf = user.id === currentUserId;

  // 拉取关注状态
  useEffect(() => {
    if (!open || isSelf) return;
    let cancelled = false;
    followApi
      .status(user.id)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        // 静默
      });
    return () => {
      cancelled = true;
    };
  }, [open, user.id, isSelf]);

  // 拉取拉黑状态：查我的拉黑列表是否含该用户，决定按钮显示「拉黑」还是「取消拉黑」
  useEffect(() => {
    if (!open || isSelf) return;
    let cancelled = false;
    socialApi
      .blocks()
      .then((list) => {
        if (!cancelled) setIsBlocked(list.some((b) => b.user_id === user.id));
      })
      .catch(() => {
        // 静默
      });
    return () => {
      cancelled = true;
    };
  }, [open, user.id, isSelf]);

  // 拉黑 / 取消拉黑：菜单内自洽（按当前 isBlocked 调 block/unblock），成功后
  // 通过 onBlockedChange 通知父级刷新（不再复用 onBlock，避免父级无条件再 block 一次）。
  const handleBlockToggle = async () => {
    if (blockBusy) return;
    setBlockBusy(true);
    try {
      if (isBlocked) {
        await socialApi.unblock(user.id);
        setIsBlocked(false);
        addToast(`已取消拉黑 ${user.username}`, 'success');
        onBlockedChange?.(false);
      } else {
        await socialApi.block(user.id);
        setIsBlocked(true);
        addToast(`已拉黑 ${user.username}`, 'success');
        onBlockedChange?.(true);
      }
    } catch {
      addToast(isBlocked ? '取消拉黑失败' : '拉黑失败', 'error');
    } finally {
      setBlockBusy(false);
    }
  };

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // 延迟绑定，避免触发打开菜单的同一次点击
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !anchorRect || isSelf) return null;

  // 计算菜单位置（避免溢出视口）
  const MENU_WIDTH = 200;
  const MENU_HEIGHT = 220;
  let left = anchorRect.right + 6;
  let top = anchorRect.top;
  if (left + MENU_WIDTH > window.innerWidth) {
    left = anchorRect.left - MENU_WIDTH - 6;
  }
  if (left < 8) left = 8;
  if (top + MENU_HEIGHT > window.innerHeight) {
    top = window.innerHeight - MENU_HEIGHT - 8;
  }
  if (top < 8) top = 8;

  const handleToggleFollow = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (status?.i_follow) {
        await followApi.unfollow(user.id);
        // 即使 prev 为 null 也构造新对象，避免状态不更新导致 UI 残留
        setStatus((prev) => ({
          i_follow: false,
          follows_me: prev?.follows_me ?? false,
          mutual: false,
          can_message: false,
        }));
        addToast(`已取消关注 ${user.username}`, 'info');
        onFollowChange?.(false, false);
      } else {
        const r = await followApi.follow(user.id);
        setStatus((prev) => ({
          i_follow: true,
          follows_me: prev?.follows_me ?? false,
          mutual: !!r.mutual,
          can_message: !!r.can_message,
        }));
        if (r.mutual) {
          addToast(`互相关注 ${user.username}，可以发起私聊`, 'success');
        } else {
          addToast(`已关注 ${user.username}`, 'success');
        }
        onFollowChange?.(true, !!r.mutual);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMention = () => {
    onMention?.(user.username);
    onClose();
  };

  const handleMessage = () => {
    if (!status?.can_message) {
      addToast('需要互相关注才能发起私聊', 'warning');
      return;
    }
    onMessage?.(user.id);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] py-1 shadow-[var(--shadow-lg)]"
      style={{
        left,
        top,
        width: MENU_WIDTH,
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* 用户信息头部 */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: 'var(--color-divider)' }}
      >
        <Avatar username={user.username} avatar={user.avatar} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
            {user.username}
          </p>
          {status?.mutual && (
            <p className="text-[11px]" style={{ color: 'var(--color-success)' }}>
              互相关注
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="关闭"
        >
          <X size={14} />
        </button>
      </div>

      {/* 菜单项 */}
      <button
        onClick={handleToggleFollow}
        disabled={loading}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
        style={{ color: 'var(--color-text)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {status?.i_follow ? (
          <>
            <UserMinus size={15} style={{ color: 'var(--color-error)' }} />
            <span>取消关注</span>
          </>
        ) : (
          <>
            <UserPlus size={15} style={{ color: 'var(--color-primary)' }} />
            <span>关注</span>
          </>
        )}
      </button>

      <button
        onClick={handleMention}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
        style={{ color: 'var(--color-text)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <AtSign size={15} style={{ color: 'var(--color-info)' }} />
        <span>@TA</span>
      </button>

      <button
        onClick={handleMessage}
        disabled={!status?.can_message}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors disabled:opacity-50"
        style={{ color: 'var(--color-text)' }}
        onMouseEnter={(e) => {
          if (status?.can_message) e.currentTarget.style.background = 'var(--color-hover-bg)';
        }}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <MessageSquare size={15} style={{ color: 'var(--color-success)' }} />
        <span>私聊</span>
        {!status?.can_message && (
          <span className="ml-auto text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            需互相关注
          </span>
        )}
      </button>

      <button
        onClick={() => { onViewProfile?.(user.username.trim()); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
        style={{ color: 'var(--color-text)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <User size={15} style={{ color: 'var(--color-primary)' }} />
        <span>查看主页</span>
      </button>

      {onBlock && user.id !== currentUserId && (
        <button
          onClick={() => { void handleBlockToggle(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
          style={{ color: 'var(--color-error)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {isBlocked ? (
            <>
              <Ban size={15} style={{ color: 'var(--color-success)' }} />
              <span style={{ color: 'var(--color-success)' }}>取消拉黑</span>
            </>
          ) : (
            <>
              <Ban size={15} />
              <span>拉黑该用户</span>
            </>
          )}
          {blockBusy && <Loader2 size={13} className="animate-spin ml-auto" style={{ color: 'var(--color-text-muted)' }} />}
        </button>
      )}
    </div>
  );
}
