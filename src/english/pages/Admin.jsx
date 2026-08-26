import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@eng/utils/api';
import {
    BookOpen, Users, School, Trash2, Plus, FileDown, FileUp,
    Save, X, RotateCcw, Search, ChevronLeft, ChevronRight, Shield,
    MessageSquareWarning,
} from 'lucide-react';

/* ---------- 通用小组件 ---------- */
function Loading() {
    return <div className="text-center py-12 text-[var(--color-text-muted)]">加载中...</div>;
}
function AlertBox({ msg }) {
    if (!msg) return null;
    return (
        <div className={`p-3 text-sm border-l-4 ${
            msg.ok
                ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]'
                : 'bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error)]'
        }`}>{msg.text}</div>
    );
}
function Pager({ page, lastPage, onPage }) {
    return (
        <div className="flex items-center justify-between mt-3">
            <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} className="btn btn-sm">
                <ChevronLeft size={13} />上一页
            </button>
            <span className="text-xs text-[var(--color-text-muted)]">第 {page} / {lastPage} 页</span>
            <button onClick={() => onPage(Math.min(lastPage, page + 1))} disabled={page >= lastPage} className="btn btn-sm">
                下一页<ChevronRight size={13} />
            </button>
        </div>
    );
}

/* ---------- 单词管理 ---------- */
function WordsPanel({ onToast }) {
    const [subTab, setSubTab] = useState('edit');
    const [textbooks, setTextbooks] = useState([]);

    // 导入
    const [impFile, setImpFile] = useState(null);
    const [impName, setImpName] = useState('');
    const [impCode, setImpCode] = useState('');
    const [impOverwrite, setImpOverwrite] = useState(false);
    const [impMsg, setImpMsg] = useState(null);
    const [busyImp, setBusyImp] = useState(false);

    // 导入词书
    const [wbFile, setWbFile] = useState(null);
    const [wbName, setWbName] = useState('全面盘点-词书');
    const [wbPerPart, setWbPerPart] = useState(25);
    const [wbOverwrite, setWbOverwrite] = useState(false);
    const [wbMsg, setWbMsg] = useState(null);
    const [busyWb, setBusyWb] = useState(false);

    // 导出
    const [exportBookId, setExportBookId] = useState('');

    // 微调
    const [words, setWords] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState(''); // 防抖后的搜索词（300ms 停顿才触发加载）
    const [filterBookId, setFilterBookId] = useState('');
    const [filterUnitId, setFilterUnitId] = useState('');
    const [filterUnits, setFilterUnits] = useState([]);
    const [loadingW, setLoadingW] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState(null);
    const wordsSeqRef = useRef(0); // 请求序号：仅最新请求允许写入状态

    // 搜索防抖：300ms 内停止输入才更新 debouncedKeyword
    useEffect(() => {
        const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
        return () => clearTimeout(t);
    }, [keyword]);

    const loadTextbooks = () => {
        api.get('/api/get_textbooks.php').then((r) => r.data.success && setTextbooks(r.data.data)).catch(() => {});
    };
    useEffect(() => { loadTextbooks(); }, []);

    // 课本变化 → 加载单元
    useEffect(() => {
        setFilterUnitId('');
        if (!filterBookId) { setFilterUnits([]); return; }
        api.get(`/api/get_units.php?textbook_id=${filterBookId}`)
            .then((r) => r.data.success && setFilterUnits(r.data.data))
            .catch(() => {});
    }, [filterBookId]);

    const loadWords = useCallback(async (p, bookId = filterBookId, unitId = filterUnitId, kw = debouncedKeyword) => {
        const seq = ++wordsSeqRef.current;
        setLoadingW(true);
        try {
            let url = `/api/admin/manage_words.php?page=${p}&size=20`;
            if (unitId) url += `&unit_id=${unitId}`;
            else if (bookId) url += `&textbook_id=${bookId}`;
            if (kw) url += `&keyword=${encodeURIComponent(kw)}`;
            const res = await api.get(url);
            if (seq !== wordsSeqRef.current) return; // 已有更新的请求，丢弃本次结果
            if (res.data.success) {
                setWords(res.data.data.items);
                setPage(res.data.data.pagination.current_page);
                setLastPage(res.data.data.pagination.last_page);
            }
        } finally {
            if (seq === wordsSeqRef.current) setLoadingW(false);
        }
    }, [debouncedKeyword, filterBookId, filterUnitId]);

    useEffect(() => { loadWords(1); }, [loadWords]);

    const startEdit = (w) => {
        setEditingId(w.id);
        setDraft({
            word: w.word,
            phonetic: w.phonetic || '',
            defsText: (w.definitions || []).map((d) => `${d.pos || ''} ${d.def || d.meaning || ''}`.trim()).join('\n'),
        });
    };

    const parseDefs = (text) => text.split('\n')
        .map((l) => l.trim()).filter(Boolean)
        .map((line) => {
            const m = line.match(/^(\S+)\s+(.+)$/);
            return m ? { pos: m[1], def: m[2] } : { pos: '', def: line };
        });

    const saveWord = async (id) => {
        try {
            await api.post('/api/admin/manage_word.php', {
                id, word: draft.word, phonetic: draft.phonetic,
                definitions: parseDefs(draft.defsText),
            });
            onToast({ ok: true, text: '单词已保存' });
            setEditingId(null);
            loadWords(page);
        } catch (error) {
            onToast({ ok: false, text: error.response?.data?.message || '保存失败' });
        }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!impFile) return;
        setBusyImp(true);
        const fd = new FormData();
        fd.append('jsonFile', impFile);
        fd.append('textbook_name', impName);
        fd.append('code', impCode);
        fd.append('overwrite', impOverwrite ? 1 : 0);
        try {
            const response = await api.post('/api/admin/import_textbook.php', fd);
            setImpMsg({ ok: response.data.success, text: response.data.message });
            if (response.data.success) loadTextbooks();
        } catch (error) {
            setImpMsg({ ok: false, text: error.response?.data?.message || '导入失败' });
        } finally {
            setBusyImp(false);
        }
    };

    const handleWordbookImport = async (e) => {
        e.preventDefault();
        if (!wbFile) return;
        setBusyWb(true);
        const fd = new FormData();
        fd.append('wordFile', wbFile);
        fd.append('book_name', wbName);
        fd.append('words_per_part', wbPerPart);
        fd.append('overwrite', wbOverwrite ? 1 : 0);
        try {
            const response = await api.post('/api/admin/import_wordbook.php', fd);
            setWbMsg({ ok: response.data.success, text: response.data.message });
            if (response.data.success) loadTextbooks();
        } catch (error) {
            setWbMsg({ ok: false, text: error.response?.data?.message || '导入失败' });
        } finally {
            setBusyWb(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await api.get(`/api/admin/export_textbook.php?textbook_id=${exportBookId}`);
            if (response.data.success) {
                const blob = new Blob([JSON.stringify(response.data.data.data, null, 4)], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.data.data.filename;
                a.click();
                URL.revokeObjectURL(url);
                onToast({ ok: true, text: '导出成功' });
            }
        } catch (error) {
            onToast({ ok: false, text: error.response?.data?.message || '导出失败' });
        }
    };

    return (
        <div>
            <div className="flex gap-1 mb-5 border-b border-[var(--color-divider)]">
                {[['edit', '单词微调'], ['import', '导入课本'], ['wordbook', '导入词书'], ['export', '导出课本']].map(([k, l]) => (
                    <button key={k} onClick={() => setSubTab(k)}
                        className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                            subTab === k
                                ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-medium'
                                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                        }`}>{l}</button>
                ))}
            </div>

            {subTab === 'import' && (
                <form onSubmit={handleImport} className="max-w-lg space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">课本名称</label>
                        <input value={impName} onChange={(e) => setImpName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">课本编号</label>
                        <input value={impCode} onChange={(e) => setImpCode(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">JSON 文件</label>
                        <input type="file" accept=".json" onChange={(e) => setImpFile(e.target.files[0] || null)} required />
                        {impFile && <p className="text-xs text-[var(--color-text-muted)] mt-1">{impFile.name}（{(impFile.size / 1024).toFixed(1)} KB）</p>}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={impOverwrite} onChange={(e) => setImpOverwrite(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
                        <span className="text-sm text-[var(--color-text-secondary)]">覆盖同编号/同名课本</span>
                    </label>
                    <button type="submit" disabled={busyImp} className="btn btn-primary w-full">
                        <FileUp size={15} />{busyImp ? '导入中...' : '开始导入'}
                    </button>
                    <AlertBox msg={impMsg} />
                </form>
            )}

            {subTab === 'wordbook' && (
                <form onSubmit={handleWordbookImport} className="max-w-lg space-y-3">
                    <div className="text-xs text-[var(--color-text-muted)] leading-relaxed p-3 bg-[var(--color-card-alt)] rounded-sm">
                        词书格式：每行「单词 + Tab 缩进 + 释义」，自动按每部分 N 词切分、每 2 个部分合为 1 个单元（Unit 1、Unit 2…依次往后排）。学习模式与课本完全一致。
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">词书名称</label>
                        <input value={wbName} onChange={(e) => setWbName(e.target.value)} required placeholder="例如：全面盘点-词书" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">每部分词数（5~100）</label>
                        <input type="number" min="5" max="100" value={wbPerPart} onChange={(e) => setWbPerPart(Number(e.target.value) || 25)} required />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">词书 TXT 文件</label>
                        <input type="file" accept=".txt" onChange={(e) => setWbFile(e.target.files[0] || null)} required />
                        {wbFile && <p className="text-xs text-[var(--color-text-muted)] mt-1">{wbFile.name}（{(wbFile.size / 1024).toFixed(1)} KB）</p>}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={wbOverwrite} onChange={(e) => setWbOverwrite(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
                        <span className="text-sm text-[var(--color-text-secondary)]">覆盖同名词书</span>
                    </label>
                    <button type="submit" disabled={busyWb} className="btn btn-primary w-full">
                        <FileUp size={15} />{busyWb ? '导入中...' : '开始导入词书'}
                    </button>
                    <AlertBox msg={wbMsg} />
                </form>
            )}

            {subTab === 'export' && (
                <div className="max-w-md space-y-3">
                    <select value={exportBookId} onChange={(e) => setExportBookId(e.target.value)}>
                        <option value="">选择要导出的课本</option>
                        {textbooks.map((tb) => (
                            <option key={tb.id} value={tb.id}>{tb.textbook_name}（{tb.code}）</option>
                        ))}
                    </select>
                    <button onClick={handleExport} disabled={!exportBookId} className="btn btn-primary w-full">
                        <FileDown size={15} /> 导出 JSON
                    </button>
                </div>
            )}

            {subTab === 'edit' && (
                <>
                    <div className="flex gap-2 mb-3 flex-wrap">
                        <select value={filterBookId} onChange={(e) => setFilterBookId(e.target.value)} className="!py-1.5 text-sm max-w-[180px]">
                            <option value="">全部课本</option>
                            {textbooks.map((tb) => <option key={tb.id} value={tb.id}>{tb.textbook_name}</option>)}
                        </select>
                        <select value={filterUnitId} onChange={(e) => setFilterUnitId(e.target.value)} disabled={!filterUnits.length} className="!py-1.5 text-sm max-w-[160px]">
                            <option value="">全部单元</option>
                            {filterUnits.map((u) => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                        </select>
                        <div className="relative flex-1 min-w-[140px]">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <input
                                value={keyword}
                                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                                onKeyDown={(e) => e.key === 'Enter' && loadWords(1)}
                                placeholder="搜索单词"
                                className="!py-1.5 pl-8 text-sm"
                            />
                        </div>
                    </div>
                    {loadingW ? <Loading /> : (
                        <div className="space-y-2">
                            {words.length === 0 && <div className="card p-8 text-center text-[var(--color-text-muted)]">没有匹配的单词</div>}
                            {words.map((w) => editingId === w.id ? (
                                <div key={w.id} className="card p-3 space-y-2 bg-[var(--color-card-alt)]">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input value={draft.word} onChange={(e) => setDraft({ ...draft, word: e.target.value })} placeholder="单词" />
                                        <input value={draft.phonetic} onChange={(e) => setDraft({ ...draft, phonetic: e.target.value })} placeholder="音标" />
                                    </div>
                                    <textarea rows={Math.max(2, draft.defsText.split('\n').length)}
                                        value={draft.defsText}
                                        onChange={(e) => setDraft({ ...draft, defsText: e.target.value })}
                                        placeholder={'每行一条，格式：词性 释义\n例如：n. 苹果'} />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setEditingId(null)} className="btn btn-sm"><X size={13} />取消</button>
                                        <button onClick={() => saveWord(w.id)} className="btn btn-sm btn-primary"><Save size={13} />保存</button>
                                    </div>
                                </div>
                            ) : (
                                <div key={w.id} className="card p-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <span className="font-semibold text-[var(--color-text)]">{w.word}</span>
                                        {w.phonetic && <span className="ml-2 text-xs text-[var(--color-text-muted)]">{w.phonetic}</span>}
                                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">[{w.unit_name}]</span>
                                        <div className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                                            {(w.definitions || []).map((d) => `${d.pos || ''}${d.def || ''}`).join('；')}
                                        </div>
                                    </div>
                                    <button onClick={() => startEdit(w)} className="btn btn-sm shrink-0">编辑</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loadingW && words.length > 0 && (
                        <Pager page={page} lastPage={lastPage} onPage={(p) => { setPage(p); loadWords(p); }} />
                    )}
                </>
            )}
        </div>
    );
}

/* ---------- 账号管理 ---------- */
const ROLE_LABELS = {
    super_admin: '超级管理员',
    school_admin: '校长',
    head_teacher: '班主任',
    teacher: '任课老师',
    student: '学生',
};

function AccountsPanel({ onToast }) {
    const [accounts, setAccounts] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [batchOpen, setBatchOpen] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', nickname: '', role: 'student' });
    const [createMsg, setCreateMsg] = useState(null);

    // 批量导入
    const [batchFile, setBatchFile] = useState(null);
    const [batchClassId, setBatchClassId] = useState('');
    const [classes, setClasses] = useState([]);
    const [batchResult, setBatchResult] = useState(null);
    const [busyBatch, setBusyBatch] = useState(false);

    const loadAccounts = useCallback(() => {
        api.get('/api/admin/manage_accounts.php')
            .then((r) => {
                if (!r.data.success) return;
                // 后端已分页：data = { items, pagination }；兼容旧版裸数组
                const d = r.data.data;
                setAccounts(Array.isArray(d) ? d : (d?.items ?? []));
            })
            .catch(() => {});
    }, []);
    useEffect(() => { loadAccounts(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/admin/manage_account.php', form);
            onToast({ ok: true, text: response.data.message || '创建成功' });
            setShowCreate(false);
            setForm({ username: '', password: '', nickname: '', role: 'student' });
            loadAccounts();
        } catch (error) {
            setCreateMsg({ ok: false, text: error.response?.data?.message || JSON.stringify(error.response?.data?.errors || {}) || '创建失败' });
        }
    };

    const handleBatch = async () => {
        if (!batchFile) return;
        setBusyBatch(true);
        const fd = new FormData();
        fd.append('file', batchFile);
        if (batchClassId) fd.append('class_id', batchClassId);
        try {
            const response = await api.post('/api/admin/students_batch.php', fd);
            setBatchResult(response.data.data); // {created, failed, details}
            loadAccounts();
        } catch (error) {
            setBatchResult({ created: 0, failed: '?', details: [{ reason: error.response?.data?.message || '导入失败' }] });
        } finally {
            setBusyBatch(false);
        }
    };

    useEffect(() => {
        if (batchOpen) {
            api.get('/api/admin/manage_schools.php')
                .then((r) => r.data.success && setClasses(r.data.data.flatMap((s) =>
                    Array.isArray(s.classes) ? s.classes : [])))
                .catch(() => {});
            // schools 接口只给统计数，班级列表单独拉：
        }
    }, [batchOpen]);

    return (
        <div>
            <div className="flex gap-2 mb-4">
                <button onClick={() => setShowCreate(!showCreate)} className={`btn btn-sm ${showCreate ? 'btn-primary' : ''}`}>
                    <Plus size={14} />新增账号
                </button>
                <button onClick={() => setBatchOpen(!batchOpen)} className={`btn btn-sm ${batchOpen ? 'btn-primary' : ''}`}>
                    批量导入学生(CSV/JSON)
                </button>
            </div>

            {/* 新增账号 */}
            {showCreate && (
                <form onSubmit={handleCreate} className="card p-4 mb-5 max-w-md space-y-3" autoComplete="off">
                    <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="用户名" required />
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="密码（至少6位）" required minLength={6} />
                    <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="姓名/昵称（可选）" />
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                        {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary w-full">创建账号</button>
                    <AlertBox msg={createMsg} />
                </form>
            )}

            {/* 批量导入 */}
            {batchOpen && (
                <div className="card p-4 mb-5 max-w-lg space-y-3">
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                        CSV 每行：<code>用户名,密码,姓名[,班级ID]</code>（密码留空自动生成6位）
                        <br />JSON 数组：<code>[{'{'}"username","password","nickname","class_id"{'}'}]</code>
                    </p>
                    <select value={batchClassId} onChange={(e) => setBatchClassId(e.target.value)}>
                        <option value="">不分配班级</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="file" accept=".csv,.json,.txt"
                        onChange={(e) => setBatchFile(e.target.files[0] || null)} />
                    <button onClick={handleBatch} disabled={!batchFile || busyBatch} className="btn btn-primary w-full">
                        {busyBatch ? '导入中...' : '批量导入'}
                    </button>
                    {batchResult && (
                        <div className="p-3 bg-[var(--color-card-alt)] text-sm space-y-1">
                            <div>成功 <strong className="text-[var(--color-success)]">{batchResult.created}</strong> · 失败 <strong className="text-[var(--color-error)]">{batchResult.failed}</strong></div>
                            {(batchResult.details || []).slice(0, 10).map((d, i) => (
                                <div key={i} className="text-xs text-[var(--color-error)]">第{d.line ?? i + 1}行 {d.username}: {d.reason}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 账号列表 */}
            <div className="space-y-2">
                {accounts.map((a) => (
                    <div key={a.id} className="card p-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="font-medium text-[var(--color-text)]">{a.username}</span>
                            <span className="text-[var(--color-text-muted)]">{a.nickname}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-sm border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                                {ROLE_LABELS[a.role] || a.role}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${a.status === 1 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'}`} title={a.status === 1 ? '正常' : '禁用'} />
                            <span className="text-xs text-[var(--color-text-muted)] w-12 text-right">{a.points} 分</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ---------- 学校管理 ---------- */
function SchoolsPanel({ onToast }) {
    const [schools, setSchools] = useState([]);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);

    const loadSchools = useCallback(() => {
        api.get('/api/admin/manage_schools.php')
            .then((r) => r.data.success && setSchools(r.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => { loadSchools(); }, [loadSchools]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/admin/manage_school.php', { name, code });
            onToast({ ok: true, text: response.data.message });
            setName(''); setCode('');
            loadSchools();
        } catch (error) {
            onToast({ ok: false, text: error.response?.data?.message || '创建失败' });
        }
    };

    // 行内编辑
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState({ name: '', code: '' });

    const startEdit = (s) => {
        setEditingId(s.id);
        setEditDraft({ name: s.name, code: s.code || '' });
    };

    const saveEdit = async () => {
        try {
            const response = await api.post('/api/admin/manage_school_update.php', {
                id: editingId, name: editDraft.name, code: editDraft.code,
            });
            onToast({ ok: true, text: response.data.message });
            setEditingId(null);
            loadSchools();
        } catch (error) {
            onToast({ ok: false, text: error.response?.data?.message || '保存失败' });
        }
    };

    return (
        <div>
            <form onSubmit={handleCreate} className="card p-4 mb-5 max-w-md flex gap-2 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">学校名称</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="w-28">
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">编号</label>
                    <input value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary shrink-0"><Plus size={14} />新增</button>
            </form>

            {loading ? <Loading /> : (
                <div className="space-y-2">
                    {schools.map((s) => editingId === s.id ? (
                        <div key={s.id} className="card p-3 bg-[var(--color-card-alt)]">
                            <div className="flex gap-2 items-end flex-wrap">
                                <div className="flex-1 min-w-[160px]">
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">学校名称</label>
                                    <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
                                </div>
                                <div className="w-28">
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">编号</label>
                                    <input value={editDraft.code} onChange={(e) => setEditDraft({ ...editDraft, code: e.target.value })} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={saveEdit} className="btn btn-sm btn-primary"><Save size={13} />保存</button>
                                    <button onClick={() => setEditingId(null)} className="btn btn-sm"><X size={13} />取消</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div key={s.id} className="card p-3 flex items-center justify-between text-sm">
                            <div>
                                <span className="font-medium text-[var(--color-text)]">{s.name}</span>
                                {s.code && <span className="ml-2 text-xs text-[var(--color-text-muted)]">{s.code}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-xs text-[var(--color-text-muted)]">
                                    {s.classes} 个班 · {s.students} 名学生
                                </div>
                                <button onClick={() => startEdit(s)} className="btn btn-sm">编辑</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---------- 回收站 ---------- */
function TrashPanel({ onToast }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadTrash = useCallback(() => {
        api.get('/api/admin/trash_list.php')
            .then((r) => r.data.success && setItems(r.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => { loadTrash(); }, [loadTrash]);

    const restore = async (id) => {
        try {
            const response = await api.post('/api/admin/trash_restore.php', { textbook_id: id });
            onToast({ ok: true, text: response.data.message });
            loadTrash();
        } catch (error) {
            onToast({ ok: false, text: error.response?.data?.message || '恢复失败' });
        }
    };

    const purge = async (id) => {
        if (!confirm('彻底删除后无法恢复，确定吗？')) return;
        try {
            const response = await api.post(`/api/admin/trash_purge.php`, { textbook_id: id });
            onToast({ ok: true, text: response.data.message });
            loadTrash();
        } catch (error) {
            onToast({ ok: false, text: error.response?.data?.message || '删除失败' });
        }
    };

    return (
        <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
                删除的课本会进入回收站保留全部数据，可随时恢复；彻底删除后不可恢复。
            </p>
            {loading ? <Loading /> : items.length === 0 ? (
                <div className="card p-10 text-center text-[var(--color-text-muted)]">回收站是空的</div>
            ) : (
                <div className="space-y-2">
                    {items.map((t) => (
                        <div key={t.id} className="card p-3 flex items-center justify-between text-sm">
                            <div>
                                <span className="font-medium text-[var(--color-text)]">{t.textbook_name}</span>
                                <span className="ml-2 text-xs text-[var(--color-text-muted)]">[{t.code}]</span>
                                <span className="ml-2 text-xs text-[var(--color-text-muted)]">{t.word_count} 词</span>
                                <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                                    删除于 {(t.deleted_at || '').replace('T', ' ').slice(0, 16)}
                                </span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => restore(t.id)} className="btn btn-sm btn-primary">
                                    <RotateCcw size={13} />恢复
                                </button>
                                <button onClick={() => purge(t.id)} className="btn btn-sm btn-error">
                                    彻底删除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---------- 反馈统计 ---------- */
const FB_TYPE_LABELS = {
    wrong_def: '释义有误',
    wrong_phonetic: '音标有误',
    wrong_audio: '发音异常',
    other: '其它问题',
};

function FeedbackPanel({ onToast }) {
    const [stats, setStats] = useState(null);
    const [items, setItems] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.get(`/api/admin/feedback_list.php${statusFilter ? `?status=${statusFilter}` : ''}`),
            api.get('/api/admin/feedback_stats.php'),
        ])
            .then(([listRes, statsRes]) => {
                if (listRes.data.success) setItems(listRes.data.data.items);
                if (statsRes.data.success) setStats(statsRes.data.data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const resolve = async (id) => {
        try {
            await api.post('/api/admin/feedback_resolve.php', { id });
            load();
        } catch (error) {
            onToast({ ok: false, text: error.response?.data?.message || '操作失败' });
        }
    };

    return (
        <div>
            {/* 统计卡 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <div className="card p-4">
                    <div className="text-xs text-[var(--color-text-muted)]">待处理</div>
                    <div className="text-2xl font-bold text-[var(--color-error)]">{stats?.total_pending ?? '-'}</div>
                </div>
                <div className="card p-4">
                    <div className="text-xs text-[var(--color-text-muted)]">已处理</div>
                    <div className="text-2xl font-bold text-[var(--color-success)]">{stats?.total_resolved ?? '-'}</div>
                </div>
                {(stats?.by_type || []).map((t) => (
                    <div key={t.label} className="card p-4">
                        <div className="text-xs text-[var(--color-text-muted)]">{t.label}</div>
                        <div className="text-lg font-semibold text-[var(--color-text)]">
                            待处理 {t.pending} / 已处理 {t.resolved}
                        </div>
                    </div>
                ))}
            </div>

            {/* 状态筛选 */}
            <div className="flex gap-1 mb-4">
                {[['', '全部'], ['pending', '待处理'], ['resolved', '已处理']].map(([k, l]) => (
                    <button key={k} onClick={() => setStatusFilter(k)} className={`btn btn-sm ${statusFilter === k ? 'btn-primary' : ''}`}>
                        {l}
                    </button>
                ))}
            </div>

            {/* 列表 */}
            {loading ? <Loading /> : items.length === 0 ? (
                <div className="card p-10 text-center text-[var(--color-text-muted)]">暂无反馈</div>
            ) : (
                <div className="space-y-2">
                    {items.map((f) => (
                        <div key={f.id} className="card p-3 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap text-sm">
                                    <span className={`px-2 py-0.5 rounded-sm text-xs border ${
                                        f.status === 'pending'
                                            ? 'border-[var(--color-warning)] text-[var(--color-warning)]'
                                            : 'border-[var(--color-success)] text-[var(--color-success)]'
                                    }`}>{f.status === 'pending' ? '待处理' : '已处理'}</span>
                                    <strong className="text-[var(--color-text)]">{f.word}</strong>
                                    <span className="text-xs text-[var(--color-primary)] border border-[var(--color-primary)] px-1.5 rounded-sm">
                                        {f.type_label}
                                    </span>
                                    <span className="text-xs text-[var(--color-text-muted)]">by @{f.username}</span>
                                </div>
                                {f.content && (
                                    <div className="text-xs text-[var(--color-text-secondary)] mt-1">{f.content}</div>
                                )}
                            </div>
                            {f.status === 'pending' && (
                                <button onClick={() => resolve(f.id)} className="btn btn-sm btn-primary shrink-0">
                                    标记已处理
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---------- 课本管理（封面） ---------- */
function BooksCoverPanel({ onToast }) {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);

    const loadBooks = useCallback(() => {
        api.get('/api/admin/textbook_list.php')
            .then((r) => r.data.success && setBooks(r.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => { loadBooks(); }, [loadBooks]);

    const pickFile = (id) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp,image/gif';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { onToast({ ok: false, text: '图片不能超过5MB' }); return; }
            setBusyId(id);
            const fd = new FormData();
            fd.append('cover', file);
            fd.append('textbook_id', id);
            try {
                const response = await api.post('/api/admin/upload_cover.php', fd);
                onToast({ ok: response.data.success, text: response.data.message });
                loadBooks();
            } catch (error) {
                onToast({ ok: false, text: error.response?.data?.message || '上传失败' });
            } finally {
                setBusyId(null);
            }
        };
        input.click();
    };

    const removeCover = async (id) => {
        setBusyId(id);
        try {
            await api.post('/api/admin/remove_cover.php', { textbook_id: id });
            loadBooks();
        } catch (error) {
            onToast({ ok: false, text: '移除失败' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
                封面建议比例 3:4（如 300×400px），支持 jpg/png/webp/gif，不超过 5MB。上传后学生端课本卡片立即生效。
            </p>
            {loading ? <Loading /> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {books.map((b) => (
                        <div key={b.id} className="card p-3 flex flex-col">
                            <div className="relative w-full aspect-[3/4] bg-[var(--color-card-alt)] border border-[var(--color-divider)] overflow-hidden mb-2 group">
                                {b.cover ? (
                                    <>
                                        <img src={`/${b.cover}`} alt={b.textbook_name} className="w-full h-full object-cover" />
                                        {busyId === b.id && <div className="absolute inset-0 bg-black/40 animate-pulse" />}
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[var(--color-text-muted)]">
                                        <BookOpen size={26} />
                                        <span className="text-xs">暂无封面</span>
                                    </div>
                                )}
                            </div>
                            <div className="font-medium text-sm text-[var(--color-text)] leading-snug line-clamp-2">{b.textbook_name}</div>
                            <div className="text-xs text-[var(--color-text-muted)] mt-1">{b.code} · {b.unit_count}单元/{b.word_count}词</div>
                            <div className="flex gap-1.5 mt-2">
                                <button onClick={() => pickFile(b.id)} disabled={busyId === b.id} className="btn btn-sm btn-primary flex-1">
                                    <FileUp size={12} />{b.cover ? '更换' : '上传'}
                                </button>
                                {b.cover && (
                                    <button onClick={() => removeCover(b.id)} disabled={busyId === b.id} className="btn btn-sm btn-error !px-2" title="移除封面">
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---------- 主壳：CMS 左侧边栏布局 ---------- */
const MENUS = [
    { key: 'words', label: '单词管理', icon: BookOpen },
    { key: 'books', label: '课本管理', icon: School },
    { key: 'accounts', label: '账号管理', icon: Users },
    { key: 'feedback', label: '反馈统计', icon: MessageSquareWarning },
    { key: 'schools', label: '学校管理', icon: School },
    { key: 'trash', label: '回收站', icon: Trash2 },
];

export default function Admin({ embedded = false }) {
    const [menu, setMenu] = useState('words');
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);
    const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 3000); };

    return (
        <div className={embedded ? "flex flex-col md:flex-row bg-[var(--color-bg-page)]" : "min-h-screen flex flex-col md:flex-row bg-[var(--color-bg-page)]"}>
            {/* 左侧边栏 */}
            <aside className={`md:w-56 bg-[var(--color-card)] md:border-r border-b md:border-b-0 border-[var(--color-border)] flex md:flex-col shrink-0 ${embedded ? '' : 'md:min-h-screen'}`}>
                <div className="hidden md:flex items-center gap-2 px-4 h-14 border-b border-[var(--color-divider)]">
                    <Shield size={18} className="text-[var(--color-primary)]" />
                    <span className="font-bold text-[var(--color-text)]">管理后台</span>
                </div>
                <nav className="flex md:flex-col flex-1 overflow-x-auto">
                    {MENUS.map((m) => {
                        const Icon = m.icon;
                        const active = menu === m.key;
                        return (
                            <button
                                key={m.key}
                                onClick={() => setMenu(m.key)}
                                className={`flex items-center gap-2.5 px-4 py-3 text-sm whitespace-nowrap transition-colors ${
                                    active
                                        ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium md:border-r-2 border-r-2 md:border-r-0 border-[var(--color-primary)]'
                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-bg)]'
                                }`}
                            >
                                <Icon size={16} />
                                <span className="hidden sm:inline">{m.label}</span>
                            </button>
                        );
                    })}
                </nav>
                <button
                    onClick={() => navigate('/english')}
                    className="hidden md:flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mt-auto"
                >
                    <ChevronLeft size={14} />返回主页
                </button>
            </aside>

            {/* 内容区 */}
            <main className="flex-1 p-6 min-w-0">
                <h1 className="text-xl font-bold text-[var(--color-text)] mb-5">
                    {MENUS.find((m) => m.key === menu)?.label}
                </h1>
                <AlertBox msg={toast} />
                {menu === 'words' && <WordsPanel onToast={showToast} />}
                {menu === 'books' && <BooksCoverPanel onToast={showToast} />}
                {menu === 'accounts' && <AccountsPanel onToast={showToast} />}
                {menu === 'schools' && <SchoolsPanel onToast={showToast} />}
                {menu === 'trash' && <TrashPanel onToast={showToast} />}
                {menu === 'feedback' && <FeedbackPanel onToast={showToast} />}
            </main>
        </div>
    );
}
