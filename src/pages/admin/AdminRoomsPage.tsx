import { useCallback, useEffect, useState } from 'react';
import {
  Hash,
  Search,
  RefreshCw,
  Ban,
  CheckCircle,
  Trash2,
  Settings,
  Lock,
  Globe2,
  X,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { ModalFooter, ModalShell } from './AdminUsersPage';
import type { AdminRoom } from '../../types';

export function AdminRoomsPage() {
  const { addToast, confirm } = useApp();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<string>('');
  const [items, setItems] = useState<AdminRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const [editing, setEditing] = useState<AdminRoom | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.rooms({ page, per_page: perPage, keyword, type });
      setItems(r.items);
      setTotal(r.pagination.total);
      setLastPage(r.pagination.last_page);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, perPage, keyword, type]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatusOf = async (r: AdminRoom, enabled: boolean) => {
    try {
      await adminApi.updateRoom(r.id, { status: enabled ? 1 : 0 });
      addToast(enabled ? '已启用' : '已关闭', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const removeRoom = async (r: AdminRoom) => {
    const ok = await confirm(`确认删除房间「${r.name}」？此操作不可恢复，所有相关消息也将被删除。`);
    if (!ok) return;
    try {
      await adminApi.deleteRoom(r.id);
      addToast('房间已删除', 'success');
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
            <Hash size={20} style={{ color: 'var(--color-primary)' }} /> 房间管理
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            管理平台所有聊天房间，支持状态调整、信息编辑与删除
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn btn-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
        </button>
      </div>

      <div
        className="p-3 flex flex-col md:flex-row md:items-center gap-3"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="relative flex-1 md:max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="搜索房间名/描述"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 140 }}
        >
          <option value="">全部类型</option>
          <option value="public">公开房间</option>
          <option value="private">私人房间</option>
        </select>
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
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">房间</th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">类型</th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">群主</th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">成员数</th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">状态</th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">创建时间</th>
              <th className="text-right font-medium px-3 py-2 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
                  暂无房间
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderTop: '1px solid var(--color-divider)', color: 'var(--color-text)' }}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-9 h-9 flex items-center justify-center text-sm"
                        style={{
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-primary)',
                        }}
                      >
                        <Hash size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate max-w-[200px]">{r.name}</div>
                        <div
                          className="text-[11px] truncate max-w-[240px]"
                          style={{ color: 'var(--color-text-light)' }}
                        >
                          {r.description || '暂无描述'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.type === 'private' ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
                        style={{
                          background: 'var(--color-warning-bg)',
                          color: 'var(--color-warning)',
                          border: '1px solid var(--color-warning-light)',
                        }}
                      >
                        <Lock size={11} /> 私人
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
                        style={{
                          background: 'var(--color-info-bg)',
                          color: 'var(--color-info)',
                          border: '1px solid var(--color-info-light)',
                        }}
                      >
                        <Globe2 size={11} /> 公开
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                    @{r.owner_username}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.member_count}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
                      style={
                        (r.status ?? 1) === 1
                          ? {
                              background: 'var(--color-success-bg)',
                              color: 'var(--color-success)',
                              border: '1px solid var(--color-success-light)',
                            }
                          : {
                              background: 'var(--color-error-bg)',
                              color: 'var(--color-error)',
                              border: '1px solid var(--color-error-light)',
                            }
                      }
                    >
                      {(r.status ?? 1) === 1 ? (
                        <>
                          <CheckCircle size={11} /> 正常
                        </>
                      ) : (
                        <>
                          <Ban size={11} /> 已关闭
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs" style={{ color: 'var(--color-text-light)' }}>
                    {r.create_time_fmt}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn btn-sm" title="编辑" onClick={() => setEditing(r)}>
                        <Settings size={13} />
                      </button>
                      <button
                        className="btn btn-sm"
                        title={(r.status ?? 1) === 1 ? '关闭' : '启用'}
                        onClick={() => setStatusOf(r, (r.status ?? 1) !== 1)}
                      >
                        {(r.status ?? 1) === 1 ? (
                          <Ban size={13} style={{ color: 'var(--color-error)' }} />
                        ) : (
                          <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
                        )}
                      </button>
                      <button
                        className="btn btn-sm"
                        title="删除"
                        onClick={() => removeRoom(r)}
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

      {editing && (
        <EditRoomModal
          room={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditRoomModal({
  room,
  onClose,
  onDone,
}: {
  room: AdminRoom;
  onClose: () => void;
  onDone: () => void;
}) {
  const { addToast } = useApp();
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || '');
  const [ownerId, setOwnerId] = useState(String(room.owner_id));
  const [status, setStatus] = useState<number>(room.status ?? 1);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (name.trim().length < 2 || name.trim().length > 50) {
      addToast('房间名长度需 2-50', 'warning');
      return;
    }
    const owner = Number(ownerId);
    if (!Number.isInteger(owner) || owner <= 0) {
      addToast('群主 ID 必须为正整数', 'warning');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateRoom(room.id, {
        name: name.trim(),
        description,
        owner_id: owner,
        status,
      });
      addToast('房间已更新', 'success');
      onDone();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '更新失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`编辑房间 · ${room.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1.5">房间名</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1.5">描述</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1.5">群主 ID</label>
          <input
            type="number"
            min={1}
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5">状态</label>
          <select value={String(status)} onChange={(e) => setStatus(Number(e.target.value))}>
            <option value="1">正常</option>
            <option value="0">已关闭</option>
          </select>
        </div>
      </div>
      <ModalFooter onClose={onClose} onConfirm={submit} confirmText="保存" loading={saving} />
    </ModalShell>
  );
}
