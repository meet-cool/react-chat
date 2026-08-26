import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@eng/utils/api';
import { Library, Volume2, Search, EyeOff, ChevronLeft, ChevronRight, RotateCcw, FileDown, X } from 'lucide-react';

// 预设隐藏模式：便于背诵
const MODES = [
    { key: 'all', label: '全部显示' },
    { key: 'hide-def', label: '隐藏释义' },   // 看英文背中文
    { key: 'hide-word', label: '隐藏单词' },  // 看中文背英文
];

const COL_LETTERS = ['', '', 'A', 'B', 'C', 'D'];

export default function WordBook() {
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [page, setPage] = useState(1);
    const [mode, setMode] = useState('all');
    const [textbooks, setTextbooks] = useState([]);
    const [units, setUnits] = useState([]);
    const [textbookId, setTextbookId] = useState('');
    const [unitId, setUnitId] = useState('');
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState(''); // 防抖后的搜索词（300ms 停顿才触发加载）
    const [loading, setLoading] = useState(true);
    const loadSeqRef = useRef(0); // 请求序号：仅最新请求允许写入状态

    // 搜索防抖：300ms 内停止输入才更新 debouncedKeyword
    useEffect(() => {
        const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
        return () => clearTimeout(t);
    }, [keyword]);

    // 勾选（自定义导出）
    const [checked, setChecked] = useState(new Set());

    // 导出弹窗
    const [exportOpen, setExportOpen] = useState(false);
    const [exportScope, setExportScope] = useState('current');
    const [exportContent, setExportContent] = useState('both');
    const [exportLayout, setExportLayout] = useState('table');
    const [exportBookId, setExportBookId] = useState('');
    const [exportUnitId, setExportUnitId] = useState('');
    const [exportUnits, setExportUnits] = useState([]);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        api.get('/api/get_textbooks.php')
            .then((res) => res.data.success && setTextbooks(res.data.data))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!textbookId) { setUnits([]); return; }
        api.get(`/api/get_units.php?textbook_id=${textbookId}`)
            .then((res) => res.data.success && setUnits(res.data.data))
            .catch(() => {});
        setUnitId('');
        setPage(1);
    }, [textbookId]);

    // 弹窗内单元联动
    useEffect(() => {
        if (!exportOpen || !exportBookId) { setExportUnits([]); return; }
        api.get(`/api/get_units.php?textbook_id=${exportBookId}`)
            .then((res) => res.data.success && setExportUnits(res.data.data))
            .catch(() => {});
        setExportUnitId('');
    }, [exportOpen, exportBookId]);

    const load = useCallback(async () => {
        const seq = ++loadSeqRef.current;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), size: '20' });
            if (unitId) params.set('unit_id', unitId);
            else if (textbookId) params.set('textbook_id', textbookId);
            if (debouncedKeyword) params.set('keyword', debouncedKeyword);
            const response = await api.get(`/api/wordbook.php?${params.toString()}`);
            if (seq !== loadSeqRef.current) return; // 已有更新的请求，丢弃本次结果
            if (response.data.success) {
                setItems(response.data.data.items);
                setPagination(response.data.data.pagination);
                setChecked(new Set());
            }
        } catch (error) {
            console.error('加载单词书失败:', error);
        } finally {
            if (seq === loadSeqRef.current) setLoading(false);
        }
    }, [page, unitId, textbookId, debouncedKeyword]);

    useEffect(() => {
        load();
    }, [load]);

    // 点击行：切换个人隐藏（持久化）
    const handleToggleHide = async (wordId) => {
        setItems((prev) => prev.map((w) => (w.id === wordId ? { ...w, hidden: !w.hidden } : w)));
        try {
            await api.post('/api/wordbook/toggle.php', { word_id: wordId });
        } catch (error) {
            console.error('切换隐藏失败:', error);
            load();
        }
    };

    const toggleCheck = (e, wordId) => {
        e.stopPropagation();
        setChecked((prev) => {
            const next = new Set(prev);
            next.has(wordId) ? next.delete(wordId) : next.add(wordId);
            return next;
        });
    };

    const allPageChecked = items.length > 0 && items.every((w) => checked.has(w.id));
    const toggleCheckAll = (e) => {
        e.stopPropagation();
        setChecked((prev) => {
            const next = new Set(prev);
            if (allPageChecked) items.forEach((w) => next.delete(w.id));
            else items.forEach((w) => next.add(w.id));
            return next;
        });
    };

    const playAudio = (e, word) => {
        e.stopPropagation();
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(word);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
    };

    // ---------- 导出 PDF ----------
    const fetchAllFiltered = async () => {
        const params = new URLSearchParams({ all: '1' });
        if (unitId) params.set('unit_id', unitId);
        else if (textbookId) params.set('textbook_id', textbookId);
        if (keyword.trim()) params.set('keyword', keyword.trim());
        const response = await api.get(`/api/wordbook.php?${params.toString()}`);
        return response.data?.data?.items || [];
    };

    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const buildPrintHTML = (words, title, subtitle) => {
        const showWord = exportContent !== 'def';
        const showDef = exportContent !== 'word';

        const defOf = (w) => (w.definitions || [])
            .map((d) => `${d.pos || ''} ${d.def || d.meaning || ''}`.trim())
            .join('；');

        let body;
        if (exportLayout === 'cards') {
            // 双栏卡片版
            const card = (w, i) => `
                <div class="card">
                    <div class="idx">${i}</div>
                    <div class="w">${showWord ? esc(w.word) : '<span class="blank">&nbsp;</span>'}
                        ${showWord && w.phonetic ? `<span class="ph">${esc(w.phonetic)}</span>` : ''}</div>
                    <div class="d">${showDef ? esc(defOf(w) || '') : '<span class="blank">____________________</span>'}</div>
                </div>`;
            body = `<div class="cards">${words.map(card).join('')}</div>`;
        } else {
            const rows = words.map((w, i) => `
                <tr>
                    <td class="c">${i}</td>
                    <td>${showWord ? esc(w.word) : ''}</td>
                    <td class="ph">${showWord ? esc(w.phonetic || '') : ''}</td>
                    <td>${showDef ? esc(defOf(w)) : ''}</td>
                </tr>`).join('');
            body = `
                <table>
                    <thead><tr><th class="c">#</th><th>单词</th><th>音标</th><th>释义</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }

        return `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system,'PingFang SC','Microsoft YaHei',sans-serif; color:#111; margin:0; }
  h1 { font-size:16pt; margin:0 0 2mm; }
  .meta { font-size:9pt; color:#555; margin-bottom:5mm; }
  table { width:100%; border-collapse:collapse; font-size:10.5pt; }
  th, td { border:0.6pt solid #555; padding:4pt 6pt; text-align:left; vertical-align:top; }
  th { background:#f0f0f0; }
  td.c, th.c { width:9mm; text-align:center; color:#666; }
  td.ph { color:#333; font-style:italic; white-space:nowrap; }
  tr { page-break-inside:avoid; }
  thead { display:table-header-group; }
  .cards { column-count:2; column-gap:6mm; }
  .card { border:0.6pt solid #555; padding:3mm; margin-bottom:3mm; break-inside:avoid; border-radius:2mm; }
  .card .idx { float:right; font-size:8pt; color:#999; }
  .card .w { font-size:13pt; font-weight:600; }
  .card .ph { font-size:9pt; color:#444; font-weight:normal; font-style:italic; margin-left:2mm; }
  .card .d { font-size:9.5pt; margin-top:1.5mm; }
  .blank { color:#bbb; }
</style></head><body>
<h1>${esc(title)}</h1>
<div class="meta">${esc(subtitle)} · 共 ${words.length} 词 · ${new Date().toLocaleDateString('zh-CN')} · 内容：${
            exportContent === 'both' ? '单词+释义' : exportContent === 'word' ? '仅单词（默写版）' : '仅释义（拼写版）'
        }</div>
${body}
<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script>
</body></html>`;
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            let words = [];
            let title = '单词书';
            let subtitle = '';

            const bookName = (id) => textbooks.find((t) => t.id === Number(id))?.textbook_name || '';
            const unitName = (id) => exportUnits.find((u) => u.id === Number(id))?.unit_name || '';

            if (exportScope === 'checked') {
                words = items.filter((w) => checked.has(w.id));
                title = '自定义勾选单词';
                subtitle = '手动勾选';
            } else if (exportScope === 'current') {
                words = items;
                title = selectedTitle();
                subtitle = '当前页';
            } else if (exportScope === 'filtered') {
                words = await fetchAllFiltered();
                title = textbookId ? bookName(textbookId) : '全部课本';
                subtitle = unitId ? `单元筛选` : (keyword ? `搜索"${keyword}"` : '当前筛选');
            } else if (exportScope === 'book') {
                const bid = exportBookId || textbookId;
                words = await (async () => {
                    const r = await api.get(`/api/wordbook.php?textbook_id=${bid}&all=1`);
                    return r.data?.data?.items || [];
                })();
                title = bookName(bid) || '整本课本';
                subtitle = `整本课本（编号 ${bid}）`;
            } else if (exportScope === 'unit') {
                const uid = exportUnitId;
                if (!uid) throw new Error('请选择单元');
                words = await (async () => {
                    const r = await api.get(`/api/wordbook.php?unit_id=${uid}&all=1`);
                    return r.data?.data?.items || [];
                })();
                title = unitName(uid) || '单元单词';
                subtitle = `${bookName(exportBookId)} / ${title}`;
            }

            if (!words.length) {
                alert('所选范围内没有单词');
                return;
            }

            const html = buildPrintHTML(words, title, subtitle);
            const win = window.open('', '_blank');
            if (!win) {
                alert('浏览器拦截了弹出窗口，请允许后重试');
                return;
            }
            win.document.open();
            win.document.write(html);
            win.document.close();
            setExportOpen(false);
        } catch (error) {
            alert(error.response?.data?.message || error.message || '导出失败');
        } finally {
            setExporting(false);
        }
    };

    const selectedTitle = () => {
        const parts = [];
        if (textbookId) parts.push(textbooks.find((t) => t.id === Number(textbookId))?.textbook_name || '');
        if (unitId) parts.push(units.find((u) => u.id === Number(unitId))?.unit_name || '');
        return parts.length ? parts.join(' / ') : '单词书';
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 pb-20 md:pb-8">
            {/* 名称框（Excel 味） */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-sm border border-[var(--color-border-light)] bg-[var(--color-card)]">
                        <Library size={14} className="text-[var(--color-primary)]" />
                        单词书.xlsx
                    </span>
                    <button
                        onClick={() => setMode(mode === 'all' ? 'hide-def' : mode === 'hide-def' ? 'hide-word' : 'all')}
                        className="btn btn-sm"
                        title="循环切换预设模式"
                    >
                        <RotateCcw size={13} />
                        {MODES.find((m) => m.key === mode)?.label}
                    </button>
                    <button onClick={() => setExportOpen(true)} className="btn btn-sm btn-primary">
                        <FileDown size={13} />
                        导出 PDF{checked.size > 0 ? `（已选 ${checked.size} 词）` : ''}
                    </button>
                </div>
                <span className="hidden sm:inline text-xs text-[var(--color-text-muted)]">点击行可隐藏/取消隐藏</span>
            </div>

            {/* 工具栏 */}
            <div className="border border-b-0 border-[var(--color-border)] bg-[var(--color-card-alt)] p-2.5 flex flex-col sm:flex-row gap-2">
                <select value={textbookId} onChange={(e) => setTextbookId(e.target.value)} className="flex-1 !py-1.5 text-sm">
                    <option value="">全部课本</option>
                    {textbooks.map((tb) => (
                        <option key={tb.id} value={tb.id}>{tb.textbook_name}</option>
                    ))}
                </select>
                <select value={unitId} onChange={(e) => { setUnitId(e.target.value); setPage(1); }} disabled={!units.length} className="flex-1 !py-1.5 text-sm">
                    <option value="">全部单元</option>
                    {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.unit_name}</option>
                    ))}
                </select>
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                        placeholder="搜索单词"
                        className="!py-1.5 pl-8 text-sm"
                    />
                </div>
                <div className="flex items-center gap-1">
                    {MODES.map((m) => (
                        <button
                            key={m.key}
                            onClick={() => setMode(m.key)}
                            className={`btn btn-sm !px-2 ${mode === m.key ? 'btn-primary' : ''}`}
                            title={m.label}
                        >
                            {m.key !== 'all' && <EyeOff size={13} />}
                            <span className="hidden lg:inline">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Excel 表格 */}
            <div className="border border-[var(--color-border)] overflow-x-auto bg-[var(--color-card)]">
                <table className="w-full border-collapse text-sm" style={{ minWidth: 680 }}>
                    <thead>
                        {/* 列字母条 */}
                        <tr className="bg-[var(--color-card-alt)] text-[11px] text-[var(--color-text-muted)]">
                            {COL_LETTERS.map((letter, i) => (
                                <th
                                    key={i}
                                    className={`font-normal border-b border-r border-[var(--color-divider)] px-1 py-0.5 ${
                                        i <= 1 ? 'w-10' : i === 2 ? 'w-44' : ''
                                    }`}
                                >
                                    {letter}
                                </th>
                            ))}
                            <th className="border-b border-[var(--color-divider)] px-1 py-0.5 w-20 font-normal">F</th>
                        </tr>
                        {/* 表头 */}
                        <tr className="bg-[var(--color-card-alt)] text-[var(--color-text-secondary)]">
                            <th className="border-b border-r border-[var(--color-divider)] px-1 py-2 w-10">
                                <input type="checkbox" checked={allPageChecked} onClick={(e) => e.stopPropagation()} onChange={toggleCheckAll} title="全选本页" />
                            </th>
                            <th className="border-b border-r border-[var(--color-divider)] px-1 py-2 w-10 font-normal">#</th>
                            <th className="border-b border-r border-[var(--color-divider)] px-3 py-2 text-left font-medium">单词</th>
                            <th className="border-b border-r border-[var(--color-divider)] px-3 py-2 text-left font-medium">音标</th>
                            <th className="border-b border-r border-[var(--color-divider)] px-3 py-2 text-left font-medium">释义</th>
                            <th className="border-b border-[var(--color-divider)] px-2 py-2 w-20 font-medium">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-16 text-[var(--color-text-muted)]" style={{ height: 200 }}>
                                    加载中...
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-16 text-[var(--color-text-muted)]" style={{ height: 200 }}>
                                    没有符合条件的单词
                                </td>
                            </tr>
                        ) : (
                            items.map((w, idx) => {
                                const maskWord = w.hidden || mode === 'hide-word';
                                const maskDef = w.hidden || mode === 'hide-def';
                                const defText = (w.definitions || [])
                                    .map((d) => `${d.pos || ''} ${d.def || d.meaning || ''}`.trim())
                                    .join('；');
                                const globalIdx = (pagination.current_page - 1) * pagination.per_page + idx + 1;
                                return (
                                    <tr
                                        key={w.id}
                                        onClick={() => handleToggleHide(w.id)}
                                        className={`cursor-pointer transition-colors ${
                                            w.hidden ? 'opacity-70' : 'hover:bg-[var(--color-hover-bg)]'
                                        }`}
                                        title={w.hidden ? '点击取消隐藏' : '点击隐藏'}
                                    >
                                        <td className="border-b border-r border-[var(--color-divider)] text-center bg-[var(--color-card-alt)]">
                                            <input type="checkbox" checked={checked.has(w.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleCheck(e, w.id)} />
                                        </td>
                                        <td className={`border-b border-r border-[var(--color-divider)] text-center text-[11px] ${
                                            w.hidden ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'
                                        }`}>
                                            {w.hidden ? <EyeOff size={13} className="inline" /> : globalIdx}
                                        </td>
                                        <td className={`border-b border-r border-[var(--color-divider)] px-3 py-2 font-semibold text-[var(--color-text)] transition-all ${
                                            maskWord ? 'blur-sm hover:blur-none' : ''
                                        }`}>
                                            {w.word}
                                        </td>
                                        <td className={`border-b border-r border-[var(--color-divider)] px-3 py-2 text-[var(--color-text-muted)] transition-all ${
                                            maskWord ? 'blur-sm hover:blur-none' : ''
                                        }`}>
                                            {maskWord ? '···' : (w.phonetic || '—')}
                                        </td>
                                        <td className={`border-b border-r border-[var(--color-divider)] px-3 py-2 text-[var(--color-text-secondary)] transition-all ${
                                            maskDef ? 'blur-sm hover:blur-none' : ''
                                        }`}>
                                            {defText || '—'}
                                        </td>
                                        <td className="border-b border-[var(--color-divider)] px-2 py-2 text-center">
                                            <button
                                                onClick={(e) => playAudio(e, w.word)}
                                                className="btn btn-sm !px-1.5"
                                                title="播放发音"
                                            >
                                                <Volume2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* 分页状态栏 */}
            <div className="flex items-center justify-between mt-2 px-2 py-1.5 border border-[var(--color-border)] bg-[var(--color-card-alt)] text-xs text-[var(--color-text-secondary)]">
                <span>记录数: {pagination.total}　已勾选: {checked.size}</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={pagination.current_page <= 1}
                        className="btn btn-sm !px-2"
                    >
                        <ChevronLeft size={13} />
                    </button>
                    <span>第 {pagination.current_page} / {pagination.last_page} 页</span>
                    <button
                        onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                        disabled={pagination.current_page >= pagination.last_page}
                        className="btn btn-sm !px-2"
                    >
                        <ChevronRight size={13} />
                    </button>
                </div>
            </div>

            {/* 导出弹窗 */}
            {exportOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setExportOpen(false)}>
                    <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
                                <FileDown size={18} className="text-[var(--color-primary)]" />
                                导出 PDF
                            </h3>
                            <button onClick={() => setExportOpen(false)} className="btn btn-sm !px-2">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">导出范围</label>
                                <select value={exportScope} onChange={(e) => setExportScope(e.target.value)} className="w-full">
                                    <option value="current">当前页（{items.length} 词）</option>
                                    <option value="checked" disabled={checked.size === 0}>已勾选（{checked.size} 词）</option>
                                    <option value="filtered">当前筛选结果（全部页）</option>
                                    <option value="book">整本课本</option>
                                    <option value="unit">指定单元</option>
                                </select>
                            </div>

                            {(exportScope === 'book' || exportScope === 'unit') && (
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">课本</label>
                                    <select value={exportBookId} onChange={(e) => setExportBookId(e.target.value)} className="w-full">
                                        <option value="">选择课本</option>
                                        {textbooks.map((tb) => (
                                            <option key={tb.id} value={tb.id}>{tb.textbook_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {exportScope === 'unit' && (
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">单元</label>
                                    <select value={exportUnitId} onChange={(e) => setExportUnitId(e.target.value)} className="w-full" disabled={!exportUnits.length}>
                                        <option value="">选择单元</option>
                                        {exportUnits.map((u) => (
                                            <option key={u.id} value={u.id}>{u.unit_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">内容</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { k: 'both', l: '单词+释义' },
                                        { k: 'word', l: '仅单词（默写版）' },
                                        { k: 'def', l: '仅释义（拼写版）' },
                                    ].map((o) => (
                                        <button
                                            key={o.k}
                                            onClick={() => setExportContent(o.k)}
                                            className={`btn btn-sm ${exportContent === o.k ? 'btn-primary' : ''}`}
                                        >
                                            {o.l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">版式</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { k: 'table', l: '表格版' },
                                        { k: 'cards', l: '双栏卡片版' },
                                    ].map((o) => (
                                        <button
                                            key={o.k}
                                            onClick={() => setExportLayout(o.k)}
                                            className={`btn btn-sm ${exportLayout === o.k ? 'btn-primary' : ''}`}
                                        >
                                            {o.l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                将打开新窗口并调起打印对话框，选择「另存为 PDF」即可保存文件。
                            </p>

                            <button onClick={handleExport} disabled={exporting} className="btn btn-primary w-full btn-lg">
                                {exporting ? '准备中...' : '生成 PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
