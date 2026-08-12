import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Settings, Key, Globe, RefreshCw, Trash2,
  Eye, EyeOff, CheckCircle, XCircle, Play,
} from 'lucide-react';
import {
  getApiBaseUrl, setApiBaseUrl, getToken, clearToken,
} from '../lib/api';

const PRESET_URLS = [
  { label: '本地开发（localhost:8000）', url: 'http://localhost:8000' },
  { label: '生产环境（ke.l.cd）', url: 'https://ke.l.cd' },
];

const DEBUG_PASSWORD = 'debug2024';
type Tab = 'api' | 'storage' | 'session';

/* ─── Password screen ─── */
function PasswordScreen({
  onUnlock, onBack,
}: {
  onUnlock: () => void;
  onBack: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const submit = () => {
    if (password === DEBUG_PASSWORD) {
      onUnlock();
    } else {
      setError('密码错误，请重试');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg-page)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-divider)' }}>
        <button onClick={onBack} className="mb-5 flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={14} /> 返回
        </button>
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Settings size={24} />
          </div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>开发者调试</h1>
          <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>请输入调试密码以访问</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="请输入密码"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
              style={{ background: 'var(--color-input-bg)', border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-divider)'}`, color: 'var(--color-text)' }}
            />
            <button
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button onClick={submit} className="px-4 rounded-lg text-sm font-medium" style={{ background: 'var(--color-primary)', color: '#fff' }}>
            解锁
          </button>
        </div>
        {error && <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-error)' }}>{error}</p>}
        <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-muted)' }}>提示：debug2024</p>
      </div>
    </div>
  );
}

/* ─── API Tab ─── */
function ApiTab() {
  const [customUrl, setCustomUrl] = useState('');
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [apiMsg, setApiMsg] = useState('');
  const [lastResult, setLastResult] = useState<string>('');

  const applyUrl = async (url: string) => {
    setApiStatus('checking');
    setApiMsg('');
    setLastResult('');
    try {
      setApiBaseUrl(url);
      await testConnection(url);
      setApiStatus('ok');
      setApiMsg('连接成功');
      setLastResult('✅');
    } catch (e: unknown) {
      setApiStatus('error');
      setApiMsg((e as Error).message || '连接失败');
      setLastResult('❌');
    }
  };

  const testNow = async () => {
    const url = getApiBaseUrl();
    setApiStatus('checking');
    setApiMsg('');
    try {
      await testConnection(url);
      setApiStatus('ok');
      setApiMsg(`✅ ${url} 正常响应`);
    } catch (e: unknown) {
      setApiStatus('error');
      setApiMsg(`❌ ${(e as Error).message}`);
    }
  };

  return (
    <>
      {/* 预设地址 */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-divider)' }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Globe size={14} style={{ color: 'var(--color-primary)' }} /> 预设地址
        </h3>
        <div className="space-y-2">
          {PRESET_URLS.map((preset) => {
            const active = getApiBaseUrl() === preset.url;
            return (
              <button
                key={preset.url}
                onClick={() => applyUrl(preset.url)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  background: active ? 'var(--color-primary-light)' : 'var(--color-hover-bg)',
                  color: active ? 'var(--color-primary)' : 'var(--color-text)',
                  border: `1px solid ${active ? 'var(--color-primary)' : 'transparent'}`,
                }}
              >
                <span>{preset.label}</span>
                <span className="text-xs font-mono opacity-60">{preset.url}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 自定义地址 */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-divider)' }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Settings size={14} style={{ color: 'var(--color-primary)' }} /> 自定义地址
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://your-api.com"
            className="flex-1 text-sm rounded-lg px-3 py-2 outline-none font-mono"
            style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-divider)', color: 'var(--color-text)' }}
          />
          <button
            onClick={() => customUrl.trim() && applyUrl(customUrl.trim())}
            className="px-3 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            应用
          </button>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--color-input-bg)' }}>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>当前生效：</span>
          <span className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{getApiBaseUrl()}</span>
        </div>
        <button
          onClick={testNow}
          disabled={apiStatus === 'checking'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-all"
          style={{
            background: apiStatus === 'checking' ? 'var(--color-hover-bg)' : 'var(--color-primary-light)',
            color: apiStatus === 'checking' ? 'var(--color-text-muted)' : 'var(--color-primary)',
            border: '1px solid var(--color-primary)',
            opacity: apiStatus === 'checking' ? 0.6 : 1,
          }}
        >
          <Play size={14} className={apiStatus === 'checking' ? 'animate-pulse' : ''} />
          {apiStatus === 'checking' ? '测试中...' : '测试连接'}
        </button>
        {(apiStatus === 'ok' || apiStatus === 'error') && (
          <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: apiStatus === 'ok' ? 'var(--color-success)' : 'var(--color-error)' }}>
            {apiStatus === 'ok' ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {apiMsg}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Session Tab ─── */
function SessionTab() {
  const token = getToken();

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-divider)' }}>
      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        <Key size={14} style={{ color: 'var(--color-primary)' }} /> 会话管理
      </h3>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: 'var(--color-input-bg)' }}>
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>登录状态</span>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>{token ? '已登录' : '未登录'}</p>
        </div>
        {token
          ? <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>活跃</span>
          : <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>无 token</span>
        }
      </div>
      {token && (
        <div className="px-3">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Token 预览</span>
          <p className="text-xs font-mono mt-1 break-all p-2 rounded-lg" style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-muted)' }}>
            {token.slice(0, 40)}...
          </p>
        </div>
      )}
      <button
        onClick={() => { clearToken(); window.location.reload(); }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        <Trash2 size={14} /> 清除登录状态
      </button>
    </div>
  );
}

