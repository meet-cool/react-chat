import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Zap,
  Trophy,
  Calendar,
  ArrowLeft,
  Clock,
  Gift,
  Sparkles,
} from 'lucide-react';
import { pointsApi, authApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { UserInfo } from '../types';

interface PointsRecord {
  id: number;
  change_points: number;
  change_exp: number;
  type: string;
  ref_id: number;
  remark: string;
  create_time: number;
  create_time_fmt: string;
}

interface PointsInfo {
  points: number;
  exp: number;
  level: number;
  exp_to_next: number;
  sign_in_streak: number;
  last_sign_in_date: string;
  signed_today: boolean;
  today_max_points: number;
}

const POINT_TYPES: Record<string, { label: string; color: string }> = {
  signin: { label: '每日签到', color: 'var(--color-primary)' },
  confession: { label: '发表表白', color: 'var(--color-error)' },
  like_received: { label: '收到点赞', color: 'var(--color-warning)' },
  comment: { label: '发表评论', color: 'var(--color-info)' },
  unlock_detail: { label: '解锁详情', color: 'var(--color-muted)' },
};

function LevelBadge({ level }: { level: number }) {
  const colors = ['#94a3b8', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981'];
  const color = colors[Math.min(level - 1, colors.length - 1)] ?? colors[0];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: color + '22', color, border: `1px solid ${color}44` }}
    >
      <Trophy size={12} /> Lv.{level}
    </span>
  );
}

interface PointsPageProps {
  onUserUpdate?: (u: UserInfo) => void;
}

export function PointsPage({ onUserUpdate }: PointsPageProps) {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null);
  const [records, setRecords] = useState<PointsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [signinLoading, setSigninLoading] = useState(false);

  const loadPoints = useCallback(async () => {
    try {
      const res = await pointsApi.getPoints();
      setPointsInfo(res);
    } catch {
      // 静默失败
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await pointsApi.pointsHistory(1);
      setRecords(res.items);
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('arcle_token');
    if (!token) return;
    loadPoints();
    loadHistory();
  }, [loadPoints, loadHistory]);

  const handleSignin = async () => {
    if (!localStorage.getItem('arcle_token')) {
      addToast('请先登录', 'warning');
      navigate('/login');
      return;
    }
    setSigninLoading(true);
    try {
      const res = await pointsApi.signin();
      setPointsInfo((prev) =>
        prev ? { ...prev, signed_today: true, sign_in_streak: res.streak } : null
      );
      addToast(
        `签到成功！+${res.points_earned}积分${res.new_level > 1 ? ' 升级至Lv.' + res.new_level + '!' : ''}`,
        'success'
      );
      // 刷新历史
      loadHistory();
      // 刷新积分信息（points、exp、level）
      loadPoints();
      // 刷新用户信息（同步到聊天页头像栏）
      if (onUserUpdate) {
        try {
          const updated = await authApi.profile();
          onUserUpdate(updated);
        } catch { /* 静默 */ }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '签到失败';
      if (!msg.includes('今日已签到')) {
        addToast(msg, 'error');
      }
    } finally {
      setSigninLoading(false);
    }
  };

  const streakDays = pointsInfo?.sign_in_streak ?? 0;
  const streakBonus = Math.min(streakDays - 1, 5) * 5;
  const streakColors = ['#fbbf24', '#f59e0b', '#ef4444', '#dc2626', '#991b1b', '#7f1d1d'];
  const streakColor = streakDays > 0 ? streakColors[Math.min(streakDays - 1, streakColors.length - 1)] : '#94a3b8';

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
        <h1 className="text-base font-bold flex-1 min-w-0 truncate items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Star size={18} style={{ color: 'var(--color-warning)' }} />
          积分中心
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 积分卡片 */}
        {pointsInfo && (
          <div
            className="rounded-lg p-4 text-center"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%)',
              color: '#fff',
            }}
          >
            <div className="text-3xl font-bold">{pointsInfo.points}</div>
            <div className="text-sm opacity-80 mt-1">当前积分</div>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <div>
                <div className="font-semibold">Lv.{pointsInfo.level}</div>
                <div className="opacity-70">等级</div>
              </div>
              <div
                className="flex-1 h-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${((100 - pointsInfo.exp_to_next) / 100) * 100}%`,
                    background: '#fbbf24',
                  }}
                />
              </div>
              <div className="text-right">
                <div className="font-semibold">{100 - pointsInfo.exp_to_next}/100</div>
                <div className="opacity-70">经验</div>
              </div>
            </div>
          </div>
        )}

        {/* 签到卡片 */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                每日签到
              </span>
            </div>
            <button
              onClick={handleSignin}
              disabled={signinLoading || (pointsInfo?.signed_today ?? false)}
              className="btn btn-primary btn-sm"
              style={{
                minHeight: 32,
                opacity: pointsInfo?.signed_today ? 0.5 : 1,
              }}
            >
              {signinLoading ? '签到中...' : pointsInfo?.signed_today ? '今日已签' : '立即签到'}
            </button>
          </div>

          {/* 连签进度条 */}
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6].map((day) => (
              <div
                key={day}
                className="flex-1 h-1.5 rounded-full"
                style={{
                  background: day <= streakDays ? streakColor : 'var(--color-border)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>连签 {streakDays} 天</span>
            <span>
              本日本次可得 <b style={{ color: streakColor }}>{pointsInfo?.today_max_points ?? 10}</b> 积分
              {streakBonus > 0 && <span>（+{streakBonus}连签加成）</span>}
            </span>
          </div>
        </div>

        {/* 积分规则 */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Gift size={14} style={{ color: 'var(--color-warning)' }} />
            赚取积分
          </h3>
          <div className="space-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="flex items-center justify-between">
              <span>每日签到</span>
              <span className="font-medium" style={{ color: 'var(--color-success)' }}>+10~35 积分</span>
            </div>
            <div className="flex items-center justify-between">
              <span>发表表白</span>
              <span className="font-medium" style={{ color: 'var(--color-success)' }}>+20 积分</span>
            </div>
            <div className="flex items-center justify-between">
              <span>收到点赞</span>
              <span className="font-medium" style={{ color: 'var(--color-success)' }}>+1 积分</span>
            </div>
            <div className="flex items-center justify-between">
              <span>发表评论</span>
              <span className="font-medium" style={{ color: 'var(--color-success)' }}>+5 积分</span>
            </div>
          </div>
        </div>

        {/* 积分明细 */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Clock size={14} style={{ color: 'var(--color-info)' }} />
            积分明细
          </h3>
          {records.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <Sparkles size={24} className="mx-auto mb-2 opacity-40" />
              暂无记录
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => {
                const typeInfo = POINT_TYPES[r.type] ?? { label: r.type, color: 'var(--color-text-muted)' };
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: typeInfo.color }}
                      />
                      <span style={{ color: 'var(--color-text-secondary)' }}>{r.remark}</span>
                    </div>
                    <span
                      className="font-medium"
                      style={{ color: r.change_points > 0 ? 'var(--color-success)' : 'var(--color-error)' }}
                    >
                      {r.change_points > 0 ? '+' : ''}{r.change_points}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
