import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { momentApi as api } from '../lib/api';
import type { Moment as MomentType, MomentComment, MomentSaveResult, UserInfo } from '../types';
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, Trash2, Globe, Lock, Users } from 'lucide-react';

type Privacy = 'public' | 'friends' | 'private';

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: React.ReactNode }[] = [
  { value: 'public', label: '公开', icon: <Globe className="w-3.5 h-3.5" /> },
  { value: 'friends', label: '好友可见', icon: <Users className="w-3.5 h-3.5" /> },
  { value: 'private', label: '仅自己', icon: <Lock className="w-3.5 h-3.5" /> },
];

function mockUploadImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}

export default function MomentsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 登录态以服务端 profile 为准（localStorage 'arcle_user' 从未被写入，不可作为依据）
  useEffect(() => {
    let cancelled = false;
    authApi.profile()
      .then((u) => { if (!cancelled) setCurrentUser(u); })
      .catch(() => { if (!cancelled) setCurrentUser(null); })
      .finally(() => { if (!cancelled) setAuthLoading(false); });
    return () => { cancelled = true; };
  }, []);
  
  const [moments, setMoments] = useState<MomentType[]>([]);
  const [myMoments, setMyMoments] = useState<MomentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [writing, setWriting] = useState(false);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [selectedMoment, setSelectedMoment] = useState<MomentType | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<MomentComment | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [viewMode, setViewMode] = useState<'feed' | 'mine'>('feed');
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMoments = useCallback(async (options?: { lastId?: number; force?: boolean }) => {
    const force = options?.force ?? false;
    if (!force && (loading || !hasMore)) return;
    setLoading(true);
    if (force) {
      setHasMore(true);
      setMoments([]);
    }
    try {
      const lastId = force ? 0 : (options?.lastId ?? 0);
      const data = await api.moments({ last_id: lastId, limit: 20 });
      if (data.length < 20) setHasMore(false);
      setMoments(prev => lastId === 0 ? data : [...prev, ...data]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    loadMoments();
  }, []);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        const lastId = moments[moments.length - 1]?.id || 0;
        loadMoments({ lastId });
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [moments, hasMore, loading, loadMoments]);

  const loadMyMoments = async () => {
    try {
      const data = await api.momentsMine();
      setMyMoments(data);
    } catch { /* silent */ }
  };

  const handlePublish = async () => {
    if ((!content.trim() && images.length === 0) || !currentUser) return;
    setWriting(true);
    try {
      const result = await api.momentsSave({ content: content.trim(), images, privacy });
      setMoments(prev => [result as MomentType, ...prev]);
      setContent('');
      setImages([]);
      setPrivacy('public');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '发布失败';
      alert(msg);
    } finally {
      setWriting(false);
    }
  };

  const handleLike = async (moment: MomentType) => {
    try {
      const result = await api.momentsLike(moment.id);
      setMoments(prev => prev.map(m =>
        m.id === moment.id ? { ...m, is_liked: result.liked, like_count: result.like_count } : m
      ));
      setMyMoments(prev => prev.map(m =>
        m.id === moment.id ? { ...m, is_liked: result.liked, like_count: result.like_count } : m
      ));
      if (selectedMoment?.id === moment.id) {
        setSelectedMoment(prev => prev ? { ...prev, is_liked: result.liked, like_count: result.like_count } : null);
      }
    } catch { /* silent */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条动态？')) return;
    try {
      await api.momentsDelete(id);
      setMoments(prev => prev.filter(m => m.id !== id));
      setMyMoments(prev => prev.filter(m => m.id !== id));
      if (selectedMoment?.id === id) setSelectedMoment(null);
    } catch { /* silent */ }
  };

  const handleComment = async (text: string, replyToComment?: MomentComment) => {
    if (!selectedMoment) return;
    try {
      const comment = await api.momentsComment(selectedMoment.id, {
        content: text,
        reply_to_id: replyToComment?.id || 0,
      });
      setSelectedMoment(prev => {
        if (!prev) return null;
        // 沿路径不可变更新：map 生成新树，替换目标评论对象
        const addReply = (comments: MomentComment[], targetId: number): MomentComment[] =>
          comments.map(c => {
            if (c.id === targetId) {
              return { ...c, children: [...(c.children || []), comment] };
            }
            if (c.children && c.children.length > 0) {
              return { ...c, children: addReply(c.children, targetId) };
            }
            return c;
          });
        const newComments = replyToComment
          ? addReply(prev.comments || [], replyToComment.id)
          : [...(prev.comments || []), comment];
        return { ...prev, comments: newComments, comment_count: prev.comment_count + 1 };
      });
    } catch { /* silent */ }
  };

  const viewDetail = async (moment: MomentType) => {
    setSelectedMoment(moment);
    setLoadingDetail(true);
    try {
      const detail = await api.momentsDetail(moment.id);
      setSelectedMoment(detail);
    } catch { /* keep current */ } finally {
      setLoadingDetail(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-muted)]">
        <p>加载中...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-text-muted)]">
        <div className="text-center">
          <p className="mb-4">请先登录后访问朋友圈</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary">去登录</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-8">
      <div className="sticky top-0 z-10 bg-[var(--color-bg-page)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">朋友圈</h1>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${viewMode === 'feed' ? 'btn-primary' : ''}`}
            onClick={() => { setViewMode('feed'); loadMoments({ force: true }); }}
          >
            动态
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'mine' ? 'btn-primary' : ''}`}
            onClick={() => { setViewMode('mine'); loadMyMoments(); }}
          >
            我的
          </button>
        </div>
      </div>

      {viewMode === 'feed' && (
        <div className="mx-4 mt-4 bg-[var(--color-card)] border border-[var(--color-border)] p-4">
          <div className="flex gap-3">
            <img
              src={currentUser.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.username}`}
              alt=""
              className="w-10 h-10 bg-[var(--color-bg-page)] flex-shrink-0"
            />
            <div className="flex-1">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`${currentUser.username}在想什么...`}
                className="w-full bg-transparent border-none text-[var(--color-text)] text-sm resize-none focus:outline-none min-h-[60px]"
                rows={2}
              />
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 bg-[var(--color-bg-page)] border border-[var(--color-border)]">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 bg-[var(--color-error)] text-white w-5 h-5 text-xs flex items-center justify-center">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-divider)]">
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="btn btn-sm text-[var(--color-text-light)]" title="添加图片">
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []).slice(0, 9 - images.length);
                      const urls = await Promise.all(files.map(mockUploadImage));
                      setImages(prev => [...prev, ...urls]);
                      e.target.value = '';
                    }} />
                  <select value={privacy} onChange={e => setPrivacy(e.target.value as Privacy)}
                    className="btn btn-sm text-[var(--color-text-light)] text-xs">
                    {PRIVACY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handlePublish} disabled={writing || (!content.trim() && images.length === 0)}
                  className="btn btn-sm btn-primary disabled:opacity-50">
                  <Send className="w-3.5 h-3.5" />发布
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'feed' && (
        <>
          {moments.map(m => (
            <MomentCard key={m.id} moment={m} onLike={() => handleLike(m)} onView={() => viewDetail(m)}
              onDelete={m.user_id === currentUser.id ? () => handleDelete(m.id) : undefined} />
          ))}
          {loading && <div className="text-center py-4 text-[var(--color-text-muted)] text-sm">加载中...</div>}
          {!loading && moments.length === 0 && (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>还没有动态</p>
              <p className="text-sm mt-1">发布第一条动态，记录精彩瞬间</p>
            </div>
          )}
          <div ref={loadMoreRef} />
        </>
      )}

      {viewMode === 'mine' && (
        <>
          {myMoments.map(m => (
            <MomentCard key={m.id} moment={m} onLike={() => handleLike(m)} onView={() => viewDetail(m)}
              onDelete={() => handleDelete(m.id)} />
          ))}
          {!loading && myMoments.length === 0 && (
            <div className="text-center py-12 text-[var(--color-text-muted)]"><p>还没有发布过动态</p></div>
          )}
        </>
      )}

      {selectedMoment && (
        <MomentDetail
          moment={selectedMoment}
          loading={loadingDetail}
          onLike={() => handleLike(selectedMoment)}
          onComment={handleComment}
          onReplyTo={(c) => setReplyTo(c)}
          onClose={() => { setSelectedMoment(null); setReplyTo(null); }}
        />
      )}
    </div>
  );
}

function MomentCard({ moment, onLike, onView, onDelete }: {
  moment: MomentType; onLike: () => void; onView: () => void; onDelete?: () => void;
}) {
  return (
    <div className="mx-4 mt-3 bg-[var(--color-card)] border border-[var(--color-border)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <img src={moment.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${moment.username}`}
          alt="" className="w-10 h-10 bg-[var(--color-bg-page)] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text)] truncate">{moment.username}</span>
            <PrivacyBadge privacy={moment.privacy} />
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">{moment.time_ago}</span>
        </div>
        {onDelete && <button onClick={onDelete} className="text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors"><Trash2 className="w-4 h-4" /></button>}
      </div>
      {moment.content && <div className="px-4 pb-2"><p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap break-words">{moment.content}</p></div>}
      {moment.images.length > 0 && (
        <div className="px-4 pb-3">
          <div className={`grid gap-2 ${moment.images.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {moment.images.map((img, i) => (
              <div key={i} className="aspect-square bg-[var(--color-bg-page)] border border-[var(--color-border)] overflow-hidden cursor-pointer" onClick={onView}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1 px-2 py-2 border-t border-[var(--color-divider)]">
        <button onClick={onLike}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm transition-colors ${moment.is_liked ? 'text-[var(--color-error)]' : 'text-[var(--color-text-light)] hover:text-[var(--color-text)]'}`}>
          <Heart className={`w-4 h-4 ${moment.is_liked ? 'fill-current' : ''}`} />
          <span>{moment.like_count || '点赞'}</span>
        </button>
        <button onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors">
          <MessageCircle className="w-4 h-4" /><span>{moment.comment_count || '评论'}</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors">
          <Share2 className="w-4 h-4" /><span>分享</span>
        </button>
      </div>
    </div>
  );
}

function PrivacyBadge({ privacy }: { privacy: string }) {
  const config = PRIVACY_OPTIONS.find(o => o.value === privacy) || PRIVACY_OPTIONS[0];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-page)] px-1.5 py-0.5">
      {config.icon}{config.label}
    </span>
  );
}

