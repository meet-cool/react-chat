import { useRef, useState } from 'react';
import { Hash, Users, LogOut, PanelRightClose, PanelRightOpen, Search, X, ChevronLeft } from 'lucide-react';
import type { Room, RoomMember, ChatMessage } from '../types';
import { socialApi, type SearchResultItem } from '../lib/api';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { MemberList } from './MemberList';
import { HashAvatar } from './HashAvatar';
import { Avatar } from './Avatar';

interface RoomChatViewProps {
  activeRoom: Room;
  messages: ChatMessage[];
  messagesLoading: boolean;
  hasMore: boolean;
  members: RoomMember[];
  membersLoading: boolean;
  sending: boolean;
  rightCollapsed: boolean;
  mobileSidebar: string | null;
  replyTo: ChatMessage | null;
  forwardMsg: ChatMessage | null;
  reportMsg: ChatMessage | null;
  forwarding: boolean;
  reporting: boolean;
  currentUserId: number;
  insertTextRef: React.RefObject<((text: string) => void) | null>;
  onToggleRight: () => void;
  onMobileMembers: () => void;
  onLeaveRoom: () => void;
  onLoadMore: () => void;
  onSend: (content: string, type: string) => void;
  onMention: (username: string) => void;
  onReact: (msgId: number, emoji: string) => void;
  onReply: (msg: ChatMessage) => void;
  onForward: (msg: ChatMessage) => void;
  onReport: (msg: ChatMessage) => void;
  onRecall?: (msg: ChatMessage) => void;
  onDice?: () => void;
  onBlock?: (userId: number, username: string) => void;
  onCancelReply: () => void;
  onConfirmForward: (target: { type: 'room' | 'private'; id: number; name: string }) => void;
  onConfirmReport: (reason: string) => void;
  onViewProfile: (username: string) => void;
  onOpenMemberProfile: (username: string) => void;
}

