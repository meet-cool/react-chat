import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, GraduationCap } from 'lucide-react';
import api from '@eng/utils/api';
import Admin from './Admin';
import Panel from './Panel';

/**
 * english 管理控制台（合并页）
 * - 管理后台（Admin）：课本导入导出 / 单词 / 账号 / 学校 / 回收站 / 反馈 / 封面
 * - 教学面板（Panel）：学生管理 / 布置作业 / 测试成绩
 * Tab 按角色显示：主站 admin/super_admin 或 eng_role 教学角色。
 */
export default function Console() {
    const navigate = useNavigate();
    const [engRole, setEngRole] = useState('');
    const [arcleRole, setArcleRole] = useState('');
    const [tab, setTab] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/profile.php');
                if (res.data?.success) {
                    setEngRole(res.data.data.eng_role || '');
                    setArcleRole(res.data.data.role || '');
                }
            } catch {
                // 后端守卫会兜底
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const isArcleAdmin = arcleRole === 'admin' || arcleRole === 'super_admin';
    const canAdmin = isArcleAdmin || ['school_admin'].includes(engRole);
    // 与 Panel.jsx 权限对齐：教学面板仅对教师/班主任开放（school_admin 只进管理后台）
    const canPanel = isArcleAdmin || ['teacher', 'head_teacher'].includes(engRole);

    // 默认 Tab：按权限取第一个可用项
    useEffect(() => {
        if (tab === null && !loading) {
            setTab(canAdmin ? 'admin' : canPanel ? 'panel' : 'none');
        }
    }, [loading, canAdmin, canPanel, tab]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-[var(--color-text-muted)]">加载中...</div>
            </div>
        );
    }

    if (tab === 'none' || (!canAdmin && tab === 'admin')) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="card p-10">
                    <ShieldCheck size={40} className="mx-auto text-[var(--color-error)] mb-4" />
                    <h2 className="text-xl font-semibold mb-2">无管理权限</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">
                        管理后台仅对管理员开放，教学面板对教师/班主任开放
                    </p>
                    <button onClick={() => navigate('/english')} className="btn btn-primary">返回主页</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg-page)]">
            {/* 顶部切换条 */}
            <div
                className="flex items-center justify-between px-4 h-12 border-b sticky top-0 z-40"
                style={{ background: 'var(--color-card)', borderColor: 'var(--color-divider)' }}
            >
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/english')}
                        className="btn btn-sm p-2"
                        title="返回主页"
                        style={{ minHeight: 30, minWidth: 30 }}
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>英语模块管理</span>
                </div>
                <div className="flex items-center gap-1">
                    {canAdmin && (
                        <button
                            onClick={() => setTab('admin')}
                            className="btn btn-sm flex items-center gap-1.5"
                            style={tab === 'admin'
                                ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                                : {}}
                        >
                            <ShieldCheck size={13} /> 管理后台
                        </button>
                    )}
                    {canPanel && (
                        <button
                            onClick={() => setTab('panel')}
                            className="btn btn-sm flex items-center gap-1.5"
                            style={tab === 'panel'
                                ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                                : {}}
                        >
                            <GraduationCap size={13} /> 教学面板
                        </button>
                    )}
                </div>
            </div>

            {/* 子页（embedded：隐藏各自的返回头） */}
            {tab === 'admin' ? <Admin embedded /> : <Panel embedded />}
        </div>
    );
}
