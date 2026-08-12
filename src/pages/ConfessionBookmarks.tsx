import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import { confessionApi } from '../lib/api';
import type { Confession, ConfessionComment } from '../types';
import { Avatar } from '../components/Avatar';
import { THEMES } from '../lib/themes';
import type { ThemeKey } from '../lib/themes';

export function ConfessionBookmarks() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('confession_theme') as ThemeKey | null;
    return saved && THEMES[saved] ? saved : 'pink';
  });

  const [bgImage, setBgImage] = useState<'mbbqbg.svg' | 'bbqbg.svg' | 'mbbqbg-dark.svg' | 'bbqbg-dark.svg'>(() => {
    const isOcean = theme === 'ocean';
    return window.innerWidth < 768
      ? (isOcean ? 'mbbqbg-dark.svg' : 'mbbqbg.svg')
      : (isOcean ? 'bbqbg-dark.svg' : 'bbqbg.svg');
  });

  const T = THEMES[theme];

  useEffect(() => {
    localStorage.setItem('confession_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const isOcean = theme === 'ocean';
      setBgImage(window.innerWidth < 768
        ? (isOcean ? 'mbbqbg-dark.svg' : 'mbbqbg.svg')
        : (isOcean ? 'bbqbg-dark.svg' : 'bbqbg.svg')
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [theme]);

  const loadBookmarks = useCallback(async () => {
    const token = localStorage.getItem('arcle_token');
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await confessionApi.bookmarks();
      setBookmarks(res.items);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const [bookmarks, setBookmarks] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleRemove = useCallback((slug: string) => {
    confessionApi.bookmark(slug).then(() => {
      setBookmarks((prev) => prev.filter((c) => c.slug !== slug));
    });
  }, []);

  return (
    <div
      className="flex flex-col h-screen"
      style={{
        background: T.cardBg,
        backgroundImage: `url(/${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 头部 */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3"
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
          我的收藏
        </h1>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeKey)}
          className="ml-auto text-xs px-1 py-0.5 shrink-0"
          style={{ background: T.cardBg, color: T.text, border: `1px solid ${T.cardBorder}`, borderRadius: '3px', padding: '3px 4px' }}
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
            加载中...
          </div>
        ) : bookmarks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: T.textMuted }}
          >
            <Heart size={40} opacity={0.4} />
            <p className="text-sm">还没有收藏的表白</p>
            <button onClick={() => navigate('/confessions')} className="btn btn-sm">
              去表白墙逛逛
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((c) => (
              <div
                key={c.id}
                className="p-3"
                style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {c.anonymous ? (
                    <div
                      className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                      style={{ background: T.labelBg, color: T.primary, borderRadius: '3px' }}
                    >
                      匿
                    </div>
                  ) : (
                    <Avatar username={c.username} avatar={c.avatar} size={28} />
                  )}
                  <span className="text-sm font-medium" style={{ color: T.text }}>
                    {c.anonymous ? '匿名' : c.username}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: T.textMuted }}>
                    {c.create_time_fmt}
                  </span>
                </div>
                <p className="text-sm mb-2 leading-relaxed" style={{ color: T.textSecondary }}>
                  {c.content}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs flex items-center gap-1" style={{ color: T.textMuted }}>
                    <Heart size={12} style={{ color: T.primary }} /> {c.like_count}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: T.textMuted }}>
                    <MessageCircle size={12} /> {c.comment_count}
                  </span>
                  <button
                    onClick={() => handleRemove(c.slug)}
                    className="ml-auto text-xs"
                    style={{ color: T.textMuted }}
                  >
                    取消收藏
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
