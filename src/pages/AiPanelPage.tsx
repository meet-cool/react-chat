import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Zap, MessageSquare, Trash2, Pencil,
  ArrowLeft, Bot, CheckCircle, AlertCircle, Menu,
  Plus, Search, X, ChevronDown, ChevronUp,
  Settings, Share2, Copy,
  Pin, PinOff, Archive, ArchiveRestore, Eraser,
  RefreshCw, ThumbsUp, ThumbsDown, MoreVertical, Brain
} from 'lucide-react';
import { aiApi } from '../lib/api';
import type { AiChat, AiMsg, AiConfig, AiDashboard } from '../types';
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

type SidebarFilter = 'all' | 'pinned';

// 列表/详情行的 status 为数字（0=active 1=archived）；status 端点入参为 'active'|'archived'
const isArchived = (chat: AiChat) =>
  chat.status === 1 || chat.status === 'archived';

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
  const [showArchived, setShowArchived] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [clearNonce, setClearNonce] = useState(0);
  // 草稿会话模式（新建对话未发首条消息前）；null=未处于草稿态
  const [draftMode, setDraftMode] = useState<'fast' | 'professional' | null>(null);

  // 会话管理：统一拉全量（含已归档），前端按 status 分组渲染
  const loadChats = useCallback(async (includeArchived = true) => {
    try {
      const list = await aiApi.listChats(includeArchived);
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

  // 把自动生成的标题同步到侧边栏列表
  const updateChatTitle = useCallback((id: number, title: string) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  // 配额仪表盘：进页面加载，每次对话 end 后由 AiChatView 触发刷新
  const [dashboard, setDashboard] = useState<AiDashboard | null>(null);
  const loadDashboard = useCallback(async () => {
    try {
      setDashboard(await aiApi.dashboard());
    } catch {
      // 静默：仪表盘不可用不影响主流程
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

  // 新建对话：进入草稿视图（chatId=0），首条消息以 conv_id=0 发送，
  // 由后端流式建会话并落库 user 消息（start 事件返回新 conv_id），
  // 这样「自动标题 / 重新生成」才有已落库的 user 前驱可用。
  const handleCreateChat = (chatMode: 'fast' | 'professional') => {
    setActiveChatId(null);
    setDraftMode(chatMode);
    setMobileMenuOpen(false);
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

  const handleTogglePin = async (chat: AiChat) => {
    const next = !chat.pinned;
    try {
      await aiApi.pinChat(chat.id, next);
      addToast(next ? '已置顶' : '已取消置顶', 'success');
      loadChats();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleToggleArchive = async (chat: AiChat) => {
    const archived = isArchived(chat);
    try {
      await aiApi.setChatStatus(chat.id, archived ? 'active' : 'archived');
      addToast(archived ? '已恢复' : '已归档', 'success');
      loadChats();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleDuplicate = async (chat: AiChat) => {
    try {
      const result = await aiApi.duplicateChat(chat.id);
      addToast('会话已复制', 'success');
      await loadChats();
      setActiveChatId(result.id);
      setMobileMenuOpen(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '复制失败', 'error');
    }
  };

  const handleClear = async (chat: AiChat) => {
    if (!window.confirm(`确定清空「${chat.title || '未命名对话'}」的全部消息？清空后不可恢复。`)) return;
    try {
      await aiApi.clearChat(chat.id);
      addToast('会话已清空', 'success');
      if (activeChatId === chat.id) setClearNonce((n) => n + 1);
      loadChats();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '清空失败', 'error');
    }
  };

  const activeChats = chats.filter((c) => !isArchived(c));
  const archivedChats = chats.filter((c) => isArchived(c));

  const filteredChats = activeChats.filter((chat) => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'pinned' && chat.pinned);
    return matchesSearch && matchesFilter;
  });

  // 已归档分组（默认折叠，前端按 status 分组渲染）
  const filteredArchived = showArchived
    ? archivedChats.filter((chat) =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="h-screen flex flex-row overflow-hidden" style={{ background: 'var(--color-bg-page)' }}>
      {/* 侧边栏遮罩 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 左侧边栏 - 移动端 fixed 浮层，桌面端静态侧栏占位 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-200 ease-out md:static md:translate-x-0 md:shrink-0 md:border-r ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--color-card)',
          borderColor: 'var(--color-divider)',
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
            {(['all', 'pinned'] as SidebarFilter[]).map((f) => (
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
                {f === 'all' ? '全部' : '置顶'}
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
          ) : filteredChats.length === 0 && archivedChats.length === 0 ? (
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
            <>
              {filteredChats.length === 0 && (
                <div className="flex items-center gap-2 px-3 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <MessageSquare size={14} />
                  <span>当前筛选下没有进行中的会话</span>
                </div>
              )}
              {filteredChats.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={activeChatId === chat.id}
                  editing={editingTitle === chat.id}
                  newTitle={newTitle}
                  openMenu={openMenuId === chat.id}
                  onOpenMenu={() => setOpenMenuId(openMenuId === chat.id ? null : chat.id)}
                  onCloseMenu={() => setOpenMenuId(null)}
                  onNewTitleChange={setNewTitle}
                  onSelect={() => {
                    setActiveChatId(chat.id);
                    setMobileMenuOpen(false);
                  }}
                  onStartEdit={() => {
                    setEditingTitle(chat.id);
                    setNewTitle(chat.title);
                    setOpenMenuId(null);
                  }}
                  onCancelEdit={() => setEditingTitle(null)}
                  onRename={(t) => {
                    handleRename(chat.id, t);
                    setOpenMenuId(null);
                  }}
                  onPin={() => handleTogglePin(chat)}
                  onArchive={() => handleToggleArchive(chat)}
                  onDuplicate={() => handleDuplicate(chat)}
                  onClear={() => handleClear(chat)}
                  onDelete={() => {
                    handleDelete(chat.id);
                    setOpenMenuId(null);
                  }}
                />
              ))}
              {/* 已归档折叠开关（include_archived=1 拉全量，前端按 status 分组） */}
              {archivedChats.length > 0 && (
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-[var(--color-hover-bg)]"
                  style={{ color: 'var(--color-text-muted)' }}
                  onClick={() => setShowArchived((v) => !v)}
                >
                  <ChevronDown size={12} className={`transition-transform duration-200 ${showArchived ? 'rotate-180' : ''}`} />
                  <Archive size={12} />
                  <span>显示已归档（{archivedChats.length}）</span>
                </button>
              )}
              {showArchived && filteredArchived.length > 0 && (
                <div
                  className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Archive size={11} />
                  <span>已归档</span>
                </div>
              )}
              {showArchived && filteredArchived.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={activeChatId === chat.id}
                  editing={editingTitle === chat.id}
                  newTitle={newTitle}
                  openMenu={openMenuId === chat.id}
                  onOpenMenu={() => setOpenMenuId(openMenuId === chat.id ? null : chat.id)}
                  onCloseMenu={() => setOpenMenuId(null)}
                  onNewTitleChange={setNewTitle}
                  onSelect={() => {
                    setActiveChatId(chat.id);
                    setMobileMenuOpen(false);
                  }}
                  onStartEdit={() => {
                    setEditingTitle(chat.id);
                    setNewTitle(chat.title);
                    setOpenMenuId(null);
                  }}
                  onCancelEdit={() => setEditingTitle(null)}
                  onRename={(t) => {
                    handleRename(chat.id, t);
                    setOpenMenuId(null);
                  }}
                  onPin={() => handleTogglePin(chat)}
                  onArchive={() => handleToggleArchive(chat)}
                  onDuplicate={() => handleDuplicate(chat)}
                  onClear={() => handleClear(chat)}
                  onDelete={() => {
                    handleDelete(chat.id);
                    setOpenMenuId(null);
                  }}
                />
              ))}
            </>
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
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 配额 / 用量一行小字 */}
          {dashboard && (
            <div
              className="px-4 py-1.5 flex-shrink-0 border-b"
              style={{ background: 'var(--color-card-alt)', borderColor: 'var(--color-divider)', color: 'var(--color-text-muted)' }}
            >
              <span className="text-xs">
                今日 {dashboard.today_calls}
                {dashboard.daily_limit ? `/${dashboard.daily_limit}` : ''} 次 · 累计 {dashboard.total_calls} · 估算 {dashboard.tokens_est} tokens
              </span>
              {dashboard.remaining === 0 && (
                <span className="ml-2 text-xs font-medium" style={{ color: 'var(--color-error)' }}>今日额度已用完</span>
              )}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {activeChatId ? (
              <AiChatView
                key={`chat-${activeChatId}`}
                chatId={activeChatId}
                dashboard={dashboard}
                clearNonce={clearNonce}
                onRefresh={() => loadChats()}
                onRefreshDashboard={loadDashboard}
                onUpdateTitle={updateChatTitle}
                onLogout={() => navigate('/login')}
              />
            ) : draftMode ? (
              <AiChatView
                key="draft"
                chatId={0}
                draftMode={draftMode}
                dashboard={dashboard}
                clearNonce={clearNonce}
                onRefresh={() => loadChats()}
                onRefreshDashboard={loadDashboard}
                onUpdateTitle={updateChatTitle}
                onChatCreated={(id) => {
                  setDraftMode(null);
                  setActiveChatId(id);
                  loadChats();
                }}
                onLogout={() => navigate('/login')}
              />
            ) : (
              <EmptyState onCreateChat={handleCreateChat} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// 会话列表行（置顶徽标 + 更多菜单：置顶/归档/复制/清空/重命名/删除）
function ChatRow({
  chat, active, editing, newTitle, openMenu,
  onOpenMenu, onCloseMenu, onNewTitleChange, onSelect,
  onStartEdit, onCancelEdit, onRename, onPin, onArchive, onDuplicate, onClear, onDelete,
}: {
  chat: AiChat;
  active: boolean;
  editing: boolean;
  newTitle: string;
  openMenu: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onNewTitleChange: (v: string) => void;
  onSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRename: (title: string) => void;
  onPin: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  const isArchived = chat.status === 1 || chat.status === 'archived';
  const menuItems: { key: string; icon: typeof Pin; label: string; action: () => void; danger?: boolean }[] = [
    { key: 'pin', icon: chat.pinned ? PinOff : Pin, label: chat.pinned ? '取消置顶' : '置顶', action: onPin },
    { key: 'archive', icon: isArchived ? ArchiveRestore : Archive, label: isArchived ? '恢复' : '归档', action: onArchive },
    { key: 'copy', icon: Copy, label: '复制会话', action: onDuplicate },
    { key: 'clear', icon: Eraser, label: '清空消息', action: onClear },
    { key: 'rename', icon: Pencil, label: '重命名', action: onStartEdit },
    { key: 'delete', icon: Trash2, label: '删除', action: onDelete, danger: true },
  ];
  return (
    <div
      className="px-3 py-2.5 cursor-pointer transition-all duration-150 group relative"
      style={active ? {
        background: 'var(--color-primary-light)',
        borderLeft: '3px solid var(--color-primary)',
      } : undefined}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <Sparkles
          size={14}
          style={{
            color: 'var(--color-primary)',
            marginTop: 2,
            flexShrink: 0,
            opacity: active ? 1 : 0.7
          }}
        />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={newTitle}
              onChange={(e) => { onNewTitleChange(e.target.value); }}
              onBlur={() => onRename(newTitle)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRename(newTitle);
                if (e.key === 'Escape') onCancelEdit();
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
            <div className="flex items-center gap-1.5">
              <span
                className="text-sm truncate font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                {chat.title || '未命名对话'}
              </span>
              {chat.pinned ? (
                !isArchived && <Pin size={11} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
              ) : null}
              {isArchived && (
                <span
                  className="text-[10px] px-1.5 py-0.5 flex-shrink-0"
                  style={{
                    background: 'var(--color-card-alt)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-muted)',
                    borderRadius: 'var(--radius-sm, 3px)'
                  }}
                >
                  已归档
                </span>
              )}
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
          </div>
        </div>
        <button
          className="p-1.5 -m-1 hover:bg-[var(--color-hover-bg)] transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu();
          }}
          title="会话操作"
        >
          <MoreVertical size={14} />
        </button>
      </div>
      {openMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => { e.stopPropagation(); onCloseMenu(); }}
          />
          <div
            className="absolute right-2 top-full z-20 py-1 w-40 shadow-lg"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-sm, 3px)'
            }}
          >
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                  item.danger ? 'hover:bg-[var(--color-error-light)]' : 'hover:bg-[var(--color-hover-bg)]'
                }`}
                style={{
                  color: item.danger ? 'var(--color-error)' : 'var(--color-text)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  item.action();
                  onCloseMenu();
                }}
              >
                <item.icon size={13} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <button
            className="p-4 flex flex-col items-start text-left transition-all duration-200 hover:scale-105 active:scale-95 whitespace-normal"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm, 3px)'
            }}
            onClick={() => onCreateChat('fast')}
          >
            <Zap size={20} style={{ color: 'var(--color-warning)', marginBottom: 8 }} />
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>快速模式</div>
            <div className="text-xs whitespace-normal" style={{ color: 'var(--color-text-muted)' }}>直接给出结论和可执行答案</div>
          </button>
          <button
            className="p-4 flex flex-col items-start text-left transition-all duration-200 hover:scale-105 active:scale-95 whitespace-normal"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm, 3px)'
            }}
            onClick={() => onCreateChat('professional')}
          >
            <Sparkles size={20} style={{ color: 'var(--color-primary)', marginBottom: 8 }} />
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>专业模式</div>
            <div className="text-xs whitespace-normal" style={{ color: 'var(--color-text-muted)' }}>结构化分析，补充风险和验证方案</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// AI 聊天视图组件
// chatId=0 表示草稿会话（新建对话尚未发送首条消息）：
// 首条消息以 conv_id=0 走流式建会话，start 事件的 conv_id 即新会话 id（onChatCreated 回报父级）。
function AiChatView({
  chatId, draftMode, dashboard, clearNonce, onRefresh, onRefreshDashboard, onUpdateTitle, onChatCreated, onLogout,
}: {
  chatId: number;
  draftMode?: 'fast' | 'professional';
  dashboard: AiDashboard | null;
  clearNonce: number;
  onRefresh: () => void;
  onRefreshDashboard: () => void;
  onUpdateTitle: (chatId: number, title: string) => void;
  onChatCreated?: (chatId: number) => void;
  onLogout?: () => void;
}) {
  const { addToast } = useApp();
  const isDraft = chatId === 0;
  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<{ title: string; mode: string; deep_thinking: number } | null>(null);
  const [mode, setMode] = useState<'fast' | 'professional'>(draftMode || 'fast');
  const [deepThinking, setDeepThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showResponseControls, setShowResponseControls] = useState(true);
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 进行中的流式读取器（卸载/切换会话时中止）
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const loadChatSeqRef = useRef(0);
  const sendCountRef = useRef(0);
  const [sendError, setSendError] = useState<string | null>(null);

  // 快捷提问 chips：从 config.quick_prompts 读取（≤6 条，超出横向滚动）
  useEffect(() => {
    aiApi.config().then((cfg) => {
      setQuickPrompts((cfg.quick_prompts || []).filter((s) => s.trim()).slice(0, 6));
    }).catch(() => {});
  }, []);

  // 侧边栏「清空消息」后重载本会话
  const clearNonceRef = useRef(clearNonce);
  useEffect(() => {
    if (clearNonce !== clearNonceRef.current) {
      clearNonceRef.current = clearNonce;
      setMessages([]);
      setSendError(null);
      loadChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearNonce]);

  const loadChat = useCallback(async () => {
    if (isDraft) return; // 草稿会话无落库数据
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

  // 自动标题：第一轮助手回复 end 后，若标题仍是默认「新对话」则静默生成
  const tryAutoTitle = useCallback(async () => {
    try {
      const detail = await aiApi.getChat(chatId);
      if ((detail.title || '').trim() !== '新对话') return;
      const result = await aiApi.generateTitle(chatId);
      if (result && result.title) {
        onUpdateTitle(chatId, result.title);
        setChatInfo((prev) => (prev ? { ...prev, title: result.title as string } : prev));
      }
    } catch {
      // 静默失败（已锁定 / 消息不足 / 上游不可用）
    }
  }, [chatId, onUpdateTitle]);

  /** 通用流式读取：逐字渲染 + 区分 quota_exceeded 与普通错误 + start 事件取新会话 id */
  const runStream = async (opts: {
    messages: AiMsg[];
    regenerate?: boolean;
    retry?: boolean;
    msgId?: number;
    onContent: (content: string) => void;
    onEnd: (content: string) => void;
    onQuota: () => void;
    onError: (msg: string) => void;
    /** conv_id=0 流式建会话时，start 事件携带新 conv_id */
    onStartConv?: (convId: number) => void;
  }) => {
    const events = await aiApi.streamChat(
      opts.messages, mode, deepThinking, chatId,
      opts.regenerate
        ? { regenerate: true, msgId: opts.msgId }
        : opts.retry ? { retry: true } : undefined,
    );
    if (!events) throw new Error('流式响应为空');
    const reader = events.getReader();
    streamReaderRef.current = reader;
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';
    let errorMsg: string | null = null;
    let quotaExceeded = false;
    // 解析单行 SSE：event: 行忽略（error 判定只看 data 载荷里的 error/code 字段）；JSON 坏行静默跳过
    const processLine = (rawLine: string) => {
      const line = rawLine.trim();
      if (!line.startsWith('data: ')) return;
      let parsed: { content?: string; done?: boolean; error?: string; code?: string; conv_id?: number };
      try {
        parsed = JSON.parse(line.slice(6));
      } catch {
        return;
      }
      if (parsed.error !== undefined) {
        quotaExceeded = parsed.code === 'quota_exceeded';
        errorMsg = parsed.error;
        return;
      }
      if (typeof parsed.conv_id === 'number' && parsed.conv_id > 0) {
        opts.onStartConv?.(parsed.conv_id);
      }
      if (parsed.content) {
        content += parsed.content;
        opts.onContent(content);
      }
    };
    try {
      while (!errorMsg) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) processLine(line);
      }
      if (!errorMsg && buffer.trim()) processLine(buffer);
      void decoder.decode();
    } finally {
      streamReaderRef.current = null;
    }
    if (errorMsg) {
      try { await reader.cancel(); } catch { /* 流已结束则忽略 */ }
      if (quotaExceeded) opts.onQuota();
      else opts.onError(errorMsg);
      return; // SSE 错误已分发；仅网络/超时异常会抛给调用方 catch
    }
    opts.onEnd(content);
  };

  const handleSend = async () => {
    if (!input.trim() || sending || quotaExhausted) return;
    const userMsg: AiMsg = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      mode,
      deep_thinking: deepThinking ? 1 : 0,
      create_time: Math.floor(Date.now() / 1000)
    };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setSending(true);
    setStreamingContent('');
    setSendError(null);
    let newConvId: number | null = null; // 草稿会话：start 事件回报的新会话 id
    try {
      await runStream({
        messages: allMessages,
        // 草稿（chatId=0）以 conv_id=0 发送，后端流式建会话并落库 user 消息
        onContent: (c) => setStreamingContent(c),
        onStartConv: (id) => { newConvId = id; },
        onEnd: (content) => {
          if (content) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 1,
                role: 'assistant',
                content,
                mode,
                deep_thinking: deepThinking ? 1 : 0,
                create_time: Math.floor(Date.now() / 1000)
              },
            ]);
          }
          setStreamingContent('');
          sendCountRef.current += 1;
          if (isDraft) {
            // 新建会话（conv_id=0 创建后）：回报新 id 并静默生成自动标题
            if (newConvId && onChatCreated) {
              void (async () => {
                try {
                  const result = await aiApi.generateTitle(newConvId);
                  if (result && result.title) {
                    onUpdateTitle(newConvId, result.title);
                  }
                } catch {
                  // 静默失败（已锁定 / 消息不足 / 上游不可用）
                }
              })();
              onChatCreated(newConvId);
              onRefresh();
            } else {
              onRefresh();
            }
            onRefreshDashboard();
            return;
          }
          onRefresh();
          onRefreshDashboard();
          // 用 DB 数据归一化本地消息 id（feedback/regenerate 依赖真实 id）
          void loadChat();
          // 第一轮回复完成后尝试自动标题（静默）
          if (sendCountRef.current === 1) void tryAutoTitle();
        },
        onQuota: () => {
          addToast('今日额度已用完', 'error');
          onRefreshDashboard();
        },
        onError: (msg) => {
          setSendError(msg);
          addToast('回复失败，可点消息上重试', 'error');
          if (!isDraft) {
            // 失败时后端已落 failed=1 留痕行：刷新让「重试」气泡可见
            void loadChat();
          }
        },
      });
    } catch (err) {
      // 网络/超时等未走 SSE 的异常在此兜底（含 SSE 开启前的 JSON 校验错误：400/404）
      setSendError(err instanceof Error ? err.message : '发送失败');
      addToast(err instanceof Error ? err.message : '发送失败', 'error');
    } finally {
      setSending(false);
    }
  };

  // 配额耗尽（remaining===0）时禁用输入
  const quotaExhausted = dashboard?.remaining === 0;

  /** 重新生成：挂在最后一条已落库助手回复（非 variant、有 user 前驱）上 */
  const handleRegenerate = async () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant || sending) return;
    if ((lastAssistant.variant_of ?? 0) > 0 || !Number.isFinite(lastAssistant.id)) return;
    // 简单校验：存在 user 前驱（后端对无 user 前驱会 400）
    const hasUserPredecessor = messages.some((m) => m.role === 'user');
    if (!hasUserPredecessor) return;
    setSending(true);
    setStreamingContent('');
    setSendError(null);
    try {
      await runStream({
        messages,
        regenerate: true,
        msgId: lastAssistant.id,
        onContent: (c) => setStreamingContent(c),
        onEnd: (content) => {
          setStreamingContent('');
          if (content) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 1,
                role: 'assistant',
                content,
                mode,
                deep_thinking: deepThinking ? 1 : 0,
                create_time: Math.floor(Date.now() / 1000),
                variant_of: lastAssistant.id,
              },
            ]);
          }
          onRefresh();
          onRefreshDashboard();
          // 归一化：新变体行的真实 id / variant_of 来自 DB
          void loadChat();
        },
        onQuota: () => {
          addToast('今日额度已用完', 'error');
          onRefreshDashboard();
        },
        onError: (msg) => {
          setSendError(msg);
          addToast('回复失败，可点消息上重试', 'error');
        },
      });
    } catch {
      // 已分发
    } finally {
      setSending(false);
    }
  };

  /** 重试：failed=1 的助手气泡原地修复 */
  const handleRetry = async () => {
    if (sending) return;
    setSending(true);
    setStreamingContent('');
    setSendError(null);
    try {
      await runStream({
        messages,
        retry: true,
        onContent: (c) => setStreamingContent(c),
        onEnd: (content) => {
          setStreamingContent('');
          if (content) {
            // 原地修复：刷新该会话消息（后端已修复 failed=1 行）
            loadChat();
            onRefresh();
          }
          onRefreshDashboard();
        },
        onQuota: () => {
          addToast('今日额度已用完', 'error');
          onRefreshDashboard();
        },
        onError: (msg) => {
          setSendError(msg);
          addToast('回复失败，可点消息上重试', 'error');
          // 重试本身失败时刷新，让 failed=1 留痕行可见
          loadChat();
        },
      });
    } catch {
      // 已分发
    } finally {
      setSending(false);
    }
  };

  /** 点赞 / 点踩（点当前值=撤销发 0） */
  const handleFeedback = async (msg: AiMsg, value: 0 | 1 | 2) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, feedback: value } : m)));
    try {
      await aiApi.setMsgFeedback(chatId, msg.id, value);
      addToast(value === 0 ? '已取消反馈' : value === 1 ? '已点赞' : '已点踩', 'success');
    } catch (err) {
      // 回滚
      setMessages((prev) => prev.map((m) =>
        m.id === msg.id ? { ...m, feedback: (msg.feedback ?? 0) } : m));
      addToast(err instanceof Error ? err.message : '反馈失败', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 「重新生成」入口：最后一条已落库助手回复（非 variant、非 failed，且存在 user 消息）
  let lastAssistantId: number | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') { lastAssistantId = messages[i].id; break; }
  }
  const lastAssistant = lastAssistantId !== null
    ? messages.find((m) => m.id === lastAssistantId) ?? null
    : null;
  const canRegenerate = !!(
    lastAssistant &&
    !sending &&
    (lastAssistant.variant_of ?? 0) === 0 &&
    lastAssistant.failed !== 1 &&
    messages.some((m) => m.role === 'user')
  );

  const handleQuickPrompt = (prompt: string) => {
    if (quotaExhausted) return;
    setInput(prompt);
    setShowPromptMenu(false);
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
            onClick={() => setShowPromptMenu(!showPromptMenu)}
          >
            <Sparkles size={12} />
            优化
            <ChevronDown size={10} className={`transition-transform duration-200 ${showPromptMenu ? 'rotate-180' : ''}`} />
          </button>
          {showPromptMenu && (
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
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              const failed = isAssistant && msg.failed === 1;
              const isLastMsg = msg.id === lastAssistantId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 text-sm leading-relaxed rounded-sm ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm'
                        : 'rounded-tl-sm'
                    }`}
                    style={{
                      background: msg.role === 'user'
                        ? 'var(--color-primary)'
                        : failed ? 'var(--color-error-bg)' : 'var(--color-card-alt)',
                      color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                      border: msg.role !== 'user'
                        ? (failed ? '1px solid var(--color-error)' : '1px solid var(--color-divider)')
                        : 'none'
                    }}
                  >
                    {failed && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs" style={{ color: 'var(--color-error)' }}>
                        <AlertCircle size={12} />
                        <span>回复失败</span>
                      </div>
                    )}
                    {isAssistant ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        className="markdown-body prose prose-sm max-w-none"
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {isAssistant && (
                      <div className="mt-2 flex items-center gap-1 pt-2" style={{ borderTop: '1px solid var(--color-divider)' }}>
                        <button
                          className="p-1 transition-colors"
                          style={{
                            color: msg.feedback === 1 ? 'var(--color-success)' : 'var(--color-text-muted)',
                            background: msg.feedback === 1 ? 'var(--color-success-bg)' : 'transparent'
                          }}
                          title={msg.feedback === 1 ? '取消点赞' : '点赞'}
                          onClick={() => handleFeedback(msg, msg.feedback === 1 ? 0 : 1)}
                        >
                          <ThumbsUp size={13} />
                        </button>
                        <button
                          className="p-1 transition-colors"
                          style={{
                            color: msg.feedback === 2 ? 'var(--color-error)' : 'var(--color-text-muted)',
                            background: msg.feedback === 2 ? 'var(--color-error-bg)' : 'transparent'
                          }}
                          title={msg.feedback === 2 ? '取消点踩' : '点踩'}
                          onClick={() => handleFeedback(msg, msg.feedback === 2 ? 0 : 2)}
                        >
                          <ThumbsDown size={13} />
                        </button>
                        {isLastMsg && canRegenerate && !failed && (
                          <button
                            className="flex items-center gap-1 px-1.5 py-1 text-xs transition-colors"
                            style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
                            title="重新生成"
                            onClick={handleRegenerate}
                          >
                            <RefreshCw size={12} />
                            <span>重新生成</span>
                          </button>
                        )}
                        {failed && (
                          <button
                            className="flex items-center gap-1 px-1.5 py-1 text-xs transition-colors"
                            style={{ color: 'var(--color-error)', background: 'var(--color-error-bg)' }}
                            title="重试"
                            onClick={handleRetry}
                          >
                            <RefreshCw size={12} />
                            <span>重试</span>
                          </button>
                        )}
                        {(msg.variant_of ?? 0) > 0 && (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            变体
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {streamingContent && (
              <div className="flex justify-start">
                <div
                  className="max-w-[85%] p-3 rounded-sm rounded-tl-sm"
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
        {quotaExhausted && (
          <div
            className="flex items-center gap-2 mb-2 text-xs"
            style={{ color: 'var(--color-error)', background: 'var(--color-error-bg)' }}
          >
            <AlertCircle size={13} />
            <span>今日额度已用完，输入已禁用</span>
          </div>
        )}
        {quickPrompts.length > 0 && !quotaExhausted && (
          <div className="max-w-4xl mx-auto mb-2 flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'thin' }}>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="flex-shrink-0 px-2.5 py-1.5 text-xs transition-all duration-150 hover:opacity-80 active:scale-95"
                style={{
                  background: 'var(--color-card-alt)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-sm, 3px)'
                }}
                onClick={() => handleQuickPrompt(prompt)}
              >
                {prompt.length > 18 ? `${prompt.slice(0, 18)}…` : prompt}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full resize-none px-3 py-2.5 text-sm"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={quotaExhausted ? '今日额度已用完' : '输入消息，Shift+Enter 换行...'}
              disabled={sending || quotaExhausted}
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
            disabled={sending || !input.trim() || quotaExhausted}
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
