import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, SendHorizonal, ArrowLeft, UserPlus } from 'lucide-react';
import { confessionApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { Confession } from '../types';
import { ThemeKey, THEMES } from '../lib/themes';

export function ConfessionPost() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [content, setContent] = useState('');
  const [target, setTarget] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('confession_theme');
    return (saved === 'ocean' || saved === 'pink' || saved === 'default') ? saved : 'pink';
  });
  const [bgImage, setBgImage] = useState('');

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
    <div
      className="flex flex-col h-screen"
      style={{
        background: T.cardBg,
        backgroundImage: bgImage ? `url(/${bgImage})` : undefined,
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
        <h1 className="text-base font-bold" style={{ color: T.text }}>
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
        <div className="ml-auto">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeKey)}
            className="text-sm"
            style={{
              background: T.inputBg,
              border: `1px solid ${T.cardBorder}`,
              color: T.text,
              borderRadius: '3px',
              padding: '4px 8px',
              outline: 'none',
            }}
          >
            <option value="ocean">🌊 蔚蓝无边星海</option>
            <option value="pink">🌸 粉色浪漫花海</option>
            <option value="default">🎨 默认主题</option>
          </select>
        </div>
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
          <label className="text-sm font-medium mb-1 block" style={{ color: T.text }}>
            表白内容 <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你想说的话..."
            rows={6}
            className="text-sm resize-none"
            style={{
              background: T.inputBg,
              border: `1px solid ${T.cardBorder}`,
              color: T.text,
              borderRadius: '3px',
              padding: '10px 12px',
              outline: 'none',
              width: '100%',
              minHeight: 120,
            }}
          />
          <p className="text-xs mt-1" style={{ color: T.textMuted }}>
            {content.length}/500
          </p>
        </div>

        {/* 对象昵称 */}
        <div>
          <label className="text-sm font-medium mb-1 block" style={{ color: T.text }}>
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
              background: 'rgba(0,0,0,0.2)',
              border: `1px solid ${T.cardBorder}`,
              color: T.text,
              borderRadius: '3px',
              padding: '8px 12px',
              outline: 'none',
            }}
          />
        </div>

        {/* 匿名/实名 */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: T.text }}>
            显示方式
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setAnonymous(true)}
              className="flex-1 py-2 text-sm transition-all"
              style={
                anonymous
                  ? {
                      background: T.labelBg,
                      color: T.primary,
                      border: `2px solid ${T.primary}`,
                      borderRadius: '3px',
                    }
                  : {
                      background: T.cardBg,
                      color: T.textMuted,
                      border: `2px solid ${T.cardBorder}`,
                      borderRadius: '3px',
                    }
              }
            >
              <Heart size={14} className="inline mr-1" />
              匿名表白
            </button>
            <button
              onClick={() => setAnonymous(false)}
              className="flex-1 py-2 text-sm transition-all"
              style={
                !anonymous
                  ? {
                      background: T.labelBg,
                      color: T.primary,
                      border: `2px solid ${T.primary}`,
                      borderRadius: '3px',
                    }
                  : {
                      background: T.cardBg,
                      color: T.textMuted,
                      border: `2px solid ${T.cardBorder}`,
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
          style={{ minHeight: 44, background: T.primary, color: '#fff', borderColor: T.primary }}
          className="w-full"
        >
          <SendHorizonal size={16} />
          {submitting ? '提交中...' : '发送表白'}
        </button>
      </div>
    </div>
  );
}
