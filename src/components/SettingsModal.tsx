import { useState, useEffect } from 'react';
import { X, Settings, User, Lock, Palette, Check, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { userApi } from '../lib/api';
import { Avatar } from './Avatar';
import type { ThemeName, UserInfo } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  user: UserInfo;
  onUserUpdate: (u: UserInfo) => void;
}

type Tab = 'profile' | 'password' | 'theme';

const themeOptions: { name: ThemeName; label: string; desc: string }[] = [
  { name: 'light', label: '浅色', desc: '护眼舒适' },
  { name: 'dark', label: '深色', desc: '夜间使用' },
  { name: 'high1', label: '高对比1', desc: '黑白高对比' },
  { name: 'high2', label: '高对比2', desc: '暗黑高反差' },
];

const QQ_AVATAR_BASE = 'https://q1.qlogo.cn/g?b=qq&s=640&nk=';
const buildQqAvatar = (qq: string) => `${QQ_AVATAR_BASE}${qq}`;

export function SettingsModal({ open, onClose, user, onUserUpdate }: SettingsModalProps) {
  const { theme, setTheme, addToast } = useApp();
  const [tab, setTab] = useState<Tab>('profile');

  // 资料表单
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [qq, setQq] = useState(() => {
    const m = /nk=(\d+)/.exec(user.avatar || '');
    return m ? m[1] : '';
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // 当 user prop 变化时（如保存后父组件更新），同步本地状态
  useEffect(() => {
    setBio(user.bio || '');
    setAvatar(user.avatar || '');
    const m = /nk=(\d+)/.exec(user.avatar || '');
    setQq(m ? m[1] : '');
  }, [user.avatar, user.bio]);

  // 密码表单
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  if (!open) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await userApi.updateProfile({ bio: bio.trim(), avatar: avatar.trim() });
      onUserUpdate(updated);
      addToast('资料已更新', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6 || newPwd.length > 32) {
      addToast('新密码长度需为 6-32 位', 'warning');
      return;
    }
    if (newPwd !== confirmPwd) {
      addToast('两次输入的密码不一致', 'warning');
      return;
    }
    setSavingPwd(true);
    try {
      await userApi.updatePassword({ old_password: oldPwd, new_password: newPwd });
      addToast('密码修改成功', 'success');
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '修改失败', 'error');
    } finally {
      setSavingPwd(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: '个人资料', icon: User },
    { key: 'password', label: '修改密码', icon: Lock },
    { key: 'theme', label: '主题外观', icon: Palette },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl flex flex-col shadow-[var(--shadow-lg)] max-h-[90vh]"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2">
            <Settings size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              设置
            </h3>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧标签栏 */}
          <div
            className="w-40 flex-shrink-0 border-r p-2"
            style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors mb-1"
                  style={
                    isActive
                      ? { background: 'var(--color-card)', color: 'var(--color-primary)', borderLeft: '3px solid var(--color-primary)' }
                      : { color: 'var(--color-text-secondary)', borderLeft: '3px solid transparent' }
                  }
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 个人资料 */}
            {tab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                  <Avatar username={user.username} avatar={avatar} size={64} />
                  <div>
                    <p className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                      {user.username}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text-light)' }}>
                      {user.email}
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm mb-1.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon size={14} /> 使用 QQ 头像
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={qq}
                      onChange={(e) => setQq(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="输入 QQ 号"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm flex-shrink-0"
                      disabled={!/^\d{5,11}$/.test(qq)}
                      onClick={() => {
                        setAvatar(buildQqAvatar(qq));
                        addToast('已应用 QQ 头像，点击"保存资料"生效', 'info');
                      }}
                    >
                      应用
                    </button>
                  </div>
                  {/^\d{5,11}$/.test(qq) && (
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        src={buildQqAvatar(qq)}
                        alt="QQ 头像预览"
                        draggable={false}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 3,
                          border: '1px solid var(--color-border)',
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                        }}
                      />
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        预览效果
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    头像链接
                  </label>
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="留空则使用首字母头像"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    个人简介
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="介绍一下自己"
                    rows={3}
                    maxLength={255}
                  />
                  <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-muted)' }}>
                    {bio.length}/255
                  </p>
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={savingProfile} className="btn btn-primary">
                    {savingProfile ? '保存中…' : '保存资料'}
                  </button>
                </div>
              </form>
            )}

            {/* 修改密码 */}
            {tab === 'password' && (
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    当前密码
                  </label>
                  <input
                    type="password"
                    value={oldPwd}
                    onChange={(e) => setOldPwd(e.target.value)}
                    placeholder="请输入当前密码"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    新密码
                  </label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="6-32位"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    确认新密码
                  </label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="再次输入新密码"
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={savingPwd} className="btn btn-primary">
                    {savingPwd ? '修改中…' : '修改密码'}
                  </button>
                </div>
              </form>
            )}

            {/* 主题外观 */}
            {tab === 'theme' && (
              <div className="flex flex-col gap-3">
                <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  选择主题外观，设置会自动保存
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {themeOptions.map((opt) => {
                    const isActive = theme === opt.name;
                    return (
                      <button
                        key={opt.name}
                        onClick={() => {
                          setTheme(opt.name);
                          addToast(`已切换到${opt.label}主题`, 'success');
                        }}
                        className="flex items-center justify-between p-4 text-left transition-colors"
                        style={
                          isActive
                            ? { background: 'var(--color-primary-light)', border: '2px solid var(--color-primary)' }
                            : { background: 'var(--color-card-alt)', border: '2px solid var(--color-border-light)' }
                        }
                      >
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                            {opt.label}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {opt.desc}
                          </p>
                        </div>
                        {isActive && <Check size={18} style={{ color: 'var(--color-primary)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
