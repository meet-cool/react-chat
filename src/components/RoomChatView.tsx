import { Hash, Users, LogOut, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { Room, RoomMember, ChatMessage } from '../types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { MemberList } from './MemberList';
import { HashAvatar } from './HashAvatar';

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
  onSend, onMention, onReact, onReply, onForward, onReport, onCancelReply,
  onConfirmForward, onConfirmReport, onViewProfile, onOpenMemberProfile,
}: RoomChatViewProps) {
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

        {/* 消息列表 */}
        <MessageList
          messages={messages} loading={messagesLoading} hasMore={hasMore} onLoadMore={onLoadMore}
          currentUserId={currentUserId} onMention={onMention} onMessage={() => {}}
          onReact={onReact} onReply={onReply} onForward={onForward} onReport={onReport}
          onViewProfile={onViewProfile}
        />

        {/* 输入框 */}
        <MessageInput
          onSend={onSend} disabled={!activeRoom} sending={sending} insertTextRef={insertTextRef}
          replyTo={replyTo ? { id: replyTo.id, username: replyTo.username, content_short: replyTo.content.slice(0, 50) } : null}
          onCancelReply={onCancelReply}
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
