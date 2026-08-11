import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Star, Gift, Calendar } from 'lucide-react';
import { authApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { UserInfo } from '../types';
import { Avatar } from '../components/Avatar';

const LEVEL_COLORS = ['#94a3b8', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899'];

function getLevelColor(level: number) {
  return LEVEL_COLORS[Math.min(level - 1, LEVEL_COLORS.length - 1)] ?? LEVEL_COLORS[0];
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('arcle_token');
    if (!token) return;
    try {
      const u = await authApi.profile();
      setInfo(u);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-page)' }}>
        <div className="w-8 h-8 border-2 animate-spin rounded-full" style={{ borderTopColor: 'var(--color-primary)', borderLeftColor: 'var(--color-border)', borderBottomColor: 'var(--color-border)', borderRightColor: 'var(--color-border)' }} />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-page)', color: 'var(--color-text-muted)' }}>
        加载失败
      </div>
    );
  }

  const levelColor = getLevelColor(info.level);
  const expPercent = 100 - info.exp_to_next;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-page)' }}>
      {/* 头部 */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <button onClick={() => navigate(-1)} className="btn btn-sm" style={{ minWidth: 36 }}>
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
          个人主页
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 头像与基本信息 */}
        <div
          className="flex flex-col items-center py-6 rounded-lg"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <Avatar username={info.username} avatar={info.avatar} size={80} online={info.online} />
          <div className="mt-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                {info.username}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: levelColor + '22', color: levelColor, border: `1px solid ${levelColor}44` }}
              >
                <Crown size={10} className="inline mr-0.5" />
                Lv.{info.level}
              </span>
              {info.role !== 'member' && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                >
                  {info.role}
                </span>
              )}
            </div>
            {info.bio && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                {info.bio}
              </p>
            )}
          </div>
        </div>

        {/* 等级与积分 */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
              <Crown size={14} style={{ color: levelColor }} />
              等级 {info.level}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {info.exp % 100}/100 EXP
            </span>
          </div>
          <div className="h-2 rounded-full mb-3" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${expPercent}%`, background: levelColor }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--color-text-secondary)' }}>总积分</span>
            <span className="font-bold flex items-center gap-1" style={{ color: 'var(--color-warning)' }}>
              <Star size={14} /> {info.points}
            </span>
          </div>
        </div>

        {/* 签到信息 */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>签到</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--color-text-secondary)' }}>
              当前连签 {info.sign_in_streak} 天
            </span>
            {info.last_sign_in_date && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                上次：{info.last_sign_in_date}
              </span>
            )}
          </div>
        </div>

        {/* 账号信息 */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
            账号信息
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>用户名</span>
              <span style={{ color: 'var(--color-text)' }}>{info.username}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>邮箱</span>
              <span style={{ color: 'var(--color-text)' }}>{info.email}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>注册时间</span>
              <span style={{ color: 'var(--color-text)' }}>
                {new Date(info.create_time * 1000).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
