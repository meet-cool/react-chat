import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Hash,
  Users,
  LogOut,
  MessageSquare,
  Settings,
  MessagesSquare,
  BookUser,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
  PanelLeftOpen,
  PanelRightOpen,
  ShieldCheck,
  Heart,
  SendHorizonal,
  Star,
  User,
  ArrowRight,
} from 'lucide-react';
import type { ChatMessage, Room, RoomMember, UserInfo, Conversation } from '../types';
import { clearToken, messageApi, roomApi, conversationApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import { Avatar } from '../components/Avatar';
import { RoomList, CreateRoomModal } from '../components/RoomList';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { MemberList } from '../components/MemberList';
import { SettingsModal } from '../components/SettingsModal';
import { ContactsView } from '../components/ContactsView';
import { ExtensionsView } from '../components/ExtensionsView';
import { PrivateChatView } from '../components/PrivateChatView';
import { RoomSettingsModal } from '../components/RoomSettingsModal';
import { ForwardDialog } from '../components/ForwardDialog';
import { ReportDialog } from '../components/ReportDialog';
import { RecentChatsView } from '../components/RecentChatsView';

interface ChatPageProps {
  user: UserInfo;
  onLogout: () => void;
}

const POLL_INTERVAL = 8000; // 消息轮询间隔 8 秒
const HEARTBEAT_INTERVAL = 60000; // 心跳间隔 60 秒
const REFRESH_INTERVAL = 30000; // 房间列表刷新间隔 30 秒
const PAGE_SIZE = 50;

type SidebarCategory = 'recent' | 'rooms' | 'contacts' | 'confession' | 'bottle' | 'points' | 'extensions';

export function ChatPage({ user, onLogout }: ChatPageProps) {
  const { addToast } = useApp();
  const navigate = useNavigate();

  const [category, setCategory] = useState<SidebarCategory>('recent');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo>(user);
  const [mobileSidebar, setMobileSidebar] = useState<SidebarCategory | 'members' | null>(null);

  // 私聊：外部触发目标用户
  const [privateTarget, setPrivateTarget] = useState<number | null>(null);
  // 是否显示私聊界面（明确模式切换）
  const [showPrivate, setShowPrivate] = useState(false);

  // 电脑端侧边栏折叠
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // 消息操作：引用回复、转发、举报
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [reportMsg, setReportMsg] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const lastMessageIdRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 防重复加入标志
  const joiningRef = useRef<Set<number>>(new Set());
  // 记录上次手动操作时间，用于区分手动切换和定时刷新
  const lastManualActionRef = useRef<number>(Date.now());
  // 成员列表是否已加载过（首次加载才显示骨架屏）
  const membersLoadedRef = useRef(false);
  // 上次加载成员的房间ID（用于切换房间时显示骨架屏）
  const lastLoadRoomRef = useRef<number | null>(null);
  // MessageInput 插入文本方法引用（@提及用）
  const insertTextRef = useRef<((text: string) => void) | null>(null);
  // 防重复处理鉴权错误
  const authErrorHandledRef = useRef(false);

  // 401 处理函数
  const handleAuthError = useCallback(() => {
    if (authErrorHandledRef.current) return;
    authErrorHandledRef.current = true;
    clearToken();
    onLogout();
    addToast('登录已过期，请重新登录', 'warning');
    navigate('/login', { replace: true });
  }, [addToast, navigate, onLogout]);

  // 加载房间列表
  const loadRooms = useCallback(async () => {
    try {
      const list = await roomApi.list();
      setRooms(list);
      // 如果没有选中房间，自动选第一个已加入的或第一个房间
      setActiveRoom((prev) => {
        if (prev) return prev;
        const joined = list.find((r) => r.joined);
        return joined || list[0] || null;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载聊天室失败';
      if (message.includes('未登录') || message.includes('登录已过期')) {
        handleAuthError();
        return;
      }
      addToast(message, 'error');
    } finally {
      setRoomsLoading(false);
    }
  }, [addToast, handleAuthError]);

  // 加载历史消息（首次进入房间）
  const loadMessages = useCallback(
    async (roomId: number) => {
      setMessagesLoading(true);
      try {
        const list = await messageApi.list(roomId, { limit: PAGE_SIZE });
        setMessages(list);
        if (list.length > 0) {
          lastMessageIdRef.current = list[list.length - 1].id;
        } else {
          lastMessageIdRef.current = 0;
        }
        setHasMore(list.length >= PAGE_SIZE);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '加载消息失败';
        if (message.includes('未登录') || message.includes('登录已过期')) {
          handleAuthError();
          return;
        }
        addToast(message, 'error');
      } finally {
        setMessagesLoading(false);
      }
    },
    [addToast, handleAuthError],
  );

  // 增量拉取新消息（轮询）
  const pollNewMessages = useCallback(async () => {
    if (!activeRoom) return;
    try {
      const list = await messageApi.list(activeRoom.id, {
        after_id: lastMessageIdRef.current,
      });
      if (list.length > 0) {
        // 去重：过滤掉已存在的消息（防止发送与轮询竞态导致重复）
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = list.filter((m) => !existingIds.has(m.id));
          if (fresh.length > 0) {
            lastMessageIdRef.current = Math.max(
              lastMessageIdRef.current,
              fresh[fresh.length - 1].id,
            );
          }
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      }
    } catch (err: unknown) {
      // 401 时静默处理，由 handleAuthError 统一跳转
      const message = err instanceof Error ? err.message : '';
      if (message.includes('未登录') || message.includes('登录已过期')) {
        handleAuthError();
      }
      // 静默失败，不打扰用户
    }
  }, [activeRoom, handleAuthError]);

  // 加载更多历史消息
  const loadMore = useCallback(async () => {
    if (!activeRoom || messages.length === 0) return;
    setMessagesLoading(true);
    try {
      const firstId = messages[0].id;
      const list = await messageApi.list(activeRoom.id, {
        before_id: firstId,
        limit: PAGE_SIZE,
      });
      if (list.length > 0) {
        // 去重：过滤掉已存在的消息
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = list.filter((m) => !existingIds.has(m.id));
          return fresh.length > 0 ? [...fresh, ...prev] : prev;
        });
        setHasMore(list.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载更多失败', 'error');
    } finally {
      setMessagesLoading(false);
    }
  }, [activeRoom, messages, addToast]);

  // 加载成员列表（带去重，防止定时刷新造成闪烁）
  const loadMembers = useCallback(async (roomId: number) => {
    // 切换房间或首次加载时显示骨架屏，定时刷新静默更新
    const isRoomSwitch = lastLoadRoomRef.current !== roomId;
    const isRecentManual = Date.now() - lastManualActionRef.current <= 5000;
    setMembersLoading((prev) => prev || isRoomSwitch || !membersLoadedRef.current || isRecentManual);
    try {
      const list = await roomApi.members(roomId);
      lastLoadRoomRef.current = roomId;
      membersLoadedRef.current = true;
      setMembers((prev) => {
        const prevById = new Map(prev.map((m) => [m.id, m]));
        const hasChanged =
          list.length !== prev.length ||
          list.some((m) => prevById.get(m.id)?.online !== m.online);
        if (!hasChanged) return prev;
        return list;
      });
    } catch {
      // 静默
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // 选择房间（不依赖 activeRoom 避免陈旧闭包）
  const handleSelectRoom = useCallback(
    async (room: Room) => {
      lastManualActionRef.current = Date.now();
      lastLoadRoomRef.current = null;
      setActiveRoom((prev) => {
        if (prev && prev.id === room.id) return prev;
        return room;
      });
      setMessages([]);
      lastMessageIdRef.current = 0;
      setMobileSidebar(null);
      await loadMessages(room.id);
      await loadMembers(room.id);
    },
    [loadMessages, loadMembers],
  );

  // 加入房间（统一入口：join 后自动切换）
  const handleJoinRoom = useCallback(
    async (room: Room) => {
      // 防重复加入
      if (joiningRef.current.has(room.id)) return;
      joiningRef.current.add(room.id);
      lastManualActionRef.current = Date.now();
      // 退出私聊模式
      setShowPrivate(false);
      setPrivateTarget(null);
      setRightCollapsed(false);
      setMobileSidebar(null);
      lastLoadRoomRef.current = null;
      try {
        // 先刷新房间列表，拿到最新的 joined 状态
        await loadRooms();
        // 从最新状态中查找房间
        const freshRoom = rooms.find((r) => r.id === room.id);
        if (!freshRoom) return;

        if (freshRoom.joined) {
          // 已加入：直接切换
          lastLoadRoomRef.current = null;
          setActiveRoom(freshRoom);
          setMessages([]);
          lastMessageIdRef.current = 0;
          await loadMessages(freshRoom.id);
          await loadMembers(freshRoom.id);
        } else {
          // 未加入：先加入
          await roomApi.join(room.id);
          addToast(`已加入「${room.name}」`, 'success');
          await loadRooms();
          const joinedRoom = rooms.find((r) => r.id === room.id);
          if (joinedRoom) {
            lastLoadRoomRef.current = null;
            setActiveRoom(joinedRoom);
            setMessages([]);
            lastMessageIdRef.current = 0;
            await loadMessages(joinedRoom.id);
            await loadMembers(joinedRoom.id);
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '加入失败';
        if (message.includes('未登录') || message.includes('登录已过期')) {
          handleAuthError();
          return;
        }
        addToast(message, 'error');
      } finally {
        joiningRef.current.delete(room.id);
      }
    },
    [addToast, loadRooms, loadMessages, loadMembers, handleAuthError, rooms],
  );

  // 退出房间
  const handleLeaveRoom = useCallback(async () => {
    if (!activeRoom) return;
    try {
      await roomApi.leave(activeRoom.id);
      addToast(`已退出「${activeRoom.name}」`, 'success');
      setActiveRoom(null);
      setMessages([]);
      setMembers([]);
      await loadRooms();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '退出失败', 'error');
    }
  }, [activeRoom, addToast, loadRooms]);

  // 发送消息
  const handleSend = useCallback(
    async (content: string, type: string) => {
      if (!activeRoom) return;
      setSending(true);
      try {
        const msg = await messageApi.send(activeRoom.id, {
          content,
          type,
          reply_to: replyTo?.id || 0,
        });
        setMessages((prev) => {
          // 去重：防止轮询已拉取到该消息
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, msg.id);
        // 清除引用回复
        if (replyTo) setReplyTo(null);
      } catch (err) {
        addToast(err instanceof Error ? err.message : '发送失败', 'error');
      } finally {
        setSending(false);
      }
    },
    [activeRoom, addToast, replyTo],
  );

  // 创建房间
  const handleCreateRoom = useCallback(
    async (data: { name: string; description: string; type: string; invite_user_ids: number[] }) => {
      try {
        const room = await roomApi.create(data);
        addToast(
          data.invite_user_ids.length > 0
            ? `聊天室「${room.name}」创建成功，已邀请 ${data.invite_user_ids.length} 位好友`
            : `聊天室「${room.name}」创建成功`,
          'success',
        );
        setShowCreateModal(false);
        await loadRooms();
        await handleSelectRoom(room);
      } catch (err) {
        addToast(err instanceof Error ? err.message : '创建失败', 'error');
      }
    },
    [addToast, loadRooms, handleSelectRoom],
  );

  // 房间信息更新回调
  const handleRoomUpdated = useCallback(
    (updated: Room) => {
      setActiveRoom((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      addToast('房间信息已同步', 'info');
    },
    [addToast],
  );

  // 成员变更回调（踢人/邀请/转让后刷新）
  const handleMembersChanged = useCallback(async () => {
    if (activeRoom) {
      await loadMembers(activeRoom.id);
      await loadRooms();
      // 同时刷新房间详情（member_count 可能变化）
      try {
        const updated = await roomApi.detail(activeRoom.id);
        setActiveRoom((prev) => (prev && prev.id === updated.id ? updated : prev));
      } catch {
        // 静默
      }
    }
  }, [activeRoom, loadMembers, loadRooms]);

  // @提及
  const handleMention = useCallback((username: string) => {
    insertTextRef.current?.(`@${username} `);
  }, []);

  // 消息反应
  const handleReact = useCallback(
    async (msgId: number, emoji: string) => {
      if (!activeRoom) return;
      try {
        const res = await messageApi.react(activeRoom.id, msgId, emoji);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, reactions: res.reactions } : m)),
        );
      } catch (err) {
        addToast(err instanceof Error ? err.message : '操作失败', 'error');
      }
    },
    [activeRoom, addToast],
  );

  // 引用回复
  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyTo(msg);
    insertTextRef.current?.(`@${msg.username} `);
  }, []);

  // 转发消息
  const handleForward = useCallback((msg: ChatMessage) => {
    setForwardMsg(msg);
    // 加载会话列表供选择
    conversationApi.list().then(setConversations).catch(() => {});
  }, []);

  // 确认转发
  const handleConfirmForward = useCallback(
    async (target: { type: 'room' | 'private'; id: number; name: string }) => {
      if (!forwardMsg) return;
      setForwarding(true);
      try {
        const content = `【转发】${forwardMsg.content}`;
        if (target.type === 'room') {
          await messageApi.send(target.id, { content, type: forwardMsg.type });
        } else {
          await conversationApi.send(target.id, { content, type: forwardMsg.type });
        }
        addToast(`已转发到 ${target.name}`, 'success');
        setForwardMsg(null);
      } catch (err) {
        addToast(err instanceof Error ? err.message : '转发失败', 'error');
      } finally {
        setForwarding(false);
      }
    },
    [forwardMsg, addToast],
  );

  // 举报消息
  const handleReport = useCallback((msg: ChatMessage) => {
    setReportMsg(msg);
  }, []);

  // 确认举报
  const handleConfirmReport = useCallback(
    async (reason: string) => {
      if (!reportMsg || !activeRoom) return;
      setReporting(true);
      try {
        await messageApi.report(activeRoom.id, reportMsg.id, reason);
        addToast('举报已提交，管理员将尽快处理', 'success');
        setReportMsg(null);
      } catch (err) {
        addToast(err instanceof Error ? err.message : '举报失败', 'error');
      } finally {
        setReporting(false);
      }
    },
    [reportMsg, activeRoom, addToast],
  );

  // 私聊：从聊天室头像菜单触发
  const handleStartPrivateChat = useCallback((userId: number) => {
    setPrivateTarget(userId);
    setShowPrivate(true);
    setCategory('recent');
    setActiveRoom(null);
    setMobileSidebar(null);
  }, []);

  // 从通讯录发起私聊
  const handleOpenConversation = useCallback((userId: number) => {
    setPrivateTarget(userId);
    setShowPrivate(true);
    setCategory('recent');
    setActiveRoom(null);
    setMobileSidebar(null);
  }, []);

  // 清空外部 target（仅清空，不关闭私聊界面）
  const handleClearPrivateTarget = useCallback(() => {
    setPrivateTarget(null);
  }, []);

  // 关闭私聊，返回聊天室列表
  const handleClosePrivate = useCallback(() => {
    setShowPrivate(false);
    setPrivateTarget(null);
    setRightCollapsed(false);
    lastLoadRoomRef.current = null;
  }, []);

  // 退出登录
  const handleLogout = () => {
    clearToken();
    onLogout();
    addToast('已退出登录', 'info');
    navigate('/');
  };

  // 初始化加载
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // 初始化加载私聊会话列表
  useEffect(() => {
    conversationApi.list().then(setConversations).catch(() => {});
  }, []);

  // 切换房间时重新启动轮询
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (!activeRoom) return;

    // 立即拉取一次
    pollNewMessages();
    pollTimerRef.current = setInterval(pollNewMessages, POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeRoom, pollNewMessages]);

  // 心跳保活
  useEffect(() => {
    const beat = () => messageApi.heartbeat().catch(() => {});
    beat();
    heartbeatTimerRef.current = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, []);

  // 定期刷新房间列表、私聊会话列表与成员在线状态
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      loadRooms();
      conversationApi.list().then(setConversations).catch(() => {});
      if (activeRoom) loadMembers(activeRoom.id);
    }, 15000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [activeRoom, loadRooms, loadMembers]);

  const sidebarCategories: {
    k: SidebarCategory;
    label: string;
    icon: typeof MessageSquare;
  }[] = [
    { k: 'recent', label: '最近', icon: MessageSquare },
    { k: 'rooms', label: '聊天室', icon: Hash },
    { k: 'contacts', label: '通讯录', icon: BookUser },
    { k: 'confession', label: '表白墙', icon: Heart },
    { k: 'bottle', label: '漂流瓶', icon: SendHorizonal },
    { k: 'points', label: '积分中心', icon: Star },
    { k: 'extensions', label: '插件', icon: Sparkles },
  ];

  const handleSidebarClick = useCallback(
    (k: SidebarCategory) => {
      if (k === 'confession') {
        navigate('/confessions');
      } else if (k === 'bottle') {
        navigate('/bottles');
      } else if (k === 'points') {
        navigate('/points');
      } else {
        setCategory(k);
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setMobileSidebar(k);
        }
      }
    },
    [navigate]
  );

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--color-bg-page)' }}
    >
      {/* 顶部导航栏 */}
      <header
        className="flex items-center justify-between px-4 py-2 border-b relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-light) 0%, transparent 60%)',
          borderColor: 'var(--color-divider)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* 装饰 SVG 波浪 */}
        <svg className="absolute bottom-0 left-0 w-full h-1.5 opacity-30" viewBox="0 0 1200 8" preserveAspectRatio="none">
          <path d="M0 4 Q 150 0, 300 4 T 600 4 T 900 4 T 1200 4 V8 H0 Z" fill="var(--color-primary)" />
          <path d="M0 5 Q 200 8, 400 5 T 800 5 T 1200 5 V8 H0 Z" fill="var(--color-primary)" opacity="0.5" />
        </svg>
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary)', boxShadow: '0 0 12px var(--color-primary)' }}>
            <MessagesSquare size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base tracking-wide" style={{ color: 'var(--color-text)' }}>
            ARCLE Chat
          </span>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          {(currentUser as unknown as { role?: string })?.role === 'admin' ||
          (currentUser as unknown as { role?: string })?.role === 'super_admin' ? (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="btn btn-sm"
              title="管理后台"
              style={{
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                background: 'var(--color-primary-light)',
                borderRadius: 6,
                padding: '4px 12px',
              }}
            >
              <ShieldCheck size={13} />
              <span className="hidden sm:inline ml-1">管理</span>
            </button>
          ) : null}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full"
            style={{ border: '1px solid var(--color-border-light)', background: 'var(--color-card-alt)' }}
          >
            <Avatar username={currentUser.username} avatar={currentUser.avatar} size={28} online />
            <span
              className="text-sm hidden sm:inline"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {currentUser.username}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-sm"
            title="退出登录"
            style={{
              borderRadius: 6,
              padding: '4px 12px',
              borderColor: 'var(--color-error)',
              color: 'var(--color-error)',
              background: 'rgba(248,113,113,0.08)',
            }}
          >
            <LogOut size={13} />
            <span className="hidden sm:inline ml-1">退出</span>
          </button>
        </div>
      </header>

      {/* 主体三栏布局 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧：分类导航条 + 内容区 */}
        <aside
          className={`border-r flex transition-[width] duration-200 ease-out ${
            leftCollapsed ? 'md:w-14' : 'md:w-72'
          } ${
            mobileSidebar !== null
              ? 'fixed inset-y-0 left-0 top-0 z-50 w-full md:w-auto md:translate-x-0 md:static md:z-auto'
              : 'fixed inset-y-0 left-0 top-0 z-50 -translate-x-full w-full md:w-auto md:translate-x-0 md:static md:z-auto'
          }`}
          style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
        >
          {/* 分类竖条 */}
          <div
            className="w-14 flex flex-col items-center py-4 gap-2 border-r flex-shrink-0 relative"
            style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}
          >
            {/* 左侧活跃指示条 */}
            <div
              className="absolute left-0 w-1 rounded-r transition-all duration-200"
              style={{
                height: 56,
                background: 'var(--color-primary)',
                opacity: 0.8,
                boxShadow: '0 0 6px var(--color-primary)',
                top: (() => {
                    const map: Record<string, number> = { recent: 12, rooms: 68, contacts: 124, confession: 180, bottle: 236, points: 292, extensions: 348 };
                    return map[category] ?? 12;
                  })(),
              }}
            />
            {sidebarCategories.map((c) => {
              const Icon = c.icon;
              const isActive = category === c.k;
              return (
                <button
                  key={c.k}
                  onClick={() => {
                    handleSidebarClick(c.k);
                    if (leftCollapsed) setLeftCollapsed(false);
                  }}
                  className="w-14 h-14 flex items-center justify-center transition-all duration-150 rounded-xl relative"
                  style={
                    isActive
                      ? {
                          background: 'var(--color-primary)',
                          color: '#fff',
                          boxShadow: `0 2px 12px var(--color-primary)`,
                          transform: 'scale(1.05)',
                        }
                      : {
                          color: 'var(--color-text-light)',
                          background: 'transparent',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--color-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                  title={c.label}
                >
                  <Icon size={24} />
                </button>
              );
            })}
            <div className="flex-1" />
            {/* 个人主页 */}
            <button
              onClick={() => navigate('/profile')}
              className="w-12 h-12 flex items-center justify-center transition-all duration-150 rounded-xl"
              style={{ color: 'var(--color-text-light)', background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              title="个人主页"
            >
              <User size={22} />
            </button>
            {/* 设置按钮 */}
            <button
              onClick={() => setShowSettings(true)}
              className="w-14 h-14 flex items-center justify-center transition-all duration-150 rounded-xl"
              style={{ color: 'var(--color-text-light)', background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              title="设置"
            >
              <Settings size={24} />
            </button>
            {/* 折叠按钮（仅桌面端） */}
            <button
              onClick={() => setLeftCollapsed((v) => !v)}
              className="hidden md:flex btn items-center gap-2 text-sm font-medium"
              style={{ minHeight: 56, minWidth: 56, padding: '0 12px', color: 'var(--color-text-light)', background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              title={leftCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            >
              {leftCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              <span>{leftCollapsed ? '展开侧边栏' : '折叠侧边栏'}</span>
            </button>
          </div>

          {/* 分类内容区 */}
          <div
            className={`flex-1 min-w-0 flex flex-col overflow-hidden transition-[width] duration-200 relative ${
              leftCollapsed ? 'md:w-0 md:overflow-hidden md:opacity-0 md:pointer-events-none' : 'md:opacity-100'
            }`}
            style={{ width: leftCollapsed ? 0 : undefined }}
          >
            {mobileSidebar && (
              <button
                className="md:hidden absolute top-3 right-3 z-10 btn btn-sm p-1.5 rounded-full"
                style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-divider)' }}
                onClick={() => setMobileSidebar(null)}
              >
                <X size={16} />
              </button>
            )}
            {showPrivate ? null : category === 'recent' ? (
              <RecentChatsView
                rooms={rooms}
                conversations={conversations}
                activeRoomId={activeRoom?.id ?? null}
                activeConvId={activeConv?.id ?? null}
                onSelectRoom={(room) => {
                  setShowPrivate(false);
                  setPrivateTarget(null);
                  setActiveConv(null);
                  handleJoinRoom(room);
                }}
                onSelectConv={(conv) => {
                  setShowPrivate(false);
                  setPrivateTarget(null);
                  setActiveRoom(null);
                  setActiveConv(conv);
                  setMobileSidebar(null);
                }}
                loading={roomsLoading}
              />
            ) : showPrivate ? null : category === 'rooms' ? (
              <RoomList
                rooms={rooms}
                activeRoomId={activeRoom?.id ?? null}
                onSelect={(room) => {
                  setShowPrivate(false);
                  setPrivateTarget(null);
                  handleJoinRoom(room);
                }}
                onCreate={() => setShowCreateModal(true)}
                loading={roomsLoading}
                onOpenSettings={() => setShowRoomSettings(true)}
              />
            ) : category === 'contacts' ? (
              <ContactsView onOpenConversation={handleOpenConversation} />
            ) : category === 'confession' ? (
              <div className="p-4">
                {/* SVG 装饰背景 */}
                <div className="relative overflow-hidden rounded-xl" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(244,114,182,0.6) 100%)' }}>
                  <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 200 120">
                    <circle cx="170" cy="20" r="40" fill="white" />
                    <circle cx="30" cy="100" r="25" fill="white" />
                    <circle cx="160" cy="90" r="15" fill="white" />
                    <path d="M0 60 Q 50 30, 100 60 T 200 60" stroke="white" strokeWidth="1.5" fill="none" opacity="0.4" />
                    <path d="M0 80 Q 60 50, 120 80 T 200 70" stroke="white" strokeWidth="1" fill="none" opacity="0.3" />
                  </svg>
                  <button
                    onClick={() => navigate('/confessions')}
                    className="relative z-10 w-full flex items-center justify-center gap-2 py-4 font-medium text-white"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <Heart size={18} fill="currentColor" />
                    <span className="text-sm">进入表白墙</span>
                    <ArrowRight size={14} opacity={0.7} />
                  </button>
                </div>
              </div>
            ) : category === 'bottle' ? (
              <div className="p-4">
                <div className="relative overflow-hidden rounded-xl" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(79,195,247,0.5) 100%)' }}>
                  <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 200 120">
                    <ellipse cx="100" cy="60" rx="50" ry="35" fill="none" stroke="white" strokeWidth="1.5" />
                    <ellipse cx="100" cy="60" rx="30" ry="20" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
                    <circle cx="170" cy="25" r="12" fill="white" />
                    <circle cx="25" cy="95" r="8" fill="white" />
                  </svg>
                  <button
                    onClick={() => navigate('/bottles')}
                    className="relative z-10 w-full flex items-center justify-center gap-2 py-4 font-medium text-white"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <SendHorizonal size={18} fill="currentColor" />
                    <span className="text-sm">去扔漂流瓶</span>
                    <ArrowRight size={14} opacity={0.7} />
                  </button>
                </div>
              </div>
            ) : showPrivate ? null : category === 'points' ? (
              <div className="p-4">
                <div className="relative overflow-hidden rounded-xl" style={{ background: 'linear-gradient(135deg, var(--color-warning) 0%, rgba(251,191,36,0.5) 100%)' }}>
                  <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 200 120">
                    <polygon points="100,15 115,50 155,50 122,72 135,110 100,85 65,110 78,72 45,50 85,50" fill="white" />
                    <polygon points="40,30 48,48 68,48 52,60 58,78 40,66 22,78 28,60 12,48 32,48" fill="white" opacity="0.6" />
                  </svg>
                  <button
                    onClick={() => navigate('/points')}
                    className="relative z-10 w-full flex items-center justify-center gap-2 py-4 font-medium text-white"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <Star size={18} fill="currentColor" />
                    <span className="text-sm">积分中心</span>
                    <ArrowRight size={14} opacity={0.7} />
                  </button>
                </div>
              </div>
            ) : (
              <ExtensionsView />
            )}
          </div>
        </aside>

        {/* 中间：消息区 / 私聊区 */}
        <main className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--color-bg)' }}>
          {showPrivate ? (
            <PrivateChatView
              targetUserId={privateTarget}
              onClearTarget={handleClearPrivateTarget}
              onBack={handleClosePrivate}
              onMessageSent={() => {
                conversationApi.list().then(setConversations).catch(() => {});
              }}
              currentUserId={currentUser.id}
            />
          ) : activeConv ? (
            <PrivateChatView
              activeConv={activeConv}
              onBack={() => {
                setActiveConv(null);
                setCategory('recent');
              }}
              onMessageSent={() => {
                conversationApi.list().then(setConversations).catch(() => {});
              }}
              currentUserId={currentUser.id}
            />
          ) : activeRoom ? (
            <>
              {/* 房间头部 */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <button
                    className="md:hidden btn btn-sm p-2"
                    onClick={() => setMobileSidebar('rooms')}
                  >
                    <Menu size={16} />
                  </button>
                  {/* 桌面端左侧折叠按钮 */}
                  <button
                    className="hidden md:flex btn items-center gap-2 text-sm font-medium"
                    style={{ minHeight: 56, minWidth: 56, padding: '0 12px' }}
                    onClick={() => setLeftCollapsed((v) => !v)}
                    title={leftCollapsed ? '展开左侧栏' : '折叠左侧栏'}
                  >
                    {leftCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    <span>{leftCollapsed ? '展开侧边栏' : '折叠侧边栏'}</span>
                  </button>
                  <Hash size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <div className="min-w-0">
                    <h2 className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                      {activeRoom.name}
                    </h2>
                    {activeRoom.description && (
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-light)' }}>
                        {activeRoom.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs hidden sm:flex items-center gap-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Users size={13} />
                    {activeRoom.online_count ?? 0} 在线
                  </span>
                  <button
                    className="btn btn-sm hidden md:flex items-center gap-1"
                    onClick={() => setRightCollapsed((v) => !v)}
                    title={rightCollapsed ? '展开右侧栏' : '折叠右侧栏'}
                  >
                    {rightCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
                    <span className="hidden lg:inline">成员</span>
                  </button>
                  {/* 移动端：成员列表触发按钮 */}
                  <button
                    className="btn btn-sm md:hidden p-1"
                    onClick={() => {
                      if (mobileSidebar === 'members') {
                        setMobileSidebar(null);
                        setRightCollapsed(false);
                      } else {
                        setMobileSidebar('members');
                        setRightCollapsed(true);
                      }
                    }}
                    title="成员列表"
                  >
                    <Users size={14} />
                  </button>
                  <button onClick={handleLeaveRoom} className="btn btn-sm btn-outline">
                    <LogOut size={14} />
                    <span className="hidden sm:inline">退出</span>
                  </button>
                </div>
              </div>

              {/* 消息列表 */}
              <MessageList
                messages={messages}
                loading={messagesLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                currentUserId={currentUser.id}
                onMention={handleMention}
                onMessage={handleStartPrivateChat}
                onReact={handleReact}
                onReply={handleReply}
                onForward={handleForward}
                onReport={handleReport}
              />

              {/* 输入框 */}
              <MessageInput
                onSend={handleSend}
                disabled={!activeRoom}
                sending={sending}
                insertTextRef={insertTextRef}
                replyTo={
                  replyTo
                    ? {
                        id: replyTo.id,
                        username: replyTo.username,
                        content_short: replyTo.content.slice(0, 50),
                      }
                    : null
                }
                onCancelReply={() => setReplyTo(null)}
              />
            </>
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {/* SVG 装饰背景 */}
              <svg className="absolute inset-0 w-full h-full opacity-8 pointer-events-none" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
                <circle cx="100" cy="100" r="60" fill="var(--color-primary)" opacity="0.08" />
                <circle cx="700" cy="150" r="40" fill="var(--color-primary)" opacity="0.06" />
                <circle cx="650" cy="500" r="80" fill="var(--color-primary)" opacity="0.05" />
                <circle cx="120" cy="480" r="50" fill="var(--color-primary)" opacity="0.07" />
                <circle cx="400" cy="300" r="120" fill="var(--color-primary)" opacity="0.04" className="pulse-ring" />
                <path d="M0 300 Q 200 200, 400 300 T 800 300" stroke="var(--color-primary)" strokeWidth="1" fill="none" opacity="0.1" />
                <path d="M0 350 Q 200 280, 400 350 T 800 350" stroke="var(--color-primary)" strokeWidth="0.8" fill="none" opacity="0.07" />
                <path d="M0 400 Q 200 350, 400 400 T 800 400" stroke="var(--color-primary)" strokeWidth="0.6" fill="none" opacity="0.05" />
                {/* 装饰点阵 */}
                {[150,300,450,600].map(x => [120,240,360,480].map(y => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="var(--color-primary)" opacity="0.15" />
                )))}
              </svg>
              {/* 浮动粒子 */}
              <svg className="absolute top-[15%] left-[20%] float-a" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="1.5" opacity="0.3" />
              </svg>
              <svg className="absolute top-[25%] right-[25%] float-b" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="var(--color-primary)" strokeWidth="1" opacity="0.25" />
              </svg>
              <svg className="absolute bottom-[30%] left-[15%] float-c" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5" stroke="var(--color-primary)" strokeWidth="1" opacity="0.2" />
              </svg>
              <svg className="absolute bottom-[20%] right-[20%] float-a" style={{ animationDelay: '1.5s' }} width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="var(--color-primary)" strokeWidth="1" opacity="0.2" />
              </svg>
              {/* 中心图标 */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-primary-light)', boxShadow: `0 0 40px var(--color-primary-light)` }}>
                  <MessagesSquare size={32} style={{ color: 'var(--color-primary)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>选择聊天室开始对话</p>
                <button
                  className="md:hidden btn btn-sm mt-2"
                  style={{ borderRadius: 6, padding: '6px 16px' }}
                  onClick={() => setMobileSidebar('rooms')}
                >
                  <Menu size={14} /> 查看聊天室
                </button>
              </div>
            </div>
          )}
        </main>

        {/* 右侧：成员列表（桌面端）— 正常 flex 流内显示 */}
        <aside
          className="hidden md:flex flex-col border-l w-60 flex-shrink-0 bg-[var(--color-card)] transition-all duration-200 ease-out"
          style={{ borderColor: 'var(--color-divider)', ...(rightCollapsed ? { width: 0, opacity: 0, pointerEvents: 'none' } : {}) }}
        >
          {activeRoom && !showPrivate && (
            <MemberList members={members} loading={membersLoading} />
          )}
        </aside>

        {/* 右侧：成员列表（移动端）— fixed 浮层，由 mobileSidebar 控制 */}
        <aside
          className={`
            md:hidden fixed inset-y-0 right-0 top-0 z-50 w-60 h-full
            border-l bg-[var(--color-card)] transition-transform duration-200 ease-out
            ${mobileSidebar === 'members' ? 'translate-x-0' : 'translate-x-full'}
          `}
          style={{ borderColor: 'var(--color-divider)' }}
        >
          {activeRoom && !showPrivate ? (
            <div className="flex flex-col h-full w-60 relative">
              <button
                className="absolute top-3 right-3 z-10 btn btn-sm p-1"
                onClick={() => setMobileSidebar(null)}
              >
                <X size={14} />
              </button>
              <MemberList members={members} loading={membersLoading} />
            </div>
          ) : null}
        </aside>
      </div>

      {/* 移动端遮罩（层级低于侧边栏，点击关闭） */}
      {mobileSidebar && (
        <div
          className="md:hidden fixed inset-0 z-40 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMobileSidebar(null)}
        />
      )}

      {/* 创建房间弹窗 */}
      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateRoom}
      />

      {/* 设置弹窗 */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        user={currentUser}
        onUserUpdate={setCurrentUser}
      />

      {/* 房间设置弹窗 */}
      <RoomSettingsModal
        open={showRoomSettings}
        room={activeRoom}
        currentUserId={currentUser.id}
        onClose={() => setShowRoomSettings(false)}
        onRoomUpdated={handleRoomUpdated}
        onMembersChanged={handleMembersChanged}
      />

      {/* 转发消息弹窗 */}
      <ForwardDialog
        open={!!forwardMsg}
        rooms={rooms.filter((r) => r.joined)}
        conversations={conversations}
        onClose={() => setForwardMsg(null)}
        onForward={handleConfirmForward}
        forwarding={forwarding}
      />

      {/* 举报消息弹窗 */}
      <ReportDialog
        open={!!reportMsg}
        onClose={() => setReportMsg(null)}
        onConfirm={handleConfirmReport}
        submitting={reporting}
      />
    </div>
  );
}
