import { useCallback, useEffect, useState } from 'react';
import { Heart, Eye, Trash2, Check, RefreshCw } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { Avatar } from '../../components/Avatar';
import type { ThemeKey, ThemeColors } from '../../lib/themes';
import { THEMES } from '../../lib/themes';

interface AdminConfession {
  id: number;
  user_id: number;
  anonymous: number;
  content: string;
  content_short: string;
  target_name: string;
  like_count: number;
  comment_count: number;
  status: number;
  status_label: string;
  username: string;
  user_avatar: string;
  create_time: number;
  create_time_fmt: string;
  slug: string;
}

type StatusFilter = '2' | '1' | '0' | 'all';

const STATUS_LABELS: Record<StatusFilter, string> = {
  '2': '待审核',
  '1': '已通过',
  '0': '已删除',
  all: '全部',
};

export function AdminConfessionsPage() {
  const { addToast, confirm } = useApp();
  const T: ThemeColors = THEMES.dark;
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [status, setStatus] = useState<StatusFilter>('2');
  const [items, setItems] = useState<AdminConfession[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [viewing, setViewing] = useState<AdminConfession | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.confessions({ page, per_page: perPage, status });
      setItems(r.items);
      setTotal(r.pagination.total);
      setLastPage(r.pagination.last_page);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, status, addToast]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (item: AdminConfession, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      const ok = await confirm('确认删除这条表白？删除后无法恢复。');
      if (!ok) return;
    }
    try {
      await adminApi.updateConfession(item.id, action);
      addToast(action === 'approve' ? '已通过' : '已删除', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const inputStyle: React.CSSProperties = {
    background: T.inputBg,
    border: '1px solid var(--color-border)',
    color: T.text,
    borderRadius: 3,
    padding: '4px 10px',
    fontSize: 13,
  };
  const btnStyle: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: 3,
    fontSize: 12,
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    background: 'var(--color-card-alt)',
    color: T.textMuted,
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: T.text }}>
          表白审核
        </h2>
        <button className="btn btn-sm" onClick={load} disabled={loading} style={{ padding: '4px 12px' }}>
          <RefreshCw size={13} /> 刷新
        </button>
      </div>

      {/* 状态筛选 */}
      <div className="flex gap-2 mb-4">
        {(['2', '1', '0', 'all'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            className="btn btn-sm"
            style={
              status === s
                ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                : {}
            }
            onClick={() => setStatus(s)}
          >
            {STATUS_LABELS[s]}
            {s === '2' && total > 0 && (
              <span className="ml-1 text-xs opacity-80">{total}</span>
            )}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex justify-center py-20" style={{ color: T.textMuted }}>
          <RefreshCw size={20} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex justify-center py-20" style={{ color: T.textMuted }}>
          <Heart size={32} opacity={0.3} />
          <p className="mt-2 text-sm">暂无内容</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded"
              style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}
            >
              <Avatar username={item.user_avatar || item.username} avatar={item.user_avatar} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium" style={{ color: T.text }}>
                    {item.anonymous ? '匿名' : item.username}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: item.status === 2 ? 'var(--color-warning-light)' : item.status === 1 ? 'var(--color-success-light)' : 'var(--color-error-light)', color: item.status === 2 ? 'var(--color-warning)' : item.status === 1 ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {item.status_label}
                  </span>
                  <span className="text-xs" style={{ color: T.textMuted }}>{item.create_time_fmt}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: T.textSecondary }}>
                  {item.content}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: T.textMuted }}>
                  {item.target_name && <span>致：{item.target_name}</span>}
                  <span><Heart size={12} className="inline mr-0.5" />{item.like_count}</span>
                  <span><Eye size={12} className="inline mr-0.5" />{item.comment_count}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {item.status === 2 && (
                  <>
                    <button className="btn btn-sm" style={{ ...btnStyle, color: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => handleAction(item, 'approve')} title="通过">
                      <Check size={13} />
                    </button>
                    <button className="btn btn-sm" style={{ ...btnStyle, color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => handleAction(item, 'reject')} title="删除">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 查看明细弹窗 */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setViewing(null)}>
          <div className="w-full max-w-md" style={{ background: T.card, border: '1px solid var(--color-border)', borderRadius: 6 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
              <span className="font-semibold text-sm" style={{ color: T.text }}>表白详情</span>
              <button className="p-1" style={{ color: T.textMuted }} onClick={() => setViewing(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4" style={{ color: T.text }}>
              <div className="flex items-center gap-2 mb-3">
                <Avatar username={viewing.username} avatar={viewing.user_avatar} size={32} />
                <div>
                  <div className="text-sm font-medium" style={{ color: T.text }}>{viewing.anonymous ? '匿名' : viewing.username}</div>
                  <div className="text-xs" style={{ color: T.textMuted }}>{viewing.create_time_fmt}</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: T.textSecondary }}>{viewing.content}</p>
              {viewing.target_name && <p className="text-xs mb-3" style={{ color: T.textMuted }}>致：<span style={{ color: T.text }}>{viewing.target_name}</span></p>}
              <div className="flex gap-4 text-xs" style={{ color: T.textMuted }}>
                <span><Heart size={12} className="inline mr-1" />{viewing.like_count} 赞</span>
                <span><Eye size={12} className="inline mr-1" />{viewing.comment_count} 评论</span>
              </div>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--color-divider)' }}>
              {viewing.status === 2 && (
                <>
                  <button className="btn btn-sm flex-1" style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff' }} onClick={() => { handleAction(viewing, 'approve'); setViewing(null); }}>
                    <Check size={13} className="inline mr-1" />通过
                  </button>
                  <button className="btn btn-sm flex-1" style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)', color: '#fff' }} onClick={() => { handleAction(viewing, 'reject'); setViewing(null); }}>
                    <Trash2 size={13} className="inline mr-1" />删除
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <PaginationBar page={page} lastPage={lastPage} total={total} onPageChange={setPage} />
    </div>
  );
}
