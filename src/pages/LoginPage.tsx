import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { authApi, setToken } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { UserInfo } from '../types';
import { ThemeToggle } from '../components/ThemeToggle';

interface LoginPageProps {
  onLogin: (user: UserInfo) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    account: '',
    username: '',
    email: '',
    password: '',
    qq: '',
  });
  const { addToast } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        if (!form.account.trim()) {
          addToast('请输入用户名或邮箱', 'warning');
          setLoading(false);
          return;
        }
        if (!form.password) {
          addToast('请输入密码', 'warning');
          setLoading(false);
          return;
        }
        const result = await authApi.login({
          account: form.account.trim(),
          password: form.password,
        });
        setToken(result.token);
        onLogin(result.userinfo);
        addToast('登录成功', 'success');
        navigate('/chat');
      } else {
        // 注册前端校验（与后端规则一致）
        const username = form.username.trim();
        const email = form.email.trim();
        const password = form.password;
        const usernameOk = /^[A-Za-z0-9_]{3,20}$/.test(username);
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const passwordOk = password.length >= 6 && password.length <= 32;
        if (!usernameOk) {
          addToast('用户名需为 3-20 位字母、数字或下划线', 'warning');
          setLoading(false);
          return;
        }
        if (!emailOk) {
          addToast('邮箱格式不正确', 'warning');
          setLoading(false);
          return;
        }
        if (!passwordOk) {
          addToast('密码长度需为 6-32 位', 'warning');
          setLoading(false);
          return;
        }
        const result = await authApi.register({ username, email, password });
        setToken(result.token);
        onLogin(result.userinfo);
        addToast('注册成功，已自动登录', 'success');
        navigate('/chat');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg-page)' }}>
      <div className="w-full max-w-md">
        {/* 顶部 Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 flex items-center justify-center mb-3"
            style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
          >
            <MessageSquare size={32} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            ARCLE 在线聊天
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-light)' }}>
            实时群聊 · 多主题切换 · Markdown 支持
          </p>
        </div>

        {/* 表单卡片 */}
        <div
          className="p-6 shadow-[var(--shadow-md)]"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          {/* 模式切换 */}
          <div className="flex mb-6" style={{ borderBottom: '1px solid var(--color-divider)' }}>
            <button
              onClick={() => setMode('login')}
              className="flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              style={
                mode === 'login'
                  ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }
                  : { color: 'var(--color-text-light)', borderBottom: '2px solid transparent' }
              }
            >
              <LogIn size={16} /> 登录
            </button>
            <button
              onClick={() => setMode('register')}
              className="flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              style={
                mode === 'register'
                  ? { color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)' }
                  : { color: 'var(--color-text-light)', borderBottom: '2px solid transparent' }
              }
            >
              <UserPlus size={16} /> 注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'login' ? (
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  用户名 / 邮箱
                </label>
                <input
                  type="text"
                  value={form.account}
                  onChange={(e) => setForm({ ...form, account: e.target.value })}
                  placeholder="请输入用户名或邮箱"
                  autoComplete="username"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    用户名
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="3-20位字母数字下划线"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    邮箱
                  </label>
                  <input
                    type="text"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="请输入邮箱"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    QQ号 <span style={{ color: 'var(--color-text-muted)' }}>(选填，用于获取头像)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.qq}
                    onChange={(e) => setForm({ ...form, qq: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    placeholder="输入QQ号（选填）"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                密码
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={mode === 'login' ? '请输入密码' : '6-32位密码'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {mode === 'login' ? '登 录' : '注 册'}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-muted)' }}>
              默认账号：admin / 123456
            </p>
          )}
        </div>

        {/* 主题切换 */}
        <div className="flex justify-center mt-6">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
