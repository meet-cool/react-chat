import { useState } from 'react';
import { Hash } from 'lucide-react';
import type { Room } from '../types';
import type { Conversation } from '../types';
import { Avatar } from './Avatar';

interface RecentChatItem {
  type: 'room' | 'private';
  id: number;
  name: string;
  subtitle: string;
  lastTime: number;
  avatar?: string;
  unread?: number;
}

interface RecentChatsViewProps {
  rooms: Room[];
  conversations: Conversation[];
  activeRoomId: number | null;
  activeConvId: number | null;
  onSelectRoom: (room: Room) => void;
  onSelectConv: (conv: Conversation) => void;
  loading?: boolean;
}

export function RecentChatsView({
  rooms,
  conversations,
  activeRoomId,
  activeConvId,
  onSelectRoom,
  onSelectConv,
  loading,
}: RecentChatsViewProps) {
  const [keyword, setKeyword] = useState('');

  // 合并房间和私聊为最近聊天列表
  const items: RecentChatItem[] = (() => {
    const result: RecentChatItem[] = [];

    // 加入的聊天室
    for (const room of rooms) {
      if (!room.joined) continue;
      result.push({
        type: 'room',
        id: room.id,
        name: room.name,
        subtitle: `${room.member_count ?? 0} 成员`,
        lastTime: room.create_time,
      });
    }

    //私聊会话
    for (const conv of conversations) {
      result.push({
        type: 'private',
        id: conv.id,
        name: conv.other_username,
        subtitle: conv.last_message?.slice(0, 30) || '无消息',
        lastTime: conv.last_message_time ?? 0,
        avatar: conv.other_avatar,
        unread: conv.unread ?? 0,
      });
    }

    // 按最后活动时间排序
    result.sort((a, b) => b.lastTime - a.lastTime);
    return result;
  })();

  // 搜索过滤
  const filtered = keyword
    ? items.filter((item) =>
        item.name.toLowerCase().includes(keyword.toLowerCase())
      )
    : items;

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: 'var(--color-text-muted)' }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-card)' }}>
      {/* 搜索框 */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="relative">
          <Hash
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索聊天..."
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              fontSize: 13,
              background: 'var(--color-bg-page)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              borderRadius: '3px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p className="text-sm">无匹配结果</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isActive =
              (item.type === 'room' && item.id === activeRoomId) ||
              (item.type === 'private' && item.id === activeConvId);

            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  if (item.type === 'room') {
                    const room = rooms.find((r) => r.id === item.id);
                    if (room) onSelectRoom(room);
                  } else {
                    const conv = conversations.find((c) => c.id === item.id);
                    if (conv) onSelectConv(conv);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--color-hover-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {/* 头像/图标 */}
                {item.type === 'private' ? (
                  <Avatar username={item.name} avatar={item.avatar} size={40} />
                ) : (
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{ background: 'var(--color-primary-light)', borderRadius: '3px' }}
                  >
                    <Hash size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                )}

                {/* 内容 */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-medium truncate"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {item.name}
                    </span>
                    {item.type === 'private' && item.unread ? (
                      <span
                        className="text-xs px-1.5 py-0.5"
                        style={{
                          background: 'var(--color-primary)',
                          color: '#fff',
                          borderRadius: '3px',
                        }}
                      >
                        {item.unread}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {item.subtitle}
                  </p>
                </div>

                {/* 时间 */}
                {item.lastTime > 0 && (
                  <span
                    className="text-xs flex-shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {formatTime(item.lastTime)}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;

  return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}