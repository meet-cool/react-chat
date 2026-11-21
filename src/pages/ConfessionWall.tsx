import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  SendHorizonal,
  Star,
  Share2,
  Search,
  Trophy,
  Bookmark,
  MoreVertical,
  ArrowLeft,
  MapPin,
  Download,
} from 'lucide-react';
import { X } from 'lucide-react';
import { confessionApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import { type ThemeKey, THEMES } from '../lib/themes';
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
  theme,
  onShare,
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
  onShare?: (c: Confession) => void;
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
            className="btn btn-sm btn-ghost"
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
                color: c.bookmarked ? T.warning : T.textMuted,
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
        {/* 右侧：分享 + 举报 */}
        <div className="flex items-center gap-1">
          {isLogged && onShare && (
            <button
              onClick={() => onShare(c)}
              className="btn btn-sm"
              style={{ minWidth: 28, padding: '2px 4px', color: T.textMuted, background: 'transparent', border: 'none' }}
              title="分享"
            >
              <Share2 size={13} />
            </button>
          )}
          <button
            onClick={() => setShowReport(true)}
            className="btn btn-sm btn-ghost"
            style={{ minWidth: 28, padding: '2px 4px', color: T.textMuted }}
            title="举报"
          >
            <MoreVertical size={13} />
          </button>
        </div>
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
                  background: T.inputBg,
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
  const [viewMode] = useState<ViewMode>('card');
  const [isLogged, setIsLogged] = useState(false);
  const [bgImage, setBgImage] = useState('');
  const [showQrItem, setShowQrItem] = useState<Confession | null>(null);
  const handleShare = useCallback((c: Confession) => {
    setShowQrItem(c);
  }, []);

  // 保存到本地：把二维码 + 「谁对谁」文案 + 内容摘要 合成一张 PNG 下载
  const [saving, setSaving] = useState(false);
  const handleSaveQr = useCallback(async (item: Confession) => {
    if (saving) return;
    setSaving(true);
    try {
      // 拉取二维码 PNG
      const qrResp = await fetch(confessionApi.qrCode(item.slug));
      if (!qrResp.ok) throw new Error('二维码加载失败');
      const qrBlob = await qrResp.blob();
      const qrUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(qrBlob);
      });
      const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('二维码解码失败'));
        img.src = qrUrl;
      });

      // 文案：谁 对 谁（匿名显示「我」）
      const whoFrom = item.anonymous ? '我' : item.username;
      const whoTo = item.target_name || '某人';
      const title = `${whoFrom} 对 ${whoTo} 说：`;
      const content = item.content.length > 40 ? item.content.slice(0, 40) + '…' : item.content;

      // 画布：白底卡片，顶部标题+内容，底部二维码
      const qrSize = 260;
      const pad = 32;
      const titleBlockH = 96;
      const canvas = document.createElement('canvas');
      canvas.width = qrSize + pad * 2;
      canvas.height = titleBlockH + qrSize + pad * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas 不支持');
      // 背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // 标题 + 内容（深色文字，白底保证可读）
      ctx.fillStyle = '#0A1628';
      ctx.font = 'bold 22px -apple-system, "PingFang SC", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(title, pad, pad, canvas.width - pad * 2);
      ctx.fillStyle = '#4A6A85';
      ctx.font = '16px -apple-system, "PingFang SC", sans-serif';
      ctx.fillText(content, pad, pad + 36, canvas.width - pad * 2);
      // 二维码
      ctx.drawImage(qrImg, pad, pad + titleBlockH, qrSize, qrSize);
      // 底部提示
      ctx.fillStyle = '#8AA0B8';
      ctx.font = '13px -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('扫码查看完整表白 · 弧光', canvas.width / 2, pad + titleBlockH + qrSize + 16, canvas.width - pad * 2);

      // 下载
      const link = document.createElement('a');
      link.download = `表白_${whoTo}_${item.slug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      addToast('二维码已保存到本地', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  }, [saving, addToast]);
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
        // 第 1 页整体替换，加载更多（p>1）追加
        setConfessions((prev) => (p > 1 ? [...prev, ...res.items] : res.items));
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
  }, []);

  // 首次加载 + 排序变化时重置到第一页重新加载（replace 语义）
  useEffect(() => {
    loadConfessions(1);
    // 仅随 sort 变化触发；search 通过手动搜索触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

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
        prev.map((c) =>
          c.slug === slug ? { ...c, bookmarked: res.bookmarked, bookmark_count: res.bookmark_count } : c
        )
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
      className="flex flex-col h-screen"
      style={{
        background: bgImage
          ? `url(/${bgImage}) center center / cover no-repeat ${T.cardBg}`
          : T.cardBg,
      }}
    >
      {/* 头部 */}
      <div
        className="sticky top-0 z-10 px-4 py-3 border-b"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {!isMainPage && (
              <button onClick={() => navigate('/chat')} className="btn btn-sm btn-ghost" style={{ minWidth: 36 }}>
                <ArrowLeft size={14} />
              </button>
            )}
            <div>
              <h1 className="text-base font-bold flex items-center gap-2" style={{ color: T.text }}>
                <Heart size={18} style={{ color: T.error }} />
                表白墙
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
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
              style={{ padding: '4px 12px', background: 'transparent', border: `1px solid ${T.cardBorder}`, color: T.textMuted }}
            >
              <Trophy size={14} /> 排行榜
            </button>
            {isLogged && (
              <button
                onClick={() => navigate('/confessions/wall')}
                className="btn btn-sm"
                style={{ padding: '4px 12px', background: 'transparent', border: `1px solid ${T.cardBorder}`, color: T.textMuted }}
              >
                <MapPin size={14} /> 我的表白墙
              </button>
            )}
            {isLogged && (
              <>
                <button
                  onClick={() => navigate('/confessions/mine')}
                  className="btn btn-sm"
                  style={{ padding: '4px 12px', background: 'transparent', border: `1px solid ${T.cardBorder}`, color: T.textMuted }}
                >
                  <Heart size={14} /> 我的表白
                </button>
                <button
                  onClick={() => navigate('/confessions/bookmarks')}
                  className="btn btn-sm"
                  style={{ padding: '4px 12px', background: 'transparent', border: `1px solid ${T.cardBorder}`, color: T.textMuted }}
                >
                  <Bookmark size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-wrap items-center gap-2">
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
                  background: T.inputBg,
                  border: `1px solid ${T.cardBorder}`,
                  color: T.text,
                  borderRadius: '3px',
                  padding: '6px 10px 6px 28px',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="text-sm"
            style={{
              background: T.cardBg,
              border: `1px solid ${T.cardBorder}`,
              color: T.text,
              borderRadius: '3px',
              padding: '4px 6px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="latest">最新</option>
            <option value="likes">最热</option>
            <option value="comments">最多评论</option>
          </select>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeKey)}
            className="text-sm"
            style={{
              background: T.cardBg,
              border: `1px solid ${T.cardBorder}`,
              color: T.text,
              borderRadius: '3px',
              padding: '4px 6px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ocean">海洋</option>
            <option value="pink">粉色</option>
            <option value="default">默认</option>
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
  onShare={handleShare}
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

      {/* QR码弹窗（美化：卡片衬底 + 「谁对谁」文案 + 内容摘要 + 保存按钮） */}
      {showQrItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowQrItem(null)}>
          <div className="w-full max-w-xs flex flex-col items-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 0, padding: 24 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>分享二维码</span>
              <button onClick={() => setShowQrItem(null)} aria-label="关闭" style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 44, minWidth: 44 }}><X size={18} /></button>
            </div>

            {/* 「谁 对 谁」文案 + 内容摘要 */}
            <div className="w-full text-center mb-3" style={{ padding: '12px 16px', background: 'var(--color-card-alt)', borderRadius: 3, border: '1px solid var(--color-divider)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
                {showQrItem.anonymous ? '我' : showQrItem.username} 对 {showQrItem.target_name || '某人'} 说
              </p>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                {showQrItem.content.length > 50 ? showQrItem.content.slice(0, 50) + '…' : showQrItem.content}
              </p>
            </div>

            {/* 二维码（白底衬底保证可扫） */}
            <div style={{ background: '#fff', padding: 12, borderRadius: 3, lineHeight: 0 }}>
              <img src={confessionApi.qrCode(showQrItem.slug)} alt="QR" style={{ width: 180, height: 180, display: 'block' }}
                   onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>

            {/* 保存按钮 */}
            <button
              onClick={() => handleSaveQr(showQrItem)}
              disabled={saving}
              className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-medium transition-all"
              style={{
                minHeight: 44,
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 3,
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={16} />
              {saving ? '正在生成…' : '保存二维码到本地'}
            </button>

            <p className="text-xs text-center mt-2" style={{ color: 'var(--color-text-muted)' }}>扫码查看完整表白</p>
          </div>
        </div>
      )}
    </div>
  );
}
