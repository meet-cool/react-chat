import { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  RefreshCw,
  Trash2,
  Users,
  MessageSquare,
  Clock,
  Search,
  Zap,
  Brain,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';
import type { AdminAiStats, AdminAiChat } from '../../types';

export function AdminAiPage() {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminAiStats | null>(null);
  const [chats, setChats] = useState<AdminAiChat[]>([]);
  const [totalChats, setTotalChats] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        adminApi.aiStats(),
        adminApi.aiChats({ page, per_page: 20, keyword }),
      ]);
      setStats(s);
      setChats(c.items);
      setTotalChats(c.pagination.total);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setPage(1);
    setSearching(true);
    setTimeout(() => setSearching(false), 300);
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteAiChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      addToast('已删除', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* 标题行 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Bot size={20} style={{ color: 'var(--color-primary)' }} /> AI广场管理
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            管理 AI 对话会话与统计
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn btn-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="总会话数" value={stats.total_chats} icon={MessageSquare} tone="primary" />
          <StatCard label="今日会话" value={stats.today_chats} icon={Clock} tone="info" />
          <StatCard label="总消息数" value={stats.total_msgs} icon={MessageSquare} tone="success" />
          <StatCard label="今日消息" value={stats.today_msgs} icon={Zap} tone="warning" />
          <StatCard label="活跃用户" value={stats.active_users} icon={Users} tone="primary" />
        </div>
      )}

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="flex-1 flex gap-2">
          <input
            className="flex-1"
            placeholder="搜索会话标题..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ borderRadius: '3px' }}
          />
          <button className="btn btn-sm" onClick={handleSearch} disabled={searching}>
            <Search size={14} /> 搜索
          </button>
        </div>
      </div>

      {/* 会话列表 */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-divider)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            会话列表
            {totalChats > 0 && <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>({totalChats})</span>}
          </span>
        </div>
        {chats.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            暂无数据
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
            {chats.map((chat) => (
              <div key={chat.id} className="px-4 py-3 flex items-center gap-4 hover:opacity-90 transition-opacity">
                <Bot size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {chat.title}
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{chat.username}</span>
                    <span>·</span>
                    <span>{chat.mode_label}</span>
                    {chat.deep_thinking === 1 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><Brain size={10} /> 深度思考</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-right flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  <div>{chat.message_count} 条消息</div>
                  <div>{chat.create_time_fmt}</div>
                </div>
                <button
                  className="btn btn-sm btn-error"
                  onClick={() => handleDelete(chat.id)}
                  title="删除会话"
                  style={{ borderRadius: '3px', padding: '4px 10px', fontSize: '12px' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalChats > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{ borderRadius: '3px' }}
          >
            上一页
          </button>
          <span className="text-sm px-3" style={{ color: 'var(--color-text-secondary)' }}>
            第 {page} 页 / 共 {Math.ceil(totalChats / 20)} 页
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= Math.ceil(totalChats / 20)}
            onClick={() => setPage(page + 1)}
            style={{ borderRadius: '3px' }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Users; tone: 'primary' | 'success' | 'warning' | 'info' }) {
  const colors: Record<string, { bg: string; color: string }> = {
    primary: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
    success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
    warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
    info: { bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
  };
  const c = colors[tone];
  return (
    <div className="p-4 flex items-start gap-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: c.bg, color: c.color }}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs" style={{ color: 'var(--color-text-light)' }}>{label}</div>
        <div className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>{value}</div>
      </div>
    </div>
  );
}
