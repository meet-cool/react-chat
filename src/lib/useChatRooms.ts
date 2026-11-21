import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room, ChatMessage, RoomMember } from '../types';
import { roomApi, messageApi, socialApi } from '../lib/api';
import { useLongPolling, type LongPollContext } from '../lib/useLongPolling';
import { playMessageSound } from './sound';

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
  handleSend: (content: string, type: string, onSent?: (msgId: number) => void) => Promise<void>;
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
  // opts 回调（onError 等）由调用方内联传入，每次渲染都是新引用。
  // 若直接进入 useCallback 依赖，loadRooms 会每次渲染重建 → 初始化 effect
  // [loadRooms] 每次渲染重跑 → 房间请求循环触发、roomsLoading 状态机被打乱卡死。
  // 因此用 ref 持有最新 opts：回调体读 optsRef.current（永远是最新闭包），
  // 而 useCallback 依赖保持稳定，回调身份不再随渲染变化。
  const optsRef = useRef(opts);
  optsRef.current = opts;

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
  // 轮询门闩：历史消息加载完成前不放行轮询（避免把历史当新消息响铃）
  const pollReadyRef = useRef(false);
  // 进入房间时的消息基线：只播 id 大于基线的他人消息
  const baselineIdRef = useRef(0);
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
      optsRef.current.onError(message, isAuth);
      return [];
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  // 加载消息（带竞态守卫）
  const loadMessages = useCallback(async (roomId: number) => {
    const requestId = ++loadMessagesRequestIdRef.current;
    const isStale = () =>
      requestId !== loadMessagesRequestIdRef.current || roomId !== activeRoomRef.current?.id;
    setMessagesLoading(true);
    // 历史加载完成前轮询不拉取/不响铃（避免把历史消息当新消息播放提示音）
    pollReadyRef.current = false;
    try {
      const list = await messageApi.list(roomId, { limit: PAGE_SIZE });
      if (isStale()) return;
      setMessages(list);
      lastMessageIdRef.current = list.length > 0 ? list[list.length - 1].id : 0;
      // 进入房间时的基线：只有 id 大于它的他人消息才算「新」并响铃
      baselineIdRef.current = lastMessageIdRef.current;
      setHasMore(list.length >= PAGE_SIZE);
      pollReadyRef.current = true; // 历史就位，放行轮询
    } catch (err: unknown) {
      if (isStale()) return;
      const message = err instanceof Error ? err.message : '加载消息失败';
      const isAuth = message.includes('未登录') || message.includes('登录已过期');
      optsRef.current.onError(message, isAuth);
      pollReadyRef.current = true; // 加载失败也放行，避免永久卡住
    } finally {
      if (!isStale()) {
        setMessagesLoading(false);
      }
    }
  }, []);

  // Long Polling（顺序阻塞式）
  const pollFnRef = useRef<(ctx: LongPollContext) => Promise<ChatMessage[]>>(async () => []);
  const onMsgRef = useRef<(payload: ChatMessage[]) => void>(() => {});
  const pollFailRef = useRef<(err: unknown) => void>(() => {});

  pollFnRef.current = async () => {
    const room = activeRoomRef.current;
    if (!room) return [];
    // 历史未加载完成前不拉取：避免用旧 lastMessageIdRef 把历史消息当新消息返回
    if (!pollReadyRef.current) return [];
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
    // 提示音：仅对「真正新于基线 且 他人发送」的消息响（进入时加载的历史不响；
    // 自己发的乐观插入也不响）。基线在 loadMessages 完成时设定，自己发消息会推进 lastMessageId。
    const hasGenuineNew = list.some((m) => !m.is_self && m.id > baselineIdRef.current);
    if (hasGenuineNew) {
      // 把基线推进到最新，后续长轮询只响更新的消息
      const maxNew = list.reduce((mx, m) => Math.max(mx, m.id), baselineIdRef.current);
      baselineIdRef.current = maxNew;
      playMessageSound();
    }
  };
  pollFailRef.current = (err: unknown) => {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('未登录') || message.includes('登录已过期')) {
      optsRef.current.onError(message, true);
    }
  };

  useLongPolling<ChatMessage[]>({
    pollFn: (ctx) => pollFnRef.current(ctx).catch((e: unknown) => { pollFailRef.current(e); throw e; }),
    deps: [activeRoom?.id],
    onMessage: (payload) => onMsgRef.current(payload),
  });

  // 加载更多（带竞态守卫：与 loadMessages 共用 requestId，房间切换后丢弃晚到结果）
  const loadMore = useCallback(async () => {
    const room = activeRoomRef.current;
    if (!room || messages.length === 0) return;
    // 入口校验：房间存在；游标用调用时刻的 messages[0].id（闭包），请求期间切房间则 stale 丢弃
    const requestId = ++loadMessagesRequestIdRef.current;
    const isStale = () =>
      requestId !== loadMessagesRequestIdRef.current || room.id !== activeRoomRef.current?.id;
    setMessagesLoading(true);
    try {
      const firstId = messages[0].id;
      const list = await messageApi.list(room.id, { before_id: firstId, limit: PAGE_SIZE });
      if (isStale()) return;
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
      if (!isStale()) {
        setMessagesLoading(false);
      }
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
        optsRef.current.onError('房间不存在或已下线', false);
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
        optsRef.current.onJoined?.(room);
        const joinedList = await loadRooms();
        const joinedRoom = joinedList.find((r) => r.id === room.id);
        if (!joinedRoom) {
          optsRef.current.onError('加入成功，但房间状态未同步，请重新选择', false);
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
      optsRef.current.onError(message, isAuth);
    } finally {
      joiningRef.current.delete(room.id);
    }
  }, [loadRooms, loadMessages, loadMembers]);

  // 退出房间
  const handleLeaveRoom = useCallback(async () => {
    const room = activeRoomRef.current;
    if (!room) return;
    try {
      await roomApi.leave(room.id);
      optsRef.current.onLeft?.(room);
      activeRoomRef.current = null;
      setActiveRoom(null);
      setMessages([]);
      setMembers([]);
      await loadRooms();
    } catch (err: unknown) {
      optsRef.current.onError(err instanceof Error ? err.message : '退出失败', false);
    }
  }, [loadRooms]);

  // 发送消息
  // 发送成功（后端确认插入）时调用 onSent —— 供调用方做「滚到底部」等后置动作；
  // 防重入：in-flight 期间（网络往返未结束）拒绝重复发送，避免快速双击 Enter / 点两次「发送」
  // 造成同一条内容连发两条。
  const sendingRef = useRef(false);
  const handleSend = useCallback(async (content: string, type: string, onSent?: (msgId: number) => void) => {
    if (sendingRef.current) return;
    const room = activeRoomRef.current;
    if (!room) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const msg = await messageApi.send(room.id, { content, type, reply_to: replyTo?.id || 0 });
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, msg.id);
      if (replyTo) setReplyTo(null);
      onSent?.(msg.id);
    } catch (err: unknown) {
      optsRef.current.onError(err instanceof Error ? err.message : '发送失败', false);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [replyTo]);

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
      optsRef.current.onError(err instanceof Error ? err.message : '操作失败', false);
    }
  }, []);

  // 撤回消息
  const handleRecall = useCallback(async (msg: ChatMessage) => {
    const room = activeRoomRef.current;
    if (!room) return;
    try {
      await socialApi.recallRoomMessage(room.id, msg.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_recalled: true, content: '' } : m))
      );
      optsRef.current.onRecalled?.();
    } catch (err: unknown) {
      optsRef.current.onError(err instanceof Error ? err.message : '撤回失败', false);
    }
  }, []);

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
