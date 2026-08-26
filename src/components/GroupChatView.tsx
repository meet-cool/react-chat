import { useCallback, useEffect, useRef, useState } from 'react';
import { UsersRound, LogOut, Megaphone, MicOff, Settings2, ChevronLeft, Loader2 } from 'lucide-react';
import type { GroupInfo, ChatMessage, GroupMember } from '../types';
import { groupApi } from '../lib/api';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { HashAvatar } from './HashAvatar';
import { GroupSettingsModal } from './GroupSettingsModal';

const POLL_INTERVAL_MS = 3000;

interface GroupChatViewProps {
  group: GroupInfo;
  currentUserId: number;
  onBack: () => void;
  onGroupUpdated: () => void;
  onToast: (msg: string) => void;
}

/**
 * 群聊视图：消息（长轮询）+ 成员抽屉（含管理操作）+ 群设置
 * 系统消息（加入/退出/禁言等）居中灰字展示，普通消息复用 MessageList。
 */
export function GroupChatView({ group, currentUserId, onBack, onGroupUpdated, onToast }: GroupChatViewProps) {
  const [detail, setDetail] = useState<GroupInfo>(group);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [mutedTip, setMutedTip] = useState(false);
  const lastIdRef = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // @提及插入通道：由 MessageInput 注册实现（照搬 ChatPage 的 useRef 持有模式）
  const insertTextRef = useRef<((text: string) => void) | null>(null);

  const myRole = detail.my_role || 'member';
  const isAdmin = myRole === 'owner' || myRole === 'admin';
  const isMuted = !!detail.my_muted;

  const loadHistory = useCallback(async (gid: number) => {
    setLoading(true);
    try {
      const list = await groupApi.messages(gid);
      setMessages(list);
      lastIdRef.current = list.length > 0 ? list[list.length - 1].id : 0;
      setHasMore(list.length >= 50);
    } catch (e: any) {
      onToast(e.message || '消息加载失败');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  const refreshDetail = useCallback(async (gid: number) => {
    try {
      const d = await groupApi.detail(gid);
      setDetail(d);
    } catch { /* 忽略 */ }
  }, []);

  const loadMembers = useCallback(async (gid: number) => {
    try {
      setMembers(await groupApi.members(gid));
    } catch { /* 非成员时忽略 */ }
  }, []);

  // 最新回调引用：长轮询 effect 只依赖 group.id，避免因父组件每次渲染新建的
  // onToast 等内联回调变化而反复重启轮询（否则每次渲染都会多 spawn 一个循环）
  const loadHistoryRef = useRef(loadHistory);
  const refreshDetailRef = useRef(refreshDetail);
  const loadMembersRef = useRef(loadMembers);
  useEffect(() => {
    loadHistoryRef.current = loadHistory;
    refreshDetailRef.current = refreshDetail;
    loadMembersRef.current = loadMembers;
  });

  // 初始化 + 长轮询
  useEffect(() => {
    // 局部取消令牌：effect 清理后旧循环不再继续，杜绝僵尸轮询
    let cancelled = false;
    const gid = group.id;
    loadHistoryRef.current(gid);
    refreshDetailRef.current(gid);
    loadMembersRef.current(gid);

    const loop = async () => {
      while (!cancelled) {
        try {
          const res = await groupApi.poll(gid, lastIdRef.current);
          if (cancelled) break; // 清理后到达的旧响应直接丢弃
          const incoming = res.messages || [];
          if (incoming.length > 0) {
            lastIdRef.current = incoming[incoming.length - 1].id;
            setMessages((prev) => {
              const known = new Set(prev.map((m) => m.id));
              const merged = [...prev, ...incoming.filter((m) => !known.has(m.id))];
              return merged;
            });
            // 系统消息（成员变动等）→ 刷新成员/详情
            if (incoming.some((m) => m.type === 'system')) {
              loadMembersRef.current(gid);
              refreshDetailRef.current(gid);
            }
          }
        } catch {
          // 网络异常时退避
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    };
    loop();

    return () => { cancelled = true; };
  }, [group.id]);

  // @提及：把 "@username " 插入输入框光标处
  const handleMention = useCallback((username: string) => {
    insertTextRef.current?.(`@${username} `);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (messages.length === 0) return;
    try {
      const older = await groupApi.messages(group.id, { before_id: messages[0].id });
      if (older.length > 0) setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length >= 50);
    } catch (e: any) {
      onToast(e.message || '加载更多失败');
    }
  }, [group.id, messages, onToast]);

  const handleSend = useCallback(async (content: string, type: string) => {
    if (isMuted) {
      setMutedTip(true);
      setTimeout(() => setMutedTip(false), 2000);
      return;
    }
    setSending(true);
    try {
      const msg = await groupApi.send(group.id, { content, type, reply_to: replyTo?.id || 0 });
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);
      setReplyTo(null);
    } catch (e: any) {
      onToast(e.message || '发送失败');
    } finally {
      setSending(false);
    }
  }, [group.id, isMuted, replyTo]);

  const handleQuit = useCallback(async () => {
    if (!window.confirm(`确定退出「${detail.name}」？`)) return;
    try {
      await groupApi.quit(group.id);
      onToast('已退出群聊');
      onBack();
      onGroupUpdated();
    } catch (e: any) {
      onToast(e.message || '退出失败');
    }
  }, [detail.name, group.id, onBack, onGroupUpdated, onToast]);

  const normalMessages = messages.filter((m) => m.type !== 'system');
  const systemMessages = messages.filter((m) => m.type === 'system');
  // 系统消息按时间穿插：简单方案——在列表尾部集中展示最近的系统消息
  const pendingCount = detail.pending_count || 0;

  return (
    <div className="flex-1 flex min-h-0 w-full">
      {/* 左列 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* 群头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <button className="btn btn-sm p-2" onClick={onBack} title="返回群列表" style={{ minHeight: 34, minWidth: 34 }}>
              <ChevronLeft size={16} />
            </button>
            <HashAvatar seed={detail.avatar_seed} size={38} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{detail.name}</h2>
                <span className="text-[10px] px-1 py-0.5 flex-shrink-0" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>群聊</span>
              </div>
              <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                {detail.member_count}/{detail.max_members} 人{isAdmin && pendingCount > 0 ? ` · ${pendingCount} 条待审批` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isMuted && (
              <span className="text-xs hidden sm:flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
                <MicOff size={12} /> 已被禁言
              </span>
            )}
            <button className="btn btn-sm items-center gap-1 hidden sm:flex" onClick={() => setShowMembers(true)} title="成员" style={{ minHeight: 34 }}>
              <UsersRound size={13} /><span className="hidden lg:inline">成员</span>
            </button>
            <button className="btn btn-sm items-center gap-1" onClick={() => setShowSettings(true)} title="群设置" style={{ minHeight: 34 }}>
              <Settings2 size={14} /><span className="hidden lg:inline">管理</span>
            </button>
            <button className="btn btn-sm btn-outline p-2" onClick={handleQuit} title="退出群聊" style={{ minHeight: 34, minWidth: 34 }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* 群公告 */}
        {detail.announcement ? (
          <div className="flex items-start gap-2 px-4 py-2 text-xs flex-shrink-0" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderBottom: '1px solid var(--color-divider)' }}>
            <Megaphone size={13} className="flex-shrink-0 mt-0.5" />
            <span className="break-words">{detail.announcement}</span>
          </div>
        ) : null}

        {/* 系统消息（最近 3 条） */}
        {systemMessages.length > 0 && (
          <div className="px-4 py-1.5 flex-shrink-0 overflow-hidden" style={{ background: 'var(--color-card-alt)', borderBottom: '1px solid var(--color-divider)', maxHeight: 64 }}>
            {systemMessages.slice(-3).map((m) => (
              <p key={m.id} className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>· {m.content}</p>
            ))}
          </div>
        )}

        {/* 消息列表 */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : (
          <MessageList
            messages={normalMessages}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            currentUserId={currentUserId}
            onMention={handleMention}
            onReply={setReplyTo}
            onViewProfile={(username) => { window.open(`/profile/${encodeURIComponent(username)}`, '_self'); }}
          />
        )}

        {/* 禁言提示 */}
        {mutedTip && (
          <div className="px-3 py-1.5 text-xs flex-shrink-0" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
            你已被禁言，无法发送消息
          </div>
        )}

        {/* 输入框（非成员/禁言时禁用） */}
        <div className="flex-shrink-0" style={{ opacity: isMuted ? 0.5 : 1 }}>
          <MessageInput
            onSend={handleSend}
            disabled={isMuted}
            sending={sending}
            insertTextRef={insertTextRef}
            replyTo={replyTo ? { id: replyTo.id, username: replyTo.username, content_short: replyTo.content.slice(0, 50) } : null}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
      </div>

      {/* 成员抽屉（桌面右侧 / 移动端悬浮） */}
      <aside
        className={`border-l flex flex-col flex-shrink-0 transition-all duration-200 ease-out ${
          showMembers
            ? 'fixed inset-y-0 right-0 z-50 w-60 h-full md:relative md:inset-auto md:h-auto'
            : 'hidden md:flex w-60'
        }`}
        style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--color-divider)' }}>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>成员 {members.length}</span>
          {showMembers && (
            <button className="btn btn-sm p-1.5 md:hidden" onClick={() => setShowMembers(false)} style={{ minHeight: 26, minWidth: 26 }}>×</button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2.5 px-3 py-2">
              <div className="relative">
                <HashAvatar seed={`user:${m.user_id}:${m.username}`} size={32} />
                {m.online && <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full" style={{ background: 'var(--color-success)', border: '1px solid var(--color-card)' }} />}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="text-xs truncate" style={{ color: 'var(--color-text)' }}>
                  {m.user_id === currentUserId ? '我' : m.username}
                </span>
                {m.role === 'owner' && <span className="text-[9px] px-1" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>群主</span>}
                {m.role === 'admin' && <span className="text-[9px] px-1" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>管理</span>}
                {m.muted && <span className="text-[9px] px-1" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>禁言</span>}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* 群管理弹窗 */}
      <GroupSettingsModal
        open={showSettings}
        group={detail}
        myRole={myRole}
        onClose={() => setShowSettings(false)}
        onGroupUpdated={() => { refreshDetail(group.id); loadMembers(group.id); onGroupUpdated(); }}
        onDissolved={() => { setShowSettings(false); onBack(); onGroupUpdated(); }}
        onError={onToast}
      />
    </div>
  );
}
