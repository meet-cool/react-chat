import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  ArrowLeft,
  Heart,
  MessageCircle,
  Sparkles,
  Star,
} from 'lucide-react';
import { confessionApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { Confession } from '../types';
import { Avatar } from '../components/Avatar';

export function ConfessionRanking() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [rankings, setRankings] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'likes' | 'comments'>('likes');
  const [isLogged, setIsLogged] = useState(false);

  const loadRanking = useCallback(async (type: 'likes' | 'comments') => {
    setLoading(true);
    try {
      const res = await confessionApi.ranking(type, 20);
      setRankings(res);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('arcle_token');
    setIsLogged(!!token);
    loadRanking('likes');
  }, [loadRanking]);

  const handleBookmark = useCallback((slug: string) => {
    if (!isLogged) {
      addToast('请先登录', 'warning');
      navigate('/login');
      return;
    }
    confessionApi.bookmark(slug).then(() => {
      setRankings((prev) =>
        prev.map((c) => (c.slug === slug ? { ...c, bookmarked: !c.bookmarked } : c))
      );
    });
  }, [isLogged, addToast, navigate]);

  const tabMedals = ['🥇', '🥈', '🥉'];

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
        <div>
          <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Trophy size={18} style={{ color: 'var(--color-warning)' }} />
            表白墙排行榜
          </h1>
        </div>
      </div>

      {/* 切换 */}
      <div
        className="flex border-b px-4"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
      >
        <button
          onClick={() => { setActiveTab('likes'); loadRanking('likes'); }}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'likes' ? 'border-b-2' : ''}`}
          style={
            activeTab === 'likes'
              ? {
                  color: 'var(--color-primary)',
                  borderBottom: '2px solid var(--color-primary)',
                  marginBottom: -1,
                }
              : { color: 'var(--color-text-muted)' }
          }
        >
          <Heart size={14} className="inline mr-1" />
          最热表白
        </button>
        <button
          onClick={() => { setActiveTab('comments'); loadRanking('comments'); }}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'comments' ? 'border-b-2' : ''}`}
          style={
            activeTab === 'comments'
              ? {
                  color: 'var(--color-primary)',
                  borderBottom: '2px solid var(--color-primary)',
                  marginBottom: -1,
                }
              : { color: 'var(--color-text-muted)' }
          }
        >
          <MessageCircle size={14} className="inline mr-1" />
          最热讨论
        </button>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: 'var(--color-text-muted)' }}>
            加载中...
          </div>
        ) : rankings.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Sparkles size={40} opacity={0.4} />
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.map((c, index) => {
              const medal = tabMedals[index];
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3"
                  style={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    ...(index < 3 ? { borderColor: 'var(--color-warning)', borderWidth: 2 } : {}),
                  }}
                >
                  {/* 排名 */}
                  <div
                    className="w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={
                      index < 3
                        ? {
                            background: 'var(--color-warning)',
                            color: '#fff',
                            borderRadius: '3px',
                          }
                        : {
                            background: 'var(--color-bg-page)',
                            color: 'var(--color-text-muted)',
                            borderRadius: '3px',
                          }
                    }
                  >
                    {medal || index + 1}
                  </div>

                  {/* 作者 */}
                  {c.anonymous ? (
                    <div
                      className="w-8 h-8 flex items-center justify-center font-bold text-xs flex-shrink-0"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '3px' }}
                    >
                      匿
                    </div>
                  ) : (
                    <Avatar username={c.username} avatar={c.avatar} size={32} />
                  )}

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {c.content}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Heart size={12} style={{ color: 'var(--color-error)' }} />
                        {c.like_count}
                      </span>
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <MessageCircle size={12} />
                        {c.comment_count}
                      </span>
                      {c.target_name && (
                        <span
                          className="text-xs px-1.5 py-0.5"
                          style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '3px' }}
                        >
                          → {c.target_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 收藏（登录用户） */}
                  <button
                    className="flex-shrink-0 p-1"
                    style={{ color: c.bookmarked ? 'var(--color-warning)' : 'var(--color-text-muted)' }}
                    title="收藏"
                    onClick={() => handleBookmark(c.slug)}
                  >
                    <Star size={14} fill={c.bookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

