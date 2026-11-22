import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Bot,
  RefreshCw,
  Trash2,
  Users,
  MessageSquare,
  Clock,
  Search,
  Zap,
  Brain,
  Save,
  Wrench,
  PlugZap,
  Eye,
  EyeOff,
  Cpu,
  KeyRound,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';
import type { AdminAiStats, AdminAiChat, AdminAiConfig, AdminAiConfigSave, AdminAiConfigTest } from '../../types';

export function AdminAiPage() {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminAiStats | null>(null);
  const [chats, setChats] = useState<AdminAiChat[]>([]);
  const [totalChats, setTotalChats] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [committedKeyword, setCommittedKeyword] = useState('');

  // 搜索防抖：停止输入 300ms 后才提交关键字，避免逐字符发请求
  useEffect(() => {
    const timer = setTimeout(() => setCommittedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // 按钮或 Enter 立即提交当前关键字
  const commitSearchNow = () => {
    setCommittedKeyword(keyword);
    setPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        adminApi.aiStats(),
        adminApi.aiChats({ page, per_page: 20, keyword: committedKeyword }),
      ]);
      setStats(s);
      setChats(c.items);
      setTotalChats(c.pagination.total);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, committedKeyword, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteAiChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      addToast('已删除', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* 标题行 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Bot size={20} style={{ color: 'var(--color-primary)' }} /> AI广场管理
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            管理 AI 对话会话与统计
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn btn-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="总会话数" value={stats.total_chats} icon={MessageSquare} tone="primary" />
          <StatCard label="今日会话" value={stats.today_chats} icon={Clock} tone="info" />
          <StatCard label="总消息数" value={stats.total_msgs} icon={MessageSquare} tone="success" />
          <StatCard label="今日消息" value={stats.today_msgs} icon={Zap} tone="warning" />
          <StatCard label="活跃用户" value={stats.active_users} icon={Users} tone="primary" />
        </div>
      )}

      {/* 模型配置（管理端微调：API / 模型 / 参数 / 系统提示词） */}
      <AiConfigPanel />

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="flex-1 flex gap-2">
          <input
            className="flex-1"
            placeholder="搜索会话标题..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitSearchNow()}
            style={{ borderRadius: '3px' }}
          />
          <button className="btn btn-sm" onClick={commitSearchNow}>
            <Search size={14} /> 搜索
          </button>
        </div>
      </div>

      {/* 会话列表 */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-divider)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            会话列表
            {totalChats > 0 && <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>({totalChats})</span>}
          </span>
        </div>
        {chats.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            暂无数据
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
            {chats.map((chat) => (
              <div key={chat.id} className="px-4 py-3 flex items-center gap-4 hover:opacity-90 transition-opacity">
                <Bot size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {chat.title}
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{chat.username}</span>
                    <span>·</span>
                    <span>{chat.mode_label}</span>
                    {chat.deep_thinking === 1 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><Brain size={10} /> 深度思考</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-right flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  <div>{chat.message_count} 条消息</div>
                  <div>{chat.create_time_fmt}</div>
                </div>
                <button
                  className="btn btn-sm btn-error"
                  onClick={() => handleDelete(chat.id)}
                  title="删除会话"
                  style={{ borderRadius: '3px', padding: '4px 10px', fontSize: '12px' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalChats > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{ borderRadius: '3px' }}
          >
            上一页
          </button>
          <span className="text-sm px-3" style={{ color: 'var(--color-text-secondary)' }}>
            第 {page} 页 / 共 {Math.ceil(totalChats / 20)} 页
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= Math.ceil(totalChats / 20)}
            onClick={() => setPage(page + 1)}
            style={{ borderRadius: '3px' }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Users; tone: 'primary' | 'success' | 'warning' | 'info' }) {
  const colors: Record<string, { bg: string; color: string }> = {
    primary: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
    success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
    warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
    info: { bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
  };
  const c = colors[tone];
  return (
    <div className="p-4 flex items-start gap-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: c.bg, color: c.color }}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs" style={{ color: 'var(--color-text-light)' }}>{label}</div>
        <div className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>{value}</div>
      </div>
    </div>
  );
}

// ============ 模型配置面板（管理端微调：API/模型/参数/系统提示词） ============

/** 面板表单状态（数值字段用字符串持有，提交时再解析，避免 number input 受控值丢失） */
interface AiConfigFormState {
  model_name: string;
  api_url: string;
  api_key: string;
  temperature: string;
  max_tokens: string;
  timeout: string;
  system_prompt: string;
}

function AiConfigPanel() {
  const { addToast } = useApp();
  // 当前生效配置（脱敏视图，来自 admin GET）：用于标题区徽章与占位提示
  const [cfg, setCfg] = useState<AdminAiConfig | null>(null);
  const [form, setForm] = useState<AiConfigFormState>({
    model_name: '',
    api_url: '',
    api_key: '',
    temperature: '0.7',
    max_tokens: '2048',
    timeout: '90',
    system_prompt: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AdminAiConfigTest | null>(null);

  const setField = (k: keyof AiConfigFormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // 进页面 GET 当前生效配置回填表单：
  // - model_name / temperature / max_tokens / timeout / system_prompt 可安全回填；
  // - api_key 服务端脱敏（前4****后4）不可回填 → 输入框留空，占位「留空使用 .env」；
  //   保存时空串 = 不落库覆盖、运行时回落 .env（与后端 save 语义一致）；
  // - api_url 服务端脱敏（中段 ***）不可回填 → 输入框留空，占位显示脱敏值，
  //   保存时留空则不传该字段（保持当前 DB 值，避免把脱敏串写进库）。
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await adminApi.aiConfig.get();
        if (!alive) return;
        setCfg(c);
        setForm({
          model_name: c.model_name,
          api_url: '',
          api_key: '',
          temperature: String(c.temperature),
          max_tokens: String(c.max_tokens),
          timeout: String(c.timeout),
          system_prompt: c.system_prompt,
        });
      } catch (err) {
        if (alive) addToast(err instanceof Error ? err.message : '加载配置失败', 'error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [addToast]);

  // 组装并校验保存请求体；校验不通过时 toast 并返回 null
  const buildSaveBody = (): AdminAiConfigSave | null => {
    const temperature = Number(form.temperature);
    const maxTokens = Number(form.max_tokens);
    const timeout = Number(form.timeout);
    const key = form.api_key.trim();
    const url = form.api_url.trim();
    const prompt = form.system_prompt;

    if (key.length > 255) {
      addToast('API Key 长度 255 以内', 'error');
      return null;
    }
    if (url.length > 512) {
      addToast('API 地址长度 512 以内', 'error');
      return null;
    }
    if (url !== '' && !/^https?:\/\//i.test(url)) {
      addToast('API 地址须为合法 http(s) 链接', 'error');
      return null;
    }
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      addToast('温度范围 0-2', 'error');
      return null;
    }
    if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 32768) {
      addToast('Max Tokens 范围 1-32768', 'error');
      return null;
    }
    if (!Number.isInteger(timeout) || timeout < 5 || timeout > 300) {
      addToast('超时范围 5-300 秒', 'error');
      return null;
    }
    if (prompt.length > 4000) {
      addToast('系统提示词长度 4000 以内', 'error');
      return null;
    }

    const body: AdminAiConfigSave = {
      model_name: form.model_name.trim(),
      api_key: key,
      temperature,
      max_tokens: maxTokens,
      timeout,
      system_prompt: prompt,
    };
    if (url !== '') body.api_url = url;
    return body;
  };

  const handleSave = async () => {
    const body = buildSaveBody();
    if (!body) return;
    setSaving(true);
    setTestResult(null);
    try {
      const saved = await adminApi.aiConfig.save(body);
      setCfg(saved);
      setForm((f) => ({ ...f, api_key: '' })); // 保存后清空 key 输入框，回退脱敏占位
      addToast('配置已保存', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 测试连接：use_form=true 测表单当前值（不落库）；key/url 留空 = 用当前生效值
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await adminApi.aiConfig.test({
        use_form: true,
        api_key: form.api_key.trim(),
        api_url: form.api_url.trim(),
        model_name: form.model_name.trim(),
        temperature: Number(form.temperature),
        timeout: Number(form.timeout),
      });
      setTestResult(r);
      if (r.ok) addToast('连接成功', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '测试失败', 'error');
    } finally {
      setTesting(false);
    }
  };

  const labelCls = 'text-xs block mb-1' as const;
  const inputStyle: CSSProperties = { borderRadius: '3px' };

  return (
    <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {/* 卡片标题：模型配置 + 当前生效模型 / Key 状态 / 配置来源 */}
      <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--color-divider)' }}>
        <Wrench size={16} style={{ color: 'var(--color-primary)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>模型配置</span>
        {cfg && (
          <>
            <span
              className="text-xs px-2 py-0.5 inline-flex items-center gap-1"
              style={{ borderRadius: '3px', background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              <Cpu size={11} /> {cfg.model_name}
            </span>
            <span
              className="text-xs px-2 py-0.5 inline-flex items-center gap-1"
              style={{
                borderRadius: '3px',
                background: cfg.has_api_key ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                color: cfg.has_api_key ? 'var(--color-success)' : 'var(--color-warning)',
              }}
            >
              <KeyRound size={11} /> {cfg.has_api_key ? 'Key 已配置' : '未配置 Key（使用 .env）'}
            </span>
            <span
              className="text-xs px-2 py-0.5"
              style={{ borderRadius: '3px', background: 'var(--color-card-alt)', color: 'var(--color-text-muted)' }}
            >
              来源：{cfg.source === 'db' ? '数据库' : '.env'}
            </span>
          </>
        )}
      </div>

      {/* 表单 */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls} style={{ color: 'var(--color-text-light)' }}>模型名称</span>
            <input
              value={form.model_name}
              onChange={(e) => setField('model_name', e.target.value)}
              placeholder={cfg?.model_name || 'agnes-2.5-flash'}
              maxLength={64}
              style={inputStyle}
            />
          </label>

          <label className="block">
            <span className={labelCls} style={{ color: 'var(--color-text-light)' }}>API 地址（留空保持当前值）</span>
            <input
              value={form.api_url}
              onChange={(e) => setField('api_url', e.target.value)}
              placeholder={cfg?.api_url || 'https://api.agnes-ai.cn/v1/***'}
              maxLength={512}
              style={inputStyle}
            />
          </label>

          <label className="block">
            <span className={labelCls} style={{ color: 'var(--color-text-light)' }}>API Key</span>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.api_key}
                onChange={(e) => setField('api_key', e.target.value)}
                placeholder="留空使用 .env"
                maxLength={255}
                style={{ ...inputStyle, paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                aria-label="切换 API Key 可见性"
                className="absolute top-0 bottom-0 right-0 flex items-center justify-center px-2"
                style={{ color: 'var(--color-text-muted)', minWidth: '44px' }}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className={labelCls} style={{ color: 'var(--color-text-light)' }}>温度</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={form.temperature}
                onChange={(e) => setField('temperature', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label className="block">
              <span className={labelCls} style={{ color: 'var(--color-text-light)' }}>Max Tokens</span>
              <input
                type="number"
                min="1"
                max="32768"
                value={form.max_tokens}
                onChange={(e) => setField('max_tokens', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label className="block">
              <span className={labelCls} style={{ color: 'var(--color-text-light)' }}>超时（秒）</span>
              <input
                type="number"
                min="5"
                max="300"
                value={form.timeout}
                onChange={(e) => setField('timeout', e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        </div>

        {/* 微调：系统提示词 */}
        <label className="block">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--color-text-light)' }}>微调：系统提示词</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{form.system_prompt.length}/4000</span>
          </div>
          <textarea
            rows={4}
            maxLength={4000}
            value={form.system_prompt}
            onChange={(e) => setField('system_prompt', e.target.value)}
            placeholder="留空使用内置提示词"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ borderRadius: '3px' }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 保存配置
          </button>
          <button className="btn btn-sm" onClick={handleTest} disabled={testing} style={{ borderRadius: '3px' }}>
            {testing ? <RefreshCw size={14} className="animate-spin" /> : <PlugZap size={14} />} 测试连接
          </button>
        </div>

        {/* 测试结果区 */}
        {testResult && (
          <div
            className="flex items-start gap-2 p-3 text-sm"
            style={{
              background: testResult.ok ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
              border: `1px solid ${testResult.ok ? 'var(--color-success)' : 'var(--color-error)'}`,
              borderRadius: '3px',
            }}
          >
            {testResult.ok ? (
              <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            ) : (
              <XCircle size={16} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
            )}
            <div className="min-w-0 flex-1">
              <div style={{ color: testResult.ok ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                {testResult.ok ? '连接成功' : '连接失败'}
                <span className="ml-2 font-normal text-xs" style={{ color: 'var(--color-text-light)' }}>
                  {testResult.latency_ms}ms · {testResult.model}
                </span>
              </div>
              {testResult.ok && testResult.reply_excerpt && (
                <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-light)' }}>
                  回复摘录：{testResult.reply_excerpt}
                </div>
              )}
              {!testResult.ok && testResult.error && (
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{testResult.error}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
