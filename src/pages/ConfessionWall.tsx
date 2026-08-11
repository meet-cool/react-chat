import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  SendHorizonal,
  Star,
  Share2,
  Search,
  LayoutGrid,
  List,
  Trophy,
  Bookmark,
  MoreVertical,
  ArrowLeft,
} from 'lucide-react';
import { confessionApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { Confession } from '../types';
import { Avatar } from '../components/Avatar';
import { ReportDialog } from '../components/ReportDialog';

type ViewMode = 'card' | 'grid';
type SortType = 'latest' | 'likes' | 'comments';
type ThemeKey = 'ocean' | 'pink' | 'default';

const THEMES: Record<ThemeKey, {
  primary: string;
  primaryLight: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  divider: string;
  labelBg: string;
}> = {
  ocean: {
    primary: '#4fc3f7',
    primaryLight: 'rgba(79,195,247,0.15)',
    cardBg: 'rgba(5,25,50,0.72)',
    cardBorder: 'rgba(79,195,247,0.25)',
    text: 'rgba(230,245,255,0.95)',
    textMuted: 'rgba(180,220,245,0.6)',
    textSecondary: 'rgba(200,230,250,0.75)',
    divider: 'rgba(79,195,247,0.15)',
    labelBg: 'rgba(79,195,247,0.18)',
  },
  pink: {
    primary: '#f472b6',
    primaryLight: 'rgba(244,114,182,0.15)',
    cardBg: 'rgba(55,8,35,0.70)',
    cardBorder: 'rgba(244,114,182,0.28)',
    text: 'rgba(255,228,240,0.95)',
    textMuted: 'rgba(240,180,210,0.6)',
    textSecondary: 'rgba(255,210,230,0.8)',
    divider: 'rgba(244,114,182,0.15)',
    labelBg: 'rgba(244,114,182,0.18)',
  },
  default: {
    primary: 'var(--color-primary)',
    primaryLight: 'var(--color-primary-light)',
    cardBg: 'var(--color-card)',
    cardBorder: 'var(--color-border)',
    text: 'var(--color-text)',
    textMuted: 'var(--color-text-muted)',
    textSecondary: 'var(--color-text-secondary)',
    divider: 'var(--color-divider)',
    labelBg: 'var(--color-primary-light)',
  },
};

interface ConfessionWallProps {
  isMainPage?: boolean;
}

function ConfessionCard({
  c,
  onLike,
  onBookmark,
  onComment,
  isLogged,
  viewMode,
  onClick,
  addToast,
  theme,
}: {
  c: Confession;
  onLike: (slug: string) => void;
  onBookmark: (slug: string) => void;
  onComment: (id: number) => void;
  isLogged: boolean;
  viewMode: ViewMode;
  onClick: (id: number) => void;
  addToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  theme: ThemeKey;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const T = THEMES[theme];

  const handleComment = async () => {
    if (!commentText.trim() || !isLogged) return;
    setLoading(true);
    try {
      await confessionApi.addComment(c.slug, commentText);
      setCommentText('');
      onComment(c.id);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleReport = async (reason: string) => {
    await confessionApi.report(c.slug, reason);
    addToast('举报已提交，我们会尽快处理', 'success');
    setShowReport(false);
  };

  return (
    <div
      className="transition-colors cursor-pointer"
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        ...(viewMode === 'grid' ? { display: 'flex', flexDirection: 'column' } : {}),
      }}
      onClick={() => onClick(c.id)}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {c.anonymous ? (
            <div
              className="flex items-center justify-center font-bold text-xs"
              style={{
                width: 28,
                height: 28,
                background: T.labelBg,
                color: T.primary,
                borderRadius: '3px',
              }}
            >
              匿
            </div>
          ) : (
            <Avatar username={c.username} avatar={c.avatar} size={28} />
          )}
          <span className="text-sm font-medium" style={{ color: T.text }}>
            {c.anonymous ? '匿名' : c.username}
          </span>
          {c.target_name && (
            <span
              className="text-xs px-1.5 py-0.5"
              style={{ background: T.labelBg, color: T.primary, borderRadius: '3px' }}
            >
              → {c.target_name}
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: T.textMuted }}>
          {c.create_time_fmt}
        </span>
      </div>

      {/* 内容 */}
      <div className="px-4 pb-2">
        <p className="text-sm leading-relaxed" style={{ color: T.textSecondary }}>
          {c.content}
        </p>
      </div>

      {/* 操作栏 */}
      <div
        className="flex items-center gap-1 px-3 py-2"
        style={{ borderTop: `1px solid ${T.divider}`, marginTop: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧：互动按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onLike(c.slug)}
            className="btn btn-sm"
            style={{
              minWidth: 32,
              maxHeight: 26,
              padding: '0 6px',
              ...(c.liked
                ? { background: 'transparent', color: T.primary, borderColor: 'transparent' }
                : { color: T.textMuted }
              ),
            }}
          >
            <Heart size={13} fill={c.liked ? 'currentColor' : 'none'} />
            <span className="ml-0.5 text-xs">{c.like_count}</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="btn btn-sm"
            style={{ minWidth: 32, maxHeight: 26, padding: '0 6px', color: T.textMuted, background: 'transparent', border: 'none' }}
          >
            <MessageCircle size={13} />
            <span className="ml-0.5 text-xs">{c.comment_count}</span>
          </button>
          {isLogged && (
            <button
              onClick={() => onBookmark(c.slug)}
              className="btn btn-sm"
              style={{
                minWidth: 32,
                maxHeight: 26,
                padding: '0 6px',
                color: c.bookmarked ? 'var(--color-warning)' : T.textMuted,
                background: 'transparent',
                border: 'none',
              }}
              title="收藏"
            >
              <Star size={13} fill={c.bookmarked ? 'currentColor' : 'none'} />
              <span className="ml-0.5 text-xs">{c.bookmark_count ?? 0}</span>
            </button>
          )}
        </div>
        {/* 右侧：更多（三个点） */}
        <button
          onClick={() => setShowReport(true)}
          className="btn btn-sm ml-auto"
          style={{ minWidth: 28, padding: '2px 4px', color: T.textMuted }}
          title="举报"
        >
          <MoreVertical size={13} />
        </button>
      </div>

      {/* 举报弹窗 */}
      <ReportDialog
        open={showReport}
        onClose={() => setShowReport(false)}
        onConfirm={handleReport}
        theme={theme}
      />

      {/* 评论区 */}
      {showComments && (
        <div
          className="px-4 pb-3"
          style={{ borderTop: `1px solid ${T.divider}`, paddingTop: 12 }}
        >
          {!isLogged ? (
            <p className="text-xs text-center py-2" style={{ color: T.textMuted }}>
              登录后即可评论
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
                placeholder="写下你的评论..."
                className="flex-1 text-sm"
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: `1px solid ${T.cardBorder}`,
                  color: T.text,
                  borderRadius: '3px',
                  padding: '6px 10px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleComment}
                disabled={loading || !commentText.trim()}
                className="btn btn-sm"
                style={{ padding: '4px 12px', background: 'transparent', border: 'none', color: T.textMuted }}
              >
                <SendHorizonal size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConfessionWall({ isMainPage = false }: ConfessionWallProps) {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortType>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isLogged, setIsLogged] = useState(false);
  const [bgImage, setBgImage] = useState('');
  const [theme, setTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('confession_theme');
    return (saved === 'ocean' || saved === 'pink' || saved === 'default') ? saved : 'pink';
  });

  const T = THEMES[theme];

  useEffect(() => {
    localStorage.setItem('confession_theme', theme);
  }, [theme]);

  useEffect(() => {
    const updateBg = () => {
      const w = window.innerWidth;
      const isOcean = theme === 'ocean';
      setBgImage(w < 768
        ? (isOcean ? 'mbbqbg-dark.svg' : 'mbbqbg.svg')
        : (isOcean ? 'bbqbg-dark.svg' : 'bbqbg.svg')
      );
    };
    updateBg();
    window.addEventListener('resize', updateBg);
    return () => window.removeEventListener('resize', updateBg);
  }, [theme]);

  const loadConfessions = useCallback(
    async (p = 1, searchVal?: string, sortVal?: SortType) => {
      setLoading(true);
      try {
        const res = await confessionApi.list(p, {
          search: searchVal ?? search,
          sort: sortVal ?? sort,
        });
        setConfessions(res.items);
        setTotal(res.pagination.total);
        setPage(p);
      } catch (err) {
        addToast(err instanceof Error ? err.message : '加载失败', 'error');
      } finally {
        setLoading(false);
      }
    },
    [search, sort, addToast]
  );

  useEffect(() => {
    const token = localStorage.getItem('arcle_token');
    setIsLogged(!!token);
    loadConfessions(1);
  }, []);

  const handleLike = useCallback((slug: string) => {
    if (!isLogged) {
      addToast('请先登录', 'warning');
      navigate('/login');
      return;
    }
    confessionApi.like(slug).then((res) => {
      setConfessions((prev) =>
        prev.map((c) => (c.slug === slug ? { ...c, liked: res.liked, like_count: res.like_count } : c))
      );
    });
  }, [isLogged, addToast, navigate]);

  const handleBookmark = useCallback((slug: string) => {
    if (!isLogged) {
      addToast('请先登录', 'warning');
      navigate('/login');
      return;
    }
    confessionApi.bookmark(slug).then((res) => {
      setConfessions((prev) =>
        prev.map((c) => (c.slug === slug ? { ...c, bookmarked: res.bookmarked } : c))
      );
    });
  }, [isLogged, addToast, navigate]);

  const handleComment = useCallback((id: number) => {
    setConfessions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, comment_count: c.comment_count + 1 } : c))
    );
  }, []);

  const handleSearch = () => {
    setPage(1);
    loadConfessions(1, search, sort);
  };

  const hasNextPage = page * 20 < total;

  return (
    <div
      className="flex flex-col h-full"
      style={
        bgImage
          ? {
              background: `url(/${bgImage}) center center / cover no-repeat`,
              backgroundAttachment: 'fixed',
            }
          : { background: T.cardBg }
      }
    >
      {/* 头部 */}
      <div
        className="sticky top-0 z-10 px-4 py-3 border-b"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {!isMainPage && (
              <button onClick={() => navigate('/chat')} className="btn btn-sm" style={{ minWidth: 36, background: 'transparent', border: 'none' }}>
                <ArrowLeft size={14} />
              </button>
            )}
            <div>
              <h1 className="text-base font-bold flex items-center gap-2" style={{ color: T.text }}>
                <Heart size={18} style={{ color: 'var(--color-error)' }} />
                表白墙
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/confessions/new')}
              className="btn btn-sm"
              style={{ padding: '4px 12px', background: T.primary, color: '#fff', borderColor: T.primary }}
            >
              <SendHorizonal size={14} />
              写表白
            </button>
            <button
              onClick={() => navigate('/confessions/ranking')}
              className="btn btn-sm"
              style={{ padding: '4px 12px', background: 'transparent', border: 'none', color: T.textMuted }}
            >
              <Trophy size={14} />
              排行榜
            </button>
            {isLogged && (
              <button
                onClick={() => navigate('/confessions/bookmarks')}
                className="btn btn-sm"
                style={{ padding: '4px 12px', background: T.primary, color: '#fff', borderColor: T.primary }}
              >
                <Bookmark size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: T.textMuted }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索表白内容..."
                className="w-full text-sm pl-8 pr-3"
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: `1px solid ${T.cardBorder}`,
                  color: T.text,
                  borderRadius: '3px',
                  padding: '6px 10px 6px 28px',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              className="btn btn-sm"
              style={{ padding: '4px 12px', background: T.primary, color: '#fff', borderColor: T.primary }}
            >
              搜索
            </button>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="text-sm"
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: `1px solid ${T.cardBorder}`,
              color: T.text,
              borderRadius: '3px',
              padding: '6px 8px',
              outline: 'none',
            }}
          >
            <option value="latest">最新</option>
            <option value="likes">最热</option>
            <option value="comments">最多评论</option>
          </select>
          <div
            className="flex border"
            style={{ borderColor: T.cardBorder, borderRadius: '3px', overflow: 'hidden' }}
          >
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 ${viewMode === 'card' ? '' : ''}`}
              style={{
                minWidth: 28,
                minHeight: 28,
                ...(viewMode === 'card'
                  ? { background: T.primary, color: '#fff' }
                  : { background: 'rgba(0,0,0,0.2)', color: T.textMuted }
                ),
              }}
              title="列表视图"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className="p-1.5"
              style={{
                minWidth: 28,
                minHeight: 28,
                ...(viewMode === 'grid'
                  ? { background: T.primary, color: '#fff' }
                  : { background: 'rgba(0,0,0,0.2)', color: T.textMuted }
                ),
              }}
              title="网格视图"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          {/* 主题选择 */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeKey)}
            className="text-sm"
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: `1px solid ${T.cardBorder}`,
              color: T.text,
              borderRadius: '3px',
              padding: '6px 8px',
              outline: 'none',
            }}
          >
            <option value="ocean">🌊 蔚蓝无边星海</option>
            <option value="pink">🌸 粉色浪漫花海</option>
            <option value="default">🎨 默认主题</option>
          </select>
        </div>
      </div>

      {/* 列表 */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={
          viewMode === 'grid'
            ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
                alignContent: 'start',
              }
            : {}
        }
      >
        {loading && confessions.length === 0 ? (
          <div className="flex items-center justify-center py-20" style={{ color: T.textMuted }}>
            加载中...
          </div>
        ) : confessions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: T.textMuted }}
          >
            <Heart size={40} opacity={0.4} />
            <p className="text-sm">还没有表白</p>
            {isLogged && (
              <button onClick={() => navigate('/confessions/new')} className="btn btn-sm" style={{ padding: '4px 12px', background: T.primary, color: '#fff', borderColor: T.primary }}>
                <SendHorizonal size={14} />
                写第一条
              </button>
            )}
          </div>
        ) : (
          confessions.map((c) => (
            <div
              key={c.id}
              className="mb-3"
              style={
            viewMode === 'grid'
              ? { minHeight: 200, display: 'flex', flexDirection: 'column' }
              : { borderBottom: `1px solid ${T.divider}`, paddingBottom: '12px' }
          }
            >
              <ConfessionCard
                c={c}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onComment={handleComment}
                isLogged={isLogged}
                viewMode={viewMode}
                onClick={(id) => {
                  const target = confessions.find((x) => x.id === id);
                  if (target) navigate(`/confessions/${target.slug}`);
                }}
                addToast={addToast}
                theme={theme}
              />
            </div>
          ))
        )}

        {hasNextPage && (
          <div className="py-3 text-center">
            <button
              onClick={() => loadConfessions(page + 1)}
              disabled={loading}
              className="btn btn-sm"
              style={{ color: T.textMuted }}
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
