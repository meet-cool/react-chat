import React from 'react';
import { useState, useEffect } from 'react';
import { X, Settings, User, Lock, Palette, Check, Volume2, Ban as BanIcon, Image as ImageIcon, Calendar, MapPin, Heart, Shield, ShieldCheck, Server, Loader, Globe, Key, Trash2, RefreshCw, Play, CheckCircle, XCircle, Copy, ArrowRight } from 'lucide-react';
import { getRadius, setRadius as persistRadius, getTransparency, setTransparency as persistTrans, getColorBg, setColorBg as persistColorBg, RADIUS_OPTIONS, type RadiusName } from '../lib/appearance';
import { socialApi, type BlockItem } from '../lib/api';
import { useApp } from '../lib/AppContext';
import { userApi, systemApi } from '../lib/api';
import { getApiBaseUrl, getToken, clearToken, setApiBaseUrl } from '../lib/api';
import { Avatar } from './Avatar';
import type { ThemeName, UserInfo, SystemInfo } from '../types';
import { useNavigate } from 'react-router-dom';
import { useDebug } from '../lib/DebugContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  user: UserInfo;
  onUserUpdate: (u: UserInfo) => void;
}

type Tab = 'profile' | 'password' | 'theme' | 'system';
type DebugAuth = 'hidden' | 'needs-pwd' | 'authenticated';
const DEBUG_PASSWORD = 'debug2024';

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
  const navigate = useNavigate();
  const { debugMode, setDebugMode, debugInfo } = useDebug();
  const [tab, setTab] = useState<Tab>('profile');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  const DEBUG_CLICKS = 7;
  const DEBUG_STORAGE_KEY = 'arcle_debug_mode';
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [debugProgress, setDebugProgress] = useState(0);
  const debugTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debugAuth, setDebugAuth] = useState<DebugAuth>('hidden');
  const [debugPwd, setDebugPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [debugPanel, setDebugPanel] = useState<'overview' | 'api' | 'session' | 'storage'>('overview');
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [apiMsg, setApiMsg] = useState('');
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [storageItems, setStorageItems] = useState<Map<string, string>>(new Map());
  const storageInitialized = React.useRef(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const applyCustomUrl = async (url: string) => {
    if (!url.trim()) return;
    setApiStatus('checking'); setApiMsg('');
    try { setApiBaseUrl(url.trim()); await systemApi.health(); setApiStatus('ok'); setApiMsg('连接成功'); }
    catch (e: unknown) { setApiStatus('error'); setApiMsg((e as Error).message || '连接失败'); }
  };
  const testApiNow = async () => {
    const url = getApiBaseUrl(); setApiStatus('checking'); setApiMsg('');
    try { await systemApi.health(); setApiStatus('ok'); setApiMsg('✅ ' + url + ' 正常'); }
    catch (e: unknown) { setApiStatus('error'); setApiMsg('❌ ' + (e as Error).message); }
  };
  const refreshStorage = () => setStorageItems(new Map(Object.entries(localStorage)));
  useEffect(() => { if (debugMode && !storageInitialized.current) { storageInitialized.current = true; refreshStorage(); } }, [debugMode]);
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };


  const handleLogout = () => { clearToken(); window.location.reload(); };

  useEffect(() => {
    setSystemLoading(true); setSystemError(null);
    systemApi.health().then(setSystemInfo).catch((e: Error) => setSystemError(e.message)).finally(() => setSystemLoading(false));
  }, []);

  const handleDebugBuildTimeClick = () => {
    if (debugMode || debugAuth !== 'hidden') return;
    const next = debugClickCount + 1;
    setDebugClickCount(next);
    setDebugProgress((next / DEBUG_CLICKS) * 100);
    
    if (debugTimerRef.current) {
      clearTimeout(debugTimerRef.current);
    }
    
    if (next >= DEBUG_CLICKS) {
      setDebugAuth('needs-pwd');
      setDebugClickCount(0);
      setDebugProgress(0);
      return;
    }
    
    debugTimerRef.current = setTimeout(() => {
      setDebugClickCount(0);
      setDebugProgress(0);
    }, 2000);
  };
  // 组件卸载时清除定时器
  React.useEffect(() => {
    return () => {
      if (debugTimerRef.current) {
        clearTimeout(debugTimerRef.current);
      }
    };
  }, []);

  const submitDebugPassword = () => {
    if (debugPwd === DEBUG_PASSWORD) {
      setDebugMode(true);
      setDebugAuth('authenticated'); setDebugPwd(''); setPwdError('');
      addToast('调试模式已开启', 'success');
    } else { setPwdError('密码错误，请重试'); }
  };

  const closeDebugMode = () => {
    setDebugMode(false);
    setDebugAuth('hidden');
    setDebugPanel('overview');
    addToast('调试模式已关闭', 'info');
  };

  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [qq, setQq] = useState(() => { const m = /nk=(\d+)/.exec(user.avatar || ''); return m ? m[1] : ''; });
  const [gender, setGender] = useState(user.gender || '');
  const [city, setCity] = useState(user.city || '');
  const [motto, setMotto] = useState(user.motto || '');
  const [birthday, setBirthday] = useState(user.birthday || '');
  const [age, setAge] = useState(user.age || 0);
  const [profileVisible, setProfileVisible] = useState<boolean>((user.profile_visible ?? 1) === 1);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setBio(user.bio || ''); setAvatar(user.avatar || '');
    const m = /nk=(\d+)/.exec(user.avatar || ''); setQq(m ? m[1] : '');
    setGender(user.gender || ''); setCity(user.city || ''); setMotto(user.motto || '');
    setBirthday(user.birthday || ''); setAge(user.age || 0);
    setProfileVisible((user.profile_visible ?? 1) === 1);
  }, [user.avatar, user.bio, user.gender, user.city, user.motto, user.birthday, user.age, user.profile_visible]);

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  // 外观自定义（圆角/透明），变更即时生效并持久化
  const [radius, setRadiusState] = useState<RadiusName>(() => getRadius());
  const [trans, setTransState] = useState<boolean>(() => getTransparency());
  const [colorBg, setColorBgState] = useState<boolean>(() => getColorBg());
  const setRadius = (r: RadiusName) => { persistRadius(r); setRadiusState(r); };
  const setTrans = (on: boolean) => { persistTrans(on); setTransState(on); };
  const setColorBg = (on: boolean) => { persistColorBg(on); setColorBgState(on); };

  // 消息提示音（默认关）
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('arcle_sound') === '1');
  const toggleSound = (on: boolean) => {
    localStorage.setItem('arcle_sound', on ? '1' : '0');
    setSoundOn(on);
    if (on) { try { new Audio('/sound/typing.mp3').play().catch(() => {}); } catch { /* ignore */ } }
  };

  // 黑名单管理
  const [blockPanel, setBlockPanel] = useState(false);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const openBlocks = () => {
    setBlockPanel(true);
    setBlocksLoading(true);
    socialApi.blocks().then((r) => setBlocks(r)).catch(() => setBlocks([])).finally(() => setBlocksLoading(false));
  };
  const handleUnblock = (uid: number) => {
    socialApi.unblock(uid).then(() => setBlocks((prev) => prev.filter((b) => b.user_id !== uid))).catch(() => {});
  };

  // 账号注销
  const [deactivateStep, setDeactivateStep] = useState(false);
  const [deactivatePwd, setDeactivatePwd] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  const handleDeactivate = async () => {
    if (!deactivatePwd) { addToast('请输入密码确认', 'warning'); return; }
    setDeactivating(true);
    try {
      await socialApi.deactivate(deactivatePwd);
      localStorage.removeItem('arcle_token');
      localStorage.removeItem('arcle_user');
      localStorage.removeItem('eng_user');
      addToast('账号已注销', 'success');
      setTimeout(() => { window.location.href = '/'; }, 800);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '注销失败', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  // Escape 关闭弹窗
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleClose = () => {
    // 如果处于密码输入状态，重置为隐藏状态
    if (debugAuth === 'needs-pwd') {
      setDebugAuth('hidden');
      setDebugPwd('');
      setPwdError('');
      setDebugClickCount(0);
      setDebugProgress(0);
    }
    onClose();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingProfile(true);
    try {
      const updated = await userApi.updateProfile({ bio: bio.trim(), avatar: avatar.trim(), qq: qq || undefined, gender, city: city.trim(), motto: motto.trim(), birthday: birthday || undefined, age });
      onUserUpdate(updated); addToast('资料已更新', 'success');
    } catch (err) { addToast(err instanceof Error ? err.message : '保存失败', 'error'); }
    finally { setSavingProfile(false); }
  };
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6 || newPwd.length > 32) { addToast('新密码长度需为 6-32 位', 'warning'); return; }
    if (newPwd !== confirmPwd) { addToast('两次输入的密码不一致', 'warning'); return; }
    setSavingPwd(true);
    try { await userApi.updatePassword({ old_password: oldPwd, new_password: newPwd }); addToast('密码修改成功', 'success'); setOldPwd(''); setNewPwd(''); setConfirmPwd(''); }
    catch (err) { addToast(err instanceof Error ? err.message : '修改失败', 'error'); }
    finally { setSavingPwd(false); }
  };

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: '个人资料', icon: User }, { key: 'password', label: '修改密码', icon: Lock },
    { key: 'theme', label: '主题外观', icon: Palette }, { key: 'system', label: '系统信息', icon: Server },
  ];
  const inputCls = 'w-full px-3 py-2 text-sm rounded outline-none transition-colors';
  const inputStyle: React.CSSProperties = { background: 'var(--color-bg-page)', border: '1px solid var(--color-border)', color: 'var(--color-text)' };
  const labelStyle: React.CSSProperties = { color: 'var(--color-text-secondary)' };
  const fieldStyle: React.CSSProperties = { marginBottom: 12 };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={handleClose}>
      <div className="w-full max-w-xl flex flex-col shadow-[var(--shadow-lg)]" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="flex items-center gap-2"><Settings size={18} style={{ color: 'var(--color-primary)' }} /><h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>设置</h3></div>
          <button onClick={handleClose} className="p-1" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-36 flex-shrink-0 border-r p-2 flex flex-col gap-1" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}>
            {tabs.map((t) => { const Icon = t.icon; const isActive = tab === t.key; return (
              <button key={t.key} onClick={() => setTab(t.key)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors rounded" style={isActive ? { background: 'var(--color-card)', color: 'var(--color-primary)', borderLeft: '3px solid var(--color-primary)' } : { color: 'var(--color-text-secondary)', borderLeft: '3px solid transparent' }}>
                <Icon size={15} /><span>{t.label}</span></button>); })}
          </div>
          <div className="flex-1 overflow-y-auto p-6 min-w-0">
            {tab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-0">
                <div className="flex items-center gap-4 pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                  <Avatar username={user.username} avatar={avatar} size={64} />
                  <div><p className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>{user.username}</p><p className="text-sm" style={{ color: 'var(--color-text-light)' }}>{user.email}</p></div>
                </div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}><span className="inline-flex items-center gap-1"><ImageIcon size={14} /> 使用 QQ 头像</span></label>
                  <div className="flex items-center gap-2"><input type="text" inputMode="numeric" value={qq} onChange={(e) => setQq(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="输入 QQ 号" className={inputCls} style={inputStyle} />
                    <button type="button" className="btn btn-sm flex-shrink-0" disabled={!/^\d{5,11}$/.test(qq)} onClick={() => { setAvatar(buildQqAvatar(qq)); addToast('已应用 QQ 头像，点击保存资料生效', 'info'); }}>应用</button></div>
                  {/^\d{5,11}$/.test(qq) && <div className="flex items-center gap-2 mt-2"><img src={buildQqAvatar(qq)} alt="预览" draggable={false} style={{ width: 36, height: 36, borderRadius: 3, border: '1px solid var(--color-border)', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }} /><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>预览效果</span></div>}
                </div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}>头像链接</label><input type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="留空则使用首字母头像" className={inputCls} style={inputStyle} /></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}>性别</label>
                  <div className="flex gap-2">{['male','female','other'].map((g) => ({ val: g, label: { male:'男', female:'女', other:'保密' }[g], icon: { male:'♂', female:'♀', other:'◇' }[g] })).map(({val,label,icon}) => (
                    <button key={val} type="button" className="btn btn-sm flex-1 justify-center" style={gender===val ? {background:'var(--color-primary)',color:'#fff',borderColor:'var(--color-primary)'} : {}} onClick={() => setGender(gender===val?'':val)}>{icon} {label}</button>))}</div></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}><MapPin size={13} className="inline mr-1"/>城市</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="例如：深圳市" className={inputCls} style={inputStyle} /></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}><Calendar size={13} className="inline mr-1"/>生日</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputCls} style={inputStyle} /></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}>年龄</label><input type="number" min={0} max={150} placeholder="未填写" value={age === 0 ? '' : age} onChange={(e) => setAge(e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} className={inputCls} style={inputStyle} /></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}><Heart size={13} className="inline mr-1"/>座右铭</label><textarea value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="写一句你喜欢的话" rows={2} maxLength={200} className={inputCls} style={{...inputStyle,resize:'vertical'}} /><p className="text-xs mt-1 text-right" style={{color:'var(--color-text-muted)'}}>{motto.length}/200</p></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}>个人简介</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="介绍一下自己" rows={3} maxLength={255} className={inputCls} style={{...inputStyle,resize:'vertical'}} /><p className="text-xs mt-1 text-right" style={{color:'var(--color-text-muted)'}}>{bio.length}/255</p></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}><span className="inline-flex items-center gap-1">{profileVisible?<ShieldCheck size={14}/>:<Shield size={14}/>}主页可见性</span></label>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-sm flex-1 justify-center" style={profileVisible ? {background:'var(--color-primary)',color:'#fff',borderColor:'var(--color-primary)'} : {background:'var(--color-hover-bg)',color:'var(--color-text-muted)'}} onClick={() => setProfileVisible(true)}><ShieldCheck size={14}/>公开</button>
                    <button type="button" className="btn btn-sm flex-1 justify-center" style={!profileVisible ? {background:'rgba(239,68,68,0.15)',color:'#ef4444',borderColor:'rgba(239,68,68,0.4)'} : {background:'var(--color-hover-bg)',color:'var(--color-text-muted)'}} onClick={() => setProfileVisible(false)}><Shield size={14}/>隐藏</button>
                  </div><p className="text-xs mt-1.5" style={{color:'var(--color-text-muted)'}}>隐藏后其他用户将无法查看您的主页详情</p></div>
                <div className="flex justify-end pt-2"><button type="submit" disabled={savingProfile} className="btn btn-primary">{savingProfile ? '保存中…' : '保存资料'}</button></div>

                {/* 安全与账号 */}
                <div className="border-t pt-4 flex flex-col gap-3" style={{ borderColor: 'var(--color-divider)' }}>
                  <button type="button" onClick={openBlocks} className="btn btn-sm justify-center" style={{ minHeight: 36 }}>
                    <BanIcon size={14} /> 黑名单管理
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeactivateStep(true)}
                    className="btn btn-sm justify-center"
                    style={{ minHeight: 36, borderColor: 'var(--color-error)', color: 'var(--color-error)', background: 'rgba(248,113,113,0.08)' }}
                  >
                    注销账号
                  </button>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>注销后账号将无法登录且不可恢复，请谨慎操作</p>
                </div>

                {/* 黑名单面板 */}
                {blockPanel && (
                  <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setBlockPanel(false)}>
                    <div className="w-full max-w-sm flex flex-col" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, maxHeight: '70vh' }} onClick={(e) => e.stopPropagation()}>
                      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-divider)' }}>
                        <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>黑名单管理</span>
                        <button onClick={() => setBlockPanel(false)} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>关闭</button>
                      </div>
                      <div className="overflow-y-auto">
                        {blocksLoading ? (
                          <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>加载中…</p>
                        ) : blocks.length === 0 ? (
                          <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>黑名单为空</p>
                        ) : (
                          blocks.map((b) => (
                            <div key={b.user_id} className="flex items-center gap-2 px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--color-divider)' }}>
                              <span className="text-sm flex-1" style={{ color: 'var(--color-text)' }}>{b.username}</span>
                              <button onClick={() => handleUnblock(b.user_id)} className="btn btn-sm" style={{ minHeight: 28 }}>解除拉黑</button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 注销确认面板 */}
                {deactivateStep && (
                  <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setDeactivateStep(false)}>
                    <div className="w-full max-w-sm flex flex-col" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
                      <div className="px-5 py-4">
                        <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-error)' }}>⚠️ 确认注销账号</p>
                        <p className="text-xs leading-5 mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                          注销后账号将匿名化且<b>无法恢复</b>，关注关系将被解除。请输入登录密码确认：
                        </p>
                        <input
                          type="password"
                          value={deactivatePwd}
                          onChange={(e) => setDeactivatePwd(e.target.value)}
                          placeholder="登录密码"
                          className={inputCls}
                          style={inputStyle}
                        />
                      </div>
                      <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-divider)' }}>
                        <button onClick={() => { setDeactivateStep(false); setDeactivatePwd(''); }} className="btn btn-sm" style={{ minHeight: 32 }}>取消</button>
                        <button onClick={handleDeactivate} disabled={deactivating || !deactivatePwd} className="btn btn-sm" style={{ minHeight: 32, background: 'var(--color-error)', color: '#fff', borderColor: 'var(--color-error)' }}>
                          {deactivating ? '注销中…' : '确认注销'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}
            {tab === 'password' && (
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div><label className="block text-sm mb-1.5" style={labelStyle}>当前密码</label><input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="请输入当前密码" autoComplete="current-password" className={inputCls} style={inputStyle} /></div>
                <div><label className="block text-sm mb-1.5" style={labelStyle}>新密码</label><input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="6-32位" autoComplete="new-password" className={inputCls} style={inputStyle} /></div>
                <div><label className="block text-sm mb-1.5" style={labelStyle}>确认新密码</label><input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="再次输入新密码" autoComplete="new-password" className={inputCls} style={inputStyle} /></div>
                <div className="flex justify-end"><button type="submit" disabled={savingPwd} className="btn btn-primary">{savingPwd ? '修改中…' : '修改密码'}</button></div>
              </form>
            )}
            {tab === 'theme' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <p className="text-sm" style={{color:'var(--color-text-secondary)'}}>选择主题外观，设置会自动保存</p>
                  <div className="grid grid-cols-2 gap-3">
                    {themeOptions.map((opt) => { const isActive = theme === opt.name; return (
                      <button key={opt.name} onClick={() => { setTheme(opt.name); addToast('已切换到'+opt.label+'主题','success'); }} className="flex items-center justify-between p-4 text-left transition-colors" style={isActive ? {background:'var(--color-primary-light)',border:'2px solid var(--color-primary)'} : {background:'var(--color-card-alt)',border:'2px solid var(--color-border-light)'}}>
                        <div><p className="font-medium text-sm" style={{color:'var(--color-text)'}}>{opt.label}</p><p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{opt.desc}</p></div>
                        {isActive && <Check size={18} style={{color:'var(--color-primary)'}}/>}</button>); })}
                  </div>
                </div>

                {/* 外观自定义：圆角 + 透明 */}
                <div className="border-t pt-4 flex flex-col gap-4" style={{ borderColor: 'var(--color-divider)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>界面自定义</p>

                  <div>
                    <label className="block text-sm mb-2" style={labelStyle}>界面圆角</label>
                    <div className="grid grid-cols-4 gap-2">
                      {RADIUS_OPTIONS.map((opt) => {
                        const active = radius === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => { setRadius(opt.value); addToast('圆角已调整为「' + opt.label + '」', 'info'); }}
                            className="btn btn-sm justify-center"
                            style={active
                              ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                              : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>调整按钮、输入框与卡片的圆角大小</p>
                  </div>

                  <div>
                    <label className="block text-sm mb-2" style={labelStyle}>彩色背景</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setColorBg(true); addToast('彩色背景已开启', 'info'); }}
                        className="btn btn-sm justify-center"
                        style={colorBg
                          ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                          : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                      >
                        开启
                      </button>
                      <button
                        onClick={() => { setColorBg(false); addToast('彩色背景已关闭', 'info'); }}
                        className="btn btn-sm justify-center"
                        style={!colorBg
                          ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                          : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                      >
                        关闭
                      </button>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>页面背景显示渐变彩色光斑，深色/高对比主题下自动隐藏</p>
                  </div>

                  <div>
                    <label className="block text-sm mb-2" style={labelStyle}>透明效果</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setTrans(true); addToast('透明效果已开启', 'info'); }}
                        className="btn btn-sm justify-center"
                        style={trans
                          ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                          : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                      >
                        开启
                      </button>
                      <button
                        onClick={() => { setTrans(false); addToast('透明效果已关闭', 'info'); }}
                        className="btn btn-sm justify-center"
                        style={!trans
                          ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                          : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                      >
                        关闭
                      </button>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>卡片与面板半透明，透出页面渐变底色</p>
                  </div>

                  <div>
                    <label className="block text-sm mb-2" style={labelStyle}>消息提示音</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleSound(true)}
                        className="btn btn-sm justify-center"
                        style={soundOn
                          ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                          : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                      >
                        开启
                      </button>
                      <button
                        onClick={() => toggleSound(false)}
                        className="btn btn-sm justify-center"
                        style={!soundOn
                          ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                          : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                      >
                        关闭
                      </button>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>收到新消息时播放提示音</p>
                  </div>
                </div>
              </div>
            )}
            {tab === 'system' && (
              <div className="flex flex-col gap-4">
                {debugMode ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-1 p-1 rounded" style={{background:'var(--color-card-alt)'}}>
                      {([{key:'overview' as const,label:'总览',icon:Settings},{key:'api' as const,label:'API',icon:Globe},{key:'session' as const,label:'会话',icon:Key},{key:'storage' as const,label:'存储',icon:Trash2}]).map((t) => {
                        const Ico = t.icon; const active = debugPanel === t.key;
                        return (<button key={t.key} onClick={() => setDebugPanel(t.key)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded transition-colors" style={active ? {background:'var(--color-primary)',color:'#fff'} : {background:'transparent',color:'var(--color-text-muted)'}}><Ico size={12}/>{t.label}</button>);
                      })}
                    </div>
                    {debugPanel === 'overview' && (
                      <div className="flex flex-col gap-2">
                        {systemInfo ? <>
                          {[{label:'应用版本',value:systemInfo.version},{label:'PHP 版本',value:systemInfo.php_version}].map(({label,value}) => (
                            <div key={label} className="flex items-center justify-between py-2 px-3 rounded" style={{background:'var(--color-card-alt)'}}>
                              <span className="text-sm" style={{color:'var(--color-text-muted)'}}>{label}</span>
                              <span className="text-sm font-mono" style={{color:'var(--color-text)'}}>{value}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between py-2 px-3 rounded" style={{background:'var(--color-card-alt)'}}>
                            <span className="text-sm" style={{color:'var(--color-text-muted)'}}>运行时长</span>
                            <span className="text-sm font-mono" style={{color:'var(--color-text)'}}>{(() => { const u = systemInfo.uptime; const h = Math.floor(u / 3600); const m = Math.floor((u % 3600) / 60); return h > 0 ? h + '时' + m + '分' : m + '分'; })()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs" style={{color:'var(--color-success)'}}><span>●</span> 后端连接正常</div>
                        </> : <div className="py-4 text-sm" style={{color:'var(--color-text-muted)'}}>加载中…</div>}
                        <button onClick={closeDebugMode} className="w-full py-2 rounded text-sm font-medium transition-colors" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>关闭调试模式</button>
                        <button
                          onClick={() => navigate('/debug')}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors mt-2"
                          style={{background:'var(--color-primary)',color:'#fff',border:'none'}}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
                        >
                          <Settings size={14} />
                          开发者选项
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                    {debugPanel === 'api' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-3 py-2 rounded" style={{background:'var(--color-card-alt)'}}>
                          <span className="text-xs" style={{color:'var(--color-text-muted)'}}>当前 API</span>
                          <span className="text-xs font-mono" style={{color:'var(--color-text)'}}>{getApiBaseUrl()}</span>
                        </div>
                        <div className="flex gap-2">
                          <input type="url" value={customApiUrl} onChange={(e) => setCustomApiUrl(e.target.value)} placeholder="http://新地址:8000" className="flex-1 text-sm px-3 py-2 rounded outline-none font-mono" style={{background:'var(--color-bg-page)',border:'1px solid var(--color-border)',color:'var(--color-text)'}} />
                          <button onClick={() => applyCustomUrl(customApiUrl)} disabled={apiStatus==='checking'} className="btn btn-sm flex-shrink-0" style={apiStatus==='checking'?{opacity:0.5}:undefined}>应用</button>
                        </div>
                        <button onClick={testApiNow} disabled={apiStatus==='checking'} className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors" style={{background:apiStatus==='checking'?'var(--color-hover-bg)':'var(--color-primary-light)',color:apiStatus==='checking'?'var(--color-text-muted)':'var(--color-primary)',border:'1px solid var(--color-primary)',opacity:apiStatus==='checking'?0.6:1}}>
                          <Play size={14} className={apiStatus==='checking'?'animate-pulse':''} />{apiStatus==='checking'?'测试中…':'测试连接'}
                        </button>
                        {(apiStatus==='ok'||apiStatus==='error') && (
                          <div className="flex items-center gap-2 text-xs" style={{color:apiStatus==='ok'?'var(--color-success)':'var(--color-error)'}}>
                            {apiStatus==='ok'?<CheckCircle size={12}/>:<XCircle size={12}/>} {apiMsg}
                          </div>
                        )}
                      </div>
                    )}
                    {debugPanel === 'session' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-3 py-2 rounded" style={{background:'var(--color-card-alt)'}}>
                          <span className="text-sm" style={{color:'var(--color-text-muted)'}}>登录状态</span>
                          <span className="text-xs px-2 py-1 rounded-sm" style={getToken()?{background:'rgba(74,222,128,0.15)',color:'#4ade80'}:{background:'rgba(251,191,36,0.15)',color:'#fbbf24'}}>{getToken()?'已登录':'未登录'}</span>
                        </div>
                        {getToken() && <div className="px-3"><span className="text-xs" style={{color:'var(--color-text-muted)'}}>Token 预览</span><p className="text-xs font-mono mt-1 break-all p-2 rounded" style={{background:'var(--color-bg-page)',color:'var(--color-text-muted)'}}>{getToken().slice(0,60)}…</p></div>}
                        <div className="flex items-center justify-between px-3 py-2 rounded" style={{background:'var(--color-card-alt)'}}>
                          <span className="text-sm" style={{color:'var(--color-text-muted)'}}>当前用户</span>
                          <span className="text-sm font-mono" style={{color:'var(--color-text)'}}>{user.username}</span>
                        </div>
                        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors" style={{background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.3)'}}><Trash2 size={14}/>清除登录状态</button>
                      </div>
                    )}
                    {debugPanel === 'storage' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{color:'var(--color-text-muted)'}}>localStorage ({storageItems.size} 项)</span>
                          <button onClick={refreshStorage} className="text-xs px-2 py-1 rounded flex items-center gap-1" style={{background:'var(--color-hover-bg)',color:'var(--color-text-muted)'}}><RefreshCw size={12}/>刷新</button>
                        </div>
                        {storageItems.size===0 ? <p className="text-xs text-center py-6" style={{color:'var(--color-text-muted)'}}>本地存储为空</p> : (
                          <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
                            {Array.from(storageItems.entries()).map(([key,val]) => (
                              <div key={key} className="flex items-center gap-2 px-3 py-2 rounded text-xs group" style={{background:'var(--color-bg-page)'}}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-mono truncate" style={{color:'var(--color-text)'}}>{key}</span>
                                    <button
                                      onClick={() => copyToClipboard(`${key}=${val}`, key)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1.5 py-0.5 rounded"
                                      style={{background:'var(--color-hover-bg)',color:'var(--color-text-muted)'}}
                                      title="复制键值对"
                                    >
                                      {copiedKey === key ? <Check size={10} className="text-[var(--color-success)]" /> : <Copy size={10} />}
                                      <span className="text-[10px]">{copiedKey === key ? '已复制' : '复制'}</span>
                                    </button>
                                  </div>
                                  <span className="font-mono block truncate text-[10px]" style={{color:'var(--color-text-muted)'}}>{val.length>60?val.slice(0,60)+'…':val}</span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(val, `${key}_value`)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded flex-shrink-0"
                                  style={{background:'var(--color-hover-bg)',color:'var(--color-text-muted)'}}
                                  title="复制值"
                                >
                                  {copiedKey === `${key}_value` ? <Check size={12} className="text-[var(--color-success)]" /> : <Copy size={12} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button onClick={() => { Object.keys(localStorage).forEach((k)=>localStorage.removeItem(k)); refreshStorage(); }} className="w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors" style={{background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.3)'}}><Trash2 size={14}/>清除所有本地存储</button>
                      </div>
                    )}
                  </div>
                ) : systemLoading ? (
                  <div className="flex items-center gap-2 py-4" style={{color:'var(--color-text-muted)'}}><Loader size={16} className="animate-spin"/><span className="text-sm">正在连接后端…</span></div>
                ) : systemError ? (
                  <div className="p-3 rounded text-sm" style={{background:'rgba(239,68,68,0.1)',color:'#ef4444'}}>⚠ 无法连接后端：{systemError}</div>
                ) : systemInfo ? (
                  <div className="flex flex-col gap-2">
                    {[{label:'应用版本',value:systemInfo.version},{label:'PHP 版本',value:systemInfo.php_version}].map(({label,value}) => (
                      <div key={label} className="flex items-center justify-between py-2 px-3 rounded" style={{background:'var(--color-card-alt)'}}>
                        <span className="text-sm" style={{color:'var(--color-text-muted)'}}>{label}</span>
                        <span className="text-sm font-mono" style={{color:'var(--color-text)'}}>{value}</span>
                      </div>
                    ))}
                    {debugAuth === 'hidden' && (
                      <div onClick={handleDebugBuildTimeClick} className="flex items-center justify-between py-2 px-3 rounded cursor-pointer transition-colors select-none" style={{background:debugClickCount>0?'rgba(59,130,246,0.12)':'var(--color-card-alt)',border:debugClickCount>0?'1px dashed var(--color-primary)':'1px solid transparent'}}>
                        <span className="text-sm" style={{color:'var(--color-text-muted)'}}>构建时间</span>
                        <span className="text-sm font-mono" style={{color:'var(--color-text)'}}>{systemInfo.build_time}</span>
                      </div>
                    )}
                    {debugClickCount > 0 && debugAuth === 'hidden' && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-sm overflow-hidden" style={{background:'var(--color-border-light)'}}>
                          <div 
                            className="h-full transition-all duration-300 ease-out"
                            style={{width: `${debugProgress}%`, background:'var(--color-primary)'}}
                          />
                        </div>
                        <p className="text-xs text-center mt-1" style={{color:'var(--color-text-muted)'}}>已点击 {debugClickCount}/{DEBUG_CLICKS} 次</p>
                      </div>
                    )}
                    {debugAuth === 'needs-pwd' && (
                      <div className="flex flex-col gap-2 mt-1">
                        <input type="password" value={debugPwd} onChange={(e)=>{setDebugPwd(e.target.value);setPwdError('');}} onKeyDown={(e)=>e.key==='Enter'&&submitDebugPassword()} placeholder="输入调试密码" className={inputCls} style={inputStyle} autoFocus />
                        <div className="flex gap-2">
                          <button onClick={submitDebugPassword} className="btn btn-sm flex-1 justify-center btn-primary">解锁</button>
                          <button onClick={()=>{setDebugAuth('hidden');setDebugPwd('');setPwdError('');setDebugClickCount(0); setDebugProgress(0);}} className="btn btn-sm flex-1 justify-center">取消</button>
                        </div>
                        {pwdError && <p className="text-xs text-center" style={{color:'var(--color-error)'}}>{pwdError}</p>}
                        <p className="text-xs text-center" style={{color:'var(--color-text-muted)'}}>提示：debug2024</p>
                      </div>
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
