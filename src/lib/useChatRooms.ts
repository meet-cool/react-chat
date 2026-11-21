import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room, ChatMessage, RoomMember } from '../types';
import { roomApi, messageApi, socialApi } from '../lib/api';
import { useLongPolling, type LongPollContext } from '../lib/useLongPolling';

const PAGE_SIZE = 50;

export interface UseChatRoomsOptions {
  /** 错误回调：message 为人类可读错误信息；isAuth 为 401 鉴权失效标记 */
  onError: (message: string, isAuth: boolean) => void;
  /** 加入房间成功后调用（Toast） */
  onJoined?: (room: Room) => void;
  /** 退出房间后调用（Toast） */
  onLeft?: (room: Room) => void;
  /** 撤回成功后调用（Toast） */
  onRecalled?: () => void;
}

export interface UseChatRoomsReturn {
  rooms: Room[];
  roomsLoading: boolean;
  activeRoom: Room | null;
  setActiveRoom: (room: Room | null) => void;
  messages: ChatMessage[];
  messagesLoading: boolean;
  hasMore: boolean;
  members: RoomMember[];
  membersLoading: boolean;
  sending: boolean;
  replyTo: ChatMessage | null;
  setReplyTo: (m: ChatMessage | null) => void;
  loadRooms: () => Promise<Room[]>;
  loadMessages: (roomId: number) => Promise<void>;
  loadMore: () => Promise<void>;
  loadMembers: (roomId: number) => Promise<void>;
  handleJoinRoom: (room: Room) => Promise<void>;
  handleLeaveRoom: () => Promise<void>;
  handleSend: (content: string, type: string) => Promise<void>;
  handleReact: (msgId: number, emoji: string) => Promise<void>;
  handleRecall: (msg: ChatMessage) => Promise<void>;
  handleDice: () => void;
  handleMention: (username: string) => void;
  handleReply: (msg: ChatMessage) => void;
  handleRoomUpdated: (updated: Room) => void;
  handleMembersChanged: () => Promise<void>;
  insertTextRef: React.MutableRefObject<((text: string) => void) | null>;
  /** 供父组件读取当前 activeRoom 的 ref（避免闭包过期） */
  activeRoomRef: React.MutableRefObject<Room | null>;
}

/**
 * 聊天房间核心逻辑 Hook
 *
 * 职责：
 * - 房间列表加载 / 切换 / 加入 / 退出
 * - 消息加载（带竞态守卫）/ 发送 / 反应 / 撤回 / 摇骰子 / @提及 / 引用回复
 * - 成员加载
 * - Long Polling 增量拉取
 * - 心跳与定期刷新
 *
 * 从 ChatPage.tsx 抽离，降低单文件复杂度。
 */
