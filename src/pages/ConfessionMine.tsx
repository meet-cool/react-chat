import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, RefreshCw } from 'lucide-react';
import { confessionApi } from '../lib/api';
import type { Confession } from '../types';
import { Avatar } from '../components/Avatar';
import { PaginationBar } from '../components/admin/PaginationBar';
import { THEMES } from '../lib/themes';
import type { ThemeKey } from '../lib/themes';

interface MineItem extends Confession {
  status_label: string;
  create_time_fmt: string;
}

export function ConfessionMine() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('confession_theme') as ThemeKey | null;
    return saved && THEMES[saved] ? saved : 'pink';
  });

  const [bgImage, setBgImage] = useState('');
  const T = THEMES[theme];

  const [items, setItems] = useState<MineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    localStorage.setItem('confession_theme', theme);
  }, [theme]);

  useEffect(() => {
    const w = window.innerWidth;
    const isOcean = theme === 'ocean';
    setBgImage(w < 768
      ? (isOcean ? 'mbbqbg-dark.svg' : 'mbbqbg.svg')
      : (isOcean ? 'bbqbg-dark.svg' : 'bbqbg.svg')
    );
  }, [theme]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await confessionApi.mine(page);
      setItems(res.items);
      setTotal(res.pagination.total);
      setLastPage(res.pagination.last_page);
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [page, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(async (slug: string) => {
    try {
      await confessionApi.delete(slug);
      setItems((prev) => prev.filter((c) => c.slug !== slug));
    } catch {
      // 静默失败
    }
  }, []);

  return (
    <div
      className="flex flex-col h-screen"
      style={{
        background: bgImage
          ? `url(/${bgImage}) center center / cover no-repeat ${T.cardBg}`
          : T.cardBg,
      }}
    >
      {/* 头部 */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <button
          onClick={() => navigate('/confessions')}
          className="btn btn-sm"
          style={{ minWidth: 36, background: 'transparent', border: 'none' }}
        >
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-base font-bold flex-1 min-w-0 truncate" style={{ color: T.text }}>
          我的表白
        </h1>
        <button
          className="btn btn-sm p-1"
          style={{ background: 'transparent', border: 'none', color: T.textMuted }}
          onClick={load}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeKey)}
          className="text-xs"
          style={{ background: T.cardBg, color: T.text, border: `1px solid ${T.cardBorder}`, borderRadius: '3px', padding: '4px 8px' }}
        >
          <option value="pink">粉色</option>
          <option value="ocean">海洋</option>
          <option value="default">默认</option>
        </select>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: T.textMuted }}>
            <RefreshCw size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: T.textMuted }}
          >
            <Heart size={40} opacity={0.4} />
            <p className="text-sm">还没有发布过表白</p>
            <button onClick={() => navigate('/confessions/new')} className="btn btn-sm">
              写第一条
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div
                key={c.id}
                className="p-3"
                style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {c.anonymous ? (
                    <div
                      className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                      style={{ background: T.labelBg, color: T.primary, borderRadius: 3 }}
                    >
                      匿
                    </div>
                  ) : (
                    <Avatar username={c.username} avatar={c.avatar} size={28} />
                  )}
                  <span className="text-sm font-medium" style={{ color: T.text }}>
                    {c.anonymous ? '匿名' : c.username}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: c.status === 2 ? T.warning : c.status === 1 ? 'var(--color-success)' : 'var(--color-error)',
                      color: c.status === 2 ? '#000' : '#fff',
                    }}
                  >
                    {c.status_label}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: T.textMuted }}>
                    {c.create_time_fmt}
                  </span>
                </div>
                <p className="text-sm mb-2 leading-relaxed" style={{ color: T.textSecondary }}>
                  {c.content}
                </p>
                {c.target_name && (
                  <p className="text-xs mb-2" style={{ color: T.textMuted }}>
                    致：<span style={{ color: T.text }}>{c.target_name}</span>
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs flex items-center gap-1" style={{ color: T.textMuted }}>
                    <Heart size={12} style={{ color: T.primary }} /> {c.like_count}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: T.textMuted }}>
                    <MessageCircle size={12} /> {c.comment_count}
                  </span>
                  {c.status !== 0 && (
                    <button
                      onClick={() => handleDelete(c.slug)}
                      className="ml-auto text-xs"
                      style={{ color: T.textMuted }}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaginationBar current={page} last={lastPage} total={total} perPage={20} onChange={setPage} />
    </div>
  );
}
