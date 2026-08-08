import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAdminAuth } from '../../lib/AdminContext';
import { useApp } from '../../lib/AppContext';

export function AdminLoginPage() {
  const { login } = useAdminAuth();
  const { addToast } = useApp();
  const navigate = useNavigate();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!account.trim() || !password) {
      addToast('请输入账号和密码', 'warning');
      return;
    }
    setLoading(true);
    try {
      await login(account.trim(), password);
      addToast('登录成功', 'success');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      addToast(err instanceof Error ? err.message : '登录失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setAccount('admin');
    setPassword('123456');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-bg-page)' }}
    >
      <div
        className="w-full max-w-md shadow-[var(--shadow-lg)]"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 flex items-center justify-center"
              style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary)',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                ARCLE 管理后台
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-light)' }}>
                仅管理员账号可登录
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label
              className="block text-sm mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              账号（用户名 / 邮箱）
            </label>
            <input
              autoComplete="username"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="输入管理员用户名或邮箱"
            />
          </div>
          <div>
            <label
              className="block text-sm mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              密码
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                autoComplete="current-password"
                placeholder="输入密码"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5"
                onClick={() => setShow((s) => !s)}
                style={{ color: 'var(--color-text-light)' }}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div
            className="p-3 text-xs"
            style={{
              background: 'var(--color-info-bg)',
              border: '1px solid var(--color-info-light)',
              borderLeft: '4px solid var(--color-info)',
              color: 'var(--color-info)',
            }}
          >
            默认超级管理员：
            <button
              type="button"
              className="ml-2 underline underline-offset-2 font-medium"
              onClick={fillDemo}
            >
              admin / 123456
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
            style={{ minHeight: 44 }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> 登录中…
              </>
            ) : (
              <>
                登录 <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="pt-1 flex items-center justify-between text-xs">
            <a href="/" style={{ color: 'var(--color-text-light)' }}>
              ← 返回首页
            </a>
            <a href="/chat" style={{ color: 'var(--color-primary)' }}>
              进入聊天 →
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
