import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, Loader2, Reply as ReplyIcon } from 'lucide-react';
import type { ChatMessage, MessageReaction } from '../types';
import { Avatar } from './Avatar';
import { UserActionMenu } from './UserActionMenu';
import {
  MessageActionMenu,
  useMessageActionTrigger,
} from './MessageActionMenu';

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  currentUserId: number;
  onMention?: (username: string) => void;
  onMessage?: (userId: number) => void;
  onViewProfile?: (username: string) => void;
  onReact?: (msgId: number, emoji: string) => void;
  onReply?: (msg: ChatMessage) => void;
  onForward?: (msg: ChatMessage) => void;
  onReport?: (msg: ChatMessage) => void;
}

interface MenuState {
  open: boolean;
  anchor: DOMRect | null;
  user: { id: number; username: string; avatar?: string };
}

interface ActionMenuState {
  open: boolean;
  pos: { x: number; y: number } | null;
  msg: ChatMessage | null;
}

export function MessageList({
  messages,
  loading,
  hasMore,
  onLoadMore,
  currentUserId,
  onMention,
  onMessage,
  onReact,
  onReply,
  onForward,
  onReport,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [menu, setMenu] = useState<MenuState>({
    open: false,
    anchor: null,
    user: { id: 0, username: '' },
  });
  const [actionMenu, setActionMenu] = useState<ActionMenuState>({
    open: false,
    pos: null,
    msg: null,
  });

  // 新消息到达时自动滚动到底部
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // 滚动监听
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceToBottom > 200);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 按日期分组
  const grouped = groupByDate(messages);

  const handleAvatarClick = (e: React.MouseEvent, msg: ChatMessage) => {
    if (msg.user_id === currentUserId) return;
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    setMenu({
      open: true,
      anchor: target.getBoundingClientRect(),
      user: { id: msg.user_id, username: msg.username, avatar: msg.avatar },
    });
  };

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col">
      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <button onClick={onLoadMore} disabled={loading} className="btn btn-sm">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
            加载更多消息
          </button>
        </div>
      )}

      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !loading ? (
          <div
            className="flex flex-col items-center justify-center h-full text-center"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p className="text-sm">还没有消息，发送第一条消息开始聊天吧</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              {/* 日期分隔线 */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: 'var(--color-divider)' }} />
                <span className="text-xs px-2" style={{ color: 'var(--color-text-muted)' }}>
                  {group.date}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--color-divider)' }} />
              </div>
              {group.items.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  showAvatar={shouldShowAvatar(group.items, idx)}
                  isSelf={msg.user_id === currentUserId}
                  currentUserId={currentUserId}
                  onAvatarClick={(e) => handleAvatarClick(e, msg)}
                  onActionTrigger={(x, y) =>
                    setActionMenu({ open: true, pos: { x, y }, msg })
                  }
                  onReact={onReact}
                />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 滚动到底部按钮 */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2 shadow-[var(--shadow-md)] btn-sm"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* 用户操作菜单 */}
      <UserActionMenu
        open={menu.open}
        anchorRect={menu.anchor}
        user={menu.user}
        currentUserId={currentUserId}
        onClose={() => setMenu((m) => ({ ...m, open: false }))}
        onMention={onMention}
        onMessage={onMessage}
        onViewProfile={(username) => onViewProfile?.(username)}
      />

      {/* 消息操作菜单 */}
      <MessageActionMenu
        open={actionMenu.open}
        anchor={actionMenu.pos}
        isSelf={actionMenu.msg?.user_id === currentUserId}
        canDelete={false}
        onClose={() => setActionMenu((s) => ({ ...s, open: false }))}
        onReact={(emoji) => {
          if (actionMenu.msg && onReact) onReact(actionMenu.msg.id, emoji);
        }}
        onReply={() => {
          if (actionMenu.msg && onReply) onReply(actionMenu.msg);
        }}
        onForward={() => {
          if (actionMenu.msg && onForward) onForward(actionMenu.msg);
        }}
        onReport={() => {
          if (actionMenu.msg && onReport) onReport(actionMenu.msg);
        }}
        onCopy={() => {
          if (actionMenu.msg) {
            navigator.clipboard?.writeText(actionMenu.msg.content).catch(() => {});
          }
        }}
      />
    </div>
  );
}

