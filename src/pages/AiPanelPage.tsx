import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Zap, MessageSquare, Trash2, Pencil,
  ArrowLeft, Bot, CheckCircle, AlertCircle, Menu,
  Plus, Search, X, ChevronDown, ChevronUp,
  User, Settings, Share2, Copy, Download,
  Edit3, Pin, Archive, RefreshCw, Star, Brain
} from 'lucide-react';
import { aiApi } from '../lib/api';
import type { AiChat, AiMsg, AiConfig } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../lib/AppContext';

interface AiPanelPageProps {}

// 快捷提示列表
const QUICK_PROMPTS = [
  { label: '精炼表达', prompt: '请用更精炼、直接的方式回答，只保留结论、关键依据和必要步骤。' },
  { label: '详细说明', prompt: '请补充背景、步骤、示例、边界条件和验证方法。' },
  { label: '总结要点', prompt: '请总结当前内容的核心要点，并按重要性排序。' },
  { label: '给出步骤', prompt: '请将解决方案整理为清晰、可执行的步骤。' },
  { label: '补充示例', prompt: '请结合一个具体示例进一步说明。' },
  { label: '检查问题', prompt: '请检查前面的结论是否存在遗漏、风险或不准确之处。' },
];

type SidebarFilter = 'all' | 'pinned' | 'archived';

export function AiPanelPage({ }: AiPanelPageProps) {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [chats, setChats] = useState<AiChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filter, setFilter] = useState<SidebarFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);

  const loadChats = useCallback(async () => {
    try {
      const list = await aiApi.listChats();
      setChats(list);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await aiApi.config();
      setConfig(cfg);
    } catch {
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
      if (activeChatId === id) setActiveChatId(null);
      addToast('会话已删除', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleCreateChat = async (chatMode: 'fast' | 'professional') => {
    try {
      const result = await aiApi.createChat(chatMode);
      setActiveChatId(result.id);
      setMobileMenuOpen(false);
      loadChats();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '创建失败', 'error');
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

  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || 
      (filter === 'pinned' && chat.pinned) ||
      (filter === 'archived' && chat.archived);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-page)' }}>
      {/* 侧边栏遮罩 */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 左侧边栏 - 对话历史 */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-200 ease-out md:relative md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ 
          background: 'var(--color-card)', 
          borderRight: '1px solid var(--color-divider)',
        }}
      >
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-sm flex items-center justify-center"
              style={{ background: 'var(--color-primary)' }}
            >
              <Bot size={18} color="#fff" />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>弧光 AI</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>智能对话</div>
            </div>
          </div>
          <button 
            className="md:hidden p-1" 
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 新建对话按钮 */}
        <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
          <button 
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{ 
              background: 'var(--color-primary)', 
              color: '#fff',
              borderRadius: 'var(--radius-sm, 3px)'
            }}
            onClick={() => handleCreateChat('fast')}
          >
            <Plus size={16} />
            <span>新建对话</span>
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="search"
              placeholder="搜索会话..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm"
              style={{ 
                background: 'var(--color-card-alt)', 
                border: '1px solid var(--color-border)', 
                color: 'var(--color-text)',
                borderRadius: 'var(--radius-sm, 3px)'
              }}
            />
          </div>
          <div className="flex gap-1 text-xs">
            {(['all', 'pinned', 'archived'] as SidebarFilter[]).map((f) => (
              <button
                key={f}
                className={`flex-1 py-1 px-2 rounded transition-all duration-150 ${
                  filter === f ? 'font-medium' : 'opacity-60 hover:opacity-100'
                }`}
                style={filter === f ? {
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary)'
                } : {
                  background: 'transparent',
                  color: 'var(--color-text-muted)'
                }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '全部' : f === 'pinned' ? '置顶' : '归档'}
              </button>
            ))}
          </div>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div 
                className="w-6 h-6 border-2 animate-spin rounded-full"
                style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }}
              />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>加载中...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 px-4 text-center">
              <div 
                className="w-12 h-12 rounded-sm flex items-center justify-center"
                style={{ background: 'var(--color-primary-light)' }}
              >
                <MessageSquare size={22} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {searchQuery ? '未找到会话' : '暂无对话'}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {searchQuery ? '尝试其他搜索词' : '开始与 AI 对话吧'}
                </div>
              </div>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`px-3 py-2.5 cursor-pointer transition-all duration-150 group ${
                  activeChatId === chat.id ? 'active' : 'hover:bg-[var(--color-hover-bg)]'
                }`}
                style={activeChatId === chat.id ? {
                  background: 'var(--color-primary-light)',
                  borderLeft: '3px solid var(--color-primary)',
                } : {}}
                onClick={() => {
                  setActiveChatId(chat.id);
                  setMobileMenuOpen(false);
                }}
              >
                <div className="flex items-start gap-2">
                  <Sparkles 
                    size={14} 
                    style={{ 
                      color: 'var(--color-primary)', 
                      marginTop: 2, 
                      flexShrink: 0,
                      opacity: activeChatId === chat.id ? 1 : 0.7
                    }} 
                  />
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
                        className="text-sm w-full p-0.5 px-1"
                        style={{ 
                          background: 'var(--color-card)', 
                          border: '1px solid var(--color-primary)', 
                          color: 'var(--color-text)', 
                          fontSize: '13px',
                          borderRadius: 'var(--radius-sm, 3px)'
                        }}
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="text-sm truncate font-medium"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {chat.title || '未命名对话'}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {chat.message_count} 条消息
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>·</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {chat.mode === 'professional' ? '专业' : '快速'}
                      </span>
                      {chat.pinned && (
                        <span className="text-xs" style={{ color: 'var(--color-warning)' }}>置顶</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1 hover:bg-[var(--color-hover-bg)] transition-colors"
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
                      className="p-1 hover:bg-[var(--color-error-light)] transition-colors"
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
            ))
          )}
        </div>

        {/* 侧边栏底部 */}
        <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {config?.has_api_key ? (
              <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
            ) : (
              <AlertCircle size={12} style={{ color: 'var(--color-warning)' }} />
            )}
            <span>{config?.model_name || 'AI 配置'}</span>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header 
          className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
        >
          <button
            className="md:hidden p-1.5"
            onClick={() => setMobileMenuOpen(true)}
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Menu size={18} />
          </button>
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div 
              className="w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-primary)' }}
            >
              <Bot size={15} color="#fff" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                弧光 AI 广场
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {activeChatId ? '对话中' : '准备就绪'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="inline-flex items-center gap-1 p-2 hover:bg-[var(--color-hover-bg)] transition-colors rounded-sm text-xs"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={() => navigate('/chat')}
              title="返回主站"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">返回主站</span>
            </button>
            <button
              className="p-2 hover:bg-[var(--color-hover-bg)] transition-colors rounded"
              style={{ color: 'var(--color-text-muted)' }}
              title="设置"
            >
              <Settings size={16} />
            </button>
            <button 
              className="p-2 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-colors rounded"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={() => handleCreateChat('fast')}
              title="新建对话"
            >
              <Plus size={16} />
            </button>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {activeChatId ? (
            <AiChatView
              key={activeChatId}
              chatId={activeChatId}
              onRefresh={() => loadChats()}
              onLogout={() => navigate('/login')}
            />
          ) : (
            <EmptyState onCreateChat={handleCreateChat} />
          )}
        </div>
      </main>
    </div>
  );
}

