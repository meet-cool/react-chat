import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Clock,
  Zap,
  MessageSquare,
  Trash2,
  Pencil,
  Settings,
  ArrowLeft,
  Bot,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { aiApi } from '../lib/api';
import type { AiChat, AiMsg, AiConfig } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../lib/AppContext';

interface AiPanelPageProps {
  onBack: () => void;
}

export function AiPanelPage({ onBack }: AiPanelPageProps) {
  const { addToast } = useApp();
  const [chats, setChats] = useState<AiChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const loadChats = useCallback(async () => {
    try {
      const list = await aiApi.listChats();
      setChats(list);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await aiApi.config();
      setConfig(cfg);
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    loadChats();
    loadConfig();
  }, [loadChats, loadConfig]);

  const handleDelete = async (id: number) => {
    try {
      await aiApi.deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      addToast('会话已删除', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleRename = async (id: number, title: string) => {
    if (!title.trim()) return;
    try {
      await aiApi.renameChat(id, title.trim());
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: title.trim() } : c)));
      setEditingTitle(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '重命名失败', 'error');
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-page)' }}>
      {/* 顶部导航 */}
      <header
        className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
      >
        <button
          className="btn btn-sm"
          onClick={onBack}
          style={{ borderRadius: '3px' }}
        >
          <ArrowLeft size={14} />
          <span>返回</span>
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: 'var(--color-primary)' }}
          >
            <Bot size={15} color="#fff" />
          </div>
          <span className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
            弧光 AI 广场
          </span>
        </div>
        <div className="flex-1" />
        {config && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {config.has_api_key ? (
              <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
            ) : (
              <AlertCircle size={13} style={{ color: 'var(--color-warning)' }} />
            )}
            {config.model_name}
          </div>
        )}
      </header>

      {/* 主体内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：会话列表 */}
        <div
          className="w-72 flex-shrink-0 border-r overflow-y-auto"
          style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}
        >
          <div className="p-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              历史会话
            </div>
          </div>

          {loading ? (
            <div className="p-6 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 animate-spin rounded-full" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>加载中…</span>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-light)' }}>
                <MessageSquare size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>暂无对话</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>开始与弧光 AI 对话</p>
            </div>
          ) : (
            <div className="py-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group px-3 py-2.5 cursor-pointer transition-all duration-150 ${
                    activeChatId === chat.id ? 'active' : ''
                  }`}
                  style={
                    activeChatId === chat.id
                      ? { background: 'var(--color-primary-light)', borderLeft: '3px solid var(--color-primary)' }
                      : { background: 'transparent' }
                  }
                  onMouseEnter={(e) => {
                    if (activeChatId !== chat.id) e.currentTarget.style.background = 'var(--color-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (activeChatId !== chat.id) e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles size={14} style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      {editingTitle === chat.id ? (
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onBlur={() => handleRename(chat.id, newTitle)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(chat.id, newTitle);
                            if (e.key === 'Escape') setEditingTitle(null);
                          }}
                          className="text-sm w-full p-0.5"
                          style={{ background: 'var(--color-card)', border: '1px solid var(--color-primary)', color: 'var(--color-text)', fontSize: '13px' }}
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm truncate" style={{ color: 'var(--color-text)' }}>
                          {chat.title}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {chat.message_count} 条消息
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>·</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {chat.mode === 'professional' ? '专业' : '快速'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 rounded"
                        style={{ color: 'var(--color-text-muted)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTitle(chat.id);
                          setNewTitle(chat.title);
                        }}
                        title="重命名"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        className="p-1 rounded"
                        style={{ color: 'var(--color-error)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(chat.id);
                        }}
                        title="删除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：对话区域或欢迎页 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeChatId ? (
            <div className="flex-1 overflow-hidden">
              <AiChatView chatId={activeChatId} onRefresh={() => loadChats()} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--color-primary-light)' }}
                >
                  <Bot size={36} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                  弧光 AI 广场
                </h1>
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-light)' }}>
                  与弧光 AI 对话，探索无限可能。支持快速和专业两种回答模式。
                </p>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div
                    className="p-4"
                    style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                  >
                    <Zap size={18} style={{ color: 'var(--color-warning)', marginBottom: 8 }} />
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>快速模式</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>直接给出结论和可执行答案</div>
                  </div>
                  <div
                    className="p-4"
                    style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                  >
                    <Sparkles size={18} style={{ color: 'var(--color-primary)', marginBottom: 8 }} />
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>专业模式</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>结构化分析，补充风险和验证方法</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// AI 对话视图组件
function AiChatView({ chatId, onRefresh }: { chatId: number; onRefresh: () => void }) {
  const { addToast } = useApp();
  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<{ title: string; mode: string; deep_thinking: number } | null>(null);
  const [mode, setMode] = useState<'fast' | 'professional'>('fast');
  const [deepThinking, setDeepThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChat = useCallback(async () => {
    try {
      const data = await aiApi.getChat(chatId);
      setChatInfo(data);
      setMessages(data.messages || []);
    } catch {
      addToast('加载失败', 'error');
    }
  }, [chatId, addToast]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg: AiMsg = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      mode,
      deep_thinking: deepThinking ? 1 : 0,
      create_time: Math.floor(Date.now() / 1000),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput('');
    setSending(true);
    setStreamingContent('');

    try {
      const events = await aiApi.streamChat(
        [...messages, userMsg].map((m) => ({ id: m.id, role: m.role, content: m.content, mode: m.mode, deep_thinking: m.deep_thinking, create_time: m.create_time })),
        mode,
        deepThinking,
      );

      if (!events) throw new Error('流式响应为空');

      // 解析 SSE 流
      const reader = events.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                setStreamingContent(assistantContent);
              } else if (parsed.done) {
                // 流结束
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 保存 assistant 消息
      if (assistantContent) {
        const assistantMsg: AiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: assistantContent,
          mode,
          deep_thinking: deepThinking ? 1 : 0,
          create_time: Math.floor(Date.now() / 1000),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingContent('');
        onRefresh();
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '发送失败', 'error');
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  };

  if (!chatInfo) return null;

  return (
    <div className="h-full flex flex-col">
      {/* 顶部信息栏 */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
      >
        <div className="flex items-center gap-2">
          <Bot size={16} style={{ color: 'var(--color-primary)' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
            弧光 AI
          </span>
          <span
            className="text-xs px-2 py-0.5"
            style={{
              background: mode === 'professional' ? 'var(--color-primary-light)' : 'var(--color-warning-light)',
              color: mode === 'professional' ? 'var(--color-primary)' : 'var(--color-warning)',
            }}
          >
            {mode === 'professional' ? '专业' : '快速'}
          </span>
          {deepThinking && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              · 深度思考
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-xs"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'fast' | 'professional')}
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '12px', padding: '4px 8px' }}
          >
            <option value="fast">快速模式</option>
            <option value="professional">专业模式</option>
          </select>
          <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
            <input
              type="checkbox"
              checked={deepThinking}
              onChange={(e) => setDeepThinking(e.target.checked)}
              className="mr-0.5"
            />
            深度思考
          </label>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 ${
                msg.role === 'user'
                  ? 'rounded-tl-3xl rounded-tr-lg rounded-bl-lg'
                  : 'rounded-tr-3xl rounded-tl-lg rounded-br-lg'
              }`}
              style={{
                background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-card-alt)',
                color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                border: msg.role !== 'user' ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="markdown-body text-sm leading-relaxed"
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="flex justify-start">
            <div
              className="max-w-[80%] p-3 rounded-tr-3xl rounded-tl-lg rounded-br-lg"
              style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)' }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="markdown-body text-sm leading-relaxed"
              >
                {streamingContent}
              </ReactMarkdown>
              <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: 'var(--color-primary)' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div
        className="p-4 border-t flex-shrink-0"
        style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
      >
        <div className="flex gap-2">
          <textarea
            className="flex-1 resize-none"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息，Shift+Enter 换行…"
            disabled={sending}
            style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: '3px' }}
          />
          <button
            className="btn btn-primary self-end"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{ borderRadius: '3px', padding: '8px 16px' }}
          >
            {sending ? <span className="animate-spin">⏳</span> : <Zap size={16} />}
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