/* ─── Storage Tab ─── */
function StorageTab() {
  const [items, setItems] = useState<Map<string, string>>(new Map());
  const [cleared, setCleared] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setItems(new Map(Object.entries(localStorage)));
    }
  }, []);

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-divider)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Trash2 size={14} style={{ color: 'var(--color-primary)' }} /> 本地存储
        </h3>
        <button
          onClick={() => { setItems(new Map(Object.entries(localStorage))); setCleared(false); }}
          className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
          style={{ background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
        >
          <RefreshCw size={12} /> 刷新
        </button>
      </div>
      {items.size === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>本地存储为空</p>
      ) : (
        <>
          <div className="max-h-52 overflow-y-auto space-y-1">
            {Array.from(items.entries()).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--color-input-bg)' }}>
                <span className="font-mono truncate flex-1 mr-2" style={{ color: 'var(--color-text)' }}>{key}</span>
                <span className="font-mono truncate flex-1" style={{ color: 'var(--color-text-muted)' }}>
                  {val.length > 50 ? val.slice(0, 50) + '…' : val}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              Object.keys(localStorage).forEach((k) => localStorage.removeItem(k));
              setItems(new Map());
              setCleared(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Trash2 size={14} /> 清除所有本地存储
          </button>
          {cleared && <p className="text-xs text-center" style={{ color: 'var(--color-success)' }}>已清除</p>}
        </>
      )}
    </div>
  );
}

/* ─── Main component ─── */
export function DebugPage() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('api');

  if (!unlocked) {
    return <PasswordScreen onUnlock={() => setUnlocked(true)} onBack={() => navigate(-1)} />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-50 px-4 py-3 border-b flex items-center gap-3" style={{ background: 'var(--color-card)', borderColor: 'var(--color-divider)' }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> 返回
        </button>
        <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>开发者调试</span>
        <div className="flex-1" />
        <button
          onClick={() => { setUnlocked(false); setActiveTab('api'); }}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
        >
          锁定
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-4" style={{ borderColor: 'var(--color-divider)' }}>
        {([
          { key: 'api' as Tab, label: 'API 配置', icon: Globe },
          { key: 'session' as Tab, label: '会话管理', icon: Key },
          { key: 'storage' as Tab, label: '本地存储', icon: Trash2 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all ${activeTab === tab.key ? 'border-b-2' : ''}`}
            style={
              activeTab === tab.key
                ? { color: 'var(--color-primary)', borderBottom: `2px solid var(--color-primary)`, marginBottom: -1 }
                : { color: 'var(--color-text-muted)' }
            }
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        )))}
      </div>

      <div className="p-4 space-y-4 pb-12">
        {activeTab === 'api' && <ApiTab />}
        {activeTab === 'session' && <SessionTab />}
        {activeTab === 'storage' && <StorageTab />}
      </div>
    </div>
  );
}

async function testConnection(url: string): Promise<void> {
  const res = await fetch(`${url}/chat/public/stats`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 200) throw new Error('API 返回异常');
}
