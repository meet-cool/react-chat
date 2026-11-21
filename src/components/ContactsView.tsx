import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, UserPlus, UserMinus, MessageSquare, RefreshCw, X, Pencil, MoreVertical, Users, UserCheck, UserCircle, Smartphone } from 'lucide-react';
import type { ContactUser } from '../types';
import { contactApi, followApi, aliasApi } from '../lib/api';
import { Avatar } from './Avatar';
import { useApp } from '../lib/AppContext';

type ContactTab = 'mutual' | 'following' | 'followers';
type ActionMenu = {
  userId: number;
  x: number;
  y: number;
} | null;

interface ContactsViewProps {
  onOpenConversation?: (userId: number) => void;
  /** 移动端全屏展开时关闭侧边栏 */
  onClose?: () => void;
}

export function ContactsView({ onOpenConversation, onClose }: ContactsViewProps) {
  const { addToast } = useApp();
  const [tab, setTab] = useState<ContactTab>('mutual');
  const [list, setList] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<ContactUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [aliasMap, setAliasMap] = useState<Record<number, string>>({});
  const [editingAliasId, setEditingAliasId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [actionMenu, setActionMenu] = useState<ActionMenu>(null);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

  const loadList = useCallback(
    async (t: ContactTab) => {
      setLoading(true);
      try {
        const data = await contactApi.list(t);
        setList(data);
      } catch (err) {
        addToast(err instanceof Error ? err.message : '加载通讯录失败', 'error');
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    loadList(tab);
    aliasApi.list().then((rows) => {
      const map: Record<number, string> = {};
      for (const r of rows) map[r.target_user_id] = r.alias;
      setAliasMap(map);
    }).catch(() => {});
  }, [tab, loadList]);

  const handleSearch = async () => {
    const kw = keyword.trim();
    if (kw.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const data = await contactApi.search(kw);
      setSearchResults(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '搜索失败', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleToggleFollow = async (u: ContactUser) => {
    try {
      if (u.i_follow) {
        await followApi.unfollow(u.id);
        addToast(`已取消关注 ${u.username}`, 'info');
        // 刷新当前列表与搜索结果
        loadList(tab);
        if (searchResults) {
          setSearchResults(searchResults.map((r) => (r.id === u.id ? { ...r, i_follow: false, mutual: false } : r)));
        }
      } else {
        const r = await followApi.follow(u.id);
        addToast(r.mutual ? `互相关注 ${u.username}` : `已关注 ${u.username}`, 'success');
        loadList(tab);
        if (searchResults) {
          setSearchResults(
            searchResults.map((s) =>
              s.id === u.id ? { ...s, i_follow: true, mutual: !!r.mutual } : s,
            ),
          );
        }
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleMessage = (u: ContactUser) => {
    if (!u.mutual) {
      addToast('需要互相关注才能发起私聊', 'warning');
      return;
    }
    onOpenConversation?.(u.id);
  };

  // 保存备注
  const handleSaveAlias = async (u: ContactUser) => {
    const alias = editingText.trim();
    try {
      await aliasApi.set(u.id, alias);
      setAliasMap((prev) => ({ ...prev, [u.id]: alias }));
      setEditingAliasId(null);
      setEditingText('');
      setList((prev) => prev.map((item) => (item.id === u.id ? { ...item, alias } : item)));
      if (searchResults) {
        setSearchResults((prev) =>
          prev?.map((item) => (item.id === u.id ? { ...item, alias } : item)) ?? null
        );
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存备注失败', 'error');
    }
  };

  // 清除备注
  const handleClearAlias = async (u: ContactUser) => {
    try {
      await aliasApi.delete(u.id);
      setAliasMap((prev) => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      setList((prev) => prev.map((item) => (item.id === u.id ? { ...item, alias: '' } : item)));
      if (searchResults) {
        setSearchResults((prev) =>
          prev?.map((item) => (item.id === u.id ? { ...item, alias: '' } : item)) ?? null
        );
      }
    } catch (err) {
      addToast('清除备注失败', 'error');
    }
  };

  const displayName = (u: ContactUser) => aliasMap[u.id] || u.username;

  // 渲染列表项
  const renderItem = (u: ContactUser) => {
    const isEditing = editingAliasId === u.id;
    const display = displayName(u);
    const handleTouchStart = (e: React.TouchEvent) => {
      if (isEditing) return;
      const timer = window.setTimeout(() => {
        const touch = e.touches[0];
        setActionMenu({ userId: u.id, x: touch.clientX, y: touch.clientY });
      }, 500);
      setLongPressTimer(timer);
    };
    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };
    return (
      <div
        key={u.id}
        className="flex items-center gap-3 px-3 py-2.5 transition-colors relative group"
        onMouseEnter={(e) => {
          if (!isEditing) e.currentTarget.style.background = 'var(--color-hover-bg)';
        }}
        onMouseLeave={(e) => {
          if (!isEditing) e.currentTarget.style.background = 'transparent';
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Avatar username={u.username} avatar={u.avatar} size={36} online={u.online} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {isEditing ? (
              <input
                autoFocus
                className="text-sm font-medium outline-none flex-1 min-w-0"
                style={{ color: 'var(--color-text)', background: 'var(--color-bg)', borderRadius: 3, padding: '1px 4px' }}
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => handleSaveAlias(u)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAlias(u);
                  if (e.key === 'Escape') { setEditingAliasId(null); setEditingText(''); }
                }}
              />
            ) : (
              <span
                className="text-sm font-medium truncate cursor-pointer hover:opacity-70"
                style={{ color: 'var(--color-text)' }}
                onClick={() => { setEditingAliasId(u.id); setEditingText(display); }}
                title="点击编辑备注"
              >
                {display}
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--color-text-light)' }}>
            {u.bio || u.last_active_fmt || '暂无简介'}
          </p>
        </div>
        {/* 操作按钮 - 默认隐藏，悬浮/点击时显示 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {u.mutual && (
            <button
              onClick={() => handleMessage(u)}
              className="btn btn-sm p-1.5 justify-center"
              style={{ width: 32, height: 32, minWidth: 32 }}
              title="发起私聊"
            >
              <MessageSquare size={14} />
            </button>
          )}
          <button
            onClick={() => {
              if (isEditing) {
                handleSaveAlias(u);
              } else {
                setEditingAliasId(u.id);
                setEditingText(display);
              }
            }}
            className="btn btn-sm p-1.5 justify-center"
            style={{ width: 32, height: 32, minWidth: 32, color: 'var(--color-text-muted)' }}
            title={isEditing ? '保存备注' : '编辑备注'}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleToggleFollow(u)}
            className="btn btn-sm p-1.5 justify-center"
            style={{
              width: 32, height: 32, minWidth: 32,
              ...(u.i_follow
                ? { color: 'var(--color-text-light)' }
                : {
                    background: 'var(--color-primary)',
                    color: '#FFFFFF',
                    borderColor: 'var(--color-primary)',
                  }),
            }}
            title={u.i_follow ? '取消关注' : '关注'}
          >
            {u.i_follow ? <UserMinus size={14} /> : <UserPlus size={14} />}
          </button>
        </div>
        {/* 移动端更多操作按钮 */}
        {isMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setActionMenu({ userId: u.id, x: rect.right, y: rect.top });
            }}
            className="btn btn-sm p-1.5 justify-center flex-shrink-0"
            style={{ width: 32, height: 32, minWidth: 32 }}
            title="更多操作"
          >
            <MoreVertical size={14} />
          </button>
        )}
      </div>
    );
  };

  // 点击外部关闭操作菜单
  useEffect(() => {
    if (!actionMenu) return;
    const handleClick = () => setActionMenu(null);
    setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => document.removeEventListener('click', handleClick);
  }, [actionMenu]);

  const displayList = searchResults ?? list;

  return (
    <div className="flex flex-col h-full min-w-[280px] relative" style={{ background: 'var(--color-card)' }}>
      {/* 头部 */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Search size={16} /> 通讯录
          </h2>
          <div className="flex items-center gap-1">
            {onClose && (
              <button
                onClick={onClose}
                className="btn btn-sm p-2"
                style={{ minHeight: 36, minWidth: 36 }}
                aria-label="收起"
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => loadList(tab)}
              disabled={loading}
              className="btn btn-sm"
              title="刷新"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="搜索用户名/邮箱（≥2字符）"
            style={{ paddingLeft: 32, paddingRight: 32 }}
          />
          {keyword && (
            <button
              onClick={() => {
                setKeyword('');
                setSearchResults(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 标签切换 - 使用图标 */}
        <div className="flex gap-1">
          {(
            [
              { k: 'mutual', label: '互关', icon: Users },
              { k: 'following', label: '关注', icon: UserCheck },
              { k: 'followers', label: '粉丝', icon: UserCircle },
            ] as { k: ContactTab; label: string; icon: typeof Users }[]
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.k}
                onClick={() => {
                  setTab(t.k);
                  setSearchResults(null);
                  setKeyword('');
                }}
                className="flex-1 py-1.5 text-xs transition-colors flex items-center justify-center gap-1"
                style={
                  tab === t.k
                    ? {
                        background: 'var(--color-primary)',
                        color: '#FFFFFF',
                        border: '1px solid var(--color-primary)',
                      }
                    : {
                        background: 'var(--color-card-alt)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border-light)',
                      }
                }
              >
                <Icon size={12} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {searching ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            搜索中…
          </div>
        ) : displayList.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {searchResults ? '未找到匹配用户' : '暂无数据'}
          </div>
        ) : (
          displayList.map(renderItem)
        )}
      </div>

      {/* 操作菜单 - 移动端 */}
      {actionMenu && (
        <div
          className="fixed z-50 shadow-[var(--shadow-lg)] overflow-hidden"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 0,
            left: Math.min(actionMenu.x, window.innerWidth - 160),
            top: actionMenu.y,
            minWidth: 140,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const user = displayList.find(u => u.id === actionMenu.userId);
            if (!user) return null;
            return (
              <>
                {user.mutual && (
                  <button
                    onClick={() => { handleMessage(user); setActionMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <MessageSquare size={16} style={{ color: 'var(--color-primary)' }} />
                    发起私聊
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingAliasId(user.id);
                    setEditingText(displayName(user));
                    setActionMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Pencil size={16} style={{ color: 'var(--color-primary)' }} />
                  编辑备注
                  </button>
                <button
                  onClick={() => { handleToggleFollow(user); setActionMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {user.i_follow ? (
                    <><UserMinus size={16} style={{ color: 'var(--color-error)' }} /> 取消关注</>
                  ) : (
                    <><UserPlus size={16} style={{ color: 'var(--color-primary)' }} /> 关注</>
                  )}
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
