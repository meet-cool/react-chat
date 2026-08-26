import { useCallback, useEffect, useState } from 'react';
import { X, UserCheck, UserX, MicOff, Mic, UserMinus, Crown, ShieldCheck, Megaphone, Loader2 } from 'lucide-react';
import type { GroupInfo, GroupMember, GroupRequest } from '../types';
import { groupApi } from '../lib/api';
import { HashAvatar } from './HashAvatar';

interface GroupSettingsModalProps {
  open: boolean;
  group: GroupInfo | null;
  myRole: string;
  onClose: () => void;
  onGroupUpdated: () => void;
  onDissolved: () => void;
  onError?: (msg: string) => void;
}

type Tab = 'requests' | 'members' | 'settings';

/**
 * 群聊管理弹窗（严格管理）
 * - 申请审批（owner/admin）：通过 / 拒绝入群申请
 * - 成员管理（owner/admin）：禁言 / 解禁 / 移除普通成员；群主可转让
 * - 群设置：公告（owner/admin）；解散（仅 owner）
 */
export function GroupSettingsModal({ open, group, myRole, onClose, onGroupUpdated, onDissolved, onError }: GroupSettingsModalProps) {
  const [tab, setTab] = useState<Tab>('requests');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [requests, setRequests] = useState<GroupRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [confirmDissolve, setConfirmDissolve] = useState(false);

  const isAdmin = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';

  const load = useCallback(async () => {
    if (!group) return;
    setLoading(true);
    try {
      if (isAdmin) {
        const [m, r] = await Promise.all([groupApi.members(group.id), groupApi.requests(group.id)]);
        setMembers(m);
        setRequests(r);
        setAnnouncement(group.announcement || '');
      } else {
        setMembers(await groupApi.members(group.id));
      }
    } catch (e: any) {
      onError?.(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [group, isAdmin, onError]);

  useEffect(() => {
    if (open) {
      setTab(isAdmin ? 'requests' : 'members');
      setConfirmDissolve(false);
      load();
    }
  }, [open, isAdmin, load]);

  if (!open || !group) return null;

  const run = async (fn: () => Promise<unknown>, okMsg?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (okMsg) onError?.(okMsg);
      await load();
      onGroupUpdated();
    } catch (e: any) {
      onError?.(e.message || '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const roleBadge = (role: string) => {
    if (role === 'owner') return <span className="text-[10px] px-1 py-0.5 flex-shrink-0" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>群主</span>;
    if (role === 'admin') return <span className="text-[10px] px-1 py-0.5 flex-shrink-0" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>管理</span>;
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md flex flex-col max-h-[85vh]"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <HashAvatar seed={group.avatar_seed} size={36} />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{group.name}</h3>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{group.member_count}/{group.max_members} 人 · 严格管理模式</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm p-2" style={{ minHeight: 30, minWidth: 30 }}><X size={15} /></button>
        </div>

        {/* Tab（仅管理可见审批） */}
        {isAdmin ? (
          <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--color-divider)' }}>
            {([
              ['requests', `入群申请 ${requests.length > 0 ? `(${requests.length})` : ''}`, UserCheck],
              ['members', '成员管理', ShieldCheck],
              ['settings', '群设置', Megaphone],
            ] as const).map(([k, label, Icon]) => (
              <button
                key={k}
                onClick={() => setTab(k as Tab)}
                className="flex-1 py-2 text-xs flex items-center justify-center gap-1 transition-colors"
                style={tab === k
                  ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }
                  : { color: 'var(--color-text-muted)' }}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--color-divider)' }}>
            <div className="flex-1 py-2 text-xs text-center flex items-center justify-center gap-1" style={{ color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }}>
              <ShieldCheck size={12} /> 成员列表
            </div>
          </div>
        )}

        {/* 内容 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : tab === 'requests' && isAdmin ? (
            requests.length === 0 ? (
              <div className="py-10 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>暂无待审批申请</div>
            ) : requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--color-divider)' }}>
                <HashAvatar seed={`user:${r.user_id}:${r.username}`} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{r.username}</div>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{r.message || '申请加入群聊'}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button className="btn btn-sm" disabled={busy} onClick={() => run(() => groupApi.review(group.id, r.id, 'approve'), '已通过')} title="通过" style={{ minHeight: 30, color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                    <UserCheck size={13} />
                  </button>
                  <button className="btn btn-sm" disabled={busy} onClick={() => run(() => groupApi.review(group.id, r.id, 'reject'), '已拒绝')} title="拒绝" style={{ minHeight: 30, color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
                    <UserX size={13} />
                  </button>
                </div>
              </div>
            ))
          ) : tab === 'settings' && isAdmin ? (
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>群公告</label>
                <textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="设置群公告，全体成员可见"
                  className="w-full resize-none text-sm"
                />
                <button
                  className="btn btn-sm btn-primary mt-2"
                  disabled={busy}
                  onClick={() => run(() => groupApi.setAnnouncement(group.id, announcement), '公告已更新')}
                >
                  保存公告
                </button>
              </div>

              {isOwner && (
                <div className="pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
                  <label className="text-xs block mb-2" style={{ color: 'var(--color-error)' }}>危险操作</label>
                  {!confirmDissolve ? (
                    <button className="btn btn-sm" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => setConfirmDissolve(true)}>
                      解散群聊
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>确认解散？不可恢复</span>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--color-error)', color: '#fff', borderColor: 'var(--color-error)' }}
                        disabled={busy}
                        onClick={() => run(async () => { await groupApi.dissolve(group.id); onDissolved(); }, '群聊已解散')}
                      >
                        确认解散
                      </button>
                      <button className="btn btn-sm" onClick={() => setConfirmDissolve(false)}>取消</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* 成员列表 */
            members.map((m) => {
              const isSelf = false;
              const canOperate = isAdmin && m.role === 'member';
              return (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-divider)' }}>
                  <div className="relative">
                    <HashAvatar seed={`user:${m.user_id}:${m.username}`} size={36} />
                    {m.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-success)', border: '1px solid var(--color-card)' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{m.username}</span>
                      {roleBadge(m.role)}
                      {m.muted && (
                        <span className="text-[10px] px-1 py-0.5" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>禁言中</span>
                      )}
                    </div>
                  </div>
                  {canOperate && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        className="btn btn-sm p-2"
                        disabled={busy}
                        title={m.muted ? '解除禁言' : '禁言'}
                        onClick={() => run(() => groupApi.mute(group.id, m.user_id, !m.muted), m.muted ? '已解除禁言' : '已禁言')}
                        style={{ minHeight: 28, minWidth: 28, color: m.muted ? 'var(--color-success)' : 'var(--color-warning)' }}
                      >
                        {m.muted ? <Mic size={12} /> : <MicOff size={12} />}
                      </button>
                      <button
                        className="btn btn-sm p-2"
                        disabled={busy}
                        title="移出群聊"
                        onClick={() => run(() => groupApi.kick(group.id, m.user_id), '已移出群聊')}
                        style={{ minHeight: 28, minWidth: 28, color: 'var(--color-error)' }}
                      >
                        <UserMinus size={12} />
                      </button>
                    </div>
                  )}
                  {isOwner && m.role === 'admin' && (
                    <button
                      className="btn btn-sm p-2 flex-shrink-0"
                      disabled={busy}
                      title="转让群主"
                      onClick={() => run(() => groupApi.transfer(group.id, m.user_id), '群主已转让')}
                      style={{ minHeight: 28, minWidth: 28, color: 'var(--color-warning)' }}
                    >
                      <Crown size={12} />
                    </button>
                  )}
                  {isSelf && null}
                </div>
              );
            })
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-4 py-2 border-t flex items-center gap-1.5 text-[11px] flex-shrink-0" style={{ borderColor: 'var(--color-divider)', color: 'var(--color-text-muted)' }}>
          <ShieldCheck size={11} />
          严格管理：入群需审批 · 管理员可禁言/移除普通成员 · 仅群主可解散/转让
        </div>
      </div>
    </div>
  );
}