// 空状态页面
function EmptyState({ onCreateChat }: { onCreateChat: (mode: 'fast' | 'professional') => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div 
          className="w-20 h-20 mx-auto mb-6 rounded-sm flex items-center justify-center"
          style={{ background: 'var(--color-primary-light)' }}
        >
          <Bot size={36} style={{ color: 'var(--color-primary)' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          弧光 AI 广场
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-light)' }}>
          与弧光 AI 对话，探索无限可能。支持快速和专业两种回答模式。
        </p>
        <div className="grid grid-cols-2 gap-3 text-left">
          <button
            className="p-4 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ 
              background: 'var(--color-card)', 
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md, 8px)'
            }}
            onClick={() => onCreateChat('fast')}
          >
            <Zap size={20} style={{ color: 'var(--color-warning)', marginBottom: 8 }} />
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>快速模式</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>直接给出结论和可执行答案</div>
          </button>
          <button
            className="p-4 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ 
              background: 'var(--color-card)', 
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md, 8px)'
            }}
            onClick={() => onCreateChat('professional')}
          >
            <Sparkles size={20} style={{ color: 'var(--color-primary)', marginBottom: 8 }} />
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>专业模式</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>结构化分析，补充风险和验证方案</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// AI 聊天视图组件
function AiChatView({ chatId, onRefresh, onLogout }: { chatId: number; onRefresh: () => void; onLogout?: () => void }) {
  const { addToast } = useApp();
  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<{ title: string; mode: string; deep_thinking: number } | null>(null);
  const [mode, setMode] = useState<'fast' | 'professional'>('fast');
  const [deepThinking, setDeepThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const [showResponseControls, setShowResponseControls] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 进行中的流式读取器（卸载/切换会话时中止）
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const loadChatSeqRef = useRef(0);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadChat = useCallback(async () => {
    const seq = ++loadChatSeqRef.current;
    try {
      const data = await aiApi.getChat(chatId);
      if (seq !== loadChatSeqRef.current) return;
      setSendError(null);
      setChatInfo(data);
      setMessages(data.messages || []);
      if (data.mode) setMode(data.mode as 'fast' | 'professional');
      if (data.deep_thinking) setDeepThinking(!!data.deep_thinking);
    } catch {
      if (seq !== loadChatSeqRef.current) return;
      addToast('加载失败', 'error');
    }
  }, [chatId, addToast]);

  useEffect(() => { loadChat(); }, [loadChat]);

  // 卸载时中止进行中的流式读取，避免串台写入其他会话
  useEffect(() => {
    return () => {
      streamReaderRef.current?.cancel().catch(() => {});
      streamReaderRef.current = null;
    };
  }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg: AiMsg = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      mode,
      deep_thinking: deepThinking ? 1 : 0,
      create_time: Math.floor(Date.now() / 1000)
    };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput('');
    setSending(true);
    setStreamingContent('');
    setSendError(null);
    try {
      const events = await aiApi.streamChat(
        [...messages, userMsg].map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          mode: m.mode,
          deep_thinking: m.deep_thinking,
          create_time: m.create_time
        })),
        mode,
        deepThinking
      );
      if (!events) throw new Error('流式响应为空');
      const reader = events.getReader();
      streamReaderRef.current = reader;
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';
      let streamErrorMsg: string | null = null;
      // 解析单行 SSE 数据；JSON 坏行静默跳过；服务端错误行记录后终止
      const processLine = (rawLine: string) => {
        const line = rawLine.trim();
        if (!line.startsWith('data: ')) return;
        let parsed: { content?: string; done?: boolean; error?: string };
        try {
          parsed = JSON.parse(line.slice(6));
        } catch {
          return;
        }
        if (parsed.error) {
          streamErrorMsg = parsed.error;
          return;
        }
        if (parsed.content) {
          assistantContent += parsed.content;
          setStreamingContent(assistantContent);
        }
      };
      try {
        while (!streamErrorMsg) {
          const { done, value } = await reader.read();
          if (done) break;
          // chunk 追加进缓冲区，按 \n 切分，最后一段留作残行
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) processLine(line);
        }
        // 流结束后处理缓冲区中剩余的无换行尾行
        if (!streamErrorMsg && buffer.trim()) processLine(buffer);
        void decoder.decode();
      } finally {
        streamReaderRef.current = null;
      }
      if (streamErrorMsg) {
        try { await reader.cancel(); } catch { /* 流已结束则忽略 */ }
        setSendError(streamErrorMsg);
        throw new Error(streamErrorMsg);
      }
      if (assistantContent) {
        const assistantMsg: AiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: assistantContent,
          mode,
          deep_thinking: deepThinking ? 1 : 0,
          create_time: Math.floor(Date.now() / 1000)
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setShowQuickPrompts(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col">
      {/* 聊天头部 */}
      <div 
        className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Bot size={16} style={{ color: 'var(--color-primary)' }} />
          <span className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
            {chatInfo?.title || '弧光 AI'}
          </span>
          <span 
            className="text-xs px-2 py-0.5 flex-shrink-0"
            style={{ 
              background: mode === 'professional' ? 'var(--color-primary-light)' : 'var(--color-warning-light)',
              color: mode === 'professional' ? 'var(--color-primary)' : 'var(--color-warning)'
            }}
          >
            {mode === 'professional' ? '专业' : '快速'}
          </span>
          {deepThinking && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
              <Brain size={10} />
              深度思考
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            className="p-1.5 hover:bg-[var(--color-hover-bg)] transition-colors rounded"
            style={{ color: 'var(--color-text-muted)' }}
            title="复制对话"
          >
            <Copy size={14} />
          </button>
          <button 
            className="p-1.5 hover:bg-[var(--color-hover-bg)] transition-colors rounded"
            style={{ color: 'var(--color-text-muted)' }}
            title="分享"
          >
            <Share2 size={14} />
          </button>
        </div>
      </div>

      {/* 响应控制栏 */}
      <div 
        className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0 transition-all duration-200"
        style={{ 
          borderColor: 'var(--color-divider)', 
          background: 'var(--color-card-alt)',
          display: showResponseControls ? 'flex' : 'none'
        }}
      >
        {/* 模式选择 */}
        <div className="flex items-center gap-1 p-0.5 rounded" style={{ background: 'var(--color-card)' }}>
          <button
            className={`px-3 py-1 text-xs font-medium rounded transition-all duration-150 ${
              mode === 'fast' ? 'active' : ''
            }`}
            style={mode === 'fast' ? {
              background: 'var(--color-primary)',
              color: '#fff'
            } : {
              background: 'transparent',
              color: 'var(--color-text-muted)'
            }}
            onClick={() => setMode('fast')}
          >
            <Zap size={12} className="inline mr-1" />
            快速
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded transition-all duration-150 ${
              mode === 'professional' ? 'active' : ''
            }`}
            style={mode === 'professional' ? {
              background: 'var(--color-primary)',
              color: '#fff'
            } : {
              background: 'transparent',
              color: 'var(--color-text-muted)'
            }}
            onClick={() => setMode('professional')}
          >
            <Sparkles size={12} className="inline mr-1" />
            专业
          </button>
        </div>

        {/* 深度思考开关 */}
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all duration-150 ${
            deepThinking ? 'active' : ''
          }`}
          style={deepThinking ? {
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-primary)'
          } : {
            background: 'var(--color-card)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)'
          }}
          onClick={() => setDeepThinking(!deepThinking)}
        >
          <Brain size={12} />
          深度思考
        </button>

        {/* 快捷提示 */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all duration-150 hover:bg-[var(--color-hover-bg)]"
            style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            onClick={() => setShowQuickPrompts(!showQuickPrompts)}
          >
            <Sparkles size={12} />
            优化
            <ChevronDown size={10} className={`transition-transform duration-200 ${showQuickPrompts ? 'rotate-180' : ''}`} />
          </button>
          {showQuickPrompts && (
            <div 
              className="absolute top-full left-0 mt-1 py-1 w-48 z-10 shadow-lg"
              style={{ 
                background: 'var(--color-card)', 
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-sm, 3px)'
              }}
            >
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-hover-bg)] transition-colors"
                  style={{ color: 'var(--color-text)' }}
                  onClick={() => handleQuickPrompt(qp.prompt)}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          className="p-1.5 hover:bg-[var(--color-hover-bg)] rounded transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onClick={() => setShowResponseControls(false)}
          title="收起设置"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sendError && (
          <div
            className="flex items-center gap-2 px-3 py-2 text-sm"
            style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
          >
            <AlertCircle size={16} />
            <span className="flex-1">{sendError}</span>
            <button onClick={() => setSendError(null)} title="关闭" style={{ color: 'inherit' }}>
              <X size={14} />
            </button>
          </div>
        )}
        {messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div 
              className="w-16 h-16 rounded-sm flex items-center justify-center mb-4"
              style={{ background: 'var(--color-primary-light)' }}
            >
              <Bot size={28} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              开始与 AI 对话
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              输入消息，获取智能回答
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'rounded-tl-xl rounded-tr-lg rounded-bl-lg' 
                      : 'rounded-tr-xl rounded-tl-lg rounded-br-lg'
                  }`}
                  style={{ 
                    background: msg.role === 'user' 
                      ? 'var(--color-primary)' 
                      : 'var(--color-card-alt)',
                    color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                    border: msg.role !== 'user' ? '1px solid var(--color-divider)' : 'none'
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      className="markdown-body prose prose-sm max-w-none"
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {streamingContent && (
              <div className="flex justify-start">
                <div 
                  className="max-w-[85%] p-3 rounded-tr-xl rounded-tl-lg rounded-br-lg"
                  style={{ 
                    background: 'var(--color-card-alt)',
                    border: '1px solid var(--color-divider)'
                  }}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    className="markdown-body prose prose-sm max-w-none"
                  >
                    {streamingContent}
                  </ReactMarkdown>
                  <span 
                    className="inline-block w-1.5 h-4 ml-0.5 animate-pulse"
                    style={{ background: 'var(--color-primary)' }}
                  />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div 
        className="px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
      >
        <div className="flex gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full resize-none px-3 py-2.5 text-sm"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，Shift+Enter 换行..."
              disabled={sending}
              style={{ 
                background: 'var(--color-card-alt)', 
                border: '1px solid var(--color-border)', 
                color: 'var(--color-text)',
                borderRadius: 'var(--radius-sm, 3px)',
                maxHeight: '120px'
              }}
            />
          </div>
          <button
            className="btn btn-primary self-end px-4 py-2.5 flex items-center gap-2"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{ borderRadius: 'var(--radius-sm, 3px)' }}
          >
            {sending ? (
              <div 
                className="w-4 h-4 border-2 animate-spin rounded-full"
                style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
              />
            ) : (
              <Zap size={16} />
            )}
            <span>发送</span>
          </button>
        </div>
        <div className="text-center mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Enter 发送 · Shift + Enter 换行
        </div>
      </div>
    </div>
  );
}
