import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@eng/contexts/AuthContext';
import { useTheme } from '@eng/contexts/ThemeContext';
import { studyBeat } from '@eng/utils/api';
import { BookOpen, Brain, Trophy, Settings, LogOut, Menu, X, Library, GraduationCap, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

// 统一账号体系：主站 admin/super_admin 或 eng_role 教学角色可进入合并管理页
const ADMIN_ROLES = ['admin', 'super_admin'];
const PANEL_ENG_ROLES = ['teacher', 'head_teacher', 'school_admin'];

/** 秒数 → 友好时长文案 */
function fmtDuration(sec) {
    if (sec === null || sec === undefined) return '--';
    const s = Math.max(0, Math.floor(Number(sec)));
    if (s < 60) return `${s}秒`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}分钟`;
    return `${Math.floor(m / 60)}小时${m % 60}分`;
}

function hasPanelAccess(user) {
    if (!user) return false;
    return ADMIN_ROLES.includes(user.role) || PANEL_ENG_ROLES.includes(user.eng_role);
}

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [studyTime, setStudyTime] = useState({ today_seconds: null, total_seconds: null });

    // 学习时长心跳：页面可见期间每 60 秒一次，服务端按真实间隔计时
    // （页面隐藏时暂停发送；离线超 5 分钟服务端自动断开不计，回来立即补一拍）
    useEffect(() => {
        if (!user) return undefined;
        let alive = true;
        const beat = async () => {
            if (document.hidden) return;
            const d = await studyBeat();
            if (alive && d && d.today_seconds !== null && d.today_seconds !== undefined) {
                setStudyTime({
                    today_seconds: Number(d.today_seconds) || 0,
                    total_seconds: Number(d.total_seconds) || 0,
                });
            }
        };
        beat();
        const timer = setInterval(beat, 60000);
        const onVisibility = () => { if (!document.hidden) beat(); };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            alive = false;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [user?.id]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/english', label: '首页', icon: BookOpen },
        { path: '/english/wordbook', label: '单词书', icon: Library },
        { path: '/english/wrong-words', label: '错词本', icon: Brain },
        { path: '/english/points', label: '积分', icon: Trophy },
        ...(hasPanelAccess(user) ? [{ path: '/english/admin', label: '管理后台', icon: GraduationCap }] : []),
        { path: '/english/profile', label: '资料', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-[var(--color-bg-page)]">
            {/* 顶部导航 */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--nav-bg)] border-b border-[var(--color-border)] backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-14">
                        <Link to="/english" className="text-[var(--color-text)] font-bold text-lg">
                            英语背单词
                        </Link>

                        {/* 桌面导航 */}
                        <div className="hidden md:flex items-center gap-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                            isActive
                                                ? 'text-[var(--color-primary)] bg-[var(--color-primary-light)]'
                                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]'
                                        }`}
                                    >
                                        <Icon size={16} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                            {user && studyTime.total_seconds !== null && (
                                <span
                                    className="hidden lg:flex items-center gap-1 px-2 py-1 text-xs rounded-sm"
                                    style={{ color: 'var(--color-text-muted)', background: 'var(--color-card-alt)' }}
                                    title="今日已学 / 累计已学（在线心跳统计）"
                                >
                                    <Timer size={14} />
                                    今日 {fmtDuration(studyTime.today_seconds)} · 累计 {fmtDuration(studyTime.total_seconds)}
                                </span>
                            )}
                            <button
                                onClick={() => toggleTheme(theme === 'light' ? 'dark' : 'light')}
                                className="btn btn-sm"
                            >
                                {theme === 'light' ? '深色' : '浅色'}
                            </button>
                            <button
                                onClick={handleLogout}
                                className="btn btn-sm btn-error"
                            >
                                <LogOut size={16} />
                                退出
                            </button>
                            {user && (
                                <span className="text-[var(--color-text-secondary)] text-sm">
                                    {user.username}
                                </span>
                            )}
                        </div>

                        {/* 移动端菜单按钮 */}
                        <button
                            className="md:hidden btn btn-sm"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* 移动端菜单 */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-card)]">
                        <div className="px-4 py-2 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-3 text-sm ${
                                            isActive
                                                ? 'text-[var(--color-primary)] bg-[var(--color-primary-light)]'
                                                : 'text-[var(--color-text-secondary)]'
                                        }`}
                                    >
                                        <Icon size={18} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                            <button
                                onClick={() => {
                                    toggleTheme(theme === 'light' ? 'dark' : 'light');
                                    setMobileMenuOpen(false);
                                }}
                                className="w-full text-left px-3 py-3 text-sm text-[var(--color-text-secondary)]"
                            >
                                切换{theme === 'light' ? '深色' : '浅色'}模式
                            </button>
                            {user && studyTime.total_seconds !== null && (
                                <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-muted)]">
                                    <Timer size={14} />
                                    今日已学 {fmtDuration(studyTime.today_seconds)} · 累计 {fmtDuration(studyTime.total_seconds)}
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-3 py-3 text-sm text-[var(--color-error)]"
                            >
                                退出登录
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* 主内容区 */}
            <main className="pt-14 min-h-screen">
                <Outlet />
            </main>

            {/* 底部导航 - 移动端 */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--nav-bg)] border-t border-[var(--color-border)] backdrop-blur-sm z-50">
                <div className="flex justify-around py-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center gap-1 px-3 py-2 text-xs ${
                                    isActive
                                        ? 'text-[var(--color-primary)]'
                                        : 'text-[var(--color-text-muted)]'
                                }`}
                            >
                                <Icon size={20} />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
