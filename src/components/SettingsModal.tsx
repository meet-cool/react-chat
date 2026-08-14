import React from 'react';
import { useState, useEffect } from 'react';
import { X, Settings, User, Lock, Palette, Check, Image as ImageIcon, Calendar, MapPin, Heart, Shield, ShieldCheck, Server, Loader, Globe, Key, Trash2, RefreshCw, Play, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { userApi, systemApi } from '../lib/api';
import { getApiBaseUrl, getToken, clearToken, setApiBaseUrl } from '../lib/api';
import { Avatar } from './Avatar';
import type { ThemeName, UserInfo, SystemInfo } from '../types';

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
  const [tab, setTab] = useState<Tab>('profile');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  const DEBUG_CLICKS = 7;
  const DEBUG_STORAGE_KEY = 'arcle_debug_mode';
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [debugMode, setDebugMode] = useState(() => {
    try { return localStorage.getItem(DEBUG_STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [debugAuth, setDebugAuth] = useState<DebugAuth>('hidden');
  const [debugPwd, setDebugPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [debugPanel, setDebugPanel] = useState<'overview' | 'api' | 'session' | 'storage'>('overview');
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [apiMsg, setApiMsg] = useState('');
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [storageItems, setStorageItems] = useState<Map<string, string>>(new Map());
  const storageInitialized = React.useRef(false);

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
  const handleLogout = () => { clearToken(); window.location.reload(); };

  useEffect(() => {
    setSystemLoading(true); setSystemError(null);
    systemApi.health().then(setSystemInfo).catch((e: Error) => setSystemError(e.message)).finally(() => setSystemLoading(false));
  }, []);

  const handleDebugBuildTimeClick = () => {
    if (debugMode || debugAuth !== 'hidden') return;
    const next = debugClickCount + 1;
    setDebugClickCount(next);
    if (next >= DEBUG_CLICKS) { setDebugAuth('needs-pwd'); setDebugClickCount(0); }
  };
  const submitDebugPassword = () => {
    if (debugPwd === DEBUG_PASSWORD) {
      setDebugMode(true);
      try { localStorage.setItem(DEBUG_STORAGE_KEY, '1'); } catch {}
      setDebugAuth('authenticated'); setDebugPwd(''); setPwdError('');
      addToast('调试模式已开启', 'success');
    } else { setPwdError('密码错误，请重试'); }
  };

  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [qq, setQq] = useState(() => { const m = /nk=(\d+)/.exec(user.avatar || ''); return m ? m[1] : ''; });
  const [gender, setGender] = useState(user.gender || '');
  const [city, setCity] = useState(user.city || '');
  const [motto, setMotto] = useState(user.motto || '');
  const [birthday, setBirthday] = useState(user.birthday || '');
  const [age, setAge] = useState(user.age || 0);
  const [profileVisible, setProfileVisible] = useState<boolean>(user.profile_visible !== false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setBio(user.bio || ''); setAvatar(user.avatar || '');
    const m = /nk=(\d+)/.exec(user.avatar || ''); setQq(m ? m[1] : '');
    setGender(user.gender || ''); setCity(user.city || ''); setMotto(user.motto || '');
    setBirthday(user.birthday || ''); setAge(user.age || 0);
    setProfileVisible(user.profile_visible !== false);
  }, [user.avatar, user.bio, user.gender, user.city, user.motto, user.birthday, user.age, user.profile_visible]);

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  if (!open) return null;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-xl flex flex-col shadow-[var(--shadow-lg)]" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="flex items-center gap-2"><Settings size={18} style={{ color: 'var(--color-primary)' }} /><h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>设置</h3></div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
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
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}>年龄</label><input type="number" min={0} max={150} value={age} onChange={(e) => setAge(parseInt(e.target.value)||0)} className={inputCls} style={inputStyle} /></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}><Heart size={13} className="inline mr-1"/>座右铭</label><textarea value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="写一句你喜欢的话" rows={2} maxLength={200} className={inputCls} style={{...inputStyle,resize:'vertical'}} /><p className="text-xs mt-1 text-right" style={{color:'var(--color-text-muted)'}}>{motto.length}/200</p></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}>个人简介</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="介绍一下自己" rows={3} maxLength={255} className={inputCls} style={{...inputStyle,resize:'vertical'}} /><p className="text-xs mt-1 text-right" style={{color:'var(--color-text-muted)'}}>{bio.length}/255</p></div>
                <div style={fieldStyle}><label className="block text-sm mb-1.5" style={labelStyle}><span className="inline-flex items-center gap-1">{profileVisible?<ShieldCheck size={14}/>:<Shield size={14}/>}主页可见性</span></label>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-sm flex-1 justify-center" style={profileVisible ? {background:'var(--color-primary)',color:'#fff',borderColor:'var(--color-primary)'} : {background:'var(--color-hover-bg)',color:'var(--color-text-muted)'}} onClick={() => setProfileVisible(true)}><ShieldCheck size={14}/>公开</button>
                    <button type="button" className="btn btn-sm flex-1 justify-center" style={!profileVisible ? {background:'rgba(239,68,68,0.15)',color:'#ef4444',borderColor:'rgba(239,68,68,0.4)'} : {background:'var(--color-hover-bg)',color:'var(--color-text-muted)'}} onClick={() => setProfileVisible(false)}><Shield size={14}/>隐藏</button>
                  </div><p className="text-xs mt-1.5" style={{color:'var(--color-text-muted)'}}>隐藏后其他用户将无法查看您的主页详情</p></div>
                <div className="flex justify-end pt-2"><button type="submit" disabled={savingProfile} className="btn btn-primary">{savingProfile ? '保存中…' : '保存资料'}</button></div>
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
              <div className="flex flex-col gap-3">
                <p className="text-sm mb-1" style={{color:'var(--color-text-secondary)'}}>选择主题外观，设置会自动保存</p>
                <div className="grid grid-cols-2 gap-3">
                  {themeOptions.map((opt) => { const isActive = theme === opt.name; return (
                    <button key={opt.name} onClick={() => { setTheme(opt.name); addToast('已切换到'+opt.label+'主题','success'); }} className="flex items-center justify-between p-4 text-left transition-colors" style={isActive ? {background:'var(--color-primary-light)',border:'2px solid var(--color-primary)'} : {background:'var(--color-card-alt)',border:'2px solid var(--color-border-light)'}}>
                      <div><p className="font-medium text-sm" style={{color:'var(--color-text)'}}>{opt.label}</p><p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{opt.desc}</p></div>
                      {isActive && <Check size={18} style={{color:'var(--color-primary)'}}/>}</button>); })}
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
                        <button onClick={() => { try{localStorage.removeItem(DEBUG_STORAGE_KEY);}catch{} setDebugMode(false); setDebugAuth('hidden'); setDebugPanel('overview'); addToast('调试模式已关闭','info'); }} className="w-full py-2 rounded text-sm font-medium transition-colors" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>关闭调试模式</button>
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
                          <span className="text-xs px-2 py-1 rounded-full" style={getToken()?{background:'rgba(74,222,128,0.15)',color:'#4ade80'}:{background:'rgba(251,191,36,0.15)',color:'#fbbf24'}}>{getToken()?'已登录':'未登录'}</span>
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
                          <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                            {Array.from(storageItems.entries()).map(([key,val]) => (
                              <div key={key} className="flex items-center justify-between px-3 py-2 rounded text-xs" style={{background:'var(--color-bg-page)'}}>
                                <span className="font-mono truncate flex-1 mr-2" style={{color:'var(--color-text)'}}>{key}</span>
                                <span className="font-mono truncate flex-1" style={{color:'var(--color-text-muted)'}}>{val.length>40?val.slice(0,40)+'…':val}</span>
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
                      <p className="text-xs text-center" style={{color:'var(--color-primary)'}}>再次点击{DEBUG_CLICKS-debugClickCount}次</p>
                    )}
                    {debugAuth === 'needs-pwd' && (
                      <div className="flex flex-col gap-2 mt-1">
                        <input type="password" value={debugPwd} onChange={(e)=>{setDebugPwd(e.target.value);setPwdError('');}} onKeyDown={(e)=>e.key==='Enter'&&submitDebugPassword()} placeholder="输入调试密码" className={inputCls} style={inputStyle} autoFocus />
                        <div className="flex gap-2">
                          <button onClick={submitDebugPassword} className="btn btn-sm flex-1 justify-center btn-primary">解锁</button>
                          <button onClick={()=>{setDebugAuth('hidden');setDebugPwd('');setPwdError('');setDebugClickCount(0);}} className="btn btn-sm flex-1 justify-center">取消</button>
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
