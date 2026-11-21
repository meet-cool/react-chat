import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  MessagesSquare,
  ShieldCheck,
  ArrowLeft,
  Bell,
  Menu,
} from 'lucide-react';
import type { UserInfo, Conversation, GroupInfo, ChatMessage } from '../types';
import { clearToken, conversationApi, socialApi, messageApi } from '../lib/api';
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
import { RoomSettingsModal } from '../components/RoomSettingsModal';
import { ForwardDialog } from '../components/ForwardDialog';
import { ReportDialog } from '../components/ReportDialog';
import type { SidebarCategory } from '../components/chat-types';
import { useChatRooms } from '../lib/useChatRooms';
import { useMobileView, type MobileView } from '../lib/useMobileView';
import type { NotificationItem } from '../lib/api';

interface ChatPageProps {
  user: UserInfo;
  onLogout: () => void;
}

const REFRESH_INTERVAL = 30000;

export function ChatPage({ user, onLogout }: ChatPageProps) {
  const { addToast } = useApp();
  const navigate = useNavigate();

  // 移动端响应式
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1099px)').matches
  );
  const { isMobile, isNarrow, mobileView, setMobileView } = useMobileView({
    onNarrowChange: (narrow) => setRightCollapsed(narrow),
  });

  // 侧边栏状态
  const [category, setCategory] = useState<SidebarCategory>('recent');
  const [indicatorTop, setIndicatorTop] = useState(24);
  const categoryBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState<SidebarCategory | 'members' | null>(null);

  // 发送成功后触发 MessageList 瞬时滚到底部（自增即可，组件内 effect 监听该值）
  const [scrollSignal, setScrollSignal] = useState(0);

  // 群聊状态
  const [activeGroup, setActiveGroup] = useState<GroupInfo | null>(null);
  const [groupListKey, setGroupListKey] = useState(0);

  // 私聊状态
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [privateTarget, setPrivateTarget] = useState<number | null>(null);
  const [showPrivate, setShowPrivate] = useState(false);

  // 转发/举报
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

  // 通知中心
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState<NotificationItem[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);

  // 401 处理
  const handleAuthError = useCallback(() => {
    clearToken();
    onLogout();
    addToast('登录已过期，请重新登录', 'warning');
    navigate('/login', { replace: true });
  }, [addToast, navigate, onLogout]);

  // 聊天房间核心逻辑（抽离到 useChatRooms）
  const chat = useChatRooms({
    onError: (msg, isAuth) => {
      if (isAuth) handleAuthError();
      else addToast(msg, 'error');
    },
    onJoined: (room) => addToast(`已加入「${room.name}」`, 'success'),
    onLeft: (room) => addToast(`已退出「${room.name}」`, 'success'),
    onRecalled: () => addToast('消息已撤回', 'success'),
  });

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
    if (!reportMsg || !chat.activeRoom) return;
    setReporting(true);
    try {
      await messageApi.report(chat.activeRoom.id, reportMsg.id, reason);
      addToast('举报已提交', 'success');
      setReportMsg(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '举报失败', 'error');
    } finally {
      setReporting(false);
    }
  }, [reportMsg, chat.activeRoom, addToast]);

  // 私聊相关
  const handleOpenConversation = useCallback((userId: number) => {
    setPrivateTarget(userId);
    setShowPrivate(true);
    setCategory('recent');
    chat.setActiveRoom(null);
    setMobileSidebar(null);
    if (isMobile) setMobileView('private');
  }, [isMobile, chat, setMobileView]);

  const handleClearPrivateTarget = useCallback(() => {
    setPrivateTarget(null);
  }, []);

  const handleClosePrivate = useCallback(() => {
    setShowPrivate(false);
    setPrivateTarget(null);
    if (!isNarrow) setRightCollapsed(false);
    // 移动端：退出聊天视图
    if (isMobile) setMobileView('list');
  }, [isMobile, isNarrow, setMobileView]);

  // 通知中心
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

  // 退出登录
  const handleLogout = () => {
    clearToken();
    onLogout();
    addToast('已退出登录', 'info');
    navigate('/');
  };

  // 定期刷新
  useEffect(() => {
    conversationApi.list().then(setConversations).catch(() => {});
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    const t = setInterval(() => {
      chat.loadRooms();
      conversationApi.list().then(setConversations).catch(() => {});
      if (chat.activeRoom) chat.loadMembers(chat.activeRoom.id);
      refreshUnread();
    }, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [chat, refreshUnread]);

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
  }, [setMobileView]);

  const {
    rooms, roomsLoading, activeRoom, setActiveRoom,
    messages, messagesLoading, hasMore, members, membersLoading,
    sending, replyTo, setReplyTo,
    loadMore, handleJoinRoom, handleLeaveRoom, handleSend,
    handleMention, handleReact, handleReply,
    insertTextRef,
  } = chat;

  // 包装 handleSend：成功插入后递增 scrollSignal，强制贴底（避免发送后停在中途）
  const wrappedHandleSend = useCallback((content: string, type: string) => {
    return handleSend(content, type, () => setScrollSignal((s) => s + 1));
  }, [handleSend]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-page)' }}>
      {/* 顶部导航 */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-divider)' }}
      >
        <div className="flex items-center gap-3">
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
                className="fixed top-12 right-3 w-80 max-h-96 flex flex-col shadow-[var(--shadow-lg)]"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 0, zIndex: 80 }}
              >
                <div className="px-3 py-2 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--color-divider)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>通知中心</span>
                  <button onClick={() => setNotifOpen(false)} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>关闭</button>
                </div>
                <div className="flex-1 overflow-y-auto">
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
              </div>
            )}
          </div>
          {((currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'super_admin') && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="btn btn-sm"
              style={{ color: 'var(--color-primary)', background: 'var(--color-primary-light)', borderRadius: 3, padding: '6px 12px' }}
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
            style={{ borderRadius: 3, padding: '6px 12px', borderColor: 'var(--color-error)', color: 'var(--color-error)', background: 'rgba(248,113,113,0.08)' }}
          >
            <LogOut size={14} />
            <span className="hidden sm:inline ml-1">退出</span>
          </button>
        </div>
      </header>

      {/* 主体布局 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧边栏 */}
        <aside
          className={`border-r flex flex-shrink-0 transition-all duration-200 ease-out md:relative md:z-10 overflow-hidden ${
            isMobile
              ? mobileView !== 'list'
                ? 'hidden'
                : mobileSidebar !== null
                  ? 'fixed inset-y-0 left-0 top-0 z-50 w-[320px] max-w-[85vw]'
                  : 'w-14'
              : `w-64 md:w-14 ${leftCollapsed ? 'md:w-14' : 'md:w-64'}`
          }`}
          style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
        >
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

          <div
            className={`flex-1 flex flex-col overflow-hidden transition-[width] duration-200 relative ${
              leftCollapsed ? 'md:w-0 md:overflow-hidden md:opacity-0 md:pointer-events-none' : 'md:opacity-100 md:min-w-[200px]'
            } ${isMobile && mobileSidebar === null ? 'hidden' : ''}`}
            style={leftCollapsed ? { width: 0, minWidth: 0 } : undefined}
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
          {isMobile && mobileSidebar !== null ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              {category === 'recent' && (
                <ChatSidebarContent
                  category={category}
                  rooms={rooms}
                  conversations={conversations}
                  activeRoomId={activeRoom?.id ?? null}
                  activeConvId={activeConv?.id ?? null}
                  roomsLoading={roomsLoading}
                  onSelectRoom={(room) => { setShowPrivate(false); setPrivateTarget(null); setActiveConv(null); setActiveGroup(null); handleJoinRoom(room); }}
                  onSelectConv={(conv) => { setShowPrivate(false); setPrivateTarget(null); setActiveRoom(null); setActiveGroup(null); setActiveConv(conv); setMobileSidebar(null); setMobileView('private'); }}
                  onCreateRoom={() => setShowCreateModal(true)}
                  onOpenRoomSettings={() => setShowRoomSettings(true)}
                  onOpenConversation={handleOpenConversation}
                  onNavigate={navigate}
                  onClose={() => setMobileSidebar(null)}
                />
              )}
              {category === 'rooms' && (
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
              )}
              {category === 'contacts' && (
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
              )}
              {category === 'groups' && (
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
                  onSelectGroup={(g: GroupInfo) => { setActiveRoom(null); setActiveConv(null); setShowPrivate(false); setPrivateTarget(null); setActiveGroup(g); setMobileSidebar(null); }}
                  onGroupsChanged={() => setGroupListKey((k) => k + 1)}
                  onClose={() => setMobileSidebar(null)}
                />
              )}
            </div>
          ) : isMobile ? (
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
                scrollSignal={scrollSignal}
                onSend={wrappedHandleSend}
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
                onRecall={chat.handleRecall}
                onDice={chat.handleDice}
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
                  scrollSignal={scrollSignal}
                  onSend={wrappedHandleSend}
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
                  onRecall={chat.handleRecall}
                  onDice={chat.handleDice}
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
      <RoomSettingsModal open={showRoomSettings} room={activeRoom} currentUserId={currentUser.id} onClose={() => setShowRoomSettings(false)} onRoomUpdated={chat.handleRoomUpdated} onMembersChanged={chat.handleMembersChanged} />
      <ForwardDialog open={!!forwardMsg} rooms={rooms.filter((r) => r.joined)} conversations={conversations} onClose={() => setForwardMsg(null)} onForward={handleConfirmForward} forwarding={forwarding} />
      <ReportDialog open={!!reportMsg} onClose={() => setReportMsg(null)} onConfirm={handleConfirmReport} submitting={reporting} />

      {/* PWA 安装提示 */}
      <InstallPrompt variant="topbar" />

      {/* 新手指导 */}
      <BeginnerGuide open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}
