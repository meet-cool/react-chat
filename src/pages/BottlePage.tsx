import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SendHorizonal,
  MessageCircle,
  Trash2,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';
import { bottleApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { Bottle as BottleType, BottleReply } from '../types';
import { Avatar } from '../components/Avatar';

interface PickedBottle {
  id: number;
  content: string;
  target: string;
  author_username: string;
  author_avatar: string;
  create_time_fmt: string;
  replies: BottleReply[];
}

export function BottlePage() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [myBottles, setMyBottles] = useState<BottleType[]>([]);
  const [picked, setPicked] = useState<PickedBottle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formContent, setFormContent] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null);
  const [isLogged, setIsLogged] = useState(false);

  // 登录检查
  const requireLogin = useCallback(() => {
    const token = localStorage.getItem('arcle_token');
    if (!token) {
      addToast('请先登录后再操作', 'warning');
      navigate('/login');
      return false;
    }
    return true;
  }, [addToast, navigate]);

  // 加载我的瓶子
  const loadMyBottles = useCallback(async () => {
    try {
      const res = await bottleApi.mine();
      setMyBottles(res.items);
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('arcle_token');
    setIsLogged(!!token);
    if (token) {
      loadMyBottles();
      // 获取当前用户
      const saved = localStorage.getItem('arcle_user');
      if (saved) {
        try {
          setCurrentUser(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  // 扔瓶子
  const handleThrow = async () => {
    if (!requireLogin()) return;
    if (!formContent.trim()) {
      addToast('请输入瓶子里的内容', 'warning');
      return;
    }
    if (formContent.trim().length < 2) {
      addToast('内容至少 2 个字', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await bottleApi.save({
        content: formContent,
        target: formTarget,
      });
      addToast('瓶子已扔进大海 🌊', 'success');
      setFormContent('');
      setFormTarget('');
      setShowForm(false);
      loadMyBottles();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '扔瓶子失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 捡瓶子
  const handlePick = async () => {
    setPicking(true);
    try {
      const res = await bottleApi.pick();
      setPicked(res);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '捡瓶子失败', 'error');
    } finally {
      setPicking(false);
    }
  };

  // 回复瓶子
  const handleReply = async (bottleId: number) => {
    if (!requireLogin()) return;
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await bottleApi.reply(bottleId, replyText);
      setReplyText('');
      setReplyingId(null);
      // 刷新已捡到的瓶子
      if (picked && picked.id === bottleId) {
        const res = await bottleApi.pick();
        setPicked(res);
      }
      loadMyBottles();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '回复失败', 'error');
    } finally {
      setReplying(false);
    }
  };

  // 删除瓶子
  const handleDelete = async (id: number) => {
    try {
      await bottleApi.delete(id);
      setMyBottles((prev) => prev.filter((b) => b.id !== id));
      addToast('瓶子已收回', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const isSelf = (userId: number) => currentUser?.id === userId;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-page)' }}>
      {/* 头部 */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <button onClick={() => navigate('/chat')} className="btn btn-sm" style={{ minWidth: 36 }}>
          <ArrowLeft size={14} />
        </button>
        <div>
          <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <SendHorizonal size={18} style={{ color: 'var(--color-primary)' }} />
            漂流瓶
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            把心事装进瓶子，随波逐流等待有缘人
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLogged ? (
            <>
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn btn-primary btn-sm"
                style={{ minHeight: 36 }}
              >
                <SendHorizonal size={14} />
                {showForm ? '收起' : '扔瓶子'}
              </button>
              <button
                onClick={handlePick}
                disabled={picking}
                className="btn btn-sm"
                style={{ minHeight: 36 }}
              >
                <RotateCcw size={14} />
                {picking ? '捡拾中...' : '捡瓶子'}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                addToast('请先登录后再使用漂流瓶', 'warning');
                navigate('/login');
              }}
              className="btn btn-sm"
              style={{ minHeight: 36 }}
            >
              <SendHorizonal size={14} />
              登录后体验
            </button>
          )}
        </div>
      </div>

      {/* 扔瓶子表单 */}
      {showForm && (
        <div
          className="px-4 py-3 border-b"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col gap-3">
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="写下你的心事..."
              rows={3}
              className="text-sm resize-none"
              style={{
                background: 'var(--color-bg-page)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                borderRadius: '3px',
                padding: '8px 12px',
                outline: 'none',
                width: '100%',
              }}
            />
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                placeholder="想对谁说（选填）"
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
                onClick={handleThrow}
                disabled={submitting || !formContent.trim()}
                className="btn btn-primary btn-sm"
                style={{ minHeight: 32 }}
              >
                {submitting ? '扔出中...' : '扔出'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 已捡到的瓶子 */}
      {picked && (
        <div
          className="m-3 p-4"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <Avatar username={picked.author_username} avatar={picked.author_avatar} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {picked.author_username}
                </span>
                {picked.target && (
                  <span
                    className="text-xs px-2 py-0.5"
                    style={{
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      borderRadius: '3px',
                    }}
                  >
                    → {picked.target}
                  </span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {picked.create_time_fmt}
              </p>
            </div>
          </div>
          <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {picked.content}
          </p>

          {/* 回复区 */}
          <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 12 }}>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {picked.replies.length} 人回复
              </span>
            </div>
            {picked.replies.map((r) => (
              <div key={r.id} className="flex items-start gap-2 mb-2">
                <Avatar username={r.username} avatar={r.avatar} size={28} />
                <div
                  className="flex-1 p-2"
                  style={{
                    background: 'var(--color-bg-page)',
                    borderRadius: '3px',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      {r.username}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {r.create_time_fmt}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {r.content}
                  </p>
                </div>
              </div>
            ))}
            {/* 回复输入框 */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleReply(picked.id);
                  }
                }}
                placeholder="写下你的回复..."
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
                onClick={() => handleReply(picked.id)}
                disabled={replying || !replyText.trim()}
                className="btn btn-primary btn-sm"
                style={{ minHeight: 32 }}
              >
                <SendHorizonal size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 我的瓶子列表 */}
      {isLogged && (
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          我的瓶子 ({myBottles.length})
        </h2>
        {myBottles.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 gap-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <SendHorizonal size={40} opacity={0.4} />
            <p className="text-sm">还没有扔过瓶子</p>
            <button onClick={() => setShowForm(true)} className="btn btn-sm">
              <SendHorizonal size={14} /> 扔一个
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {myBottles.map((b) => (
              <div
                key={b.id}
                className="p-3"
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {b.content}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {b.create_time_fmt}
                      </span>
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <MessageCircle size={12} /> {b.replies} 回复
                      </span>
                      {b.picked ? (
                        <span
                          className="text-xs px-1.5 py-0.5"
                          style={{
                            background: 'var(--color-success-bg)',
                            color: 'var(--color-success)',
                            borderRadius: '3px',
                          }}
                        >
                          已有人捡到
                        </span>
                      ) : (
                        <span
                          className="text-xs px-1.5 py-0.5"
                          style={{
                            background: 'var(--color-warning-bg)',
                            color: 'var(--color-warning)',
                            borderRadius: '3px',
                          }}
                        >
                          还在漂流
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="flex-shrink-0 p-1"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="收回瓶子"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-error)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
