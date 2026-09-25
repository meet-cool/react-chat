import { useCallback, useEffect, useRef, useState } from 'react';
import { renderBBCode } from '../lib/bbcode';
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
} from 'lucide-react';
import type { Conversation, PrivateMessage, MessageReaction } from '../types';
import { conversationApi } from '../lib/api';
import { Avatar } from './Avatar';
import { useApp } from '../lib/AppContext';
import { MessageActionMenu, useMessageActionTrigger } from './MessageActionMenu';
import { EmojiPicker } from './EmojiPicker';
import { ForwardDialog } from './ForwardDialog';
import { ReportDialog } from './ReportDialog';

const POLL_INTERVAL = 3000;
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
  const [content, setContent] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [showListMobile, setShowListMobile] = useState(true);
  // 消息搜索
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);
  const [searchError, setSearchError] = useState('');

  const lastMsgIdRef = useRef<number>(0);
  // 轮询并发防护：上一轮请求未返回时跳过本轮，避免慢响应乱序覆盖
  const inFlightRef = useRef(false);
  // 消息滚动容器与近底状态（距底 <160px 才自动滚底）
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showEmoji, setShowEmoji] = useState(false);
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
    try {
      const list = await conversationApi.list();
      setConversations(list);
    } catch {
      // 静默
    } finally {
      setListLoading(false);
    }
  }, []);

  // 加载某个会话的消息
  const loadMessages = useCallback(async (convId: number) => {
    setMessagesLoading(true);
    try {
      const list = await conversationApi.messages(convId, { limit: PAGE_SIZE });
      setMessages(list);
      lastMsgIdRef.current = list.length > 0 ? list[list.length - 1].id : 0;
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载私聊消息失败', 'error');
    } finally {
      setMessagesLoading(false);
    }
  }, [addToast]);

  // 增量拉取新消息
  const pollNewMessages = useCallback(async () => {
    if (!activeConv || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const list = await conversationApi.messages(activeConv.id, { after_id: lastMsgIdRef.current });
      if (list.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = list.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          lastMsgIdRef.current = Math.max(lastMsgIdRef.current, fresh[fresh.length - 1].id);
          const merged = [...prev, ...fresh];
          merged.sort((a, b) => a.id - b.id); // 按 id 升序，防止乱序追加
          return merged;
        });
      }
    } catch {
      // 静默
    } finally {
      inFlightRef.current = false;
    }
  }, [activeConv]);

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
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeConv) return;
    pollNewMessages();
    pollRef.current = setInterval(pollNewMessages, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv, pollNewMessages]);

  // 定期刷新会话列表
  useEffect(() => {
    listPollRef.current = setInterval(loadConversations, 10000);
    return () => { if (listPollRef.current) clearInterval(listPollRef.current); };
  }, [loadConversations]);

  // 自动滚动：仅当用户停留在近底位置时才滚底，避免打断向上翻阅
  useEffect(() => {
    if (bottomRef.current && nearBottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

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

  // 摇骰子
  const handleDice = () => {
    if (!activeConv || sending) return;
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
    setSending(true);
    try {
      const msg = await conversationApi.send(activeConv.id, { content: trimmed, type: 'text', reply_to: replyTo?.id || 0 });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, msg.id);
      setContent('');
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
    try {
      const res = await conversationApi.react(activeConv.id, msgId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, reactions: res.reactions } : m)));
    } catch (err) {
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
              <div className="flex items-end gap-2">
                <button onClick={() => setShowEmoji((s) => !s)} className="btn flex-shrink-0" style={{ minHeight: 44, minWidth: 44 }} title="表情" type="button">
                  <Smile size={18} />
                </button>
                <button onClick={handleDice} disabled={sending} className="btn flex-shrink-0" style={{ minHeight: 44, minWidth: 44 }} title="摇骰子" type="button">
                  <Dices size={18} />
                </button>
                {showEmoji && (
                  <div className="absolute z-50" style={{ bottom: 72, left: 12 }}>
                    <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息…"
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
      />
    </div>
  );
}

function PrivateBubble({ msg, showAvatar, currentUserId, onActionTrigger, onReact }: {
  msg: PrivateMessage;
  showAvatar: boolean;
  currentUserId: number;
  onActionTrigger: (x: number, y: number) => void;
  onReact: (emoji: string) => void;
}) {
  // 富文本消息：BBCode 渲染（旧 markdown 类型兼容展示）
  const isRich = msg.type === 'bbcode' || msg.type === 'markdown';
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
          <div className="px-3 py-1.5 text-xs" style={{ background: 'var(--color-card-alt)', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border-light)', borderRadius: 8, fontStyle: 'italic' }}>
            {msg.is_self ? '你' : msg.username}撤回了一条消息
          </div>
        ) : msg.type === 'pat' ? (
          <div className="px-3 py-1.5 text-xs" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            👋 {msg.is_self ? '你拍了拍对方' : '对方拍了拍你'}
          </div>
        ) : msg.type === 'dice' ? (
          <div className="px-3 py-2 flex items-center gap-2" style={msg.is_self ? { background: 'var(--color-primary)', color: '#FFFFFF' } : { background: 'var(--color-card-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border-light)' }}>
            <span className="text-xl">🎲</span>
            <span className="text-lg font-bold">{msg.content || '…'}</span>
            <span className="text-xs" style={{ opacity: 0.7 }}>点</span>
          </div>
        ) : (
          <div className="px-3 py-2 text-sm" style={msg.is_self ? { background: 'var(--color-primary)', color: '#FFFFFF' } : { background: 'var(--color-card-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border-light)' }}>
            {isRich ? (
              <div className="bbcode-body break-words" dangerouslySetInnerHTML={{ __html: richHtml }} />
            ) : (
              <span className="break-words whitespace-pre-wrap">{msg.content}</span>
            )}
          </div>
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

function ReactionBadge({ reaction, isSelf, onClick }: { reaction: MessageReaction; isSelf: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs transition-colors" style={isSelf ? { background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' } : { background: 'var(--color-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)' }}>
      <span>{reaction.emoji}</span>
      <span className="font-medium">{reaction.count}</span>
    </button>
  );
}
