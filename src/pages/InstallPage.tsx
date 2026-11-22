// 文件路径：vite-react/src/pages/InstallPage.tsx
// 安装向导页（路由 /install，公开无需登录）
// 状态机：detect → db → admin → running → done（done 内含成功/失败两分支）
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Home,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  UserCircle,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  installApi,
  InstallCheckData,
  InstallCheckItem,
  InstallNetworkError,
  InstallLockedError,
  InstallRunData,
  InstallTestDbData,
} from '../lib/api';

/** 五步状态机（running 为执行中的过渡态） */
type Step = 'detect' | 'db' | 'admin' | 'running' | 'done';

const STEP_META: { key: Step; num: number; label: string }[] = [
  { key: 'detect', num: 1, label: '检测' },
  { key: 'db', num: 2, label: '数据库' },
  { key: 'admin', num: 3, label: '管理员' },
  { key: 'running', num: 4, label: '执行' },
  { key: 'done', num: 5, label: '完成' },
];

const STEP_INDEX: Record<Step, number> = { detect: 1, db: 2, admin: 3, running: 4, done: 5 };

/** checks 后端实际返回对象 {key:{label,ok,detail}}，数组为兼容形态 → 统一为数组 */
function normalizeChecks(raw?: InstallCheckData['checks']): InstallCheckItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return Object.values(raw);
}

/** CORS/网络失败的统一文案（fetch TypeError 在浏览器里无法区分不可达与 CORS 未放行） */
function networkErrorText(): string {
  return `无法连接后端 / 后端未配置 CORS 白名单（后端 .env CORS_ALLOW_ORIGIN 需包含 ${window.location.origin}）`;
}

function describeError(e: unknown): string {
  if (e instanceof InstallNetworkError) return networkErrorText();
  return e instanceof Error ? e.message : '请求失败';
}

/** 密码强度小字提示（仅提示，不做拦截） */
function passwordHint(p: string): string {
  if (!p || p.length < 6) return '至少 6 位';
  if (p.length < 10) return '偏弱，建议 10 位以上，字母 + 数字混合';
  if (p.length < 16) return '中等强度';
  return '强';
}