export function useChatRooms(opts: UseChatRoomsOptions): UseChatRoomsReturn {
  const { onError, onJoined, onLeft, onRecalled } = opts;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // refs
  const lastMessageIdRef = useRef<number>(0);
  const joiningRef = useRef<Set<number>>(new Set());
  const lastManualActionRef = useRef<number>(Date.now());
  const membersLoadedRef = useRef(false);
  const lastLoadRoomRef = useRef<number | null>(null);
  const insertTextRef = useRef<((text: string) => void) | null>(null);

  // 消息加载竞态守卫
  const loadMessagesRequestIdRef = useRef(0);
  const activeRoomRef = useRef<Room | null>(null);
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // 加载房间列表
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
      const isAuth = message.includes('未登录') || message.includes('登录已过期');
      onError(message, isAuth);
      return [];
    } finally {
      setRoomsLoading(false);
    }
  }, [onError]);

  // 加载消息（带竞态守卫）
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
      const isAuth = message.includes('未登录') || message.includes('登录已过期');
      onError(message, isAuth);
    } finally {
      if (!isStale()) {
        setMessagesLoading(false);
      }
    }
  }, [onError]);

  // Long Polling（顺序阻塞式）
  const pollFnRef = useRef<(ctx: LongPollContext) => Promise<ChatMessage[]>>(async () => []);
  const onMsgRef = useRef<(payload: ChatMessage[]) => void>(() => {});
  const pollFailRef = useRef<(err: unknown) => void>(() => {});

  pollFnRef.current = async () => {
    const room = activeRoomRef.current;
    if (!room) return [];
    return messageApi.list(room.id, { after_id: lastMessageIdRef.current });
  };
  onMsgRef.current = (list: ChatMessage[]) => {
    if (list.length === 0) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const fresh = list.filter((m) => !existingIds.has(m.id));
      if (fresh.length > 0) {
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, fresh[fresh.length - 1].id);
      }
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  };
  pollFailRef.current = (err: unknown) => {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('未登录') || message.includes('登录已过期')) {
      onError(message, true);
    }
  };

  useLongPolling<ChatMessage[]>({
    pollFn: (ctx) => pollFnRef.current(ctx).catch((e: unknown) => { pollFailRef.current(e); throw e; }),
    deps: [activeRoom?.id],
    onMessage: (payload) => onMsgRef.current(payload),
  });

  // 加载更多
  const loadMore = useCallback(async () => {
    const room = activeRoomRef.current;
    if (!room || messages.length === 0) return;
    setMessagesLoading(true);
    try {
      const firstId = messages[0].id;
      const list = await messageApi.list(room.id, { before_id: firstId, limit: PAGE_SIZE });
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
      // 静默
    } finally {
      setMessagesLoading(false);
    }
  }, [messages]);

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
    lastLoadRoomRef.current = null;
    try {
      const list = await loadRooms();
      const freshRoom = list.find((r) => r.id === room.id);
      if (!freshRoom) {
        onError('房间不存在或已下线', false);
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
        onJoined?.(room);
        const joinedList = await loadRooms();
        const joinedRoom = joinedList.find((r) => r.id === room.id);
        if (!joinedRoom) {
          onError('加入成功，但房间状态未同步，请重新选择', false);
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
      const isAuth = message.includes('未登录') || message.includes('登录已过期');
      onError(message, isAuth);
    } finally {
      joiningRef.current.delete(room.id);
    }
  }, [loadRooms, loadMessages, loadMembers, onError, onJoined]);

  // 退出房间
  const handleLeaveRoom = useCallback(async () => {
    const room = activeRoomRef.current;
    if (!room) return;
    try {
      await roomApi.leave(room.id);
      onLeft?.(room);
      activeRoomRef.current = null;
      setActiveRoom(null);
      setMessages([]);
      setMembers([]);
      await loadRooms();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : '退出失败', false);
    }
  }, [loadRooms, onError, onLeft]);

  // 发送消息
  const handleSend = useCallback(async (content: string, type: string) => {
    const room = activeRoomRef.current;
    if (!room) return;
    setSending(true);
    try {
      const msg = await messageApi.send(room.id, { content, type, reply_to: replyTo?.id || 0 });
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, msg.id);
      if (replyTo) setReplyTo(null);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : '发送失败', false);
    } finally {
      setSending(false);
    }
  }, [replyTo, onError]);

  // 摇骰子
  const handleDice = useCallback(() => {
    const n = 1 + Math.floor(Math.random() * 6);
    handleSend(String(n), 'dice');
  }, [handleSend]);

  // @提及
  const handleMention = useCallback((username: string) => {
    insertTextRef.current?.(`@${username} `);
  }, []);

  // 引用回复
  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyTo(msg);
    insertTextRef.current?.(`@${msg.username} `);
  }, []);

  // 消息反应
  const handleReact = useCallback(async (msgId: number, emoji: string) => {
    const room = activeRoomRef.current;
    if (!room) return;
    try {
      const res = await messageApi.react(room.id, msgId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, reactions: res.reactions } : m)));
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : '操作失败', false);
    }
  }, [onError]);

  // 撤回消息
  const handleRecall = useCallback(async (msg: ChatMessage) => {
    const room = activeRoomRef.current;
    if (!room) return;
    try {
      await socialApi.recallRoomMessage(room.id, msg.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_recalled: true, content: '' } : m))
      );
      onRecalled?.();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : '撤回失败', false);
    }
  }, [onError, onRecalled]);

  // 房间更新
  const handleRoomUpdated = useCallback((updated: Room) => {
    setActiveRoom((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  }, []);

  // 成员变更
  const handleMembersChanged = useCallback(async () => {
    const room = activeRoomRef.current;
    if (room) {
      await loadMembers(room.id);
      await loadRooms();
    }
  }, [loadMembers, loadRooms]);

  // 初始化
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // 心跳
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const beat = () => messageApi.heartbeat().catch(() => {});
    beat();
    heartbeatTimerRef.current = setInterval(beat, 60000);
    return () => { if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current); };
  }, []);

  return {
    rooms,
    roomsLoading,
    activeRoom,
    setActiveRoom,
    messages,
    messagesLoading,
    hasMore,
    members,
    membersLoading,
    sending,
    replyTo,
    setReplyTo,
    loadRooms,
    loadMessages,
    loadMore,
    loadMembers,
    handleJoinRoom,
    handleLeaveRoom,
    handleSend,
    handleReact,
    handleRecall,
    handleDice,
    handleMention,
    handleReply,
    handleRoomUpdated,
    handleMembersChanged,
    insertTextRef,
    activeRoomRef,
  };
}