function MomentDetail({ moment, loading, onLike, onComment, onReplyTo, onClose }: {
  moment: MomentType; loading: boolean; onLike: () => void;
  onComment: (text: string, replyTo?: MomentComment) => Promise<void>;
  onReplyTo: (c: MomentComment) => void; onClose: () => void;
}) {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = async () => {
    if (!commentText.trim()) return;
    await onComment(commentText.trim());
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[85vh] bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <img src={moment.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${moment.username}`}
            alt="" className="w-10 h-10 bg-[var(--color-bg-page)]" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text)]">{moment.username}</span>
              <PrivacyBadge privacy={moment.privacy} />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">{moment.create_time_fmt}</span>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-3 overflow-y-auto flex-1">
          {moment.content && <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{moment.content}</p>}
          {moment.images.length > 0 && (
            <div className={`grid gap-2 mt-3 ${moment.images.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {moment.images.map((img, i) => (
                <div key={i} className="aspect-square bg-[var(--color-bg-page)] border border-[var(--color-border)] overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-3 pt-3 border-t border-[var(--color-divider)] text-xs text-[var(--color-text-muted)]">
            <span>{moment.like_count} 人点赞</span>
            <span>{moment.comment_count} 条评论</span>
          </div>
          {loading ? <div className="py-4 text-center text-[var(--color-text-muted)] text-sm">加载中...</div> : (
            <div className="mt-3 space-y-3">
              {(moment.comments || []).map(comment => (
                <CommentItem key={comment.id} comment={comment} onReply={onReplyTo} />
              ))}
              {(moment.comments || []).length === 0 && <div className="text-center py-4 text-[var(--color-text-muted)] text-sm">暂无评论</div>}
            </div>
          )}
        </div>
        <div className="border-t border-[var(--color-border)] px-4 py-3 flex gap-2">
          <input value={commentText} onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder="发表评论..."
            className="flex-1 bg-[var(--color-bg-page)] border border-[var(--color-border)] text-[var(--color-text)] text-sm px-3 py-2 focus:border-[var(--color-primary)] outline-none" />
          <button onClick={handleSubmit} disabled={!commentText.trim()} className="btn btn-sm btn-primary disabled:opacity-50">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex border-t border-[var(--color-border)]">
          <button onClick={onLike}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${moment.is_liked ? 'text-[var(--color-error)]' : 'text-[var(--color-text-light)] hover:text-[var(--color-text)]'}`}>
            <Heart className={`w-5 h-5 ${moment.is_liked ? 'fill-current' : ''}`} />
            {moment.like_count || '点赞'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, onReply }: { comment: MomentComment; onReply: (c: MomentComment) => void }) {
  return (
    <div className="flex gap-2">
      <img src={comment.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.username}`}
        alt="" className="w-7 h-7 bg-[var(--color-bg-page)] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="bg-[var(--color-bg-page)] px-3 py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-[var(--color-primary)]">{comment.username}</span>
            {comment.reply_to_username && <span className="text-xs text-[var(--color-text-muted)]">回复 <span className="text-[var(--color-primary)]">@{comment.reply_to_username}</span></span>}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 break-words">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-xs text-[var(--color-text-muted)]">{comment.time_ago}</span>
          <button onClick={() => onReply(comment)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">回复</button>
        </div>
        {comment.children && comment.children.length > 0 && (
          <div className="mt-2 space-y-2 pl-2 border-l-2 border-[var(--color-border-light)]">
            {comment.children.map(child => <CommentItem key={child.id} comment={child} onReply={onReply} />)}
          </div>
        )}
      </div>
    </div>
  );
}
