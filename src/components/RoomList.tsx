import { useEffect, useState } from 'react';
import { Hash, Plus, Search, Users, LogOut, X, Lock, Globe, Check, Settings } from 'lucide-react';
import type { ContactUser, Room } from '../types';
import { Avatar } from './Avatar';
import { useApp } from '../lib/AppContext';
import { contactApi } from '../lib/api';

interface RoomListProps {
  rooms: Room[];
  activeRoomId: number | null;
  onSelect: (room: Room) => void;
  onCreate: () => void;
  loading?: boolean;
  onOpenSettings?: () => void;
}

export function RoomList({ rooms, activeRoomId, onSelect, onCreate, loading, onOpenSettings }: RoomListProps) {
  const [keyword, setKeyword] = useState('');

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(keyword.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-card)' }}>
      {/* 头部 */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Hash size={18} /> 聊天室
          </h2>
          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="btn btn-sm"
                title="房间设置"
                disabled={activeRoomId === null}
              >
                <Settings size={14} />
              </button>
            )}
            <button
              onClick={onCreate}
              className="btn btn-sm btn-primary"
              title="创建聊天室"
            >
              <Plus size={14} /> 新建
            </button>
          </div>
        </div>
        {/* 搜索框 */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索聊天室"
            style={{ paddingLeft: 32 }}
          />
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 房间列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            暂无聊天室
          </div>
        ) : (
          filtered.map((room) => {
            const isActive = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                onClick={() => onSelect(room)}
                className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                style={
                  isActive
                    ? { background: 'var(--color-primary-light)', borderLeft: '3px solid var(--color-primary)' }
                    : { borderLeft: '3px solid transparent' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--color-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Avatar username={room.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {room.type === 'private' ? (
                      <Lock size={12} style={{ color: 'var(--color-warning)' }} />
                    ) : null}
                    <span className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                      {room.name}
                    </span>
                    {room.joined && (
                      <span
                        className="text-[10px] px-1.5 py-0.5"
                        style={{
                          background: 'var(--color-success-bg)',
                          color: 'var(--color-success)',
                          border: '1px solid var(--color-success-light)',
                        }}
                      >
                        已加入
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-light)' }}>
                    {room.description || '暂无简介'}
                  </p>
                  <div className="flex items-center gap-1 mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Users size={11} />
                    <span className="text-[11px]">{room.member_count} 人</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/** 创建房间弹窗（含好友选择） */
interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string; description: string; type: string; invite_user_ids: number[] }) => void;
}

export function CreateRoomModal({ open, onClose, onConfirm }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('public');
  const [friends, setFriends] = useState<ContactUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const { addToast } = useApp();

  // 打开时加载互相关注好友列表
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFriendsLoading(true);
    contactApi
      .list('mutual')
      .then((list) => {
        if (!cancelled) setFriends(list);
      })
      .catch(() => {
        if (!cancelled) addToast('加载好友列表失败', 'error');
      })
      .finally(() => {
        if (!cancelled) setFriendsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, addToast]);

  // 关闭时重置状态
  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setType('public');
      setSelectedIds([]);
      setFriends([]);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      addToast('聊天室名称长度需为 2-50 个字符', 'warning');
      return;
    }
    if (description.length > 255) {
      addToast('聊天室简介最多 255 字符', 'warning');
      return;
    }
    onConfirm({
      name: trimmedName,
      description: description.trim(),
      type,
      invite_user_ids: selectedIds,
    });
  };

  const toggleFriend = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-[var(--shadow-lg)]"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            创建聊天室
          </h3>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              聊天室名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="2-50个字符"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              聊天室简介
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {type === 'private' ? '私人房间仅成员可见，需主动加入' : '公开房间所有人可见'}
            </p>
          </div>

          {/* 好友邀请 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                邀请好友（可选）
              </label>
              {selectedIds.length > 0 && (
                <span className="text-xs" style={{ color: 'var(--color-primary)' }}>
                  已选 {selectedIds.length} 人
                </span>
              )}
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              仅可邀请互相关注的好友
            </p>
            <div
              className="max-h-48 overflow-y-auto"
              style={{ border: '1px solid var(--color-border-light)', background: 'var(--color-card-alt)' }}
            >
              {friendsLoading ? (
                <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  加载好友列表…
                </div>
              ) : friends.length === 0 ? (
                <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  暂无互相关注好友
                  <br />
                  前往通讯录添加好友
                </div>
              ) : (
                friends.map((f) => {
                  const checked = selectedIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFriend(f.id)}
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
                      <Avatar username={f.username} avatar={f.avatar} size={28} online={f.online} />
                      <span
                        className="flex-1 text-sm truncate"
                        style={{ color: 'var(--color-text)' }}
                      >
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
                })
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-2">
            <button type="button" onClick={onClose} className="btn">
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> 创建
              {selectedIds.length > 0 && `（邀请 ${selectedIds.length} 人）`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** 退出房间确认 */
export function LeaveRoomButton({ onLeave }: { onLeave: () => void }) {
  return (
    <button onClick={onLeave} className="btn btn-sm btn-outline" title="退出房间">
      <LogOut size={14} /> 退出
    </button>
  );
}
