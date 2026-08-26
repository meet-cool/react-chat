import { Hash, Heart, SendHorizonal, Star, Sparkles, ArrowRight } from 'lucide-react';
import type { SidebarCategory } from './chat-types';
import { RecentChatsView } from './RecentChatsView';
import { RoomList } from './RoomList';
import { ContactsView } from './ContactsView';
import { GroupsView } from './GroupsView';

interface ChatSidebarContentProps {
  category: SidebarCategory;
  rooms: any[];
  conversations: any[];
  activeRoomId: number | null;
  activeConvId: number | null;
  roomsLoading: boolean;
  onSelectRoom: (room: any) => void;
  onSelectConv: (conv: any) => void;
  onCreateRoom: () => void;
  onOpenRoomSettings: () => void;
  onOpenConversation: (userId: number) => void;
  onNavigate: (path: string) => void;
  /** 群聊（category='groups' 时使用） */
  activeGroupId?: number | null;
  onSelectGroup?: (group: any) => void;
  onGroupsChanged?: () => void;
}

export function ChatSidebarContent({
  category,
  rooms,
  conversations,
  activeRoomId,
  activeConvId,
  roomsLoading,
  onSelectRoom,
  onSelectConv,
  onCreateRoom,
  onOpenRoomSettings,
  onOpenConversation,
  onNavigate,
  activeGroupId,
  onSelectGroup,
  onGroupsChanged,
}: ChatSidebarContentProps) {
  if (category === 'groups') {
    return (
      <GroupsView
        activeGroupId={activeGroupId ?? null}
        onSelectGroup={onSelectGroup || (() => {})}
        onGroupsChanged={onGroupsChanged || (() => {})}
      />
    );
  }

  if (category === 'recent') {
    return (
      <RecentChatsView
        rooms={rooms}
        conversations={conversations}
        activeRoomId={activeRoomId}
        activeConvId={activeConvId}
        onSelectRoom={onSelectRoom}
        onSelectConv={onSelectConv}
        loading={roomsLoading}
      />
    );
  }

  if (category === 'rooms') {
    return (
      <RoomList
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelect={onSelectRoom}
        onCreate={onCreateRoom}
        loading={roomsLoading}
        onOpenSettings={onOpenRoomSettings}
      />
    );
  }

  if (category === 'contacts') {
    return <ContactsView onOpenConversation={onOpenConversation} />;
  }

  if (category === 'confession') {
    return (
      <div className="p-4">
        <div
          className="relative overflow-hidden rounded-xl"
          style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(244,114,182,0.6) 100%)' }}
        >
          <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 200 120">
            <circle cx="170" cy="20" r="40" fill="white" />
            <circle cx="30" cy="100" r="25" fill="white" />
            <circle cx="160" cy="90" r="15" fill="white" />
            <path d="M0 60 Q 50 30, 100 60 T 200 60" stroke="white" strokeWidth="1.5" fill="none" opacity="0.4" />
            <path d="M0 80 Q 60 50, 120 80 T 200 70" stroke="white" strokeWidth="1" fill="none" opacity="0.3" />
          </svg>
          <button
            onClick={() => onNavigate('/confessions')}
            className="relative z-10 w-full flex items-center justify-center gap-2 py-4 font-medium text-white"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Heart size={18} fill="currentColor" />
            <span className="text-sm">进入表白墙</span>
            <ArrowRight size={14} opacity={0.7} />
          </button>
        </div>
      </div>
    );
  }

  if (category === 'bottle') {
    return (
      <div className="p-4">
        <div
          className="relative overflow-hidden rounded-xl"
          style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(79,195,247,0.5) 100%)' }}
        >
          <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 200 120">
            <ellipse cx="100" cy="60" rx="50" ry="35" fill="none" stroke="white" strokeWidth="1.5" />
            <ellipse cx="100" cy="60" rx="30" ry="20" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
            <circle cx="170" cy="25" r="12" fill="white" />
            <circle cx="25" cy="95" r="8" fill="white" />
          </svg>
          <button
            onClick={() => onNavigate('/bottles')}
            className="relative z-10 w-full flex items-center justify-center gap-2 py-4 font-medium text-white"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <SendHorizonal size={18} fill="currentColor" />
            <span className="text-sm">去扔漂流瓶</span>
            <ArrowRight size={14} opacity={0.7} />
          </button>
        </div>
      </div>
    );
  }

  if (category === 'points') {
    return (
      <div className="p-4">
        <div
          className="relative overflow-hidden rounded-xl"
          style={{ background: 'linear-gradient(135deg, var(--color-warning) 0%, rgba(251,191,36,0.5) 100%)' }}
        >
          <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 200 120">
            <polygon points="100,15 115,50 155,50 122,72 135,110 100,85 65,110 78,72 45,50 85,50" fill="white" />
            <polygon points="40,30 48,48 68,48 52,60 58,78 40,66 22,78 28,60 12,48 32,48" fill="white" opacity="0.6" />
          </svg>
          <button
            onClick={() => onNavigate('/points')}
            className="relative z-10 w-full flex items-center justify-center gap-2 py-4 font-medium text-white"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Star size={18} fill="currentColor" />
            <span className="text-sm">积分中心</span>
            <ArrowRight size={14} opacity={0.7} />
          </button>
        </div>
      </div>
    );
  }

  // extensions
  return (
    <div className="p-4">
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(168,85,247,0.5) 100%)' }}
      >
        <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 200 120">
          <circle cx="100" cy="60" r="45" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="60" r="25" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
          <circle cx="170" cy="30" r="15" fill="white" />
          <circle cx="30" cy="90" r="10" fill="white" />
        </svg>
        <button
          onClick={() => onNavigate('/ai')}
          className="relative z-10 w-full flex items-center justify-center gap-2 py-4 font-medium text-white"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Sparkles size={18} fill="currentColor" />
          <span className="text-sm">弧光 AI 广场</span>
          <ArrowRight size={14} opacity={0.7} />
        </button>
      </div>
    </div>
  );
}
