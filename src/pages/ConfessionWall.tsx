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
}: {
  c: Confession;
  onLike: (slug: string) => void;
  onBookmark: (slug: string) => void;
  onComment: (id: number) => void;
  isLogged: boolean;
  viewMode: ViewMode;
  onClick: (id: number) => void;
  addToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

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

  const handleShare = () => {
    const url = `${window.location.origin}/confessions/${c.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      window.dispatchEvent(new CustomEvent('arcle-toast', { detail: { message: '链接已复制', type: 'success' } }));
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
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
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
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                borderRadius: '3px',
              }}
            >
              匿
            </div>
          ) : (
            <Avatar username={c.username} avatar={c.avatar} size={28} />
          )}
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {c.anonymous ? '匿名' : c.username}
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
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {c.create_time_fmt}
        </span>
      </div>

      {/* 内容 */}
      <div className="px-4 pb-2">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {c.content}
        </p>
      </div>

      {/* 操作栏 */}
      <div
        className="flex items-center gap-1 px-3 py-2"
        style={{ borderTop: '1px solid var(--color-divider)', marginTop: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧：互动按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onLike(c.slug)}
            className={`btn btn-sm ${c.liked ? 'btn-error' : ''}`}
            style={{
              minWidth: 32,
              padding: '2px 6px',
              ...(c.liked
                ? { background: 'var(--color-error)', color: '#fff', borderColor: 'var(--color-error)' }
                : { color: 'var(--color-text-muted)' }
              ),
            }}
          >
            <Heart size={13} fill={c.liked ? 'currentColor' : 'none'} />
            <span className="ml-0.5 text-xs">{c.like_count}</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="btn btn-sm"
            style={{ minWidth: 32, padding: '2px 6px', color: 'var(--color-text-muted)' }}
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
                padding: '2px 6px',
                color: c.bookmarked ? 'var(--color-warning)' : 'var(--color-text-muted)',
              }}
              title="收藏"
            >
              <Star size={13} fill={c.bookmarked ? 'currentColor' : 'none'} />
              <span className="ml-0.5 text-xs">{c.bookmark_count ?? 0}</span>
            </button>
          )}
        </div>
        {/* 右侧：分享 + 更多 */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="btn btn-sm"
            style={{ color: 'var(--color-text-muted)' }}
            title="分享"
          >
            <Share2 size={14} />
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="btn btn-sm"
            style={{ color: 'var(--color-text-muted)' }}
            title="举报"
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* 举报弹窗 */}
      <ReportDialog
        open={showReport}
        onClose={() => setShowReport(false)}
        onConfirm={handleReport}
      />

      {/* 评论区 */}
      {showComments && (
        <div
          className="px-4 pb-3"
          style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 12 }}
        >
          {!isLogged ? (
            <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-muted)' }}>
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
                  background: 'var(--color-bg-page)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  borderRadius: '3px',
                  padding: '6px 10px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleComment}
                disabled={loading || !commentText.trim()}
                className="btn btn-primary btn-sm"
                style={{ minHeight: 32 }}
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

  const loadConfessions = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await confessionApi.list(p, { search, sort });
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
    loadConfessions(1);
  };

  const hasNextPage = page * 20 < total;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-page)' }}>
      {/* 头部 */}
      <div
        className="px-4 py-3 border-b"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {!isMainPage && (
              <button onClick={() => navigate('/chat')} className="btn btn-sm" style={{ minWidth: 36 }}>
                <ArrowLeft size={14} />
              </button>
            )}
            <div>
              <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Heart size={18} style={{ color: 'var(--color-error)' }} />
                表白墙
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/confessions/new')}
              className="btn btn-primary btn-sm"
              style={{ minHeight: 34 }}
            >
              <SendHorizonal size={14} />
              写表白
            </button>
            <button
              onClick={() => navigate('/confessions/ranking')}
              className="btn btn-sm"
              style={{ minHeight: 34 }}
            >
              <Trophy size={14} />
              排行榜
            </button>
            {isLogged && (
              <button
                onClick={() => navigate('/confessions/bookmarks')}
                className="btn btn-sm"
                style={{ minHeight: 34 }}
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
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索表白内容..."
                className="w-full text-sm pl-8 pr-3"
                style={{
                  background: 'var(--color-bg-page)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
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
              style={{ minHeight: 32 }}
            >
              搜索
            </button>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="text-sm"
            style={{
              background: 'var(--color-bg-page)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
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
            style={{ borderColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}
          >
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 ${viewMode === 'card' ? '' : ''}`}
              style={
                viewMode === 'card'
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { background: 'var(--color-bg-page)', color: 'var(--color-text-muted)' }
              }
              title="列表视图"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className="p-1.5"
              style={
                viewMode === 'grid'
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { background: 'var(--color-bg-page)', color: 'var(--color-text-muted)' }
              }
              title="网格视图"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
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
          <div className="flex items-center justify-center py-20" style={{ color: 'var(--color-text-muted)' }}>
            加载中...
          </div>
        ) : confessions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Heart size={40} opacity={0.4} />
            <p className="text-sm">还没有表白</p>
            {isLogged && (
              <button onClick={() => navigate('/confessions/new')} className="btn btn-sm">
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
              : { borderBottom: '1px solid var(--color-divider)', paddingBottom: '12px' }
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
              style={{ color: 'var(--color-text-muted)' }}
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
