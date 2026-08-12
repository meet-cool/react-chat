import { useCallback, useEffect, useState } from 'react';
import { Search, UserPlus, UserMinus, MessageSquare, RefreshCw, X, Pencil } from 'lucide-react';
import type { ContactUser } from '../types';
import { contactApi, followApi, aliasApi } from '../lib/api';
import { Avatar } from './Avatar';
import { useApp } from '../lib/AppContext';

type ContactTab = 'mutual' | 'following' | 'followers';

interface ContactsViewProps {
  onOpenConversation?: (userId: number) => void;
}

export function ContactsView({ onOpenConversation }: ContactsViewProps) {
  const { addToast } = useApp();
  const [tab, setTab] = useState<ContactTab>('mutual');
  const [list, setList] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<ContactUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  // 备注 map: targetUserId -> alias
  const [aliasMap, setAliasMap] = useState<Record<number, string>>({});
  // 正在编辑备注的用户
  const [editingAliasId, setEditingAliasId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

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
    return (
      <div
        key={u.id}
        className="flex items-center gap-3 px-3 py-2.5 transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
        onMouseLeave={(e) => {
          if (!isEditing) e.currentTarget.style.background = 'transparent';
        }}
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
            {u.mutual && (
              <span
                className="text-[10px] px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap"
                style={{
                  background: 'var(--color-success-bg)',
                  color: 'var(--color-success)',
                  border: '1px solid var(--color-success-light)',
                  lineHeight: '1.4',
                }}
              >
                互关
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--color-text-light)' }}>
            {u.bio || u.last_active_fmt || '暂无简介'}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {u.mutual && (
            <button
              onClick={() => handleMessage(u)}
              className="btn btn-sm p-1 justify-center flex-shrink-0 rounded-full"
              style={{ width: 36, height: 36, minWidth: 36 }}
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
            className="btn btn-sm p-0 justify-center flex-shrink-0"
            style={{ width: 34, height: 30, minWidth: 34, color: 'var(--color-text-muted)' }}
            title={isEditing ? '保存备注' : '编辑备注'}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => handleToggleFollow(u)}
            className="btn btn-sm p-0 justify-center flex-shrink-0"
            style={{
              width: 34, height: 30, minWidth: 34,
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
            {u.i_follow ? <UserMinus size={13} /> : <UserPlus size={13} />}
          </button>
        </div>
      </div>
    );
  };

  const displayList = searchResults ?? list;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-card)' }}>
      {/* 头部 */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Search size={16} /> 通讯录
          </h2>
          <button
            onClick={() => loadList(tab)}
            disabled={loading}
            className="btn btn-sm"
            title="刷新"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
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

        {/* 标签切换 */}
        <div className="flex gap-1">
          {(
            [
              { k: 'mutual', label: '互相关注' },
              { k: 'following', label: '我关注' },
              { k: 'followers', label: '关注我' },
            ] as { k: ContactTab; label: string }[]
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => {
                setTab(t.k);
                setSearchResults(null);
                setKeyword('');
              }}
              className="flex-1 py-1.5 text-xs transition-colors"
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
              {t.label}
            </button>
          ))}
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
    </div>
  );
}
