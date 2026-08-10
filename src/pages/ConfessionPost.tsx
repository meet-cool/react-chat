import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, SendHorizonal, ArrowLeft, UserPlus } from 'lucide-react';
import { confessionApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { Confession } from '../types';

export function ConfessionPost() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [content, setContent] = useState('');
  const [target, setTarget] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('arcle_token');
    setIsLogged(!!token);
  }, []);

  const handleSubmit = async () => {
    if (!content.trim() || content.trim().length < 2) {
      addToast('内容至少 2 个字', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await confessionApi.create({
        content,
        target_name: target,
        anonymous,
      });
      if (isLogged) {
        addToast('表白成功！', 'success');
        const list = await confessionApi.list(1);
        const latest = list.items.find((c) => c.id === res.id);
        if (latest) {
          navigate(`/confessions/${latest.slug}`);
        } else {
          navigate('/confessions');
        }
      } else {
        addToast('表白已提交，审核通过后将展示', 'info');
        navigate('/confessions');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '提交失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
          写表白
        </h1>
        {!isLogged && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
          >
            未登录 · 审核制
          </span>
        )}
      </div>

      {!isLogged && (
        <div
          className="px-4 py-2 text-xs"
          style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
        >
          未登录用户每日限 10 条，提交后需审核通过才展示。
          <button onClick={() => navigate('/login')} className="ml-2 underline font-medium">
            登录享更多权益
          </button>
        </div>
      )}

      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* 内容 */}
        <div>
          <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>
            表白内容 <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你想说的话..."
            rows={6}
            className="text-sm resize-none"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              borderRadius: '3px',
              padding: '10px 12px',
              outline: 'none',
              width: '100%',
              minHeight: 120,
            }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {content.length}/500
          </p>
        </div>

        {/* 对象昵称 */}
        <div>
          <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text)' }}>
            对象昵称（选填）
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="你想对谁表白？"
            maxLength={50}
            className="text-sm w-full"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              borderRadius: '3px',
              padding: '8px 12px',
              outline: 'none',
            }}
          />
        </div>

        {/* 匿名/实名 */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text)' }}>
            显示方式
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setAnonymous(true)}
              className={`flex-1 py-2 text-sm transition-all ${anonymous ? 'border-primary' : ''}`}
              style={
                anonymous
                  ? {
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '3px',
                    }
                  : {
                      background: 'var(--color-card)',
                      color: 'var(--color-text-muted)',
                      border: '2px solid var(--color-border)',
                      borderRadius: '3px',
                    }
              }
            >
              <Heart size={14} className="inline mr-1" />
              匿名表白
            </button>
            <button
              onClick={() => setAnonymous(false)}
              className={`flex-1 py-2 text-sm transition-all ${!anonymous ? 'border-primary' : ''}`}
              style={
                !anonymous
                  ? {
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '3px',
                    }
                  : {
                      background: 'var(--color-card)',
                      color: 'var(--color-text-muted)',
                      border: '2px solid var(--color-border)',
                      borderRadius: '3px',
                    }
              }
            >
              <UserPlus size={14} className="inline mr-1" />
              实名表白
            </button>
          </div>
        </div>

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !content.trim() || content.trim().length < 2}
          className="btn btn-primary w-full"
          style={{ minHeight: 44 }}
        >
          <SendHorizonal size={16} />
          {submitting ? '提交中...' : '发送表白'}
        </button>
      </div>
    </div>
  );
}
