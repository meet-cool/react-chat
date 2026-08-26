import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Star,
  Share2,
  SendHorizonal,
  Trash2,
  UserPlus,
  MoreVertical,
  MapPin,
  X,
} from 'lucide-react';
import { confessionApi, authApi, getApiBaseUrl } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { Confession, ConfessionComment } from '../types';
import { Avatar } from '../components/Avatar';
import { ReportDialog } from '../components/ReportDialog';
import { type ThemeKey, THEMES } from '../lib/themes';
import { CONFESSION_THEMES } from '../lib/confessionThemes';
import type { ConfessionTheme } from '../lib/confessionThemes';

interface DetailConfession extends Confession {
  comments: ConfessionComment[];
}

export function ConfessionDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { addToast } = useApp();
  const [confession, setConfession] = useState<DetailConfession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; role: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('confession_theme');
    // 白名单校验，脏值回退默认主题
    return saved && saved in THEMES ? (saved as ThemeKey) : 'pink';
  });
  const [bgImage, setBgImage] = useState<'mbbqbg.svg' | 'bbqbg.svg' | 'mbbqbg-dark.svg' | 'bbqbg-dark.svg'>(() => {
    const isOcean = theme === 'ocean';
    return window.innerWidth < 768
      ? (isOcean ? 'mbbqbg-dark.svg' : 'mbbqbg.svg')
      : (isOcean ? 'bbqbg-dark.svg' : 'bbqbg.svg');
  });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const T = THEMES[theme];

  useEffect(() => {
    localStorage.setItem('confession_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const isOcean = theme === 'ocean';
      setWindowWidth(window.innerWidth);
      setBgImage(window.innerWidth < 768
        ? (isOcean ? 'mbbqbg-dark.svg' : 'mbbqbg.svg')
        : (isOcean ? 'bbqbg-dark.svg' : 'bbqbg.svg')
      );
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [theme]);

  const loadDetail = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await confessionApi.detail(slug);
      setConfession(res);
    } catch {
      addToast('表白不存在或已被删除', 'error');
      setTimeout(() => navigate('/confessions'), 1500);
    } finally {
      setLoading(false);
    }
  }, [slug, navigate, addToast]);

  useEffect(() => {
    const token = localStorage.getItem('arcle_token');
    setIsLogged(!!token);
    loadDetail();
  }, [loadDetail]);

  // 当前用户以服务端 profile 为准（localStorage 'arcle_user' 从未被写入）
  useEffect(() => {
    let cancelled = false;
    authApi.profile()
      .then((u) => { if (!cancelled) setCurrentUser(u); })
      .catch(() => { if (!cancelled) setCurrentUser(null); });
    return () => { cancelled = true; };
  }, []);

  const handleLike = useCallback(() => {
    if (!isLogged) {
      addToast('请先登录', 'warning');
      navigate('/login');
      return;
    }
    if (!confession) return;
    confessionApi.like(confession.slug).then((res) => {
      setConfession((prev) =>
        prev ? { ...prev, liked: res.liked, like_count: res.like_count } : null
      );
    }).catch((err) => {
      addToast(err instanceof Error ? err.message : '点赞失败', 'error');
    });
  }, [isLogged, confession, addToast, navigate]);

  const handleBookmark = useCallback(() => {
    if (!isLogged) {
      addToast('请先登录', 'warning');
      navigate('/login');
      return;
    }
    if (!confession) return;
    confessionApi.bookmark(confession.slug).then((res) => {
      setConfession((prev) =>
        prev ? { ...prev, bookmarked: res.bookmarked } : null
      );
    }).catch((err) => {
      addToast(err instanceof Error ? err.message : '收藏失败', 'error');
    });
  }, [isLogged, confession, addToast, navigate]);

  const handleComment = useCallback(async () => {
    if (!isLogged || !commentText.trim() || !confession) return;
    setCommenting(true);
    try {
      await confessionApi.addComment(confession.slug, commentText);
      setCommentText('');
      loadDetail();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '评论失败', 'error');
    } finally {
      setCommenting(false);
    }
  }, [isLogged, commentText, confession, loadDetail, addToast]);

  const handleDelete = useCallback(async () => {
    if (!confession) return;
    setShowDeleteConfirm(false);
    try {
      await confessionApi.delete(confession.slug);
      addToast('已删除', 'success');
      navigate('/confessions');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  }, [confession, addToast, navigate]);

  const [showQrUrl, setShowQrUrl] = useState('');
  const [showPlaceOnWall, setShowPlaceOnWall] = useState(false);

  const handleShare = useCallback(() => {
    if (!confession) return;
    const url = `${window.location.origin}/confessions/${confession.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => addToast('链接已复制', 'success'));
    }
    setShowQrUrl(url);
  }, [confession, addToast]);

  const handleReport = async (reason: string) => {
    if (!confession) return;
    await confessionApi.report(confession.slug, reason);
    addToast('举报已提交，我们会尽快处理', 'success');
    setShowReport(false);
  };

  const isOwner = currentUser?.id === confession?.user_id;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canDelete = isOwner || isAdmin;

  const THEMES_LIST: { key: ThemeKey; label: string }[] = [
    { key: 'pink', label: '粉色' },
    { key: 'ocean', label: '海洋' },
    { key: 'default', label: '默认' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: T.cardBg }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 animate-spin"
            style={{ borderColor: T.cardBorder, borderTopColor: T.primary }}
          />
          <p className="text-sm" style={{ color: T.textMuted }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!confession) return null;

  return (
    <div
      className="flex flex-col h-screen"
      style={{
        background: `url(/${bgImage}) center center / cover ${T.cardBg}`,
      }}
    >
      {/* 头部 */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <button
          onClick={() => navigate('/confessions')}
          className="flex items-center justify-center transition-all duration-200 hover:opacity-80"
          style={{
            width: 32, height: 32, padding: 0,
            background: 'transparent', border: 'none',
            color: T.textMuted, cursor: 'pointer', borderRadius: 3,
          }}
        >
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-base font-bold flex-1 min-w-0 truncate" style={{ color: T.text }}>
          表白详情
        </h1>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeKey)}
          className="text-xs px-1 py-0.5 shrink-0"
          style={{
            background: T.labelBg,
            border: `1px solid ${T.cardBorder}`,
            color: T.text,
            borderRadius: '3px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {THEMES_LIST.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* 表白内容卡片 */}
        <div
          className="p-4"
          style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
        >
          {/* 作者信息 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {confession.anonymous ? (
                <div
                  className="flex items-center justify-center font-bold text-sm"
                  style={{
                    width: 36,
                    height: 36,
                    background: T.labelBg,
                    color: T.primary,
                    borderRadius: '3px',
                  }}
                >
                  匿
                </div>
              ) : (
                <Avatar username={confession.username} avatar={confession.avatar} size={36} />
              )}
              <div>
                <span className="text-sm font-medium" style={{ color: T.text }}>
                  {confession.anonymous ? '匿名' : confession.username}
                </span>
                <p className="text-xs" style={{ color: T.textMuted }}>
                  {confession.create_time_fmt}
                </p>
              </div>
            </div>
            {confession.target_name && (
              <span
                className="text-xs px-2 py-1"
                style={{ background: T.labelBg, color: T.primary, borderRadius: '3px' }}
              >
                → {confession.target_name}
              </span>
            )}
          </div>

          {/* 表白内容 */}
          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: T.textSecondary }}
          >
            {confession.content}
          </p>

          {/* 操作栏 */}
          <div
            className="flex items-center gap-2 pt-3"
            style={{ borderTop: `1px solid ${T.divider}` }}
          >
            {/* 左侧：互动按钮 */}
            <div className="flex items-center gap-1 flex-1">
              <button
                onClick={handleLike}
                className="flex-1 flex items-center justify-center gap-1.5 transition-all duration-200 hover:opacity-90"
                style={{
                  height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                  border: `1px solid ${confession.liked ? T.primary : T.textMuted}`,
                  background: confession.liked ? T.primary : 'transparent',
                  color: confession.liked ? '#fff' : T.textMuted,
                  cursor: 'pointer', borderRadius: 3, whiteSpace: 'nowrap',
                  minHeight: 32,
                }}
              >
                <Heart size={14} fill={confession.liked ? 'currentColor' : 'none'} />
                喜欢 {confession.like_count}
              </button>
              <button
                onClick={handleBookmark}
                className="flex-1 flex items-center justify-center gap-1.5 transition-all duration-200 hover:opacity-80"
                style={{
                  height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                  border: `1px solid ${confession.bookmarked ? T.warning : T.textMuted}`,
                  background: confession.bookmarked ? `${T.warning}22` : 'transparent',
                  color: confession.bookmarked ? T.warning : T.textMuted,
                  cursor: 'pointer', borderRadius: 3, whiteSpace: 'nowrap',
                  minHeight: 32,
                }}
              >
                <Star size={14} fill={confession.bookmarked ? 'currentColor' : 'none'} />
                收藏
              </button>
            </div>
            {/* 右侧：分享 + 贴墙 + 举报 */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1 transition-all duration-200 hover:opacity-80"
                style={{
                  height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                  border: `1px solid ${T.textMuted}`,
                  background: 'transparent',
                  color: T.textMuted, cursor: 'pointer', borderRadius: 3,
                  minHeight: 32,
                }}
              >
                <Share2 size={14} /> 分享
              </button>
              {isLogged && (
                <button
                  onClick={() => navigate('/confessions/wall')}
                  className="flex items-center justify-center gap-1 transition-all duration-200 hover:opacity-80"
                  style={{
                    height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                    border: `1px solid ${T.primary}`,
                    background: 'transparent',
                    color: T.primary, cursor: 'pointer', borderRadius: 3,
                    minHeight: 32,
                  }}
                >
                  <MapPin size={14} /> 贴上墙
                </button>
              )}
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center justify-center transition-all duration-200 hover:opacity-80"
                style={{
                  width: 32, height: 32, padding: 0,
                  border: `1px solid ${T.textMuted}`,
                  background: 'transparent',
                  color: T.textMuted, cursor: 'pointer', borderRadius: 3,
                  minHeight: 32,
                }}
                title="举报"
              >
                <MoreVertical size={14} />
              </button>
            </div>
            {canDelete && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-center transition-all duration-200 hover:opacity-80"
                    style={{
                      width: 32, height: 32, padding: 0,
                      border: `1px solid ${T.textMuted}`,
                      background: 'transparent',
                      color: T.textMuted, cursor: 'pointer', borderRadius: 3,
                      minHeight: 32,
                    }}
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDelete}
                      className="flex items-center justify-center gap-1 transition-all duration-200"
                      style={{
                        height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                        background: T.error, color: '#fff',
                        border: `1px solid ${T.error}`, borderRadius: 3,
                        minHeight: 32, cursor: 'pointer',
                      }}
                    >
                      确认删除
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex items-center justify-center transition-all duration-200 hover:opacity-80"
                      style={{
                        height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                        border: `1px solid ${T.textMuted}`,
                        background: 'transparent', color: T.textMuted,
                        borderRadius: 3, minHeight: 32, cursor: 'pointer',
                      }}
                    >
                      取消
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 评论区 */}
        <div
          className="p-4"
          style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} style={{ color: T.textMuted }} />
            <span className="text-sm font-medium" style={{ color: T.text }}>
              评论 ({confession.comments.length})
            </span>
          </div>

          {/* 评论列表 */}
          {confession.comments.length === 0 ? (
            <div className="py-6 text-center" style={{ color: T.textMuted }}>
              <MessageCircle size={32} opacity={0.3} className="mx-auto mb-2" />
              <p className="text-sm">还没有评论</p>
              {isLogged && <p className="text-xs mt-1">快来写第一条评论吧</p>}
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {confession.comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar username={comment.username} avatar={comment.avatar} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium" style={{ color: T.text }}>
                        {comment.username}
                      </span>
                      <span className="text-xs" style={{ color: T.textMuted }}>
                        {comment.create_time_fmt}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: T.textSecondary }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 评论输入 */}
          {isLogged ? (
            <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${T.divider}` }}>
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
                  padding: '8px 12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleComment}
                disabled={commenting || !commentText.trim()}
                className="flex items-center justify-center gap-1 transition-all duration-200 hover:opacity-90"
                style={{
                  height: 36, padding: '0 16px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                  background: commenting ? `${T.primary}88` : T.primary,
                  color: '#fff', border: `1px solid ${T.primary}`,
                  borderRadius: 3, minHeight: 36, cursor: commenting ? 'not-allowed' : 'pointer',
                }}
              >
                <SendHorizonal size={14} />
                发送
              </button>
            </div>
          ) : (
            <div className="pt-3 text-center" style={{ borderTop: `1px solid ${T.divider}` }}>
              <button
                onClick={() => {
                  addToast('请先登录后再评论', 'warning');
                  navigate('/login');
                }}
                className="flex items-center justify-center gap-1 transition-all duration-200 hover:opacity-90"
                style={{
                  height: 36, padding: '0 16px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                  background: T.primary, color: '#fff',
                  border: `1px solid ${T.primary}`, borderRadius: 3,
                  minHeight: 36, cursor: 'pointer',
                }}
              >
                <UserPlus size={14} />
                登录后评论
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 举报弹窗 */}
      <ReportDialog
        open={showReport}
        onClose={() => setShowReport(false)}
        onConfirm={handleReport}
        theme={theme}
      />

      {/* 分享二维码弹窗 */}
      {showQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowQrUrl('')}>
          <div className="w-full max-w-xs" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 20 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>分享二维码</span>
              <button onClick={() => setShowQrUrl('')} style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <img src={`${getApiBaseUrl()}/chat/qrcode/url?url=${encodeURIComponent(showQrUrl)}`} alt="QR" className="w-full" />
            <p className="text-xs text-center mt-2" style={{ color: 'var(--color-text-muted)' }}>扫码查看表白</p>
          </div>
        </div>
      )}
    </div>
  );
}
