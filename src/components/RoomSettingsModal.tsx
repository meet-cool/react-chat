import { useEffect, useState } from 'react';
import {
  X,
  Save,
  Crown,
  Shield,
  ShieldOff,
  UserMinus,
  UserPlus,
  Check,
  Globe,
  Lock,
  ArrowRightLeft,
  Users,
  Settings,
} from 'lucide-react';
import type { ContactUser, Room, RoomMember } from '../types';
import { Avatar } from './Avatar';
import { useApp } from '../lib/AppContext';
import { contactApi, roomApi } from '../lib/api';

type Tab = 'info' | 'members' | 'invite';

interface RoomSettingsModalProps {
  open: boolean;
  room: Room | null;
  currentUserId: number;
  onClose: () => void;
  onRoomUpdated?: (room: Room) => void;
  onMembersChanged?: () => void;
}

export function RoomSettingsModal({
  open,
  room,
  currentUserId,
  onClose,
  onRoomUpdated,
  onMembersChanged,
}: RoomSettingsModalProps) {
  const { addToast } = useApp();
  const [tab, setTab] = useState<Tab>('info');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [savingInfo, setSavingInfo] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [friends, setFriends] = useState<ContactUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [inviteSelected, setInviteSelected] = useState<number[]>([]);
  const [inviting, setInviting] = useState(false);
  const [transferTarget, setTransferTarget] = useState<number | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  // 当前用户在房间的角色
  const isOwner = room?.owner_id === currentUserId;
  const myMember = members.find((m) => m.id === currentUserId);
  const isAdmin = isOwner || myMember?.role === 'admin';
  const isManager = isOwner || isAdmin;

  // 初始化表单
  useEffect(() => {
    if (open && room) {
      setName(room.name);
      setDescription(room.description);
      setType(room.type === 'private' ? 'private' : 'public');
      setTab('info');
      setTransferTarget(null);
      setShowTransferConfirm(false);
      setInviteSelected([]);
    }
  }, [open, room]);

  // 加载成员
  const loadMembers = async () => {
    if (!room) return;
    setMembersLoading(true);
    try {
      const list = await roomApi.members(room.id);
      setMembers(list);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载成员失败', 'error');
    } finally {
      setMembersLoading(false);
    }
  };

  // 加载好友（用于邀请）
  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const list = await contactApi.list('mutual');
      // 过滤掉已是房间成员的好友
      const memberIds = new Set(members.map((m) => m.id));
      setFriends(list.filter((f) => !memberIds.has(f.id)));
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载好友失败', 'error');
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    if (open && room) {
      loadMembers();
    }
  }, [open, room]);

  useEffect(() => {
    if (tab === 'invite' && room) {
      loadFriends();
    }
  }, [tab, room]);

  if (!open || !room) return null;

  // 保存房间信息
  const handleSaveInfo = async () => {
    if (!room) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      addToast('聊天室名称长度需为 2-50 个字符', 'warning');
      return;
    }
    if (description.length > 255) {
      addToast('聊天室简介最多 255 字符', 'warning');
      return;
    }
    setSavingInfo(true);
    try {
      const updated = await roomApi.update(room.id, {
        name: trimmedName,
        description,
        type,
      });
      addToast('房间信息已更新', 'success');
      onRoomUpdated?.(updated);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '更新失败', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  // 转让群主
  const handleTransfer = async () => {
    if (!room || transferTarget === null) return;
    setTransferring(true);
    try {
      await roomApi.transfer(room.id, transferTarget);
      addToast('群主已转让', 'success');
      setShowTransferConfirm(false);
      setTransferTarget(null);
      await loadMembers();
      onMembersChanged?.();
      // 转让后当前用户不再是群主，可能需要关闭弹窗
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '转让失败', 'error');
    } finally {
      setTransferring(false);
    }
  };

  // 设置/取消管理员
  const handleToggleAdmin = async (member: RoomMember) => {
    if (!room) return;
    const newIsAdmin = member.role !== 'admin';
    try {
      await roomApi.setAdmin(room.id, member.id, newIsAdmin);
      addToast(newIsAdmin ? `已将 ${member.username} 设为管理员` : `已取消 ${member.username} 的管理员`, 'success');
      await loadMembers();
      onMembersChanged?.();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  // 踢出成员
  const handleKick = async (member: RoomMember) => {
    if (!room) return;
    if (!confirm(`确定要踢出「${member.username}」吗？`)) return;
    try {
      await roomApi.kick(room.id, member.id);
      addToast(`已踢出 ${member.username}`, 'info');
      await loadMembers();
      onMembersChanged?.();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  // 邀请好友
  const handleInvite = async () => {
    if (!room || inviteSelected.length === 0) return;
    setInviting(true);
    try {
      const result = await roomApi.invite(room.id, inviteSelected);
      addToast(`已邀请 ${result.invited} 位好友加入`, 'success');
      setInviteSelected([]);
      await loadMembers();
      onMembersChanged?.();
      // 重新加载好友列表（过滤已加入的）
      const list = await contactApi.list('mutual');
      const memberIds = new Set(members.map((m) => m.id));
      // 加上刚邀请的成员
      inviteSelected.forEach((id) => memberIds.add(id));
      setFriends(list.filter((f) => !memberIds.has(f.id)));
    } catch (err) {
      addToast(err instanceof Error ? err.message : '邀请失败', 'error');
    } finally {
      setInviting(false);
    }
  };

  const toggleInvite = (id: number) => {
    setInviteSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // 按角色排序成员：群主 → 管理员 → 普通成员
  const sortedMembers = [...members].sort((a, b) => {
    const aOrder = a.is_owner ? 0 : a.role === 'admin' ? 1 : 2;
    const bOrder = b.is_owner ? 0 : b.role === 'admin' ? 1 : 2;
    return aOrder - bOrder;
  });

  const tabs: { k: Tab; label: string; icon: typeof Globe; show: boolean }[] = [
    { k: 'info', label: '房间信息', icon: Globe, show: true },
    { k: 'members', label: '成员管理', icon: Users, show: true },
    { k: 'invite', label: '邀请好友', icon: UserPlus, show: isManager },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[var(--shadow-lg)]"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Settings /> 房间设置
            <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>
              · {room.name}
            </span>
          </h3>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* 标签栏 */}
        <div
          className="flex border-b"
          style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}
        >
          {tabs
            .filter((t) => t.show)
            .map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors"
                  style={
                    isActive
                      ? {
                          color: 'var(--color-primary)',
                          borderBottom: '2px solid var(--color-primary)',
                          background: 'var(--color-card)',
                        }
                      : {
                          color: 'var(--color-text-light)',
                          borderBottom: '2px solid transparent',
                        }
                  }
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 房间信息 */}
          {tab === 'info' && (
            <div className="flex flex-col gap-4">
              {!isManager && (
                <div
                  className="px-3 py-2 text-xs"
                  style={{
                    background: 'var(--color-warning-bg)',
                    color: 'var(--color-warning)',
                    border: '1px solid var(--color-warning-light)',
                    borderLeft: '4px solid var(--color-warning)',
                  }}
                >
                  仅群主或管理员可修改房间信息
                </div>
              )}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  聊天室名称
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isManager}
                  placeholder="2-50 个字符"
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  聊天室简介
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isManager}
                  placeholder="简单描述一下这个聊天室"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  房间类型
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType('public')}
                    disabled={!isManager}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                    style={
                      type === 'public'
                        ? { background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }
                        : { background: 'var(--color-card-alt)', border: '1px solid var(--color-border-light)', color: 'var(--color-text-secondary)' }
                    }
                  >
                    <Globe size={14} />
                    <span>公开</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('private')}
                    disabled={!isManager}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                    style={
                      type === 'private'
                        ? { background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }
                        : { background: 'var(--color-card-alt)', border: '1px solid var(--color-border-light)', color: 'var(--color-text-secondary)' }
                    }
                  >
                    <Lock size={14} />
                    <span>私人</span>
                  </button>
                </div>
              </div>

              {/* 房间元信息 */}
              <div
                className="grid grid-cols-2 gap-3 p-3 text-xs"
                style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border-light)' }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>房间 ID：</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{room.id}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>成员数：</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{room.member_count}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>创建时间：</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{room.create_time_fmt}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>我的角色：</span>
                  <span style={{ color: isOwner ? 'var(--color-warning)' : isAdmin ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                    {isOwner ? '群主' : isAdmin ? '管理员' : '成员'}
                  </span>
                </div>
              </div>

              {isManager && (
                <div className="flex justify-end">
                  <button onClick={handleSaveInfo} disabled={savingInfo} className="btn btn-primary">
                    <Save size={14} /> {savingInfo ? '保存中…' : '保存修改'}
                  </button>
                </div>
              )}

              {/* 转让群主（仅群主可见） */}
              {isOwner && (
                <div
                  className="mt-4 p-4"
                  style={{
                    background: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning-light)',
                    borderLeft: '4px solid var(--color-warning)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRightLeft size={15} style={{ color: 'var(--color-warning)' }} />
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>
                      转让群主
                    </h4>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-light)' }}>
                    转让后你将变为管理员，新群主将拥有全部管理权限。此操作不可撤销。
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={transferTarget ?? ''}
                      onChange={(e) => setTransferTarget(e.target.value ? Number(e.target.value) : null)}
                      className="flex-1"
                      style={{ paddingRight: 30 }}
                    >
                      <option value="">选择新群主…</option>
                      {members
                        .filter((m) => m.id !== currentUserId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.username}
                            {m.role === 'admin' ? '（管理员）' : ''}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => setShowTransferConfirm(true)}
                      disabled={transferTarget === null}
                      className="btn btn-warning btn-sm"
                    >
                      <ArrowRightLeft size={14} /> 转让
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 成员管理 */}
          {tab === 'members' && (
            <div className="flex flex-col gap-2">
              {!isManager && (
                <div
                  className="px-3 py-2 text-xs mb-2"
                  style={{
                    background: 'var(--color-info-bg)',
                    color: 'var(--color-info)',
                    border: '1px solid var(--color-info-light)',
                    borderLeft: '4px solid var(--color-info)',
                  }}
                >
                  仅群主或管理员可管理成员
                </div>
              )}
              {membersLoading ? (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  加载中…
                </div>
              ) : sortedMembers.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  暂无成员
                </div>
              ) : (
                sortedMembers.map((m) => {
                  const mIsOwner = m.is_owner;
                  const mIsAdmin = m.role === 'admin';
                  const isMe = m.id === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                      style={{
                        background: 'var(--color-card-alt)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    >
                      <Avatar username={m.username} avatar={m.avatar} size={36} online={m.online} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                            {m.username}
                            {isMe && <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>(我)</span>}
                          </span>
                          {mIsOwner && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 flex items-center gap-0.5"
                              style={{
                                background: 'var(--color-warning-bg)',
                                color: 'var(--color-warning)',
                                border: '1px solid var(--color-warning-light)',
                              }}
                            >
                              <Crown size={10} /> 群主
                            </span>
                          )}
                          {!mIsOwner && mIsAdmin && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 flex items-center gap-0.5"
                              style={{
                                background: 'var(--color-primary-light)',
                                color: 'var(--color-primary)',
                                border: '1px solid var(--color-primary)',
                              }}
                            >
                              <Shield size={10} /> 管理员
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-light)' }}>
                          {m.bio || (m.online ? '在线' : '离线')}
                        </p>
                      </div>
                      {/* 操作按钮 */}
                      {isManager && !mIsOwner && !isMe && (
                        <div className="flex items-center gap-1">
                          {isOwner && (
                            <button
                              onClick={() => handleToggleAdmin(m)}
                              className="btn btn-sm"
                              title={mIsAdmin ? '取消管理员' : '设为管理员'}
                              style={
                                mIsAdmin
                                  ? { color: 'var(--color-text-light)' }
                                  : {
                                      background: 'var(--color-primary)',
                                      color: '#FFFFFF',
                                      borderColor: 'var(--color-primary)',
                                    }
                              }
                            >
                              {mIsAdmin ? <ShieldOff size={13} /> : <Shield size={13} />}
                            </button>
                          )}
                          <button
                            onClick={() => handleKick(m)}
                            className="btn btn-sm"
                            title="踢出房间"
                            style={{
                              background: 'var(--color-error-bg)',
                              color: 'var(--color-error)',
                              borderColor: 'var(--color-error-light)',
                            }}
                          >
                            <UserMinus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 邀请好友 */}
          {tab === 'invite' && isManager && (
            <div className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                仅可邀请与你互相关注的好友。已加入的成员不会显示。
              </p>
              {friendsLoading ? (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  加载好友列表…
                </div>
              ) : friends.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  暂无可邀请的好友
                  <br />
                  <span className="text-xs">前往通讯录添加好友</span>
                </div>
              ) : (
                <>
                  <div
                    className="max-h-80 overflow-y-auto"
                    style={{ border: '1px solid var(--color-border-light)', background: 'var(--color-card-alt)' }}
                  >
                    {friends.map((f) => {
                      const checked = inviteSelected.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleInvite(f.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                          style={
                            checked
                              ? { background: 'var(--color-primary-light)' }
                              : undefined
                          }
                          onMouseEnter={(e) => {
                            if (!checked) e.currentTarget.style.background = 'var(--color-hover-bg)';
                          }}
                          onMouseLeave={(e) => {
                            if (!checked) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Avatar username={f.username} avatar={f.avatar} size={32} online={f.online} />
                          <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text)' }}>
                            {f.username}
                          </span>
                          <span
                            className="w-5 h-5 flex items-center justify-center"
                            style={
                              checked
                                ? {
                                    background: 'var(--color-primary)',
                                    color: '#FFFFFF',
                                    border: '1px solid var(--color-primary)',
                                  }
                                : {
                                    background: 'transparent',
                                    border: '1px solid var(--color-border)',
                                  }
                            }
                          >
                            {checked && <Check size={12} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {inviteSelected.length > 0 ? `已选 ${inviteSelected.length} 人` : '点击好友选择'}
                    </span>
                    <button
                      onClick={handleInvite}
                      disabled={inviteSelected.length === 0 || inviting}
                      className="btn btn-primary"
                    >
                      <UserPlus size={14} /> {inviting ? '邀请中…' : `邀请${inviteSelected.length > 0 ? ` ${inviteSelected.length} 人` : ''}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 转让群主确认弹窗 */}
        {showTransferConfirm && transferTarget !== null && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowTransferConfirm(false)}
          >
            <div
              className="w-full max-w-sm p-5 shadow-[var(--shadow-lg)]"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                确认转让群主
              </h4>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-light)' }}>
                将群主转让给
                <span className="font-medium" style={{ color: 'var(--color-warning)' }}>
                  {' '}{members.find((m) => m.id === transferTarget)?.username}{' '}
                </span>
                后，你将变为管理员。此操作不可撤销，确定继续吗？
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowTransferConfirm(false)} className="btn">
                  取消
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={transferring}
                  className="btn btn-warning"
                >
                  {transferring ? '转让中…' : '确认转让'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