interface MessageBubbleProps {
  msg: ChatMessage;
  showAvatar: boolean;
  isSelf: boolean;
  currentUserId: number;
  onAvatarClick: (e: React.MouseEvent) => void;
  onActionTrigger: (x: number, y: number) => void;
  onReact?: (msgId: number, emoji: string) => void;
}

function MessageBubble({
  msg,
  showAvatar,
  isSelf,
  currentUserId,
  onAvatarClick,
  onActionTrigger,
  onReact,
}: MessageBubbleProps) {
  const isMarkdown = msg.type === 'markdown';
  const time = msg.create_time_fmt.split(' ')[1] || '';
  const trigger = useMessageActionTrigger(onActionTrigger);

  const handleReactionClick = (emoji: string) => {
    if (onReact) onReact(msg.id, emoji);
  };

  return (
    <div
      className={`flex gap-2 mb-3 ${isSelf ? 'flex-row-reverse' : ''}`}
      onTouchStart={trigger.onTouchStart}
      onTouchEnd={trigger.onTouchEnd}
      onTouchMove={trigger.onTouchMove}
      onContextMenu={trigger.onContextMenu}
    >
      <div className="w-9 flex-shrink-0">
        {showAvatar && (
          <button
            onClick={(e) => {
              // 长按触发过则不响应点击
              if (trigger.isLongPress()) {
                e.preventDefault();
                return;
              }
              onAvatarClick(e);
            }}
            className="cursor-pointer"
            style={{ background: 'transparent', border: 'none', padding: 0 }}
            title={`@${msg.username}`}
          >
            <Avatar username={msg.username} avatar={msg.avatar} size={36} />
          </button>
        )}
      </div>
      <div className={`flex flex-col max-w-[70%] ${isSelf ? 'items-end' : 'items-start'}`}>
        {showAvatar && (
          <div className={`flex items-center gap-2 mb-1 ${isSelf ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {isSelf ? '我' : msg.username}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {time}
            </span>
          </div>
        )}

        {/* 引用预览 */}
        {msg.reply && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 mb-1 text-xs max-w-full"
            style={{
              background: 'var(--color-card-alt)',
              borderLeft: '3px solid var(--color-primary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <ReplyIcon size={11} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
              {msg.reply.username}:
            </span>
            <span className="truncate">{msg.reply.content_short}</span>
          </div>
        )}

        <div
          className="px-3 py-2 text-sm"
          style={
            isSelf
              ? { background: 'var(--color-primary)', color: '#FFFFFF' }
              : {
                  background: 'var(--color-card-alt)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-light)',
                }
          }
        >
          {isMarkdown ? (
            <div className="markdown-body break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          ) : (
            <span className="break-words whitespace-pre-wrap">{msg.content}</span>
          )}
        </div>

        {/* 反应列表 */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
            {msg.reactions.map((r) => (
              <ReactionBadge
                key={r.emoji}
                reaction={r}
                isSelf={r.users.includes(currentUserId)}
                onClick={() => handleReactionClick(r.emoji)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReactionBadge({
  reaction,
  isSelf,
  onClick,
}: {
  reaction: MessageReaction;
  isSelf: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs transition-colors"
      style={
        isSelf
          ? {
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
            }
          : {
              background: 'var(--color-card)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-light)',
            }
      }
    >
      <span>{reaction.emoji}</span>
      <span className="font-medium">{reaction.count}</span>
    </button>
  );
}

/** 按日期分组 */
function groupByDate(messages: ChatMessage[]): { date: string; items: ChatMessage[] }[] {
  const groups: Record<string, ChatMessage[]> = {};
  for (const msg of messages) {
    const date = msg.create_time_fmt.split(' ')[0] || '';
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

/** 是否显示头像（同一人连续消息只在第一条显示） */
function shouldShowAvatar(items: ChatMessage[], idx: number): boolean {
  if (idx === 0) return true;
  const prev = items[idx - 1];
  const curr = items[idx];
  return prev.user_id !== curr.user_id;
}
