import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Hash,
  Users,
  LogOut,
  MessagesSquare,
  ShieldCheck,
  ArrowLeft,
  User as UserIcon,
  Settings,
} from 'lucide-react';
import type { ChatMessage, Room, RoomMember, UserInfo, Conversation, GroupInfo } from '../types';
import { clearToken, messageApi, roomApi, conversationApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import { Avatar } from '../components/Avatar';
import { ChatSidebarNav } from '../components/ChatSidebarNav';
import { ChatSidebarContent } from '../components/ChatSidebarContent';
import { RoomChatView } from '../components/RoomChatView';
import { PrivateChatView } from '../components/PrivateChatView';
import { GroupChatView } from '../components/GroupChatView';
import { SettingsModal } from '../components/SettingsModal';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { InstallPrompt } from '../components/InstallPrompt';
import { BeginnerGuide } from '../components/BeginnerGuide';
import { Bell } from 'lucide-react';
import { socialApi, type NotificationItem } from '../lib/api';
import { RoomSettingsModal } from '../components/RoomSettingsModal';
import { ForwardDialog } from '../components/ForwardDialog';
import { ReportDialog } from '../components/ReportDialog';
import type { SidebarCategory } from '../components/chat-types';

interface ChatPageProps {
  user: UserInfo;
  onLogout: () => void;
}

const POLL_INTERVAL = 8000;
const HEARTBEAT_INTERVAL = 60000;
const REFRESH_INTERVAL = 30000;
const PAGE_SIZE = 50;

type MobileView = 'list' | 'room' | 'private';

export function ChatPage({ user, onLogout }: ChatPageProps) {
  const { addToast } = useApp();
  const navigate = useNavigate();

  // 响应式移动端判断（窗口尺寸变化时更新）
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // 窄桌面（平板竖屏等）：默认折叠右侧成员栏，避免会话区被挤压
  const [isNarrow, setIsNarrow] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1099px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1099px)');
    const onChange = (e: MediaQueryListEvent) => {
      setIsNarrow(e.matches);
      setRightCollapsed(e.matches);
    };
    setIsNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // 侧边栏状态
  const [category, setCategory] = useState<SidebarCategory>('recent');
  const [indicatorTop, setIndicatorTop] = useState(24);
  const categoryBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState<SidebarCategory | 'members' | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('list');

  // 房间状态
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // 群聊状态（严格管理：审批入群/禁言/转让/解散）
  const [activeGroup, setActiveGroup] = useState<GroupInfo | null>(null);
  const [groupListKey, setGroupListKey] = useState(0);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // 私聊状态
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [privateTarget, setPrivateTarget] = useState<number | null>(null);
  const [showPrivate, setShowPrivate] = useState(false);

  // 右侧成员栏（窄桌面默认折叠，避免会话区被挤压）
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1099px)').matches
  );

  // 发送状态
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [reportMsg, setReportMsg] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo>(user);

  // refs
  const lastMessageIdRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joiningRef = useRef<Set<number>>(new Set());
  const lastManualActionRef = useRef<number>(Date.now());
  const membersLoadedRef = useRef(false);
  const lastLoadRoomRef = useRef<number | null>(null);
  const insertTextRef = useRef<((text: string) => void) | null>(null);
  const authErrorHandledRef = useRef(false);

  // 消息加载竞态守卫：请求序号 + 当前房间快照
  const loadMessagesRequestIdRef = useRef(0);
  const activeRoomRef = useRef<Room | null>(null);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // 更新指示条位置
  useEffect(() => {
    requestAnimationFrame(() => {
      const btn = categoryBtnRefs.current.get(category);
      const col = document.querySelector('[data-sidebar-col]') as HTMLElement;
      if (btn && col) {
        setIndicatorTop(btn.offsetTop - col.offsetTop + 8);
      }
    });
  }, [category, showLabels]);

  // 401 处理
  const handleAuthError = useCallback(() => {
    if (authErrorHandledRef.current) return;
    authErrorHandledRef.current = true;
    clearToken();
    onLogout();
    addToast('登录已过期，请重新登录', 'warning');
    navigate('/login', { replace: true });
  }, [addToast, navigate, onLogout]);

  // 加载房间列表（返回最新数组，供调用方基于返回值操作）
  const loadRooms = useCallback(async (): Promise<Room[]> => {
    try {
      const list = await roomApi.list();
      setRooms(list);
      setActiveRoom((prev) => {
        if (prev) return prev;
        const joined = list.find((r) => r.joined);
        return joined || list[0] || null;
      });
      return list;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载聊天室失败';
      if (message.includes('未登录') || message.includes('登录已过期')) {
        handleAuthError();
        return [];
      }
      addToast(message, 'error');
      return [];
    } finally {
      setRoomsLoading(false);
    }
  }, [addToast, handleAuthError]);

  // 加载消息（带竞态守卫：await 返回后若请求序号过期或房间已切换则丢弃结果）
  const loadMessages = useCallback(async (roomId: number) => {
    const requestId = ++loadMessagesRequestIdRef.current;
    const isStale = () =>
      requestId !== loadMessagesRequestIdRef.current || roomId !== activeRoomRef.current?.id;
    setMessagesLoading(true);
    try {
      const list = await messageApi.list(roomId, { limit: PAGE_SIZE });
      if (isStale()) return;
      setMessages(list);
      lastMessageIdRef.current = list.length > 0 ? list[list.length - 1].id : 0;
      setHasMore(list.length >= PAGE_SIZE);
    } catch (err: unknown) {
      if (isStale()) return;
      const message = err instanceof Error ? err.message : '加载消息失败';
      if (message.includes('未登录') || message.includes('登录已过期')) {
        handleAuthError();
        return;
      }
      addToast(message, 'error');
    } finally {
      if (!isStale()) {
        setMessagesLoading(false);
      }
    }
  }, [addToast, handleAuthError]);

  // 轮询新消息
  const pollNewMessages = useCallback(async () => {
    if (!activeRoom) return;
    try {
      const list = await messageApi.list(activeRoom.id, { after_id: lastMessageIdRef.current });
      if (list.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = list.filter((m) => !existingIds.has(m.id));
          if (fresh.length > 0) {
            lastMessageIdRef.current = Math.max(lastMessageIdRef.current, fresh[fresh.length - 1].id);
            // 收到他人新消息时播放提示音（设置开关，默认关）
            const hasOthers = fresh.some((m) => m.user_id !== currentUser.id && !m.is_recalled);
            if (hasOthers && localStorage.getItem('arcle_sound') === '1') {
              try { new Audio('/sound/typing.mp3').play().catch(() => {}); } catch { /* ignore */ }
            }
          }
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('未登录') || message.includes('登录已过期')) {
        handleAuthError();
      }
    }
  }, [activeRoom, handleAuthError]);

  // 加载更多
  const loadMore = useCallback(async () => {
    if (!activeRoom || messages.length === 0) return;
    setMessagesLoading(true);
    try {
      const firstId = messages[0].id;
      const list = await messageApi.list(activeRoom.id, { before_id: firstId, limit: PAGE_SIZE });
      if (list.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = list.filter((m) => !existingIds.has(m.id));
          return fresh.length > 0 ? [...fresh, ...prev] : prev;
        });
        setHasMore(list.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch {
      addToast('加载更多失败', 'error');
    } finally {
      setMessagesLoading(false);
    }
  }, [activeRoom, messages, addToast]);

  // 加载成员
  const loadMembers = useCallback(async (roomId: number) => {
    const isRoomSwitch = lastLoadRoomRef.current !== roomId;
    const isRecentManual = Date.now() - lastManualActionRef.current <= 5000;
    setMembersLoading((prev) => prev || isRoomSwitch || !membersLoadedRef.current || isRecentManual);
    try {
      const list = await roomApi.members(roomId);
      lastLoadRoomRef.current = roomId;
      membersLoadedRef.current = true;
      setMembers((prev) => {
        const prevById = new Map(prev.map((m) => [m.id, m]));
        const hasChanged = list.length !== prev.length || list.some((m) => prevById.get(m.id)?.online !== m.online);
        if (!hasChanged) return prev;
        return list;
      });
    } catch {
      // 静默
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // 加入房间
  const handleJoinRoom = useCallback(async (room: Room) => {
    if (joiningRef.current.has(room.id)) return;
    joiningRef.current.add(room.id);
    lastManualActionRef.current = Date.now();
    setShowPrivate(false);
    setPrivateTarget(null);
    if (!isNarrow) setRightCollapsed(false);
    setMobileSidebar(null);
    
    // 移动端：切换到聊天视图
    if (isMobile) {
      setMobileView('room');
    }
    
    lastLoadRoomRef.current = null;
    try {
      const list = await loadRooms();
      const freshRoom = list.find((r) => r.id === room.id);
      if (!freshRoom) {
        addToast('房间不存在或已下线', 'error');
        return;
      }
      if (freshRoom.joined) {
        lastLoadRoomRef.current = null;
        activeRoomRef.current = freshRoom;
        setActiveRoom(freshRoom);
        setMessages([]);
        lastMessageIdRef.current = 0;
        await loadMessages(freshRoom.id);
        await loadMembers(freshRoom.id);
      } else {
        await roomApi.join(room.id);
        addToast(`已加入「${room.name}」`, 'success');
        const joinedList = await loadRooms();
        const joinedRoom = joinedList.find((r) => r.id === room.id);
        if (!joinedRoom) {
          addToast('加入成功，但房间状态未同步，请重新选择', 'warning');
          return;
        }
        lastLoadRoomRef.current = null;
        activeRoomRef.current = joinedRoom;
        setActiveRoom(joinedRoom);
        setMessages([]);
        lastMessageIdRef.current = 0;
        await loadMessages(joinedRoom.id);
        await loadMembers(joinedRoom.id);
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
  }, [addToast, loadRooms, loadMessages, loadMembers, handleAuthError, isMobile, isNarrow]);

  // 退出房间
  const handleLeaveRoom = useCallback(async () => {
    if (!activeRoom) return;
    try {
      await roomApi.leave(activeRoom.id);
      addToast(`已退出「${activeRoom.name}」`, 'success');
      activeRoomRef.current = null;
      setActiveRoom(null);
      setMessages([]);
      setMembers([]);
      await loadRooms();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '退出失败', 'error');
    }
  }, [activeRoom, addToast, loadRooms]);

  // 发送消息
  const handleSend = useCallback(async (content: string, type: string) => {
    if (!activeRoom) return;
    setSending(true);
    try {
      const msg = await messageApi.send(activeRoom.id, { content, type, reply_to: replyTo?.id || 0 });
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, msg.id);
      if (replyTo) setReplyTo(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '发送失败', 'error');
    } finally {
      setSending(false);
    }
  }, [activeRoom, addToast, replyTo]);


  // 摇骰子：发送 dice 类型消息
  const handleDice = useCallback(() => {
    if (!activeRoom) return;
    const n = 1 + Math.floor(Math.random() * 6);
    handleSend(String(n), 'dice');
  }, [activeRoom, handleSend]);

  // @提及
  const handleMention = useCallback((username: string) => {
    insertTextRef.current?.(`@${username} `);
  }, []);

  // 消息反应
  const handleReact = useCallback(async (msgId: number, emoji: string) => {
    if (!activeRoom) return;
    try {
      const res = await messageApi.react(activeRoom.id, msgId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, reactions: res.reactions } : m)));
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  }, [activeRoom, addToast]);

  // 引用回复
  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyTo(msg);
    insertTextRef.current?.(`@${msg.username} `);
  }, []);

  // 转发
  const handleForward = useCallback((msg: ChatMessage) => {
    setForwardMsg(msg);
    conversationApi.list().then(setConversations).catch(() => {});
  }, []);

  // 举报
  const handleReport = useCallback((msg: ChatMessage) => {
    setReportMsg(msg);
  }, []);

  // 确认转发
  const handleConfirmForward = useCallback(async (target: { type: 'room' | 'private'; id: number; name: string }) => {
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
  }, [forwardMsg, addToast]);

  // 确认举报
  const handleConfirmReport = useCallback(async (reason: string) => {
    if (!reportMsg || !activeRoom) return;
    setReporting(true);
    try {
      await messageApi.report(activeRoom.id, reportMsg.id, reason);
      addToast('举报已提交', 'success');
      setReportMsg(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '举报失败', 'error');
    } finally {
      setReporting(false);
    }
  }, [reportMsg, activeRoom, addToast]);

  // 私聊相关
  const handleOpenConversation = useCallback((userId: number) => {
    setPrivateTarget(userId);
    setShowPrivate(true);
    setCategory('recent');
    setActiveRoom(null);
    setMobileSidebar(null);
    // 移动端：切换到私聊视图
    if (isMobile) {
      setMobileView('private');
    }
  }, [isMobile]);

  const handleClearPrivateTarget = useCallback(() => {
    setPrivateTarget(null);
  }, []);

  const handleClosePrivate = useCallback(() => {
    setShowPrivate(false);
    setPrivateTarget(null);
    if (!isNarrow) setRightCollapsed(false);
    lastLoadRoomRef.current = null;
    // 移动端：退出聊天视图
    if (isMobile) {
      setMobileView('list');
    }
  }, [isMobile, isNarrow]);

  // 撤回消息（房间）
  const handleRecall = useCallback(async (msg: ChatMessage) => {
    if (!activeRoom) return;
    try {
      await socialApi.recallRoomMessage(activeRoom.id, msg.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_recalled: true, content: '' } : m))
      );
      addToast('消息已撤回', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '撤回失败', 'error');
    }
  }, [activeRoom, addToast]);

  // 通知中心
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState<NotificationItem[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    socialApi.unreadCount().then((r) => setNotifUnread(r.unread)).catch(() => {});
  }, []);

  const openNotifications = useCallback(() => {
    setNotifOpen((v) => !v);
    if (!notifOpen) {
      socialApi.notifications().then((r) => setNotifList(r)).catch(() => {});
      socialApi.markRead().then(() => setNotifUnread(0)).catch(() => {});
    }
  }, [notifOpen]);

  // 拉黑用户
  const handleBlock = useCallback(async (userId: number, username: string) => {
    try {
      const r = await socialApi.block(userId);
      addToast(`已拉黑 ${r.username || username}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  }, [addToast]);

  // 房间更新
  const handleRoomUpdated = useCallback((updated: Room) => {
    setActiveRoom((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    addToast('房间信息已同步', 'info');
  }, [addToast]);

  const handleMembersChanged = useCallback(async () => {
    if (activeRoom) {
      await loadMembers(activeRoom.id);
      await loadRooms();
    }
  }, [activeRoom, loadMembers, loadRooms]);

  // 退出登录
  const handleLogout = () => {
    clearToken();
    onLogout();
    addToast('已退出登录', 'info');
    navigate('/');
  };

  // 初始化
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    conversationApi.list().then(setConversations).catch(() => {});
    refreshUnread();
  }, [refreshUnread]);

  // 轮询消息
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (!activeRoom) return;
    pollNewMessages();
    pollTimerRef.current = setInterval(pollNewMessages, POLL_INTERVAL);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [activeRoom, pollNewMessages]);

  // 心跳
  useEffect(() => {
    const beat = () => messageApi.heartbeat().catch(() => {});
    beat();
    heartbeatTimerRef.current = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => { if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current); };
  }, []);

  // 定期刷新
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      loadRooms();
      conversationApi.list().then(setConversations).catch(() => {});
      if (activeRoom) loadMembers(activeRoom.id);
      refreshUnread();
    }, REFRESH_INTERVAL);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [activeRoom, loadRooms, loadMembers, refreshUnread]);

  const handleSidebarClick = useCallback((k: SidebarCategory) => {
    if (k === 'confession') navigate('/confessions');
    else if (k === 'bottle') navigate('/bottles');
    else if (k === 'points') navigate('/points');
    else if (k === 'extensions') navigate('/ai');
    else if (k === 'plugins') navigate('/plugins');
    else if (k === 'moments') navigate('/moments');
    else if (k === 'english') navigate('/english');
    else {
      setCategory(k);
      if (isMobile) setMobileSidebar(k);
    }
  }, [navigate, isMobile]);

  // 移动端返回按钮
  const handleMobileBack = useCallback(() => {
    setMobileView('list');
    setMobileSidebar(null);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-page)' }}>
      {/* 顶部导航 */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-divider)' }}
      >
        <div className="flex items-center gap-3">
          {/* 移动端：根据视图显示返回或菜单按钮 */}
          {isMobile && mobileView !== 'list' ? (
            <button
              className="btn btn-sm p-2"
              onClick={handleMobileBack}
              style={{ minHeight: 36, minWidth: 36 }}
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <button
              className="md:hidden btn btn-sm p-2"
              onClick={() => setMobileSidebar('recent')}
              style={{ minHeight: 36, minWidth: 36 }}
            >
              <Menu size={18} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-primary)' }}
            >
              <MessagesSquare size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base hidden sm:block" style={{ color: 'var(--color-text)' }}>
              ARCLE Chat
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 通知中心 */}
          <div className="relative">
            <button
              onClick={openNotifications}
              className="btn btn-sm p-2"
              title="通知中心"
              style={{ minHeight: 36, minWidth: 36, position: 'relative' }}
            >
              <Bell size={16} />
              {notifUnread > 0 && (
                <span
                  className="absolute flex items-center justify-center text-[10px] text-white"
                  style={{ top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 9999, background: 'var(--color-error)', padding: '0 3px' }}
                >
                  {notifUnread > 99 ? '99+' : notifUnread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div
                className="fixed top-12 right-3 w-80 max-h-96 overflow-y-auto shadow-[var(--shadow-lg)]"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, zIndex: 80 }}
              >
                <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-divider)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>通知中心</span>
                  <button onClick={() => setNotifOpen(false)} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>关闭</button>
                </div>
                {notifList.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>暂无通知</p>
                ) : (
                  notifList.map((n) => (
                    <div key={n.id} className="px-3 py-2.5 border-b last:border-b-0 flex gap-2" style={{ borderColor: 'var(--color-divider)' }}>
                      <span style={{ color: 'var(--color-primary)' }}>{n.type === 'follow' ? '👤' : n.type === 'gift' ? '🎁' : '📢'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-5" style={{ color: 'var(--color-text)' }}>{n.content}</p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{n.create_time_fmt}</p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: 'var(--color-error)' }} />}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {((currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'super_admin') && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="btn btn-sm"
              style={{
                color: 'var(--color-primary)',
                background: 'var(--color-primary-light)',
                borderRadius: 6,
                padding: '6px 12px',
              }}
            >
              <ShieldCheck size={14} />
              <span className="hidden sm:inline ml-1">管理</span>
            </button>
          )}
          <div
            className="flex items-center gap-2 px-3 py-1.5"
            style={{ border: '1px solid var(--color-border-light)', background: 'var(--color-card-alt)' }}
          >
            <Avatar
              username={currentUser.username}
              avatar={currentUser.avatar}
              size={28}
              online
              onClick={() => navigate(`/profile/${encodeURIComponent(currentUser.username || '')}`)}
            />
            <span className="text-sm hidden sm:inline" style={{ color: 'var(--color-text-secondary)' }}>
              {currentUser.username}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-sm"
            style={{
              borderRadius: 6,
              padding: '6px 12px',
              borderColor: 'var(--color-error)',
              color: 'var(--color-error)',
              background: 'rgba(248,113,113,0.08)',
            }}
          >
            <LogOut size={14} />
            <span className="hidden sm:inline ml-1">退出</span>
          </button>
        </div>
      </header>

      {/* 主体布局 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧边栏 - 移动端聊天视图时隐藏；列表视图仅保留图标栏，分类内容由主区域渲染 */}
        <aside
          className={`border-r flex flex-shrink-0 transition-all duration-200 ease-out md:relative md:z-0 ${
            isMobile
              ? mobileView !== 'list'
                ? 'hidden'
                : mobileSidebar !== null
                  ? 'fixed inset-y-0 left-0 top-0 z-50 w-full'
                  : 'w-14'
              : `w-72 md:w-14 ${leftCollapsed ? 'md:w-14' : 'md:w-72'}`
          }`}
          style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
        >
          {/* 导航图标栏 */}
          <ChatSidebarNav
            category={category}
            showLabels={showLabels}
            indicatorTop={indicatorTop}
            categoryBtnRefs={categoryBtnRefs}
            onCategoryClick={handleSidebarClick}
            onToggleLabels={() => setShowLabels((v) => !v)}
            onNavigateToProfile={() => navigate(`/profile/${encodeURIComponent(currentUser.username || '')}`)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenGuide={() => setShowGuide(true)}
            onOpenMbti={() => navigate('/mbti')}
          />

          {/* 分类内容区 - 移动端内联时隐藏（由主区域渲染列表），抽屉/桌面端显示 */}
          <div
            className={`flex-1 min-w-0 flex flex-col overflow-hidden transition-[width] duration-200 relative ${
              leftCollapsed ? 'md:w-0 md:overflow-hidden md:opacity-0 md:pointer-events-none' : 'md:opacity-100'
            } ${isMobile && mobileSidebar === null ? 'hidden' : ''}`}
            style={{ width: leftCollapsed ? 0 : undefined }}
            data-sidebar-col
          >
            {showPrivate ? null : category === 'recent' ? (
              <ChatSidebarContent
                category={category}
                rooms={rooms}
                conversations={conversations}
                activeRoomId={activeRoom?.id ?? null}
                activeConvId={activeConv?.id ?? null}
                roomsLoading={roomsLoading}
                onSelectRoom={(room) => { setShowPrivate(false); setPrivateTarget(null); setActiveConv(null); setActiveGroup(null); handleJoinRoom(room); }}
                onSelectConv={(conv) => { setShowPrivate(false); setPrivateTarget(null); setActiveRoom(null); setActiveGroup(null); setActiveConv(conv); setMobileSidebar(null); if (isMobile) { setMobileView('private'); } }}
                onCreateRoom={() => setShowCreateModal(true)}
                onOpenRoomSettings={() => setShowRoomSettings(true)}
                onOpenConversation={handleOpenConversation}
                onNavigate={navigate}
              />
            ) : category === 'rooms' ? (
              <ChatSidebarContent
                category={category}
                rooms={rooms}
                conversations={conversations}
                activeRoomId={activeRoom?.id ?? null}
                activeConvId={activeConv?.id ?? null}
                roomsLoading={roomsLoading}
                onSelectRoom={(room) => { setShowPrivate(false); setPrivateTarget(null); setActiveConv(null); setActiveGroup(null); handleJoinRoom(room); }}
                onSelectConv={() => {}}
                onCreateRoom={() => setShowCreateModal(true)}
                onOpenRoomSettings={() => setShowRoomSettings(true)}
                onOpenConversation={() => {}}
                onNavigate={navigate}
              />
            ) : category === 'contacts' ? (
              <ChatSidebarContent
                category={category}
                rooms={[]}
                conversations={[]}
                activeRoomId={null}
                activeConvId={null}
                roomsLoading={false}
                onSelectRoom={() => {}}
                onSelectConv={() => {}}
                onCreateRoom={() => {}}
                onOpenRoomSettings={() => {}}
                onOpenConversation={handleOpenConversation}
                onNavigate={navigate}
              />
            ) : (
              <ChatSidebarContent
                category={category}
                rooms={[]}
                conversations={[]}
                activeRoomId={null}
                activeConvId={null}
                roomsLoading={false}
                onSelectRoom={() => {}}
                onSelectConv={() => {}}
                onCreateRoom={() => {}}
                onOpenRoomSettings={() => {}}
                onOpenConversation={() => {}}
                onNavigate={navigate}
                activeGroupId={activeGroup?.id ?? null}
                onSelectGroup={(g: GroupInfo) => { setActiveRoom(null); setActiveConv(null); setShowPrivate(false); setPrivateTarget(null); setActiveGroup(g); if (isMobile) setMobileSidebar(null); }}
                onGroupsChanged={() => setGroupListKey((k) => k + 1)}
              />
            )}
          </div>
        </aside>

        {/* 中间内容区 */}
        <main className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--color-bg)' }}>
          {/* 移动端视图 */}
          {isMobile ? (
            activeGroup ? (
              <GroupChatView
                group={activeGroup}
                currentUserId={currentUser.id}
                onBack={() => setActiveGroup(null)}
                onGroupUpdated={() => setGroupListKey((k) => k + 1)}
                onToast={(m) => addToast(m)}
              />
            ) : mobileView === 'room' && activeRoom ? (
              <RoomChatView
                activeRoom={activeRoom}
                messages={messages}
                messagesLoading={messagesLoading}
                hasMore={hasMore}
                members={members}
                membersLoading={membersLoading}
                sending={sending}
                rightCollapsed={false}
                mobileSidebar={mobileSidebar}
                replyTo={replyTo}
                forwardMsg={forwardMsg}
                reportMsg={reportMsg}
                forwarding={forwarding}
                reporting={reporting}
                currentUserId={currentUser.id}
                insertTextRef={insertTextRef}
                onToggleRight={() => {}}
                onMobileMembers={() => setMobileSidebar((prev) => prev === 'members' ? null : 'members')}
                onLeaveRoom={() => { handleLeaveRoom(); setMobileView('list'); }}
                onLoadMore={loadMore}
                onSend={handleSend}
                onMention={handleMention}
                onReact={handleReact}
                onReply={handleReply}
                onForward={handleForward}
                onReport={handleReport}
                onCancelReply={() => setReplyTo(null)}
                onConfirmForward={handleConfirmForward}
                onConfirmReport={handleConfirmReport}
                onViewProfile={(username) => navigate(`/profile/${encodeURIComponent(username.trim())}`)}
                onOpenMemberProfile={(username) => navigate(`/profile/${encodeURIComponent(username.trim())}`)}
                onRecall={handleRecall}
                onDice={handleDice}
                onBlock={handleBlock}
              />
            ) : mobileView === 'private' || showPrivate ? (
              <PrivateChatView
                targetUserId={privateTarget}
                activeConv={activeConv}
                onClearTarget={handleClearPrivateTarget}
                onBack={handleMobileBack}
                onMessageSent={() => { conversationApi.list().then(setConversations).catch(() => {}); }}
                currentUserId={currentUser.id}
              />
            ) : (
              /* 显示列表 */
              <div className="flex-1 min-h-0 overflow-hidden">
                {category === 'recent' ? (
                  <ChatSidebarContent
                    category={category}
                    rooms={rooms}
                    conversations={conversations}
                    activeRoomId={activeRoom?.id ?? null}
                    activeConvId={activeConv?.id ?? null}
                    roomsLoading={roomsLoading}
                    onSelectRoom={(room) => { setShowPrivate(false); setPrivateTarget(null); setActiveConv(null); setActiveGroup(null); handleJoinRoom(room); }}
                    onSelectConv={(conv) => { setShowPrivate(false); setPrivateTarget(null); setActiveRoom(null); setActiveGroup(null); setActiveConv(conv); setMobileSidebar(null); if (isMobile) { setMobileView('private'); } }}
                    onCreateRoom={() => setShowCreateModal(true)}
                    onOpenRoomSettings={() => setShowRoomSettings(true)}
                    onOpenConversation={handleOpenConversation}
                    onNavigate={navigate}
                    onClose={() => setMobileSidebar(null)}
                  />
                ) : category === 'rooms' ? (
                  <ChatSidebarContent
                    category={category}
                    rooms={rooms}
                    conversations={conversations}
                    activeRoomId={activeRoom?.id ?? null}
                    activeConvId={activeConv?.id ?? null}
                    roomsLoading={roomsLoading}
                    onSelectRoom={(room) => { setShowPrivate(false); setPrivateTarget(null); setActiveConv(null); setActiveGroup(null); handleJoinRoom(room); }}
                    onSelectConv={() => {}}
                    onCreateRoom={() => setShowCreateModal(true)}
                    onOpenRoomSettings={() => setShowRoomSettings(true)}
                    onOpenConversation={() => {}}
                    onNavigate={navigate}
                    onClose={() => setMobileSidebar(null)}
                  />
                ) : category === 'contacts' ? (
                  <ChatSidebarContent
                    category={category}
                    rooms={[]}
                    conversations={[]}
                    activeRoomId={null}
                    activeConvId={null}
                    roomsLoading={false}
                    onSelectRoom={() => {}}
                    onSelectConv={() => {}}
                    onCreateRoom={() => {}}
                    onOpenRoomSettings={() => {}}
                    onOpenConversation={handleOpenConversation}
                    onNavigate={navigate}
                    onClose={() => setMobileSidebar(null)}
                  />
                ) : (
                  <ChatSidebarContent
                    category={category}
                    rooms={[]}
                    conversations={[]}
                    activeRoomId={null}
                    activeConvId={null}
                    roomsLoading={false}
                    onSelectRoom={() => {}}
                    onSelectConv={() => {}}
                    onCreateRoom={() => {}}
                    onOpenRoomSettings={() => {}}
                    onOpenConversation={() => {}}
                    onNavigate={navigate}
                    activeGroupId={null}
                    onSelectGroup={(g: GroupInfo) => { setActiveRoom(null); setActiveConv(null); setShowPrivate(false); setPrivateTarget(null); setActiveGroup(g); if (isMobile) setMobileSidebar(null); }}
                    onGroupsChanged={() => setGroupListKey((k) => k + 1)}
                    onClose={() => setMobileSidebar(null)}
                  />
                )}
              </div>
            )
          ) : (
            /* 桌面端视图 */
            <>
              {showPrivate ? (
                <PrivateChatView
                  targetUserId={privateTarget}
                  onClearTarget={handleClearPrivateTarget}
                  onBack={handleClosePrivate}
                  onMessageSent={() => { conversationApi.list().then(setConversations).catch(() => {}); }}
                  currentUserId={currentUser.id}
                />
              ) : activeConv ? (
                <PrivateChatView
                  activeConv={activeConv}
                  onBack={() => { setActiveConv(null); setCategory('recent'); }}
                  onMessageSent={() => { conversationApi.list().then(setConversations).catch(() => {}); }}
                  currentUserId={currentUser.id}
                />
              ) : activeGroup ? (
                <GroupChatView
                  group={activeGroup}
                  currentUserId={currentUser.id}
                  onBack={() => setActiveGroup(null)}
                  onGroupUpdated={() => setGroupListKey((k) => k + 1)}
                  onToast={(m) => addToast(m)}
                />
              ) : activeRoom ? (
                <RoomChatView
                  activeRoom={activeRoom}
                  messages={messages}
                  messagesLoading={messagesLoading}
                  hasMore={hasMore}
                  members={members}
                  membersLoading={membersLoading}
                  sending={sending}
                  rightCollapsed={rightCollapsed}
                  mobileSidebar={mobileSidebar}
                  replyTo={replyTo}
                  forwardMsg={forwardMsg}
                  reportMsg={reportMsg}
                  forwarding={forwarding}
                  reporting={reporting}
                  currentUserId={currentUser.id}
                  insertTextRef={insertTextRef}
                  onToggleRight={() => setRightCollapsed((v) => !v)}
                  onMobileMembers={() => {
                    if (mobileSidebar === 'members') { setMobileSidebar(null); setRightCollapsed(false); }
                    else { setMobileSidebar('members'); setRightCollapsed(true); }
                  }}
                  onLeaveRoom={handleLeaveRoom}
                  onLoadMore={loadMore}
                  onSend={handleSend}
                  onMention={handleMention}
                  onReact={handleReact}
                  onReply={handleReply}
                  onForward={handleForward}
                  onReport={handleReport}
                  onCancelReply={() => setReplyTo(null)}
                  onConfirmForward={handleConfirmForward}
                  onConfirmReport={handleConfirmReport}
                  onViewProfile={(username) => navigate(`/profile/${encodeURIComponent(username.trim())}`)}
                  onOpenMemberProfile={(username) => navigate(`/profile/${encodeURIComponent(username.trim())}`)}
                  onRecall={handleRecall}
                  onDice={handleDice}
                  onBlock={handleBlock}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-sm flex items-center justify-center" style={{ background: 'var(--color-primary-light)' }}>
                      <MessagesSquare size={32} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <p className="text-base font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>选择聊天室开始对话</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>从左侧列表选择聊天室、群聊或私聊会话</p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 移动端遮罩 */}
      {mobileSidebar && (
        <div className="md:hidden fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setMobileSidebar(null)} />
      )}

      {/* 弹窗 */}
      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(room) => { handleJoinRoom(room); }}
      />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} user={currentUser} onUserUpdate={setCurrentUser} />
      <RoomSettingsModal open={showRoomSettings} room={activeRoom} currentUserId={currentUser.id} onClose={() => setShowRoomSettings(false)} onRoomUpdated={handleRoomUpdated} onMembersChanged={handleMembersChanged} />
      <ForwardDialog open={!!forwardMsg} rooms={rooms.filter((r) => r.joined)} conversations={conversations} onClose={() => setForwardMsg(null)} onForward={handleConfirmForward} forwarding={forwarding} />
      <ReportDialog open={!!reportMsg} onClose={() => setReportMsg(null)} onConfirm={handleConfirmReport} submitting={reporting} />

      {/* PWA 安装提示（顶部细条，避免遮挡输入框） */}
      <InstallPrompt variant="topbar" />

      {/* 新手指导 */}
      <BeginnerGuide open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}
