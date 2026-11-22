import { useCallback, useEffect, useRef, useState } from 'react';
import { renderBBCode, resolveMessageType, hasBbcodeMarkup } from '../lib/bbcode';
import { socialApi, type SearchResultItem } from '../lib/api';
import {
  Loader2,
  Send,
  Smile,
  X,
  Dices,
  Hand,
  Search,
  Undo2,
  Reply as ReplyIcon,
  MessageSquare,
  Code2,
  Type,
  Images,
} from 'lucide-react';
import type { Conversation, PrivateMessage, MessageReaction } from '../types';
import { conversationApi } from '../lib/api';
import { useLongPolling, type LongPollContext } from '../lib/useLongPolling';
import { playMessageSound } from '../lib/sound';
import { Avatar } from './Avatar';
import { DiceIcon } from './DiceIcon';
import { useApp } from '../lib/AppContext';
import { MessageActionMenu, useMessageActionTrigger } from './MessageActionMenu';
import { EmojiPicker } from './EmojiPicker';
import { MemePicker } from './MemePicker';
import { ForwardDialog } from './ForwardDialog';
import { ReportDialog } from './ReportDialog';

const PAGE_SIZE = 50;

interface PrivateChatViewProps {
  targetUserId?: number | null;
  activeConv?: Conversation | null;
  onClearTarget?: () => void;
  onBack?: () => void;
  onMessageSent?: () => void;
  currentUserId: number;
}

