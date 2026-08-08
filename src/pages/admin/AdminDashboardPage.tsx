import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  MessageSquare,
  BarChart3,
  Hash,
  Zap,
  CalendarDays,
  RefreshCw,
  TrendingUp,
  Globe,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';
import type { AdminStats, TrendPoint } from '../../types';

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: typeof Users;
  tone: 'primary' | 'success' | 'warning' | 'info';
}

const toneStyles: Record<StatCardProps['tone'], { bg: string; color: string; border: string }> = {
  primary: {
    bg: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    border: 'var(--color-primary)',
  },
  success: {
    bg: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    border: 'var(--color-success-light)',
  },
  warning: {
    bg: 'var(--color-warning-bg)',
    color: 'var(--color-warning)',
    border: 'var(--color-warning-light)',
  },
  info: {
    bg: 'var(--color-info-bg)',
    color: 'var(--color-info)',
    border: 'var(--color-info-light)',
  },
};

function StatCard({ label, value, sub, icon: Icon, tone }: StatCardProps) {
  const s = toneStyles[tone];
  return (
    <div
      className="p-4 flex items-start gap-3"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="w-10 h-10 flex items-center justify-center flex-shrink-0"
        style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs" style={{ color: 'var(--color-text-light)' }}>
          {label}
        </div>
        <div
          className="text-2xl font-bold mt-0.5 truncate"
          style={{ color: 'var(--color-text)' }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([adminApi.stats(), adminApi.trend()]);
      setStats(s);
      setTrend(t);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  // 简易条形图高度
  const maxTotal = Math.max(1, ...trend.map((t) => t.total));

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* 标题行 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-lg md:text-xl font-bold flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
            <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} /> 仪表盘
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            平台核心数据一览
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn btn-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="总用户数"
          value={stats?.total_users ?? '-'}
          sub={`今日新增 ${stats?.today_users ?? 0} · 在线 ${stats?.online_users ?? 0}`}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="房间总数"
          value={stats?.total_rooms ?? '-'}
          sub={`今日活跃 ${stats?.active_rooms ?? 0}`}
          icon={Hash}
          tone="info"
        />
        <StatCard
          label="消息总数"
          value={stats?.total_messages ?? '-'}
          sub={`今日 ${stats?.today_messages ?? 0} · 私聊 ${stats?.private_total ?? 0}`}
          icon={MessageSquare}
          tone="success"
        />
        <StatCard
          label="在线用户"
          value={stats?.online_users ?? '-'}
          sub="5 分钟内活跃"
          icon={Zap}
          tone="warning"
        />
      </div>

      {/* 趋势图 */}
      <div
        className="p-4 md:p-5"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              近 7 日消息趋势
            </h2>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1" style={{ color: 'var(--color-text-light)' }}>
              <span
                className="inline-block w-3 h-3"
                style={{ background: 'var(--color-primary)' }}
              />{' '}
              房间
            </span>
            <span className="flex items-center gap-1" style={{ color: 'var(--color-text-light)' }}>
              <span
                className="inline-block w-3 h-3"
                style={{ background: 'var(--color-success)' }}
              />{' '}
              私聊
            </span>
            <span className="flex items-center gap-1" style={{ color: 'var(--color-text-light)' }}>
              <Globe size={12} /> 总量（折线）
            </span>
          </div>
        </div>

        {trend.length === 0 ? (
          <div
            className="py-12 text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            暂无数据
          </div>
        ) : (
          <div>
            {/* 条形图 */}
            <div
              className="grid gap-3 items-end"
              style={{ gridTemplateColumns: `repeat(${trend.length}, minmax(0, 1fr))`, height: 200 }}
            >
              {trend.map((t) => {
                const h1 = maxTotal ? (t.room / maxTotal) * 100 : 0;
                const h2 = maxTotal ? (t['private'] / maxTotal) * 100 : 0;
                return (
                  <div key={t.date} className="flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full max-w-[38px] flex flex-col-reverse gap-0.5"
                      style={{ height: '100%' }}
                    >
                      <div
                        style={{
                          height: `${h2}%`,
                          minHeight: t['private'] > 0 ? 2 : 0,
                          background: 'var(--color-success)',
                        }}
                        title={`私聊 ${t['private']}`}
                      />
                      <div
                        style={{
                          height: `${h1}%`,
                          minHeight: t.room > 0 ? 2 : 0,
                          background: 'var(--color-primary)',
                        }}
                        title={`房间 ${t.room}`}
                      />
                    </div>
                    <div
                      className="mt-2 text-[11px]"
                      style={{ color: 'var(--color-text-light)' }}
                    >
                      {t.date}
                    </div>
                    <div
                      className="text-[10px] font-semibold"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {t.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div
        className="p-4 flex items-start gap-2 text-xs"
        style={{
          background: 'var(--color-card-alt)',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <CalendarDays size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <div style={{ color: 'var(--color-text-secondary)' }}>
          提示：房间消息与私聊消息分开统计。所有统计均为实时聚合，可点击右上角刷新重新拉取。
        </div>
      </div>
    </div>
  );
}