export function RoomChatView({
  activeRoom, messages, messagesLoading, hasMore, members, membersLoading, sending,
  rightCollapsed, mobileSidebar, replyTo, forwardMsg, reportMsg, forwarding, reporting,
  currentUserId, insertTextRef, onToggleRight, onMobileMembers, onLeaveRoom, onLoadMore,
  onSend, onMention, onReact, onReply, onForward, onReport, onRecall, onDice, onCancelReply,
  onConfirmForward, onConfirmReport, onViewProfile, onOpenMemberProfile, onBlock,
}: RoomChatViewProps) {
  // 房间内消息搜索
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSearch = () => {
    setSearchOpen(false);
    setKeyword('');
    setResults(null);
    setSearchError('');
  };

  const doSearch = (kw: string) => {
    const q = kw.trim();
    if (q.length < 2) {
      setSearchError('至少输入 2 个字符');
      setResults(null);
      return;
    }
    setSearching(true);
    setSearchError('');
    socialApi.searchRoomMessages(activeRoom.id, q)
      .then((r) => setResults(r.results))
      .catch((e) => setSearchError(e instanceof Error ? e.message : '搜索失败'))
      .finally(() => setSearching(false));
  };

  const onKeywordChange = (v: string) => {
    setKeyword(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = v.trim();
    if (q.length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(v), 400);
    } else {
      setResults(null);
      setSearchError('');
    }
  };

  return (
    <div className="flex-1 flex min-h-0 w-full">
      {/* 左列：头部 + 消息 + 输入 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* 房间头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}>
          <div className="flex items-center gap-1 min-w-0">
            <button className="md:hidden btn btn-sm p-2" onClick={onMobileMembers} style={{ minHeight: 36, minWidth: 36 }}>
              <Hash size={18} />
            </button>
            <HashAvatar seed={`room:${activeRoom.id}:${activeRoom.name}`} size={34} title={activeRoom.name} />
            <div className="min-w-0">
              <h2 className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>{activeRoom.name}</h2>
              {activeRoom.description && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-light)' }}>{activeRoom.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs hidden sm:flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
              <Users size={13} />{activeRoom.online_count ?? 0} 在线
            </span>
            {/* 消息搜索 */}
            <button
              className="btn btn-sm p-2"
              onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
              title={searchOpen ? '关闭搜索' : '搜索聊天记录'}
              style={{ minHeight: 36, minWidth: 36 }}
            >
              {searchOpen ? <X size={15} /> : <Search size={15} />}
            </button>
            <button className="btn btn-sm hidden md:flex items-center gap-1" onClick={onToggleRight} title={rightCollapsed ? '展开右侧栏' : '折叠右侧栏'} style={{ minHeight: 36 }}>
              {rightCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
              <span className="hidden lg:inline">成员</span>
            </button>
            <button className="btn btn-sm md:hidden p-2" onClick={onMobileMembers} title="成员列表" style={{ minHeight: 36, minWidth: 36 }}>
              <Users size={16} />
            </button>
            <button onClick={onLeaveRoom} className="btn btn-sm btn-outline" style={{ minHeight: 36 }}>
              <LogOut size={14} /><span className="hidden sm:inline ml-1">退出</span>
            </button>
          </div>
        </div>

        {/* 搜索面板 */}
        {searchOpen && (
          <div className="border-b flex-shrink-0 px-4 py-2" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}>
            <div className="flex items-center gap-2">
              <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
              <input
                autoFocus
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch(keyword)}
                placeholder="搜索聊天记录（至少 2 个字符）"
                className="flex-1 text-sm bg-transparent border-none outline-none"
                style={{ color: 'var(--color-text)' }}
              />
              {searching && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>搜索中…</span>}
            </div>
            {searchError && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{searchError}</p>}
            {results && (
              <div className="mt-2 max-h-64 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>没有找到匹配的消息</p>
                ) : (
                  results.map((r) => (
                    <div key={r.id} className="flex items-start gap-2 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-divider)' }}>
                      <Avatar username={r.username} avatar={r.avatar} size={26} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{r.is_self ? '我' : r.username}</span>
                          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{r.create_time_fmt}</span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{r.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 消息列表 */}
        <MessageList
          messages={messages} loading={messagesLoading} hasMore={hasMore} onLoadMore={onLoadMore}
          currentUserId={currentUserId} onMention={onMention} onMessage={() => {}}
          onReact={onReact} onReply={onReply} onForward={onForward} onReport={onReport}
          onViewProfile={onViewProfile}
          onRecall={onRecall}
          onBlock={onBlock}
        />

        {/* 输入框 */}
        <MessageInput
          onSend={onSend} disabled={!activeRoom} sending={sending} insertTextRef={insertTextRef}
          replyTo={replyTo ? { id: replyTo.id, username: replyTo.username, content_short: replyTo.content.slice(0, 50) } : null}
          onCancelReply={onCancelReply}
          onDice={onDice}
        />
      </div>

      {/* 右侧成员列表（桌面端） */}
      <aside className="hidden md:flex flex-col border-l w-60 flex-shrink-0 bg-[var(--color-card)] transition-all duration-200 ease-out" style={{ borderColor: 'var(--color-divider)', ...(rightCollapsed ? { width: 0, opacity: 0, pointerEvents: 'none' } : {}) }}>
        <MemberList members={members} loading={membersLoading} onSelect={onOpenMemberProfile} />
      </aside>

      {/* 右侧成员列表（移动端抽屉） */}
      <aside className={`md:hidden fixed inset-y-0 right-0 z-50 w-60 h-full border-l bg-[var(--color-card)] transition-transform duration-200 ease-out ${mobileSidebar === 'members' ? 'translate-x-0' : 'translate-x-full'}`} style={{ borderColor: 'var(--color-divider)' }}>
        {activeRoom && (
          <div className="flex flex-col h-full w-60 relative">
            <button className="absolute top-3 right-3 z-10 btn btn-sm p-2" onClick={onMobileMembers} style={{ minHeight: 36, minWidth: 36 }}>
              <span className="text-lg">×</span>
            </button>
            <MemberList members={members} loading={membersLoading} onSelect={onOpenMemberProfile} />
          </div>
        )}
      </aside>
    </div>
    // 弹窗由 ChatPage 全局渲染（ForwardDialog/ReportDialog），此处不再重复
  );
}
