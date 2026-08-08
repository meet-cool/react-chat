import { useState } from 'react';
import { Forward, Search, X, Loader2, Check } from 'lucide-react';
import type { Room, Conversation } from '../types';
import { Avatar } from './Avatar';

interface ForwardDialogProps {
  open: boolean;
  rooms: Room[];
  conversations: Conversation[];
  onClose: () => void;
  onForward: (target: { type: 'room' | 'private'; id: number; name: string }) => void;
  forwarding?: boolean;
}

export function ForwardDialog({
  open,
  rooms,
  conversations,
  onClose,
  onForward,
  forwarding,
}: ForwardDialogProps) {
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<{
    type: 'room' | 'private';
    id: number;
    name: string;
  } | null>(null);

  if (!open) return null;

  const kw = keyword.trim().toLowerCase();
  const filteredRooms = rooms.filter(
    (r) => !kw || r.name.toLowerCase().includes(kw),
  );
  const filteredConvs = conversations.filter(
    (c) => !kw || c.other_username.toLowerCase().includes(kw),
  );

  const handleConfirm = () => {
    if (!selected) return;
    onForward(selected);
  };

  const Row = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
      style={{
        border: active
          ? '1px solid var(--color-primary)'
          : '1px solid transparent',
        background: active ? 'var(--color-primary-light)' : 'transparent',
        color: 'var(--color-text)',
      }}
      onMouseEnter={(el) => {
        if (!active) el.currentTarget.style.background = 'var(--color-hover-bg)';
      }}
      onMouseLeave={(el) => {
        if (!active) el.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md flex flex-col shadow-[var(--shadow-lg)] max-h-[80vh]"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2">
            <Forward size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              转发消息到
            </h3>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--color-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* 搜索 */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索聊天室或私聊会话"
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredConvs.length > 0 && (
            <>
              <div
                className="text-xs px-2 py-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                私聊会话
              </div>
              {filteredConvs.map((c) => (
                <Row
                  key={`conv-${c.id}`}
                  active={
                    selected?.type === 'private' && selected?.id === c.id
                  }
                  onClick={() =>
                    setSelected({ type: 'private', id: c.id, name: c.other_username })
                  }
                >
                  <Avatar
                    username={c.other_username}
                    avatar={c.other_avatar}
                    size={28}
                    online={c.other_online}
                  />
                  <span className="flex-1 truncate">{c.other_username}</span>
                  {selected?.type === 'private' && selected?.id === c.id && (
                    <Check size={14} style={{ color: 'var(--color-primary)' }} />
                  )}
                </Row>
              ))}
            </>
          )}

          {filteredRooms.length > 0 && (
            <>
              <div
                className="text-xs px-2 py-1.5 mt-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                聊天室
              </div>
              {filteredRooms.map((r) => (
                <Row
                  key={`room-${r.id}`}
                  active={selected?.type === 'room' && selected?.id === r.id}
                  onClick={() =>
                    setSelected({ type: 'room', id: r.id, name: r.name })
                  }
                >
                  <div
                    className="w-7 h-7 flex items-center justify-center text-xs flex-shrink-0"
                    style={{
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary)',
                    }}
                  >
                    #{r.name.charAt(0)}
                  </div>
                  <span className="flex-1 truncate">{r.name}</span>
                  {selected?.type === 'room' && selected?.id === r.id && (
                    <Check size={14} style={{ color: 'var(--color-primary)' }} />
                  )}
                </Row>
              ))}
            </>
          )}

          {filteredConvs.length === 0 && filteredRooms.length === 0 && (
            <div
              className="py-10 text-center text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              没有找到可转发的目标
            </div>
          )}
        </div>

        {/* 底部 */}
        <div
          className="px-4 py-3 border-t flex items-center justify-end gap-2"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            disabled={!selected || forwarding}
            onClick={handleConfirm}
          >
            {forwarding ? (
              <>
                <Loader2 size={14} className="animate-spin" /> 转发中…
              </>
            ) : (
              <>
                <Forward size={14} /> 转发
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
