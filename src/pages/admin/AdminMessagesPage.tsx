import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Trash2,
  Eye,
  MessageCircle,
  Users,
  Lock,
  X,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { Avatar } from '../../components/Avatar';
import { ModalShell } from './AdminUsersPage';
import type { AdminMessage } from '../../types';

export function AdminMessagesPage() {
  const { addToast, confirm } = useApp();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [scope, setScope] = useState<'room' | 'private'>('room');
  const [items, setItems] = useState<AdminMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const [viewing, setViewing] = useState<AdminMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.messages({ page, per_page: perPage, scope });
      setItems(r.items);
      setTotal(r.pagination.total);
      setLastPage(r.pagination.last_page);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, perPage, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (m: AdminMessage) => {
    const ok = await confirm(
      `确认删除这条消息？\n\n发送人：${m.sender_name}\n内容摘要：${m.content_short}`,
    );
    if (!ok) return;
    try {
      await adminApi.deleteMessage(m.id, scope);
      addToast('已删除', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-lg md:text-xl font-bold flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
            <MessageSquare size={20} style={{ color: 'var(--color-primary)' }} /> 消息审查
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            查看与删除房间或私聊中的最近消息
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn btn-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
        </button>
      </div>

      <div
        className="p-3 flex flex-wrap items-center gap-2"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <ScopeTab label="房间消息" icon={Users} active={scope === 'room'} onClick={() => { setScope('room'); setPage(1); }} />
        <ScopeTab label="私聊消息" icon={Lock} active={scope === 'private'} onClick={() => { setScope('private'); setPage(1); }} />
      </div>

      <div
        className="overflow-auto"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                background: 'var(--color-card-alt)',
                borderBottom: '1px solid var(--color-divider)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">发送人</th>
              <th className="text-left font-medium px-3 py-2">内容摘要</th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">类型</th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">目标</th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">发送时间</th>
              <th className="text-right font-medium px-3 py-2 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
                  暂无消息
                </td>
              </tr>
            ) : (
              items.map((m) => (
                <tr
                  key={`${scope}-${m.id}`}
                  style={{ borderTop: '1px solid var(--color-divider)', color: 'var(--color-text)' }}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar username={m.sender_name} avatar={m.sender_avatar} size={28} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{m.sender_name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--color-text-light)' }}>
                          UID {m.sender_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className="truncate max-w-[420px] text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {m.content_short}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
                      style={{
                        background: 'var(--color-card-alt)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    >
                      <MessageCircle size={11} /> {m.type || 'text'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs" style={{ color: 'var(--color-text-light)' }}>
                    {scope === 'room' ? `房间 #${m.target_id}` : `会话 #${m.target_id}`}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs" style={{ color: 'var(--color-text-light)' }}>
                    {m.create_time_fmt}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn btn-sm" title="查看内容" onClick={() => setViewing(m)}>
                        <Eye size={13} />
                      </button>
                      <button
                        className="btn btn-sm"
                        title="删除"
                        onClick={() => remove(m)}
                      >
                        <Trash2 size={13} style={{ color: 'var(--color-error)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        current={page}
        last={lastPage}
        total={total}
        perPage={perPage}
        onChange={setPage}
      />

      {viewing && (
        <ViewMessageModal message={viewing} scope={scope} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function ScopeTab({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
}) {
  return (
    <button
      onClick={onClick}
      className="btn btn-sm"
      style={
        active
          ? {
              background: 'var(--color-primary)',
              color: '#FFF',
              borderColor: 'var(--color-primary)',
            }
          : undefined
      }
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function ViewMessageModal({
  message,
  scope,
  onClose,
}: {
  message: AdminMessage;
  scope: 'room' | 'private';
  onClose: () => void;
}) {
  return (
    <ModalShell title={`消息详情 · ${scope === 'room' ? '房间' : '私聊'} #${message.id}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar username={message.sender_name} avatar={message.sender_avatar} size={40} />
          <div>
            <div className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {message.sender_name}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-light)' }}>
              发送于 {message.create_time_fmt} · 类型 {message.type || 'text'}
            </div>
          </div>
        </div>
        <div
          className="p-3 text-sm whitespace-pre-wrap break-all max-h-64 overflow-auto"
          style={{
            background: 'var(--color-card-alt)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text)',
          }}
        >
          {message.content || '（无内容）'}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end">
        <button className="btn btn-primary" onClick={onClose}>
          <X size={14} /> 关闭
        </button>
      </div>
    </ModalShell>
  );
}
