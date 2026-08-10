import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import { confessionApi } from '../lib/api';
import type { Confession, ConfessionComment } from '../types';
import { Avatar } from '../components/Avatar';

export function ConfessionBookmarks() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleRemove = useCallback((id: number) => {
    confessionApi.bookmark(id).then(() => {
      setBookmarks((prev) => prev.filter((c) => c.id !== id));
    });
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-page)' }}>
      {/* 头部 */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <button onClick={() => navigate('/confessions')} className="btn btn-sm" style={{ minWidth: 36 }}>
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
          我的收藏
        </h1>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: 'var(--color-text-muted)' }}>
            加载中...
          </div>
        ) : bookmarks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: 'var(--color-text-muted)' }}
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
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {c.anonymous ? (
                    <div
                      className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '3px' }}
                    >
                      匿
                    </div>
                  ) : (
                    <Avatar username={c.username} avatar={c.avatar} size={28} />
                  )}
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {c.anonymous ? '匿名' : c.username}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                    {c.create_time_fmt}
                  </span>
                </div>
                <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {c.content}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Heart size={12} style={{ color: 'var(--color-error)' }} /> {c.like_count}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <MessageCircle size={12} /> {c.comment_count}
                  </span>
                  <button
                    onClick={() => handleRemove(c.id)}
                    className="ml-auto text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
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