/* ---------- 步骤条（序号 + 标题，无 .steps 依赖） ---------- */
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-start">
      {STEP_META.map((s, i) => {
        const state = i + 1 < current ? 'done' : i + 1 === current ? 'active' : 'todo';
        const circleStyle: CSSProperties =
          state === 'done'
            ? { background: 'var(--color-primary)', color: '#FFFFFF', border: '1px solid var(--color-primary)', borderRadius: 3 }
            : state === 'active'
              ? { background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 3 }
              : { background: 'var(--color-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 3 };
        return (
          <Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1" style={{ width: 44 }}>
              <div className="w-7 h-7 flex items-center justify-center text-xs font-semibold flex-shrink-0" style={circleStyle}>
                {state === 'done' ? <Check size={14} /> : s.num}
              </div>
              <span
                className="text-[11px] sm:text-xs whitespace-nowrap"
                style={{ color: state === 'active' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
              >
                {s.label}
              </span>
            </div>
            {i < STEP_META.length - 1 && (
              <div
                className="flex-1 h-px mx-1 sm:mx-2 mt-3.5"
                style={{ background: i + 1 < current ? 'var(--color-primary)' : 'var(--color-divider)' }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ---------- 提示框（左侧 4px 色条，规范 .alert 模式） ---------- */
function AlertBox({ tone, title, children }: { tone: 'error' | 'warning' | 'success' | 'info'; title?: string; children: ReactNode }) {
  const bar = {
    error: 'var(--color-error)',
    warning: 'var(--color-warning)',
    success: 'var(--color-success)',
    info: 'var(--color-primary)',
  }[tone];
  const bg = {
    error: 'var(--color-error-bg)',
    warning: 'var(--color-warning-bg)',
    success: 'var(--color-success-bg)',
    info: 'var(--color-info-bg)',
  }[tone];
  return (
    <div className="px-3 py-2.5" style={{ background: bg, borderLeft: `4px solid ${bar}`, borderRadius: 3 }}>
      {title && <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>{title}</p>}
      <div className="text-xs leading-5 break-all" style={{ color: 'var(--color-text-secondary)' }}>
        {children}
      </div>
    </div>
  );
}

/* ---------- 表单字段（label + 输入框 + 小字提示） ---------- */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs mb-1" style={{ color: 'var(--color-text-light)' }}>{label}</span>
      {children}
      {hint ? <span className="block text-[11px] mt-1 leading-4" style={{ color: 'var(--color-text-muted)' }}>{hint}</span> : null}
    </label>
  );
}

export function InstallPage() {
  const navigate = useNavigate();

  /* ---- 全局状态机 ---- */
  const [step, setStep] = useState<Step>('detect');

  /* ---- Step 0 detect ---- */
  const [detectLoading, setDetectLoading] = useState(true);
  const [checkData, setCheckData] = useState<InstallCheckData | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedHint, setLockedHint] = useState('');
  const [detectError, setDetectError] = useState<string | null>(null);

  /* ---- Step 1 db ---- */
  const [dbForm, setDbForm] = useState({ host: '127.0.0.1', port: '3306', name: '', user: '', pass: '', charset: 'utf8mb4' });
  const [dbTesting, setDbTesting] = useState(false);
  const [dbResult, setDbResult] = useState<InstallTestDbData | null>(null);
  const [dbError, setDbError] = useState<{ message: string; hint?: string } | null>(null);

  /* ---- Step 2 admin ---- */
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  /* ---- Step 3/4 running → done ---- */
  const [runResult, setRunResult] = useState<{
    ok: boolean;
    data: InstallRunData;
    error: string;
    hint: string;
    completed_steps: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  /** 进页面自动 GET /install（重新检测时复用） */
  const runDetect = useCallback(async () => {
    setStep('detect');
    setDetectLoading(true);
    setDetectError(null);
    setLocked(false);
    setCheckData(null);
    try {
      const data = await installApi.check();
      setCheckData(data);
      // 用后端返回的 .env 现值预填数据库表单（pass 留空 → 回落 .env）
      setDbForm((f) => ({
        host: data.db?.host || f.host,
        port: data.db?.port ? String(data.db.port) : f.port,
        name: data.db?.name ?? f.name,
        user: data.db?.user ?? f.user,
        pass: f.pass,
        charset: data.db?.charset || f.charset,
      }));
    } catch (e) {
      if (e instanceof InstallLockedError) {
        // HTTP 423：已安装，终止流程
        setLocked(true);
        setLockedHint(e.hint || '系统已安装，禁止再次安装。');
      } else {
        setDetectError(describeError(e));
      }
    } finally {
      setDetectLoading(false);
    }
  }, []);

  useEffect(() => {
    void runDetect();
  }, [runDetect]);

  const checkItems = useMemo(() => normalizeChecks(checkData?.checks), [checkData]);
  const allOk = checkItems.length > 0 && checkItems.every((c) => c.ok);
  /** runtime/ 与 .env 可写性失败的红色告警（detail 文案原样展示） */
  const permAlerts = useMemo(
    () =>
      checkItems
        .filter((c) => !c.ok && (c.label.includes('runtime') || c.label.includes('.env')))
        .map((c) => {
          const isPath = /[/\\]/.test(c.detail) && c.detail.length > 4;
          const target = isPath ? c.detail : c.label.includes('.env') ? '.env' : c.detail;
          return `主机目录权限不足：请让主机商把 ${target} 设为可写（755/775）后再安装`;
        }),
    [checkItems],
  );
  /** 迁移 SQL 数量（detect 表里的「N 个 SQL」），执行态文案用 */
  const migrationCount = useMemo(() => {
    const item = checkItems.find((c) => c.label.includes('迁移'));
    const match = item?.detail?.match(/(\d+)\s*个/);
    return match ? Number(match[1]) : 25;
  }, [checkItems]);

  const userValid = /^[A-Za-z0-9_]{3,20}$/.test(adminUser.trim());
  const passValid = adminPass.length >= 6;

  /** Step 1：测试数据库连接（返回是否成功，供「一键部署」复用） */
  const handleTestDb = async (): Promise<boolean> => {
    if (!dbForm.host.trim()) {
      setDbError({ message: '数据库主机不能为空' });
      return false;
    }
    setDbTesting(true);
    setDbError(null);
    setDbResult(null);
    try {
      const data = await installApi.testDb({
        host: dbForm.host.trim(),
        port: Number(dbForm.port) || 3306,
        name: dbForm.name.trim(),
        user: dbForm.user.trim(),
        pass: dbForm.pass,
        charset: dbForm.charset || 'utf8mb4',
      });
      // 连接类失败 HTTP 仍 200，读 data.ok 判定
      if (data.ok) { setDbResult(data); return true; }
      setDbError({ message: data.error || '连接失败', hint: data.hint });
      return false;
    } catch (e) {
      const err = e as Error & { hint?: string };
      setDbError({
        message: describeError(e),
        hint: e instanceof InstallNetworkError ? undefined : err.hint,
      });
      return false;
    } finally {
      setDbTesting(false);
    }
  };

  /** 一键部署：.env 已配置 DB 时自动测库 → 直达管理员步（失败回落手动 db 步） */
  const [oneClickBusy, setOneClickBusy] = useState(false);
  const handleOneClick = async () => {
    setOneClickBusy(true);
    const ok = await handleTestDb();
    setOneClickBusy(false);
    setStep(ok ? 'admin' : 'db');
  };

  /** Step 2 → 3：执行安装（同步长请求 30-90s，不设短超时） */
  const handleRun = async () => {
    if (!userValid || !passValid) return;
    setStep('running');
    setRunResult(null);
    setCopied(false);
    try {
      const data = await installApi.run({
        host: dbForm.host.trim(),
        port: Number(dbForm.port) || 3306,
        name: dbForm.name.trim(),
        user: dbForm.user.trim(),
        pass: dbForm.pass,
        charset: dbForm.charset || 'utf8mb4',
        admin_username: adminUser.trim(),
        admin_password: adminPass,
      });
      setRunResult({ ok: true, data, error: '', hint: '', completed_steps: data.completed_steps ?? [] });
    } catch (e) {
      const err = e as Error & { hint?: string; completed_steps?: string[] };
      setRunResult({
        ok: false,
        data: { ok: false },
        error: describeError(e),
        hint: err.hint || '',
        completed_steps: err.completed_steps ?? [],
      });
    }
    setStep('done');
  };

  /** 密码复制（仅显示一次，clipboard 失败时 execCommand 兜底） */
  const copyPassword = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const runPassword = runResult?.data?.admin?.password ?? runResult?.data?.admin_password ?? '';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-page)' }}>
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* 顶部品牌区 */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-14 h-14 flex items-center justify-center mb-3"
            style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
          >
            <Zap size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Arcle 弧光 <span className="font-normal" style={{ color: 'var(--color-text-light)' }}>· 安装向导</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-light)' }}>
            弧光所至 —— 环境检测 · 数据库 · 管理员 · 一键安装
          </p>
        </div>

        <div
          className="shadow-[var(--shadow-md)]"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          {/* 步骤条 */}
          <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
            <StepBar current={STEP_INDEX[step]} />
          </div>

          <div className="p-4 sm:p-6">
            {/* ============ Step 0：环境检测 ============ */}
            {step === 'detect' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Server size={16} style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>环境检测</h2>
                  {!locked && !detectLoading && (
                    <span
                      className="px-1.5 py-0.5 text-xs rounded-sm font-medium"
                      style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}
                    >
                      未初始化
                    </span>
                  )}
                </div>

                {detectLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <Loader2 size={16} className="animate-spin" /> 正在检测运行环境…
                  </div>
                )}

                {locked && !detectLoading && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <Lock size={36} style={{ color: 'var(--color-warning)' }} />
                    <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>系统已安装</h3>
                    <p className="text-sm max-w-md leading-6" style={{ color: 'var(--color-text-light)' }}>{lockedHint}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      （管理员可解锁重装：super_admin 调用 POST /install/unlock 后重试）
                    </p>
                  </div>
                )}

                {!locked && !detectLoading && detectError && (
                  <>
                    <AlertBox tone="error" title="无法连接后端">
                      {detectError}
                    </AlertBox>
                    <button className="btn w-full" onClick={() => void runDetect()}>
                      <RefreshCw size={14} /> 重新检测
                    </button>
                  </>
                )}

                {!locked && !detectError && checkData && (
                  <>
                    {permAlerts.map((msg) => (
                      <AlertBox key={msg} tone="error" title="权限检测未通过">
                        {msg}
                      </AlertBox>
                    ))}

                    {/* 检测结果表：ok 绿勾 / fail 红叉 + detail 原样 */}
                    <div style={{ border: '1px solid var(--color-border-light)' }}>
                      {checkItems.map((c, i) => (
                        <div
                          key={`${c.label}-${i}`}
                          className="flex items-center gap-2.5 px-3 py-2.5"
                          style={{
                            borderTop: i > 0 ? '1px solid var(--color-divider)' : 'none',
                            background: i % 2 ? 'var(--color-card-alt)' : 'var(--color-card)',
                          }}
                        >
                          {c.ok ? (
                            <CheckCircle2 size={16} className="flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                          ) : (
                            <XCircle size={16} className="flex-shrink-0" style={{ color: 'var(--color-error)' }} />
                          )}
                          <span className="text-sm flex-1 min-w-0" style={{ color: c.ok ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                            {c.label}
                          </span>
                          <span className="text-xs font-mono break-all text-right" style={{ color: c.ok ? 'var(--color-text-muted)' : 'var(--color-warning)' }}>
                            {c.detail}
                          </span>
                        </div>
                      ))}
                    </div>

                    <AlertBox tone="info" title="当前 .env 数据库配置（表单已按此预填，可直接修改）">
                      {checkData.db
                        ? `${checkData.db.host}:${checkData.db.port} / ${checkData.db.name || '（空）'} · 用户 ${checkData.db.user || '（空）'} · ${checkData.db.charset}`
                        : '未知'}
                    </AlertBox>

                    {checkData.db?.name ? (
                      <button
                        className="btn btn-primary w-full"
                        onClick={() => void handleOneClick()}
                        disabled={oneClickBusy}
                      >
                        <Rocket size={15} className={oneClickBusy ? 'animate-pulse' : ''} />
                        {oneClickBusy ? '正在测试连接…' : '一键部署'}
                      </button>
                    ) : null}
                    <button className="btn w-full" onClick={() => setStep('db')}>
                      {allOk ? '下一步：数据库' : '下一步：数据库（有未通过项，可现场填写连接信息）'}
                      <ArrowRight size={15} />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ============ Step 1：数据库连接 ============ */}
            {step === 'db' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Database size={16} style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--color-text)' }}>数据库连接</h2>
                  <button className="btn btn-sm" style={{ minWidth: 'auto' }} onClick={() => setStep('detect')}>
                    <ArrowLeft size={13} /> 上一步
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="主机 Host *">
                    <input
                      className="min-h-[44px]"
                      value={dbForm.host}
                      onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })}
                      placeholder="127.0.0.1"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="端口 Port">
                    <input
                      className="min-h-[44px]"
                      value={dbForm.port}
                      onChange={(e) => setDbForm({ ...dbForm, port: e.target.value })}
                      placeholder="3306"
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label="数据库名" hint="留空回落 .env">
                    <input
                      className="min-h-[44px]"
                      value={dbForm.name}
                      onChange={(e) => setDbForm({ ...dbForm, name: e.target.value })}
                      placeholder="arcle"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="用户">
                    <input
                      className="min-h-[44px]"
                      value={dbForm.user}
                      onChange={(e) => setDbForm({ ...dbForm, user: e.target.value })}
                      placeholder="root"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="密码" hint="留空回落 .env 的 DB.PASS">
                    <input
                      type="password"
                      className="min-h-[44px]"
                      value={dbForm.pass}
                      onChange={(e) => setDbForm({ ...dbForm, pass: e.target.value })}
                      placeholder="••••••"
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field label="字符集">
                    <input
                      className="min-h-[44px]"
                      value={dbForm.charset}
                      onChange={(e) => setDbForm({ ...dbForm, charset: e.target.value })}
                      placeholder="utf8mb4"
                    />
                  </Field>
                </div>

                {dbError && (
                  <AlertBox tone="error" title="连接失败">
                    {dbError.message}
                    {dbError.hint && <span className="block mt-1">提示：{dbError.hint}</span>}
                  </AlertBox>
                )}

                {dbResult?.ok && (
                  <AlertBox tone="success" title="连接成功">
                    {dbResult.message}
                    <span className="block mt-1">
                      MySQL {dbResult.version || '—'} · 数据库 {dbResult.database_exists ? '已存在' : '不存在，将自动创建'}
                    </span>
                    {dbResult.can_create_db && <span className="block mt-0.5">当前账号具备建库权限</span>}
                  </AlertBox>
                )}

                <button
                  className="btn btn-primary w-full"
                  disabled={dbTesting || !dbForm.host.trim()}
                  onClick={() => void handleTestDb()}
                >
                  {dbTesting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  {dbTesting ? '测试中…' : '测试连接'}
                </button>

                {dbResult?.ok && (
                  <button className="btn w-full" onClick={() => setStep('admin')}>
                    下一步：管理员 <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}

            {/* ============ Step 2：创建管理员 ============ */}
            {step === 'admin' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserCircle size={16} style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--color-text)' }}>创建管理员</h2>
                  <button className="btn btn-sm" style={{ minWidth: 'auto' }} onClick={() => setStep('db')}>
                    <ArrowLeft size={13} /> 上一步
                  </button>
                </div>

                <Field label="管理员用户名" hint="3-20 位字母、数字或下划线">
                  <input
                    className="min-h-[44px]"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="admin"
                    autoComplete="off"
                  />
                </Field>

                <Field label="管理员密码" hint={`至少 6 位 · ${passwordHint(adminPass)}`}>
                  <input
                    type="password"
                    className="min-h-[44px]"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="••••••"
                    autoComplete="new-password"
                  />
                </Field>

                <AlertBox tone="warning" title="部署提醒">
                  安装成功后管理员密码仅回显一次。请立即登录并修改密码；部署后删除 runtime/install.lock 并更换 .env 中的密钥。
                </AlertBox>

                <button className="btn btn-primary w-full" disabled={!userValid || !passValid} onClick={() => void handleRun()}>
                  <Zap size={14} /> 执行安装
                </button>
              </div>
            )}

            {/* ============ Step 3：执行中 ============ */}
            {step === 'running' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                <p className="text-sm text-center leading-6" style={{ color: 'var(--color-text)' }}>
                  建库 → 迁移 {migrationCount} 个 SQL → 种子数据 → 写 .env → 生成锁定文件…
                </p>
                <p className="text-xs text-center leading-5" style={{ color: 'var(--color-text-muted)' }}>
                  同步长请求，通常需 30–90 秒。请耐心等待，不要关闭或刷新页面
                </p>
              </div>
            )}

            {/* ============ Step 4：完成（成功 / 失败） ============ */}
            {step === 'done' &&
              (runResult ? (
                runResult.ok ? (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <CheckCircle2 size={44} style={{ color: 'var(--color-success)' }} />
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>安装成功</h2>

                    {runPassword && (
                      <div
                        className="w-full px-4 py-3"
                        style={{
                          background: 'var(--color-warning-bg)',
                          border: '1px solid var(--color-warning)',
                          borderLeft: '4px solid var(--color-warning)',
                          borderRadius: 3,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <KeyRound size={14} className="flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
                          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                            管理员密码（仅显示一次，请立即登录并修改）
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-lg font-bold break-all" style={{ color: 'var(--color-text)' }}>
                            {runPassword}
                          </span>
                          <button className="btn btn-sm flex-shrink-0" style={{ minWidth: 'auto' }} onClick={() => void copyPassword(runPassword)}>
                            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? '已复制' : '复制'}
                          </button>
                        </div>
                        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-light)' }}>
                          用户名：{runResult.data.admin?.username || adminUser}
                        </p>
                      </div>
                    )}

                    {runResult.data.message && (
                      <AlertBox tone="warning" title="后端返回">
                        {runResult.data.message}
                      </AlertBox>
                    )}

                    <button className="btn btn-primary w-full" onClick={() => navigate('/login')}>
                      <Home size={15} /> 进入登录页
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    <div className="flex items-center gap-2">
                      <XCircle size={20} style={{ color: 'var(--color-error)' }} />
                      <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>安装失败</h2>
                    </div>
                    <AlertBox tone="error" title="错误信息">
                      {runResult.error}
                    </AlertBox>
                    {runResult.hint && (
                      <AlertBox tone="info" title="排查提示">
                        {runResult.hint}
                      </AlertBox>
                    )}
                    {runResult.completed_steps.length > 0 && (
                      <p className="text-xs leading-5" style={{ color: 'var(--color-text-muted)' }}>
                        已完成步骤：{runResult.completed_steps.join('、')}
                      </p>
                    )}
                    <button className="btn w-full" onClick={() => void runDetect()}>
                      <RefreshCw size={14} /> 重新检测
                    </button>
                  </div>
                )
              ) : null)}
          </div>
        </div>

        <p className="text-xs mt-4 text-center leading-5" style={{ color: 'var(--color-text-muted)' }}>
          安装成功后生成 runtime/install.lock，禁止二次安装；如需重装，管理员可调用 POST /install/unlock 解锁
        </p>
      </div>
    </div>
  );
}
