import { useState, useEffect } from 'react';
import { X, Settings, User, Lock, Palette, Check, Image as ImageIcon, Calendar, MapPin, Heart, Shield, ShieldCheck, Server, Loader } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { userApi, systemApi } from '../lib/api';
import { Avatar } from './Avatar';
import type { ThemeName, UserInfo, SystemInfo } from '../types';

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

  // 系统信息
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  // 调试模式：连续点击构建时间7次触发，localStorage 持久化
  const DEBUG_CLICKS = 7;
  const DEBUG_STORAGE_KEY = 'arcle_debug_mode';
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [debugMode, setDebugMode] = useState(() => {
    try { return localStorage.getItem(DEBUG_STORAGE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    setSystemLoading(true);
    setSystemError(null);
    systemApi.health()
      .then(setSystemInfo)
      .catch((e: Error) => setSystemError(e.message))
      .finally(() => setSystemLoading(false));
  }, []);

  const handleDebugBuildTimeClick = () => {
    if (debugMode) return;
    const next = debugClickCount + 1;
    setDebugClickCount(next);
    if (next >= DEBUG_CLICKS) {
      setDebugMode(true);
      try { localStorage.setItem(DEBUG_STORAGE_KEY, '1'); } catch {}
      setDebugClickCount(0);
      addToast('调试模式已开启', 'success');
    }
  };

  // 资料表单
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [qq, setQq] = useState(() => {
    const m = /nk=(\d+)/.exec(user.avatar || '');
    return m ? m[1] : '';
  });
  const [gender, setGender] = useState(user.gender || '');
  const [city, setCity] = useState(user.city || '');
  const [motto, setMotto] = useState(user.motto || '');
  const [birthday, setBirthday] = useState(user.birthday || '');
  const [age, setAge] = useState(user.age || 0);
  const [profileVisible, setProfileVisible] = useState<boolean>(user.profile_visible !== false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setBio(user.bio || '');
    setAvatar(user.avatar || '');
    const m = /nk=(\d+)/.exec(user.avatar || '');
    setQq(m ? m[1] : '');
    setGender(user.gender || '');
    setCity(user.city || '');
    setMotto(user.motto || '');
    setBirthday(user.birthday || '');
    setAge(user.age || 0);
    setProfileVisible(user.profile_visible !== false);
  }, [user.avatar, user.bio, user.gender, user.city, user.motto, user.birthday, user.age, user.profile_visible]);

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
      const updated = await userApi.updateProfile({
        bio: bio.trim(),
        avatar: avatar.trim(),
        qq: qq || undefined,
        gender,
        city: city.trim(),
        motto: motto.trim(),
        birthday: birthday || undefined,
        age,
      });
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

  // 输入框样式
  const inputCls = 'w-full px-3 py-2 text-sm rounded outline-none transition-colors';
  const inputStyle: React.CSSProperties = {
    background: 'var(--color-bg-page)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  };
  const labelStyle: React.CSSProperties = { color: 'var(--color-text-secondary)' };
  const fieldStyle: React.CSSProperties = { marginBottom: 12 };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl flex flex-col shadow-[var(--shadow-lg)]"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
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

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 左侧标签栏 */}
          <div
            className="w-36 flex-shrink-0 border-r p-2 flex flex-col gap-1"
            style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors rounded"
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

          {/* 右侧内容区 — 固定高度滚动 */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0">
            {/* 个人资料 */}
            {tab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-0">
                {/* 头像区 */}
                <div className="flex items-center gap-4 pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
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

                {/* QQ 头像 */}
                <div style={fieldStyle}>
                  <label className="block text-sm mb-1.5" style={labelStyle}>
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
                      className={inputCls}
                      style={inputStyle}
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
                        alt="预览"
                        draggable={false}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 3,
                          border: '1px solid var(--color-border)',
                          objectFit: 'cover',
                        }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
                      />
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>预览效果</span>
                    </div>
                  )}
                </div>

                {/* 头像链接 */}
                <div style={fieldStyle}>
                  <label className="block text-sm mb-1.5" style={labelStyle}>头像链接</label>
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="留空则使用首字母头像"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {/* 性别 */}
                <div style={fieldStyle}>
                  <label className="block text-sm mb-1.5" style={labelStyle}>性别</label>
                  <div className="flex gap-2">
                    {[
                      { val: 'male', label: '男', icon: '♂' },
                      { val: 'female', label: '女', icon: '♀' },
                      { val: 'other', label: '保密', icon: '◇' },
                    ].map((g) => (
                      <button
                        key={g.val}
                        type="button"
                        className="btn btn-sm flex-1 justify-center"
                        style={
                          gender === g.val
                            ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                            : {}
                        }
                        onClick={() => setGender(gender === g.val ? '' : g.val)}
                      >
                        {g.icon} {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 城市 */}
                <div style={fieldStyle}>
                  <label className="block text-sm mb-1.5" style={labelStyle}>
                    <MapPin size={13} className="inline mr-1" /> 城市
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="例如：深圳市"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {/* 生日 */}
                <div style={fieldStyle}>
                  <label className="block text-sm mb-1.5" style={labelStyle}>
                    <Calendar size={13} className="inline mr-1" /> 生日
                  </label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {/* 年龄 */}
                <div style={fieldStyle}>
                  <label className="block text-sm mb-1.5" style={labelStyle}>年龄</label>
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {/* 座右铭 */}
                <div style={fieldStyle}>
                  <label className="block text-sm mb-1.5" style={labelStyle}>
                    <Heart size={13} className="inline mr-1" /> 座右铭
                  </label>
                  <textarea
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="写一句你喜欢的话"
                    rows={2}
                    maxLength={200}
                    className={inputCls}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                  <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-muted)' }}>
                    {motto.length}/200
                  </p>
                </div>

                {/* 个人简介 */}
                <div style={fieldStyle}>
                  <label className="block text-sm mb-1.5" style={labelStyle}>个人简介</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="介绍一下自己"
                    rows={3}
                    maxLength={255}
                    className={inputCls}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                  <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-muted)' }}>
                    {bio.length}/255
                  </p>
                </div>

                {/* 主页可见性 */}
                <div style={fieldStyle}>
                  <label className="block text-sm mb-1.5" style={labelStyle}>
                    <span className="inline-flex items-center gap-1">
                      {profileVisible ? <ShieldCheck size={14} /> : <Shield size={14} />}
                      主页可见性
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 justify-center ${profileVisible ? 'btn-primary' : ''}`}
                      style={profileVisible ? {} : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                      onClick={() => setProfileVisible(true)}
                    >
                      <ShieldCheck size={14} /> 公开
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-1 justify-center ${!profileVisible ? '' : ''}`}
                      style={!profileVisible ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' } : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                      onClick={() => setProfileVisible(false)}
                    >
                      <Shield size={14} /> 隐藏
                    </button>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    隐藏后其他用户将无法查看您的主页详情
                  </p>
                </div>

                {/* 保存按钮 */}
                <div className="flex justify-end pt-2">
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
                  <label className="block text-sm mb-1.5" style={labelStyle}>当前密码</label>
                  <input
                    type="password"
                    value={oldPwd}
                    onChange={(e) => setOldPwd(e.target.value)}
                    placeholder="请输入当前密码"
                    autoComplete="current-password"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" style={labelStyle}>新密码</label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="6-32位"
                    autoComplete="new-password"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" style={labelStyle}>确认新密码</label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="再次输入新密码"
                    autoComplete="new-password"
                    className={inputCls}
                    style={inputStyle}
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
                <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
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
                          <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{opt.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</p>
                        </div>
                        {isActive && <Check size={18} style={{ color: 'var(--color-primary)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 系统信息 */}
            {tab === 'system' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  后端服务连接信息
                </p>
                {systemLoading ? (
                  <div className="flex items-center gap-2 py-4" style={{ color: 'var(--color-text-muted)' }}>
                    <Loader size={16} className="animate-spin" />
                    <span className="text-sm">正在连接后端…</span>
                  </div>
                ) : systemError ? (
                  <div className="p-3 rounded text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    ⚠ 无法连接后端：{systemError}
                  </div>
                ) : systemInfo ? (
                  <div className="flex flex-col gap-2">
                    {[
                      { label: '应用版本', value: systemInfo.version },
                      { label: 'PHP 版本', value: systemInfo.php_version },
                      { label: '运行时长', value: `${Math.floor(systemInfo.uptime / 3600)}时${Math.floor((systemInfo.uptime % 3600) / 60)}分` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 px-3 rounded" style={{ background: 'var(--color-card-alt)' }}>
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                        <span className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>{value}</span>
                      </div>
                    ))}
                    {/* 调试入口：构建时间可点击，连续7次开启调试模式 */}
                    <div
                      onClick={handleDebugBuildTimeClick}
                      className="flex items-center justify-between py-2 px-3 rounded cursor-pointer transition-colors select-none"
                      style={{
                        background: debugClickCount > 0
                          ? 'rgba(59,130,246,0.12)'
                          : 'var(--color-card-alt)',
                        border: debugClickCount > 0
                          ? '1px dashed var(--color-primary)'
                          : '1px solid transparent',
                      }}
                    >
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>构建时间</span>
                      <span className="text-sm font-mono" style={{ color: 'var(--color-text)' }}>{systemInfo.build_time}</span>
                    </div>
                    {debugClickCount > 0 && !debugMode && (
                      <p className="text-xs text-center" style={{ color: 'var(--color-primary)' }}>
                        再次点击{DEBUG_CLICKS - debugClickCount}次进入调试模式
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--color-success, #22c55e)' }}>
                      <span>●</span> 后端连接正常 · API: {import.meta.env.VITE_API_BASE_URL || 'localhost:8000'}
                    </div>
                    {debugMode && (
                      <button
                        onClick={() => {
                          try { localStorage.removeItem(DEBUG_STORAGE_KEY); } catch {}
                          setDebugMode(false);
                          addToast('调试模式已关闭，刷新后生效', 'info');
                        }}
                        className="w-full py-2 rounded text-sm font-medium transition-colors"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                      >
                        关闭调试模式
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
