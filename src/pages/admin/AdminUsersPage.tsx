import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  UserPlus,
  ShieldCheck,
  ShieldOff,
  Ban,
  CheckCircle,
  UserCog,
  X,
  Crown,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';
import { useAdminAuth } from '../../lib/AdminContext';
import { PaginationBar } from '../../components/admin/PaginationBar';
import { Avatar } from '../../components/Avatar';
import type { AdminUser, AdminUserRole } from '../../types';

export function AdminUsersPage() {
  const { addToast } = useApp();
  const { admin: me } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.users({
        page,
        per_page: perPage,
        keyword,
        status,
      });
      setItems(r.items);
      setTotal(r.pagination.total);
      setLastPage(r.pagination.last_page);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, perPage, keyword, status]);

  useEffect(() => {
    load();
  }, [load]);

  const isSuperAdmin = me?.role === 'super_admin';

  const setStatusOf = async (u: AdminUser, enabled: boolean) => {
    if (u.id === me?.id) {
      addToast('不能禁用自己', 'warning');
      return;
    }
    try {
      await adminApi.updateUser(u.id, { status: enabled ? 1 : 0 });
      addToast(enabled ? '已启用' : '已禁用', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const setRoleOf = async (u: AdminUser, role: AdminUserRole) => {
    if (u.role === 'super_admin' && !isSuperAdmin) {
      addToast('无权限操作超级管理员', 'warning');
      return;
    }
    if (role === 'super_admin' && !isSuperAdmin) {
      addToast('仅超级管理员可设置超级管理员', 'warning');
      return;
    }
    try {
      await adminApi.updateUser(u.id, { role });
      addToast('角色已更新', 'success');
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const roleLabel = (r: AdminUserRole) =>
    r === 'super_admin' ? '超级管理员' : r === 'admin' ? '管理员' : '普通用户';

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {/* 头部 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-lg md:text-xl font-bold flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
            <Users size={20} style={{ color: 'var(--color-primary)' }} /> 用户管理
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            管理平台全部用户、角色、状态
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="btn btn-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          {isSuperAdmin && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreate(true)}
            >
              <UserPlus size={14} /> 新建用户
            </button>
          )}
        </div>
      </div>

      {/* 搜索区 */}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') load();
            }}
            placeholder="搜索用户名 / 邮箱 / 简介"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{ minWidth: 140 }}
          >
            <option value="">全部状态</option>
            <option value="1">正常</option>
            <option value="0">已禁用</option>
          </select>
        </div>
      </div>

      {/* 表格 */}
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
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">
                用户
              </th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">
                邮箱
              </th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">
                角色
              </th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">
                状态
              </th>
              <th className="text-left font-medium px-3 py-2 whitespace-nowrap">
                最后活跃
              </th>
              <th className="text-right font-medium px-3 py-2 whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  暂无用户
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr
                  key={u.id}
                  style={{
                    borderTop: '1px solid var(--color-divider)',
                    color: 'var(--color-text)',
                  }}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        username={u.username}
                        avatar={u.avatar}
                        size={28}
                        online={u.online}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.username}</div>
                        <div
                          className="text-[11px] truncate max-w-[180px]"
                          style={{ color: 'var(--color-text-light)' }}
                        >
                          #{u.id} · {u.bio || '无简介'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                    {u.email}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
                      style={
                        u.status === 1
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
                      {u.status === 1 ? (
                        <>
                          <CheckCircle size={11} /> 正常
                        </>
                      ) : (
                        <>
                          <Ban size={11} /> 禁用
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs" style={{ color: 'var(--color-text-light)' }}>
                    {u.last_active_fmt || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="btn btn-sm"
                        onClick={() => setEditing(u)}
                        title="编辑"
                      >
                        <UserCog size={13} />
                      </button>
                      <button
                        className="btn btn-sm"
                        title={u.role === 'admin' ? '降为普通用户' : '设为管理员'}
                        disabled={u.role === 'super_admin' && !isSuperAdmin}
                        onClick={() =>
                          setRoleOf(u, u.role === 'admin' || u.role === 'super_admin' ? 'member' : 'admin')
                        }
                      >
                        {u.role === 'admin' || u.role === 'super_admin' ? (
                          <ShieldOff size={13} />
                        ) : (
                          <ShieldCheck size={13} style={{ color: 'var(--color-primary)' }} />
                        )}
                      </button>
                      {isSuperAdmin && (
                        <button
                          className="btn btn-sm"
                          title={u.role === 'super_admin' ? '取消超管' : '设为超管'}
                          onClick={() =>
                            setRoleOf(u, u.role === 'super_admin' ? 'admin' : 'super_admin')
                          }
                        >
                          <Crown
                            size={13}
                            style={{
                              color:
                                u.role === 'super_admin'
                                  ? 'var(--color-warning)'
                                  : 'var(--color-text-light)',
                            }}
                          />
                        </button>
                      )}
                      <button
                        className="btn btn-sm"
                        title={u.status === 1 ? '禁用' : '启用'}
                        disabled={u.id === me?.id || (u.role === 'super_admin' && !isSuperAdmin)}
                        onClick={() => setStatusOf(u, u.status !== 1)}
                      >
                        {u.status === 1 ? (
                          <Ban size={13} style={{ color: 'var(--color-error)' }} />
                        ) : (
                          <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
                        )}
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

      {/* 新建弹窗 */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {/* 编辑弹窗 */}
      {editing && (
        <EditUserModal
          user={editing}
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

function RoleBadge({ role }: { role: AdminUserRole }) {
  if (role === 'super_admin') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
        style={{
          background: 'var(--color-warning-bg)',
          color: 'var(--color-warning)',
          border: '1px solid var(--color-warning-light)',
        }}
      >
        <Crown size={11} /> 超级管理员
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
        style={{
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-primary)',
        }}
      >
        <ShieldCheck size={11} /> 管理员
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
      style={{
        background: 'var(--color-card-alt)',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border-light)',
      }}
    >
      普通用户
    </span>
  );
}

function CreateUserModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { addToast } = useApp();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<AdminUserRole>('member');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      addToast('用户名 3-20 位字母数字下划线', 'warning');
      return;
    }
    if (!email.includes('@')) {
      addToast('邮箱格式不正确', 'warning');
      return;
    }
    if (password.length < 6 || password.length > 32) {
      addToast('密码长度 6-32', 'warning');
      return;
    }
    setSaving(true);
    try {
      await adminApi.createUser({ username, email, password, role });
      addToast('用户已创建', 'success');
      onDone();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '创建失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="新建用户" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1.5">用户名</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="3-20 位字母数字下划线"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5">邮箱</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5">初始密码</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6-32 位"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5">角色</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminUserRole)}
          >
            <option value="member">普通用户</option>
            <option value="admin">管理员</option>
          </select>
        </div>
      </div>
      <ModalFooter onClose={onClose} onConfirm={submit} confirmText="创建" loading={saving} />
    </ModalShell>
  );
}

function EditUserModal({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const { addToast } = useApp();
  const { admin: me } = useAdminAuth();
  const isSuper = me?.role === 'super_admin';

  const [bio, setBio] = useState(user.bio || '');
  const [role, setRole] = useState<AdminUserRole>(user.role);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const payload: Partial<AdminUser> & { password?: string } = { bio, role };
      if (password) payload.password = password;
      await adminApi.updateUser(user.id, payload);
      addToast('已更新', 'success');
      onDone();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '更新失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`编辑用户 · ${user.username}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1.5">简介</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="用户简介（最多 255 字）"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5">角色</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminUserRole)}
            disabled={!isSuper && user.role === 'super_admin'}
          >
            <option value="member">普通用户</option>
            <option value="admin">管理员</option>
            {isSuper && <option value="super_admin">超级管理员</option>}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1.5">
            重置密码（留空表示不修改）
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6-32 位"
          />
        </div>
      </div>
      <ModalFooter onClose={onClose} onConfirm={submit} confirmText="保存" loading={saving} />
    </ModalShell>
  );
}

export function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md shadow-[var(--shadow-lg)]"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
            {title}
          </h3>
          <button className="p-1" onClick={onClose} style={{ color: 'var(--color-text-light)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function ModalFooter({
  onClose,
  onConfirm,
  confirmText = '确定',
  loading,
}: {
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  loading?: boolean;
}) {
  return (
    <div className="mt-5 flex items-center justify-end gap-2">
      <button className="btn" onClick={onClose}>
        取消
      </button>
      <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
        {loading ? <RefreshCw size={14} className="animate-spin" /> : null} {confirmText}
      </button>
    </div>
  );
}
