import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@eng/utils/api';
import { GraduationCap, Users, Ban, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '@eng/contexts/AuthContext';

const MODULE_LABELS = {
    listen_word: '听词选词',
    listen_meaning: '听词选意',
    word_select: '看词选意',
    meaning_select: '看意选词',
    dictation: '听写单词',
    write: '默写单词',
    test: '综合测试',
};

const FEATURES = [
    { key: 'pk', label: 'PK对战' },
    { key: 'wordbook', label: '单词书' },
    { key: 'points', label: '积分签到' },
    { key: 'review', label: '错词复习' },
];

export default function Panel({ embedded = false, engRole: engRoleProp = '' }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    // 统一账号体系：英语角色 = Console 传入的 engRole > user.eng_role > 主站角色折算
    const role = engRoleProp
        || user?.eng_role
        || ({ super_admin: 'super_admin', admin: 'school_admin' }[user?.role] ?? 'student');
    const isHeadTeacher = role === 'head_teacher';

    const [tab, setTab] = useState('homework');
    const [students, setStudents] = useState([]);
    const [hwList, setHwList] = useState([]);
    const [msg, setMsg] = useState(null);

    // 布置作业表单
    const [textbooks, setTextbooks] = useState([]);
    const [units, setUnits] = useState([]);
    const [parts, setParts] = useState([]);
    const [form, setForm] = useState({ title: '', textbook_id: '', unit_id: '', part_id: '', module_type: 'dictation', due_date: '' });
    const [submitting, setSubmitting] = useState(false);

    // 学生封禁操作中状态
    const [banBusyId, setBanBusyId] = useState(null);
    const [banOpenId, setBanOpenId] = useState(null); // 展开功能选择的学生

    // 测试成绩查询
    const [scoreStudent, setScoreStudent] = useState('');
    const [scores, setScores] = useState(null);

    useEffect(() => {
        // 无权限角色不加载
        if (!['teacher', 'head_teacher', 'school_admin', 'super_admin'].includes(role)) return;
        if (isHeadTeacher) {
            loadStudents();
            setTab('students');
        }
        loadHomework();
        api.get('/api/get_textbooks.php')
            .then((res) => res.data.success && setTextbooks(res.data.data))
            .catch(() => {});
    }, []);

    const loadStudents = () => {
        api.get('/api/panel/students.php')
            .then((res) => res.data.success && setStudents(res.data.data))
            .catch(() => {});
    };

    const loadHomework = () => {
        api.get('/api/panel/homework_list.php')
            .then((res) => res.data.success && setHwList(res.data.data))
            .catch(() => {});
    };

    const loadScores = (uid) => {
        if (!uid) { setScores(null); return; }
        api.get(`/api/panel/test_records.php?user_id=${uid}`)
            .then((res) => { if (res.data.success) setScores(res.data.data); })
            .catch((e) => console.error('[Panel] 测试成绩加载失败:', e));
    };

    const onFormChange = async (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        if (key === 'textbook_id') {
            setUnits([]); setParts([]);
            const res = await api.get(`/api/get_units.php?textbook_id=${value}`);
            if (res.data.success) setUnits(res.data.data);
        }
        if (key === 'unit_id') {
            setParts([]);
            const res = await api.get(`/api/get_parts.php?unit_id=${value}`);
            if (res.data.success) setParts(res.data.data);
        }
    };

    const handleCreateHomework = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMsg(null);
        try {
            const body = {
                ...form,
                class_id: isHeadTeacher ? Number(localStorage.getItem('eng_panel_class_id') || 0) : 0,
            };
            const response = await api.post('/api/panel/homework.php', body);
            setMsg({ ok: true, text: response.data.message });
            loadHomework();
        } catch (error) {
            setMsg({ ok: false, text: error.response?.data?.message || '布置失败' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleBan = async (userId, feature) => {
        setBanBusyId(userId);
        try {
            const response = await api.post('/api/panel/ban.php', {
                user_id: userId,
                feature: feature === null ? 'off' : feature,
                reason: '',
            });
            setMsg({ ok: true, text: response.data.message });
            loadStudents();
        } catch (error) {
            setMsg({ ok: false, text: error.response?.data?.message || '操作失败' });
        } finally {
            setBanBusyId(null);
            setBanOpenId(null);
        }
    };

    // 权限提示
    if (!['teacher', 'head_teacher'].includes(role)) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="card p-10">
                    <Ban size={40} className="mx-auto text-[var(--color-error)] mb-4" />
                    <h2 className="text-xl font-semibold mb-2">无面板权限</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">
                        教学面板仅对任课老师、班主任、校长开放
                    </p>
                    <button onClick={() => navigate('/english')} className="btn btn-primary">返回主页</button>
                </div>
            </div>
        );
    }

    return (
        <div className={embedded ? "max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-8" : "max-w-5xl mx-auto px-4 py-8 pb-20 md:pb-8"}>
            {/* 独立面板头（embedded 时由 Console 提供切换条） */}
            {!embedded && (
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
                    <GraduationCap size={26} className="text-[var(--color-primary)]" />
                    教学面板
                    <span className="text-xs font-normal text-[var(--color-text-muted)] border border-[var(--color-border)] px-2 py-0.5 rounded-sm">
                        {isHeadTeacher ? '班主任' : role === 'teacher' ? '任课老师' : role}
                    </span>
                </h1>
                <button onClick={() => navigate('/english')} className="btn btn-sm">
                    <ArrowLeft size={14} />
                    返回主页
                </button>
            </div>
            )}

            {/* Tab */}
            <div className="flex gap-2 mb-6">
                <button onClick={() => setTab('homework')} className={`btn btn-sm ${tab === 'homework' ? 'btn-primary' : ''}`}>
                    布置作业
                </button>
                <button onClick={() => { setTab('scores'); if (students.length === 0) loadStudents(); }} className={`btn btn-sm ${tab === 'scores' ? 'btn-primary' : ''}`}>
                    测试成绩
                </button>
                {isHeadTeacher && (
                    <button onClick={() => { setTab('students'); loadStudents(); }} className={`btn btn-sm ${tab === 'students' ? 'btn-primary' : ''}`}>
                        <Users size={13} /> 学生管理
                    </button>
                )}
            </div>

            {msg && (
                <div className={`mb-4 p-3 text-sm border-l-4 ${
                    msg.ok ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]'
                           : 'bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error)]'
                }`}>{msg.text}</div>
            )}

            {/* 测试成绩 */}
            {tab === 'scores' && (
                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <label className="text-sm text-[var(--color-text-secondary)]">选择学生</label>
                        <select
                            value={scoreStudent}
                            onChange={(e) => { setScoreStudent(e.target.value); loadScores(e.target.value); }}
                            className="max-w-xs"
                        >
                            <option value="">请选择学生</option>
                            {students.map((s) => <option key={s.id} value={s.id}>{s.username}</option>)}
                        </select>
                    </div>

                    {!scores && <p className="text-sm text-[var(--color-text-muted)] py-4">请先选择一名学生查看测试记录。</p>}

                    {scores && (
                        <>
                            <div className="grid grid-cols-2 gap-3 mb-4 max-w-xs">
                                <div className="p-3 bg-[var(--color-card-alt)] rounded-sm text-center">
                                    <div className="text-xl font-bold text-[var(--color-primary)]">{scores.summary?.exam_count ?? 0}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">考试次数</div>
                                </div>
                                <div className="p-3 bg-[var(--color-card-alt)] rounded-sm text-center">
                                    <div className="text-xl font-bold text-[var(--color-success)]">{scores.summary?.avg_score ?? 0}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">平均分</div>
                                </div>
                            </div>

                            {scores.items?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-muted)]">
                                                <th className="py-2 pr-4 font-medium">时间</th>
                                                <th className="py-2 pr-4 font-medium">得分</th>
                                                <th className="py-2 pr-4 font-medium">答对/总题</th>
                                                <th className="py-2 pr-4 font-medium">金币</th>
                                                <th className="py-2 font-medium">用时</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {scores.items.map((r) => (
                                                <tr key={r.id} className="border-b border-[var(--color-divider)] hover:bg-[var(--color-hover-bg)]">
                                                    <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{String(r.created_at || '').replace('T', ' ').slice(0, 16)}</td>
                                                    <td className={`py-2 pr-4 font-bold ${r.score >= 60 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>{r.score}</td>
                                                    <td className="py-2 pr-4">{r.correct_count}/{r.total_questions}</td>
                                                    <td className="py-2 pr-4">{r.coins_earned}</td>
                                                    <td className="py-2">{Math.floor((r.duration || 0) / 60)}分{(r.duration || 0) % 60}秒</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--color-text-muted)] text-center py-6">该学生还没有测试记录</p>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 布置作业 */}
            {tab === 'homework' && (
                <>
                    <form onSubmit={handleCreateHomework} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">作业标题</label>
                            <input value={form.title} onChange={(e) => onFormChange('title', e.target.value)} required placeholder="例如：Unit1 单词背诵" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">课本</label>
                            <select value={form.textbook_id} onChange={(e) => onFormChange('textbook_id', e.target.value)} required>
                                <option value="">选择课本</option>
                                {textbooks.map((tb) => <option key={tb.id} value={tb.id}>{tb.textbook_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">单元</label>
                            <select value={form.unit_id} onChange={(e) => onFormChange('unit_id', e.target.value)} required disabled={!units.length}>
                                <option value="">选择单元</option>
                                {units.map((u) => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">部分</label>
                            <select value={form.part_id} onChange={(e) => onFormChange('part_id', e.target.value)} required disabled={!parts.length}>
                                <option value="">选择部分</option>
                                {parts.map((p) => <option key={p.id} value={p.id}>第{p.part_number}部分</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">模块</label>
                            <select value={form.module_type} onChange={(e) => onFormChange('module_type', e.target.value)}>
                                {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">截止日期</label>
                            <input type="date" value={form.due_date} onChange={(e) => onFormChange('due_date', e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                            <button type="submit" disabled={submitting} className="btn btn-primary w-full">
                                {submitting ? '发布中...' : '发布作业'}
                            </button>
                        </div>
                    </form>

                    {/* 我的作业 */}
                    <h3 className="font-semibold text-[var(--color-text)] mb-3">已布置作业</h3>
                    {hwList.length === 0 ? (
                        <div className="card p-8 text-center text-[var(--color-text-muted)]">还没有布置过作业</div>
                    ) : (
                        <div className="space-y-2">
                            {hwList.map((hw) => (
                                <div key={hw.id} className="card p-3 flex items-center justify-between text-sm">
                                    <div>
                                        <span className="text-[var(--color-text)]">{hw.title}</span>
                                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                                            {MODULE_LABELS[hw.module_type]} · 截止 {hw.due_date || '不限'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-[var(--color-text-muted)]">
                                        完成 {hw.done_students}/{hw.total_students || '?'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* 学生管理（班主任） */}
            {tab === 'students' && isHeadTeacher && (
                students.length === 0 ? (
                    <div className="card p-10 text-center text-[var(--color-text-muted)]">本班暂无学生</div>
                ) : (
                    <div className="space-y-2">
                        {students.map((s) => {
                            const bannedSet = new Set(s.banned);
                            return (
                                <div key={s.id} className="card p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <span className="text-[var(--color-text)] font-medium">{s.nickname}</span>
                                            <span className="ml-2 text-xs text-[var(--color-text-muted)]">@{s.username}</span>
                                            <span className="ml-2 text-xs text-[var(--color-text-muted)]">{s.class_name}</span>
                                            <span className="ml-2 text-xs text-[var(--color-text-muted)]">{s.points} 积分</span>
                                        </div>
                                        <button
                                            onClick={() => setBanOpenId(banOpenId === s.id ? null : s.id)}
                                            className="btn btn-sm"
                                        >
                                            <Ban size={13} />
                                            功能限制
                                        </button>
                                    </div>

                                    {banOpenId === s.id && (
                                        <div className="mt-3 pt-3 border-t border-[var(--color-divider)] flex flex-wrap items-center gap-2">
                                            {FEATURES.map((f) => {
                                                const isBanned = bannedSet.has(f.key);
                                                return (
                                                    <button
                                                        key={f.key}
                                                        disabled={banBusyId === s.id}
                                                        onClick={() => handleBan(s.id, isBanned ? null : f.key)}
                                                        className={`btn btn-sm ${isBanned ? 'btn-error' : ''}`}
                                                    >
                                                        {f.label}{isBanned ? '（禁用中·点击解禁）' : ''}
                                                    </button>
                                                );
                                            })}
                                            {(s.banned.length > 0) && (
                                                <button
                                                    disabled={banBusyId === s.id}
                                                    onClick={() => handleBan(s.id, null)}
                                                    className="btn btn-sm"
                                                >
                                                    全部解禁
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}