export function PrivateChatView({ targetUserId, activeConv: propActiveConv, onBack, onMessageSent, currentUserId }: PrivateChatViewProps) {
  const { addToast } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  // 发送 in-flight 守卫（ref 同步判断，避免快速双击 Enter/点「发送」连发两条）
  const sendingRef = useRef(false);
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'text' | 'bbcode'>('text');
  const [listLoading, setListLoading] = useState(false);
  const [showListMobile, setShowListMobile] = useState(true);
  // 消息搜索
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);
  const [searchError, setSearchError] = useState('');

  const lastMsgIdRef = useRef<number>(0);
  // 进入会话的消息基线：只播 id 大于基线的对方消息（进入时拉取的历史不响铃）
  const baselineMsgIdRef = useRef<number>(0);
  // 表情反应竞态守卫：per-msg 请求序号（快速连点多表情时只应用最新返回）
  const reactSeqRef = useRef<Map<number, number>>(new Map());
  // 消息滚动容器与近底状态（距底 <160px 才自动滚底）
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 会话列表加载竞态守卫（多次触发 loadConversations 时丢弃旧结果）
  const listLoadSeqRef = useRef(0);

  // 消息加载竞态守卫：requestId 递增 + activeConv 快照（ref 避免闭包过期）
  const loadMsgRequestIdRef = useRef(0);
  const activeConvRef = useRef<Conversation | null>(null);
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  const [showEmoji, setShowEmoji] = useState(false);
  const [showMeme, setShowMeme] = useState(false);
  const [replyTo, setReplyTo] = useState<PrivateMessage | null>(null);
  const [forwardMsg, setForwardMsg] = useState<PrivateMessage | null>(null);
  const [reportMsg, setReportMsg] = useState<PrivateMessage | null>(null);
  const [forwarding, setForwarding] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [actionMenu, setActionMenu] = useState<{
    open: boolean;
    pos: { x: number; y: number } | null;
    msg: PrivateMessage | null;
  }>({ open: false, pos: null, msg: null });

  // 加载会话列表
  const loadConversations = useCallback(async () => {
    setListLoading(true);
    const requestId = ++listLoadSeqRef.current;
    try {
      // 8s 超时兜底：单线程后端被长轮询/慢请求堵住时，避免骨架无限卡住
      const list = await conversationApi.list();
      if (requestId !== listLoadSeqRef.current) return; // 已有更新的重载请求，丢弃
      setConversations(list);
    } catch {
      // 静默（后端暂不可用时保持上次数据，不清空）
    } finally {
      if (requestId === listLoadSeqRef.current) {
        setListLoading(false);
      }
    }
  }, []);

  // 加载某个会话的消息（带竞态守卫：requestId 失配或会话已切换则丢弃结果）
  const loadMessages = useCallback(async (convId: number) => {
    const requestId = ++loadMsgRequestIdRef.current;
    const isStale = () => requestId !== loadMsgRequestIdRef.current || convId !== activeConvRef.current?.id;
    setMessagesLoading(true);
    try {
      const list = await conversationApi.messages(convId, { limit: PAGE_SIZE });
      if (isStale()) return;
      setMessages(list);
      lastMsgIdRef.current = list.length > 0 ? list[list.length - 1].id : 0;
      // 基线：进入会话时设定，只比它新的对方消息才响铃
      baselineMsgIdRef.current = lastMsgIdRef.current;
    } catch (err) {
      if (isStale()) return;
      addToast(err instanceof Error ? err.message : '加载私聊消息失败', 'error');
    } finally {
      if (!isStale()) {
        setMessagesLoading(false);
      }
    }
  }, [addToast]);

  // 增量拉取新消息（顺序阻塞式 Long Polling，替代原 3s 固定间隔 setInterval）
  // pollFn / onMessage 以 ref 持有最新闭包，保证 hook 传入稳定引用
  const pollFnRef = useRef<(ctx: LongPollContext) => Promise<PrivateMessage[]>>(async () => {
    if (!activeConv) return [];
    return conversationApi.messages(activeConv.id, { after_id: lastMsgIdRef.current });
  });
  const onMsgRef = useRef<(payload: PrivateMessage[], ctx: LongPollContext) => void>(() => {});
  pollFnRef.current = async (ctx) => {
    if (!activeConv) return [];
    void ctx;
    return conversationApi.messages(activeConv.id, { after_id: lastMsgIdRef.current });
  };
  onMsgRef.current = (list) => {
    if (list.length === 0) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const fresh = list.filter((m) => !existingIds.has(m.id));
      if (fresh.length === 0) return prev;
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, fresh[fresh.length - 1].id);
      const merged = [...prev, ...fresh];
      merged.sort((a, b) => a.id - b.id); // 按 id 升序，防止乱序追加
      return merged;
    });
    // 提示音：仅「真正新于基线 且 对方发送」的消息才响（进入时拉取的历史不响；
    // 自己发的不响）。响铃后把基线推进到最新，后续只响更新的消息。
    const hasGenuineNew = list.some((m) => m.sender_id !== currentUserId && m.id > baselineMsgIdRef.current);
    if (hasGenuineNew) {
      baselineMsgIdRef.current = list.reduce((mx, m) => Math.max(mx, m.id), baselineMsgIdRef.current);
      playMessageSound();
    }
  };

  useLongPolling<PrivateMessage[]>({
    pollFn: (ctx) => pollFnRef.current(ctx),
    deps: [activeConv?.id],
    onMessage: (payload, ctx) => onMsgRef.current(payload, ctx),
  });

  // 初始化
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 当外部指定目标用户时，创建/打开会话
  useEffect(() => {
    if (propActiveConv) {
      setActiveConv(propActiveConv);
      setShowListMobile(false);
      loadMessages(propActiveConv.id);
      return;
    }
    if (!targetUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await conversationApi.create(targetUserId);
        await loadConversations();
        const found = (await conversationApi.list()).find((c) => c.other_id === targetUserId);
        if (!cancelled) {
          if (found) {
            setActiveConv(found);
            setShowListMobile(false);
            await loadMessages(found.id);
          } else {
            const tempConv: Conversation = {
              id: result.id,
              other_id: result.other_id,
              other_username: result.other_username,
              other_avatar: result.other_avatar,
              other_online: result.other_online,
              last_message: '',
              last_message_time: 0,
              last_message_fmt: '',
              unread: 0,
              update_time: result.create_time,
            };
            setActiveConv(tempConv);
            setShowListMobile(false);
            await loadMessages(tempConv.id);
          }
          onBack?.();
        }
      } catch (err) {
        if (!cancelled) {
          addToast(err instanceof Error ? err.message : '创建私聊失败', 'error');
        }
        onBack?.();
      }
    })();
    return () => { cancelled = true; };
  }, [targetUserId, loadConversations, loadMessages, addToast, onBack]);

  // 选择会话
  const handleSelectConv = async (c: Conversation) => {
    if (activeConv?.id === c.id) return;
    setActiveConv(c);
    setMessages([]);
    lastMsgIdRef.current = 0;
    setShowListMobile(false);
    await loadMessages(c.id);
    setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)));
  };

  // 轮询当前会话新消息
  // 定期刷新会话列表
  useEffect(() => {
    listPollRef.current = setInterval(loadConversations, 10000);
    return () => { if (listPollRef.current) clearInterval(listPollRef.current); };
  }, [loadConversations]);

  // 自动滚动：仅当用户停留在近底位置时才滚底，避免打断向上翻阅
  // 首次加载用 auto（瞬时）：smooth 动画会被后加载的图片/布局变化打断，停在列表中间
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (bottomRef.current && nearBottomRef.current) {
      const behavior: ScrollBehavior = didInitialScrollRef.current ? 'smooth' : 'auto';
      bottomRef.current.scrollIntoView({ behavior });
      didInitialScrollRef.current = true;
    }
  }, [messages.length]);

  // 富文本气泡内容后加载（表情包 <img> 懒加载撑高）导致列表变高时：
  // 若用户仍在近底，重新贴底；否则不动（不打断翻阅）。
  const handleBubbleGrew = useCallback((msgId: number) => {
    void msgId;
    if (nearBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, []);
  const handleBubbleGrewRef = useRef(handleBubbleGrew);
  handleBubbleGrewRef.current = handleBubbleGrew;

  const handleMessagesScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  // 发送消息
  // 消息搜索（防抖）
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doSearch = (kw: string) => {
    const q = kw.trim();
    if (!activeConv) return;
    if (q.length < 2) { setSearchError('至少输入 2 个字符'); setSearchResults(null); return; }
    setSearching(true);
    setSearchError('');
    socialApi.searchConvMessages(activeConv.id, q)
      .then((r) => setSearchResults(r.results))
      .catch((e) => setSearchError(e instanceof Error ? e.message : '搜索失败'))
      .finally(() => setSearching(false));
  };
  const onKeywordChange = (v: string) => {
    setKeyword(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = v.trim();
    if (q.length >= 2) searchTimerRef.current = setTimeout(() => doSearch(v), 400);
    else { setSearchResults(null); setSearchError(''); }
  };
  const closeSearch = () => { setSearchOpen(false); setKeyword(''); setSearchResults(null); setSearchError(''); };

  // 拍一拍
  const handlePat = async () => {
    if (!activeConv) return;
    try {
      const r = await socialApi.pat(activeConv.id);
      setMessages((prev) => [...prev, {
        id: Date.now(),
        conversation_id: activeConv.id,
        sender_id: currentUserId,
        content: '',
        type: 'pat',
        is_read: 0,
        create_time: r.pat_time,
        create_time_fmt: '',
        reply_to: 0,
        status: 0,
        is_self: true,
        reactions: [],
        reply: null,
        is_recalled: false,
        username: '',
        avatar: '',
      } as any]);
    } catch (e) {
      addToast(e instanceof Error ? e.message : '拍一拍失败', 'error');
    }
  };

  // 撤回自己的私聊消息
  const handleRecall = async (msg: any) => {
    if (!activeConv) return;
    try {
      await socialApi.recallPrivateMessage(activeConv.id, msg.id);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_recalled: true, content: '' } : m)));
      addToast('消息已撤回', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : '撤回失败', 'error');
    }
  };

  // 摇骰子（ref 连点锁 800ms：sending 是 state 更新有延迟，同帧双击挡不住；
  // 后端 2 秒同内容去重兜底）
  const diceLockRef = useRef(false);
  const handleDice = () => {
    if (!activeConv || sending || diceLockRef.current) return;
    diceLockRef.current = true;
    setTimeout(() => { diceLockRef.current = false; }, 800);
    const n = 1 + Math.floor(Math.random() * 6);
    (async () => {
      try {
        const m = await conversationApi.send(activeConv.id, { content: String(n), type: 'dice' });
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        lastMsgIdRef.current = Math.max(lastMsgIdRef.current, m.id);
      } catch (e) {
        addToast(e instanceof Error ? e.message : '发送失败', 'error');
      }
    })();
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || !activeConv) return;
    if (sendingRef.current) return; // 正在发送，忽略重复触发
    sendingRef.current = true;
    setSending(true);
    try {
      const sendType = resolveMessageType(trimmed, mode);
      const msg = await conversationApi.send(activeConv.id, { content: trimmed, type: sendType, reply_to: replyTo?.id || 0 });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, msg.id);
      setContent('');
      // 发送后强制贴底：恢复近底标记并瞬时滚到底部（避免 smooth 动画被后加载图片打断而停在中途）
      nearBottomRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      if (replyTo) setReplyTo(null);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, last_message: trimmed, last_message_time: msg.create_time, last_message_fmt: new Date(msg.create_time * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-') }
            : c,
        ),
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : '发送失败', 'error');
    } finally {
      sendingRef.current = false;
      setSending(false);
      if (onMessageSent) onMessageSent();
    }
  };

  // 直接发送一条表情包（独立消息，不走输入框）：点 MemePicker 即发
  const sendMeme = async (url: string) => {
    if (!activeConv || sendingRef.current) return;
    const c = `[img]${url}[/img]`;
    sendingRef.current = true;
    setSending(true);
    try {
      const msg = await conversationApi.send(activeConv.id, { content: c, type: 'bbcode', reply_to: replyTo?.id || 0 });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, msg.id);
      // 贴底
      nearBottomRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      if (replyTo) setReplyTo(null);
      setConversations((prev) =>
        prev.map((x) =>
          x.id === activeConv.id
            ? { ...x, last_message: c, last_message_time: msg.create_time, last_message_fmt: new Date(msg.create_time * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-') }
            : x,
        ),
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : '发送失败', 'error');
    } finally {
      sendingRef.current = false;
      setSending(false);
      if (onMessageSent) onMessageSent();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 消息反应
  const handleReact = async (msgId: number, emoji: string) => {
    if (!activeConv) return;
    // 竞态守卫：同一消息快速连点多个表情时，只应用最新一次返回，避免旧数据覆盖
    const seq = (reactSeqRef.current.get(msgId) ?? 0) + 1;
    reactSeqRef.current.set(msgId, seq);
    try {
      const res = await conversationApi.react(activeConv.id, msgId, emoji);
      if (reactSeqRef.current.get(msgId) !== seq) return;
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, reactions: res.reactions } : m)));
    } catch (err) {
      if (reactSeqRef.current.get(msgId) !== seq) return;
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  // 引用回复
  const handleReply = (msg: PrivateMessage) => {
    setReplyTo(msg);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  // 转发
  const handleForward = (msg: PrivateMessage) => {
    setForwardMsg(msg);
  };

  const handleConfirmForward = async (target: { type: 'room' | 'private'; id: number; name: string }) => {
    if (!forwardMsg) return;
    setForwarding(true);
    try {
      const content = `【转发】${forwardMsg.content}`;
      if (target.type === 'private') {
        await conversationApi.send(target.id, { content, type: forwardMsg.type });
        addToast(`已转发到 ${target.name}`, 'success');
      } else {
        addToast('请从聊天室转发到房间', 'info');
      }
      setForwardMsg(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '转发失败', 'error');
    } finally {
      setForwarding(false);
    }
  };

  // 举报
  const handleReport = (msg: PrivateMessage) => {
    setReportMsg(msg);
  };

  // 收集被举报消息的前后各 5 条作为 evidence（供反馈页附带）
  const collectEvidence = useCallback((msg: PrivateMessage) => {
    const idx = messages.findIndex((m) => m.id === msg.id);
    const from = Math.max(0, idx - 5);
    const to = Math.min(messages.length, idx + 6);
    return messages.slice(from, to).map((m) => ({
      id: m.id,
      username: m.username,
      content: m.content.slice(0, 100),
      create_time_fmt: m.create_time_fmt,
      is_self: m.is_self,
    }));
  }, [messages]);

  const handleConfirmReport = async (reason: string) => {
    if (!reportMsg || !activeConv) return;
    setReporting(true);
    try {
      await conversationApi.report(activeConv.id, reportMsg.id, reason);
      addToast('举报已提交', 'success');
      setReportMsg(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '举报失败', 'error');
    } finally {
      setReporting(false);
    }
  };

  // 插入 Emoji
  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((c) => c + emoji);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="flex h-full" style={{ background: 'var(--color-bg)' }}>
      {/* 会话列表 - 移动端显示 */}
      <div
        className={`${showListMobile ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-72 border-r`}
        style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <MessageSquare size={16} /> 私聊
            </h2>
            {onBack && (
              <button onClick={onBack} className="btn btn-sm" title="返回聊天室列表">
                <span className="hidden lg:inline">返回</span>
              </button>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>互相关注即可发起私聊</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {listLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              暂无私聊会话
              <br />
              <span className="text-xs">前往通讯录发起私聊</span>
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConv?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectConv(c)}
                  className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                  style={isActive ? { background: 'var(--color-primary-light)', borderLeft: '3px solid var(--color-primary)' } : { borderLeft: '3px solid transparent' }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--color-hover-bg)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Avatar username={c.other_username} avatar={c.other_avatar} size={40} online={c.other_online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{c.other_username}</span>
                      {c.last_message_fmt && <span className="text-[10px] ml-2" style={{ color: 'var(--color-text-muted)' }}>{c.last_message_fmt}</span>}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-light)' }}>{c.last_message || '开始对话吧'}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 ml-1" style={{ background: 'var(--color-error)', color: '#FFFFFF', minWidth: 18, textAlign: 'center' }}>
                      {c.unread > 99 ? '99+' : c.unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 消息区 */}
      <div className={`${showListMobile ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0 min-h-0`}>
        {activeConv ? (
          <>
            {/* 会话头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}>
              <div className="flex items-center gap-2 min-w-0">
                {/* 仅桌面端显示返回按钮；移动端由 ChatPage header 统一处理 */}
                {onBack && (
                  <button className="hidden md:flex btn btn-sm p-2" onClick={onBack} title="返回聊天室列表" style={{ minHeight: 36, minWidth: 36 }}>
                    <span className="text-lg">×</span>
                  </button>
                )}
                <Avatar username={activeConv.other_username} avatar={activeConv.other_avatar} size={32} online={activeConv.other_online} />
                <div className="min-w-0">
                  <h2 className="font-semibold truncate text-sm" style={{ color: 'var(--color-text)' }}>{activeConv.other_username}</h2>
                  <p className="text-[11px]" style={{ color: activeConv.other_online ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {activeConv.other_online ? '在线' : '离线'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="btn btn-sm p-2"
                  onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                  title={searchOpen ? '关闭搜索' : '搜索聊天记录'}
                  style={{ minHeight: 36, minWidth: 36 }}
                >
                  {searchOpen ? <X size={15} /> : <Search size={15} />}
                </button>
                <button className="btn btn-sm p-2" onClick={handlePat} title="拍一拍对方" style={{ minHeight: 36, minWidth: 36 }}>
                  <Hand size={15} />
                </button>
              </div>
            </div>

            {/* 搜索面板 */}
            {searchOpen && (
              <div className="border-b px-4 py-2" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}>
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
                {searchResults && (
                  <div className="mt-2 max-h-60 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>没有找到匹配的消息</p>
                    ) : (
                      searchResults.map((r) => (
                        <div key={r.id} className="flex items-start gap-2 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-divider)' }}>
                          <Avatar username={r.username} avatar={r.avatar} size={26} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{r.is_self ? '我' : r.username}</span>
                              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{r.create_time_fmt}</span>
                            </div>
                            {(r as SearchResultItem & { type?: string }).type === 'bbcode' || (r as SearchResultItem & { type?: string }).type === 'markdown' ? (
                              <div className="bbcode-body text-xs break-words max-w-[220px] my-0.5" style={{ color: 'var(--color-text-secondary)' }}
                                   dangerouslySetInnerHTML={{ __html: renderBBCode(r.content) }} />
                            ) : (
                              <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{r.content}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 消息列表 */}
            <div ref={scrollContainerRef} onScroll={handleMessagesScroll} className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
              {messages.length === 0 && !messagesLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--color-text-muted)' }}>
                  <p className="text-sm">还没有消息，发送一条消息开始私聊</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const showAvatar = idx === 0 || messages[idx - 1].sender_id !== m.sender_id;
                  return (
                    <PrivateBubble
                      key={m.id}
                      msg={m}
                      showAvatar={showAvatar}
                      currentUserId={currentUserId}
                      onActionTrigger={(x, y) => setActionMenu({ open: true, pos: { x, y }, msg: m })}
                      onReact={(emoji) => handleReact(m.id, emoji)}
                      onListGrew={handleBubbleGrewRef.current}
                    />
                  );
                })
              )}
              {messagesLoading && (
                <div className="flex justify-center py-3">
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* 输入区 */}
            <div className="p-3 border-t relative flex-shrink-0" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}>
              {replyTo && (
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2 text-xs" style={{ background: 'var(--color-card-alt)', borderLeft: '3px solid var(--color-primary)', color: 'var(--color-text-secondary)' }}>
                  <ReplyIcon size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <span className="font-medium" style={{ color: 'var(--color-primary)' }}>回复 {replyTo.username}:</span>
                  <span className="truncate flex-1">{replyTo.content.slice(0, 50)}</span>
                  <button onClick={() => setReplyTo(null)} className="p-0.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} title="取消回复">
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setMode('text')} className="btn btn-sm flex items-center gap-1" style={mode === 'text' ? { background: 'var(--color-primary)', color: '#FFFFFF', borderColor: 'var(--color-primary)' } : undefined}>
                  <Type size={13} /> 纯文本
                </button>
                <button onClick={() => setMode('bbcode')} className="btn btn-sm flex items-center gap-1" style={mode === 'bbcode' ? { background: 'var(--color-primary)', color: '#FFFFFF', borderColor: 'var(--color-primary)' } : undefined}>
                  <Code2 size={13} /> BBCode
                </button>
                {mode === 'bbcode' && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>支持 [b][i][u][color=红][url][img][quote][code] 等标签</span>}
              </div>
              <div className="flex items-end gap-2">
                <button onClick={() => setShowEmoji((s) => !s)} className="btn flex-shrink-0" style={{ minHeight: 44, minWidth: 44 }} title="表情" type="button">
                  <Smile size={18} />
                </button>
                <button
                  onClick={() => setShowMeme((s) => !s)}
                  className="btn flex-shrink-0"
                  style={{ minHeight: 44, minWidth: 44 }}
                  title="表情包"
                  type="button"
                >
                  <Images size={18} />
                </button>
                <button onClick={handleDice} disabled={sending} className="btn flex-shrink-0" style={{ minHeight: 44, minWidth: 44 }} title="摇骰子" type="button">
                  <Dices size={18} />
                </button>
                {showEmoji && (
                  <div className="absolute z-50" style={{ bottom: 72, left: 12 }}>
                    <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
                  </div>
                )}
                {showMeme && (
                  <div className="absolute z-50" style={{ bottom: 72, left: 60 }}>
                    <MemePicker
                      keyword=""
                      onPick={(url) => {
                        // 表情包点击后直接作为一条 bbcode 消息发送（不再插入输入框等待手动发）。
                        void sendMeme(url);
                        setShowMeme(false);
                      }}
                      onClose={() => setShowMeme(false)}
                    />
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === 'bbcode' ? '输入 BBCode 消息…' : '输入消息…'}
                  rows={1}
                  className="flex-1 resize-none"
                  style={{ minHeight: 44, maxHeight: 120 }}
                />
                <button onClick={handleSend} disabled={!content.trim() || sending} className="btn btn-primary" style={{ minHeight: 44 }}>
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  发送
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
            <MessageSquare size={48} className="mb-4" />
            <p className="text-sm">从左侧选择一个会话开始私聊</p>
          </div>
        )}
      </div>

      {/* 消息操作菜单 */}
      <MessageActionMenu
        open={actionMenu.open}
        anchor={actionMenu.pos}
        isSelf={actionMenu.msg?.sender_id === currentUserId}
        canDelete={false}
        onClose={() => setActionMenu((s) => ({ ...s, open: false }))}
        onReact={(emoji) => { if (actionMenu.msg) handleReact(actionMenu.msg.id, emoji); }}
        onReply={() => { if (actionMenu.msg) handleReply(actionMenu.msg); }}
        onForward={() => { if (actionMenu.msg) handleForward(actionMenu.msg); }}
        onReport={() => { if (actionMenu.msg) handleReport(actionMenu.msg); }}
        onCopy={() => { if (actionMenu.msg) navigator.clipboard?.writeText(actionMenu.msg.content).catch(() => {}); }}
        canRecall={!!actionMenu.msg && actionMenu.msg.is_self && !actionMenu.msg.is_recalled && (Date.now() - actionMenu.msg.create_time * 1000) < 120000}
        recallRemaining={actionMenu.msg ? Math.max(0, 120 - Math.floor(Date.now() / 1000 - actionMenu.msg.create_time)) : 0}
        onRecall={() => { if (actionMenu.msg) handleRecall(actionMenu.msg); }}
      />

      {/* 转发弹窗 */}
      <ForwardDialog
        open={!!forwardMsg}
        rooms={[]}
        conversations={conversations}
        onClose={() => setForwardMsg(null)}
        onForward={handleConfirmForward}
        forwarding={forwarding}
      />

      {/* 举报弹窗 */}
      <ReportDialog
        open={!!reportMsg}
        onClose={() => setReportMsg(null)}
        onConfirm={handleConfirmReport}
        submitting={reporting}
        feedbackJump={reportMsg ? { targetUser: reportMsg.username, context: collectEvidence(reportMsg) } : undefined}
      />
    </div>
  );
}

function PrivateBubble({ msg, showAvatar, currentUserId, onActionTrigger, onReact, onListGrew }: {
  msg: PrivateMessage;
  showAvatar: boolean;
  currentUserId: number;
  onActionTrigger: (x: number, y: number) => void;
  onReact: (emoji: string) => void;
  onListGrew?: (msgId: number) => void;
}) {
  // 富文本消息：BBCode 渲染（旧 markdown 类型兼容展示）
  // 兜底：type='text' 但内容含成对 BBCode 标签（早期表情包以 text 入库）也按 BBCode 渲染
  const isRich = msg.type === 'bbcode' || msg.type === 'markdown'
    || (msg.type === 'text' && hasBbcodeMarkup(msg.content));
  const richHtml = isRich ? renderBBCode(msg.content) : '';
  const time = msg.create_time_fmt.split(' ')[1] || '';
  const trigger = useMessageActionTrigger(onActionTrigger);

  return (
    <div className={`flex gap-2 mb-3 ${msg.is_self ? 'flex-row-reverse' : ''}`} onTouchStart={trigger.onTouchStart} onTouchEnd={trigger.onTouchEnd} onTouchMove={trigger.onTouchMove} onContextMenu={trigger.onContextMenu}>
      <div className="w-9 flex-shrink-0">
        {showAvatar && <Avatar username={msg.username} avatar={msg.avatar ?? null} size={36} />}
      </div>
      <div className={`flex flex-col max-w-[70%] ${msg.is_self ? 'items-end' : 'items-start'}`}>
        {showAvatar && (
          <div className={`flex items-center gap-2 mb-1 ${msg.is_self ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{msg.is_self ? '我' : msg.username}</span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{time}</span>
          </div>
        )}
        {msg.reply && (
          <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-xs max-w-full" style={{ background: 'var(--color-card-alt)', borderLeft: '3px solid var(--color-primary)', color: 'var(--color-text-secondary)' }}>
            <ReplyIcon size={11} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span className="font-medium" style={{ color: 'var(--color-primary)' }}>{msg.reply.username}:</span>
            <span className="truncate">{msg.reply.content_short}</span>
          </div>
        )}
        {msg.is_recalled ? (
          <div className="px-3 py-1.5 text-xs" style={{ background: 'var(--color-card-alt)', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border-light)', borderRadius: 3, fontStyle: 'italic' }}>
            {msg.is_self ? '你' : msg.username}撤回了一条消息
          </div>
        ) : msg.type === 'pat' ? (
          <div className="px-3 py-1.5 text-xs" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            👋 {msg.is_self ? '你拍了拍对方' : '对方拍了拍你'}
          </div>
        ) : msg.type === 'dice' ? (
          <div className="px-3 py-1.5 flex items-center justify-center rounded" style={{ background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-card-alt) 100%)', border: '1px solid var(--color-border)', margin: '4px 0' }}>
            <DiceIcon value={parseInt(msg.content, 10) || 1} size={28} strokeColor="var(--color-text-muted)" />
            <span className="text-xl font-bold ml-2" style={{ color: 'var(--color-primary)' }}>{msg.content || '?'}</span>
            <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>点</span>
          </div>
        ) : (
          <RichBubble
            isSelf={msg.is_self}
            isRich={isRich}
            richHtml={richHtml}
            text={msg.content}
            msgId={msg.id}
            onGrew={onListGrew}
          />
        )}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${msg.is_self ? 'justify-end' : 'justify-start'}`}>
            {msg.reactions.map((r) => (
              <ReactionBadge key={r.emoji} reaction={r} isSelf={r.users.includes(currentUserId)} onClick={() => onReact(r.emoji)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 富文本/普通消息气泡内容。
 * 首次渲染后若内容高度增大（BBCode 里的 <img> 表情包是懒加载，图片到达才撑高），
 * 通过 onGrew(msgId) 上抛，父级在「仍在近底」时重新贴底，
 * 解决「刚进入私聊停在列表中间」的问题。
 */
function RichBubble({ isSelf, isRich, richHtml, text, msgId, onGrew }: {
  isSelf: boolean;
  isRich: boolean;
  richHtml: string;
  text: string;
  msgId: number;
  onGrew?: (msgId: number) => void;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(0);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const growCb = onGrew;
    if (!growCb) return;
    const measure = () => {
      const h = el.offsetHeight;
      if (h > heightRef.current) {
        heightRef.current = h;
        growCb(msgId);
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // onGrew 每次渲染都是新闭包（父级经 ref 间接调用），只订阅一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      className="px-3 py-2 text-sm"
      style={isSelf ? { background: 'var(--color-primary)', color: '#FFFFFF' } : { background: 'var(--color-card-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border-light)' }}
    >
      {isRich ? (
        <div ref={innerRef} className="bbcode-body break-words" dangerouslySetInnerHTML={{ __html: richHtml }} />
      ) : (
        <span className="break-words whitespace-pre-wrap">{text}</span>
      )}
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
