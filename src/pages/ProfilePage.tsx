import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Star, Calendar, Shield, ShieldCheck } from 'lucide-react';
import { authApi, userApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { UserInfo } from '../types';
import { Avatar } from '../components/Avatar';

const LEVEL_COLORS = ['#94a3b8', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899'];

function getLevelColor(level: number) {
  return LEVEL_COLORS[Math.min(level - 1, LEVEL_COLORS.length - 1)] ?? LEVEL_COLORS[0];
}

interface ProfilePageProps {
  user?: UserInfo;
}

export function ProfilePage({ user }: ProfilePageProps) {
  const navigate = useNavigate();
  const { username } = useParams<{ username?: string }>();
  const { addToast } = useApp();

  // 用传入的 user prop 判断，不依赖异步 API 加载
  const selfUsername = user?.username || '';
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingVisible, setUpdatingVisible] = useState(false);

  // 用 ref 跟踪是否已导航离开，防止异步回调在卸载后仍 setState
  const abortedRef = useRef(false);

  // 稳定的 loadProfile，不依赖易变的 isSelf/username/navigate
  const loadProfileRef = useRef<{ current: () => Promise<void> }>({
    current: async () => {},
  });

  const doLoadProfile = useCallback(async () => {
    abortedRef.current = false;
    // 重置上次请求标记
    const prevAborted = abortedRef.current;
    abortedRef.current = false;

    // 如果是查看自己，且已经加载过，直接复用
    const isSelfNow = !username || username === selfUsername;
    if (isSelfNow && !prevAborted) {
      // 已经有 info 就不用重复请求
      if (!info) {
        try {
          const u = await authApi.profile();
          if (!abortedRef.current) setInfo(u);
        } catch (err) {
          if (!abortedRef.current) {
            const msg = err instanceof Error ? err.message : '';
            if (msg.includes('403') || msg.includes('隐藏')) {
              addToast('该用户已隐藏主页', 'warning');
            }
            navigate(-1);
            abortedRef.current = true;
          }
        }
      }
      return;
    }

    // 查看他人主页
    if (!username) return;
    try {
      const u = await userApi.getOtherProfile(username.trim());
      if (!abortedRef.current) setInfo(u);
    } catch (err) {
      if (abortedRef.current) return;
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('403') || msg.includes('隐藏')) {
        addToast('该用户已隐藏主页', 'warning');
      } else if (msg.includes('404') || msg.includes('不存在')) {
        addToast('用户不存在', 'error');
      }
      navigate(-1);
      abortedRef.current = true;
    } finally {
      if (!abortedRef.current) setLoading(false);
    }
  }, [username, selfUsername, info, navigate, addToast]);

  useEffect(() => {
    abortedRef.current = false;
    setLoading(true);
    doLoadProfile().catch(() => {});
    return () => { abortedRef.current = true; };
  }, [doLoadProfile]);

  const handleToggleVisible = async () => {
    if (!info) return;
    setUpdatingVisible(true);
    try {
      const result = await userApi.updateProfileVisible(!info.profile_visible);
      setInfo((prev) => prev ? { ...prev, profile_visible: result.profile_visible === 1 } : prev);
      addToast(result.profile_visible === 1 ? '主页已公开' : '主页已隐藏', 'success');
    } catch {
      addToast('设置失败', 'error');
    } finally {
      setUpdatingVisible(false);
    }
  };

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
        <h1 className="text-base font-bold flex-1 min-w-0 truncate" style={{ color: 'var(--color-text)' }}>
          {isSelf ? '个人主页' : `@${info.username} 的主页`}
        </h1>
        {isSelf && (
          <button
            onClick={handleToggleVisible}
            disabled={updatingVisible}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all"
            style={{
              background: info.profile_visible ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
              color: info.profile_visible ? '#4ade80' : '#ef4444',
              border: `1px solid ${info.profile_visible ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
              opacity: updatingVisible ? 0.6 : 1,
            }}
            title={info.profile_visible ? '点击隐藏主页' : '点击公开主页'}
          >
            {info.profile_visible ? <ShieldCheck size={12} /> : <Shield size={12} />}
            {info.profile_visible ? '主页公开' : '主页隐藏'}
          </button>
        )}
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
            {!isSelf && info.profile_visible === false && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                该用户已隐藏主页信息
              </p>
            )}
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

        {/* 详细信息（仅本人可见） */}
        {isSelf && (
          <>
            {/* 隐私状态 */}
            <div
              className="rounded-lg p-4"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {info.profile_visible ? (
                    <ShieldCheck size={16} style={{ color: '#4ade80' }} />
                  ) : (
                    <Shield size={16} style={{ color: '#ef4444' }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    主页可见性
                  </span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{
                  background: info.profile_visible ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
                  color: info.profile_visible ? '#4ade80' : '#ef4444',
                }}>
                  {info.profile_visible ? '公开' : '隐藏'}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                隐藏后其他用户将无法查看您的主页详情
              </p>
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
          </>
        )}

        {/* 他人信息（公开字段） */}
        {!isSelf && info.profile_visible !== false && (
          <div
            className="rounded-lg p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
              基本信息
            </h3>
            <div className="space-y-2 text-sm">
              {info.gender && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>性别</span>
                  <span style={{ color: 'var(--color-text)' }}>
                    {info.gender === 'male' ? '男' : info.gender === 'female' ? '女' : '保密'}
                  </span>
                </div>
              )}
              {info.city && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>城市</span>
                  <span style={{ color: 'var(--color-text)' }}>{info.city}</span>
                </div>
              )}
              {info.motto && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>座右铭</span>
                  <span style={{ color: 'var(--color-text)' }}>{info.motto}</span>
                </div>
              )}
              {info.birthday && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>生日</span>
                  <span style={{ color: 'var(--color-text)' }}>{info.birthday}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
