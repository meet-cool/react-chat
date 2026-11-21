import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Reply as ReplyIcon } from 'lucide-react';
import type { ChatMessage, MessageReaction } from '../types';
import { renderBBCode } from '../lib/bbcode';
import { Avatar } from './Avatar';
import { UserActionMenu } from './UserActionMenu';
import { MessageActionMenu, useMessageActionTrigger } from './MessageActionMenu';

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  currentUserId: number;
  /** 外部触发「滚到底部」信号（每次自增即滚底，用于发送成功后强制贴底） */
  scrollSignal?: number;
  onMention?: (username: string) => void;
  onMessage?: (userId: number) => void;
  onViewProfile?: (username: string) => void;
  onReact?: (msgId: number, emoji: string) => void;
  onReply?: (msg: ChatMessage) => void;
  onForward?: (msg: ChatMessage) => void;
  onReport?: (msg: ChatMessage) => void;
  onRecall?: (msg: ChatMessage) => void;
  onBlock?: (userId: number, username: string) => void;
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

export function MessageList({ messages, loading, hasMore, onLoadMore, currentUserId, scrollSignal, onMention, onMessage, onViewProfile, onReact, onReply, onForward, onReport, onRecall, onBlock }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // 是否处于距底部 <160px 的近底状态（决定新消息是否自动滚底）
  const nearBottomRef = useRef(true);
  // 是否完成过「首次置底」。首次进入聊天室时列表高度尚未定型（消息气泡 + 图片后加载），
  // 若用 smooth 滚动，动画会被后续布局变化打断而停在中途 → 表现为「刚进入不在最底端」。
  // 首次加载改用 auto（瞬时置底），并挂 MutationObserver 在内容变高（图片加载完成）时重新贴底；
  // 一旦用户手动滚动离开底部，observer 与自动滚底一并停用，不再打断翻阅。
  const didInitialScrollRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [menu, setMenu] = useState<MenuState>({ open: false, anchor: null, user: { id: 0, username: '' } });
  const [actionMenu, setActionMenu] = useState<ActionMenuState>({ open: false, pos: null, msg: null });

  // 外部触发滚底（发送消息后）：瞬时滚到底部并恢复「近底」状态，
  // 这样后续新消息/图片后加载仍会保持贴底，不再因动画被打断而停在中间。
  useEffect(() => {
    if (scrollSignal === undefined) return;
    nearBottomRef.current = true;
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollSignal]);

  // 仅当用户停留在近底位置时才自动滚底，避免打断向上翻阅
  useEffect(() => {
    if (bottomRef.current && nearBottomRef.current) {
      // 首次加载：瞬时置底（不带动画，避免被打断）
      const behavior: ScrollBehavior = didInitialScrollRef.current ? 'smooth' : 'auto';
      bottomRef.current.scrollIntoView({ behavior });
      didInitialScrollRef.current = true;
    }
  }, [messages.length]);

  // 首次进入时：内容高度变化（图片后加载、消息渲染完成）且用户仍近底 → 保持贴底。
  // 用户一旦上翻（nearBottomRef 为 false），observer 不再触发滚动。
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const reposition = () => {
      if (nearBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      } else {
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(reposition);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceToBottom > 200);
    nearBottomRef.current = distanceToBottom < 160;
  };

  const scrollToBottom = () => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const grouped = groupByDate(messages);

  const handleAvatarClick = (e: React.MouseEvent, msg: ChatMessage) => {
    if (msg.user_id === currentUserId) return;
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    setMenu({ open: true, anchor: target.getBoundingClientRect(), user: { id: msg.user_id, username: msg.username, avatar: msg.avatar } });
  };

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
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
          <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-sm">还没有消息，发送第一条消息开始聊天吧</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: 'var(--color-divider)' }} />
                <span className="text-xs px-2" style={{ color: 'var(--color-text-muted)' }}>{group.date}</span>
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
                  onActionTrigger={(x, y) => setActionMenu({ open: true, pos: { x, y }, msg })}
                  onReact={onReact}
                  onRecall={onRecall}
                />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      {showScrollBtn && (
        <button onClick={scrollToBottom} className="absolute bottom-4 right-4 p-2 shadow-[var(--shadow-md)] btn-sm" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <ChevronDown size={18} />
        </button>
      )}
      <UserActionMenu open={menu.open} anchorRect={menu.anchor} user={menu.user} currentUserId={currentUserId} onClose={() => setMenu((m) => ({ ...m, open: false }))} onMention={onMention} onMessage={onMessage} onViewProfile={(username) => onViewProfile?.(username)} onBlock={onBlock} />
      <MessageActionMenu open={actionMenu.open} anchor={actionMenu.pos} isSelf={actionMenu.msg?.user_id === currentUserId} canDelete={false} onClose={() => setActionMenu((s) => ({ ...s, open: false }))} onReact={(emoji) => { if (actionMenu.msg && onReact) onReact(actionMenu.msg.id, emoji); }} onReply={() => { if (actionMenu.msg && onReply) onReply(actionMenu.msg); }} onForward={() => { if (actionMenu.msg && onForward) onForward(actionMenu.msg); }} onReport={() => { if (actionMenu.msg && onReport) onReport(actionMenu.msg); }} onCopy={() => { if (actionMenu.msg) navigator.clipboard?.writeText(actionMenu.msg.content).catch(() => {}); }} 
        canRecall={!!actionMenu.msg && actionMenu.msg.is_self && !actionMenu.msg.is_recalled && (Date.now() - actionMenu.msg.create_time * 1000) < 120000}
        recallRemaining={actionMenu.msg ? Math.max(0, 120 - Math.floor(Date.now() / 1000 - actionMenu.msg.create_time)) : 0}
        onRecall={() => { if (actionMenu.msg && onRecall) onRecall(actionMenu.msg); }} />
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

function MessageBubble({ msg, showAvatar, isSelf, currentUserId, onAvatarClick, onActionTrigger, onReact, onRecall }: MessageBubbleProps & { onRecall?: (msg: ChatMessage) => void }) {
  // 富文本消息：BBCode 渲染（旧 markdown 类型消息按 BBCode 兼容展示）
  const isRich = msg.type === 'bbcode' || msg.type === 'markdown';
  const richHtml = isRich ? renderBBCode(msg.content) : '';
  const time = msg.create_time_fmt.split(' ')[1] || '';
  const trigger = useMessageActionTrigger(onActionTrigger);

  const handleReactionClick = (emoji: string) => { if (onReact) onReact(msg.id, emoji); };

  return (
    <div className={`flex gap-2 mb-3 ${isSelf ? 'flex-row-reverse' : ''}`} onTouchStart={trigger.onTouchStart} onTouchEnd={trigger.onTouchEnd} onTouchMove={trigger.onTouchMove} onContextMenu={trigger.onContextMenu}>
      <div className="w-9 flex-shrink-0">
        {showAvatar && (
          <button onClick={(e) => { if (trigger.isLongPress()) { e.preventDefault(); return; } onAvatarClick(e); }} className="cursor-pointer" style={{ background: 'transparent', border: 'none', padding: 0 }} title={`@${msg.username}`}>
            <Avatar username={msg.username} avatar={msg.avatar} size={36} />
          </button>
        )}
      </div>
      <div className={`flex flex-col max-w-[70%] ${isSelf ? 'items-end' : 'items-start'}`}>
        {showAvatar && (
          <div className={`flex items-center gap-2 mb-1 ${isSelf ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{isSelf ? '我' : msg.username}</span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{time}</span>
          </div>
        )}
        {msg.reply && (
          <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-xs max-w-full rounded-sm" style={{ background: 'var(--color-card-alt)', borderLeft: '3px solid var(--color-primary)', color: 'var(--color-text-secondary)' }}>
            <ReplyIcon size={11} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span className="font-medium" style={{ color: 'var(--color-primary)' }}>{msg.reply.username}:</span>
            <span className="truncate">{msg.reply.content_short}</span>
          </div>
        )}
        {msg.is_recalled ? (
          <div className="px-3 py-1.5 text-xs rounded-sm" style={{ background: 'var(--color-card-alt)', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border-light)', fontStyle: 'italic' }}>
            {isSelf ? '你' : msg.username}撤回了一条消息
          </div>
        ) : msg.type === 'pat' ? (
          <div className="px-3 py-1.5 text-xs" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            👋 {isSelf ? '你' : msg.username}拍了拍{isSelf ? '对方' : '你'}
          </div>
        ) : msg.type === 'dice' ? (
          <div className="px-3 py-1.5 flex items-center justify-center rounded" style={{ background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-card-alt) 100%)', border: '1px solid var(--color-border)', margin: '4px 0' }}>
            <span className="text-2xl mr-2">🎲</span>
            <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>{msg.content || '?'}</span>
            <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>点</span>
          </div>
        ) : (
          <div className="px-3 py-2 text-sm rounded-sm" style={isSelf ? { background: 'var(--color-primary)', color: '#FFFFFF' } : { background: 'var(--color-card-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border-light)' }}>
            {isRich ? (
              <div className="bbcode-body break-words" dangerouslySetInnerHTML={{ __html: richHtml }} />
            ) : (
              <span className="break-words whitespace-pre-wrap">{msg.content}</span>
            )}
          </div>
        )}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
            {msg.reactions.map((r) => (
              <ReactionBadge key={r.emoji} reaction={r} isSelf={r.users.includes(currentUserId)} onClick={() => handleReactionClick(r.emoji)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReactionBadge({ reaction, isSelf, onClick }: { reaction: MessageReaction; isSelf: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs transition-colors" style={isSelf ? { background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' } : { background: 'var(--color-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)' }}>
      <span>{reaction.emoji}</span>
      <span className="font-medium">{reaction.count}</span>
    </button>
  );
}

function groupByDate(messages: ChatMessage[]): { date: string; items: ChatMessage[] }[] {
  const groups: Record<string, ChatMessage[]> = {};
  for (const msg of messages) {
    const date = msg.create_time_fmt.split(' ')[0] || '';
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

function shouldShowAvatar(items: ChatMessage[], idx: number): boolean {
  if (idx === 0) return true;
  const prev = items[idx - 1];
  const curr = items[idx];
  return prev.user_id !== curr.user_id;
}
