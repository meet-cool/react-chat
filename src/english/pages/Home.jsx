import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@eng/utils/api';
import { BookOpen, Check } from 'lucide-react';

const MODULES = [
    { key: 'listen_word', label: '听词选词' },
    { key: 'listen_meaning', label: '听词选意' },
    { key: 'word_select', label: '看词选意' },
    { key: 'meaning_select', label: '看意选词' },
    { key: 'dictation', label: '听写单词' },
    { key: 'write', label: '默写单词' },
    { key: 'test', label: '综合测试' },
];

// 课本封面（预留位：接口返回 cover 字段时展示图片）
function Cover({ book }) {
    return (
        <div className="relative w-full aspect-[3/4] bg-[var(--color-card-alt)] border border-[var(--color-divider)] overflow-hidden">
            {book.cover ? (
                <img src={`/${book.cover}`} alt={book.textbook_name} className="w-full h-full object-cover" draggable={false} />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
                    <BookOpen size={30} />
                    <span className="text-xs">封面预留</span>
                </div>
            )}
        </div>
    );
}

export default function Home() {
    const [textbooks, setTextbooks] = useState([]);
    const [selectedTextbook, setSelectedTextbook] = useState(null);
    const [units, setUnits] = useState([]);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const restoredRef = useRef(false); // 恢复完成前不触发持久化写入

    // 恢复上次选择的课本/单元
    useEffect(() => {
        api.get('/api/get_textbooks.php')
            .then(async (res) => {
                if (!res.data.success) return;
                const list = res.data.data;
                setTextbooks(list);
                try {
                    const saved = JSON.parse(localStorage.getItem('eng_home_selection') || 'null');
                    if (!saved) return;
                    const book = list.find((b) => b.id === saved.textbookId);
                    if (!book) return;
                    setSelectedTextbook(book);
                    const uRes = await api.get(`/api/get_units.php?textbook_id=${book.id}`);
                    if (!uRes.data.success) return;
                    setUnits(uRes.data.data);
                    const u = uRes.data.data.find((x) => x.id === saved.unitId);
                    if (u) {
                        setSelectedUnit(u);
                        const pRes = await api.get(`/api/get_parts.php?unit_id=${u.id}`);
                        if (pRes.data.success) setParts(pRes.data.data);
                    }
                } catch { /* 忽略恢复失败 */ }
            })
            .catch(() => {})
            .finally(() => { restoredRef.current = true; });
    }, []);

    // 选择变化时持久化（恢复流程完成后才启用，避免初始 null 误清存储）
    useEffect(() => {
        if (!restoredRef.current) return;
        if (selectedTextbook) {
            localStorage.setItem('eng_home_selection', JSON.stringify({
                textbookId: selectedTextbook.id,
                unitId: selectedUnit?.id ?? null,
            }));
        }
    }, [selectedTextbook, selectedUnit]);

    const handleSelectTextbook = async (book) => {
        setSelectedTextbook(book);
        setSelectedUnit(null);
        setParts([]);
        setUnits([]); // 清空上一本课本的单元，避免脏列表闪现
        setLoading(true);
        try {
            const response = await api.get(`/api/get_units.php?textbook_id=${book.id}`);
            if (response.data.success) setUnits(response.data.data);
        } catch (error) {
            console.error('加载单元失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUnit = async (unit) => {
        setSelectedUnit(unit);
        setLoading(true);
        try {
            const response = await api.get(`/api/get_parts.php?unit_id=${unit.id}`);
            if (response.data.success) setParts(response.data.data);
        } catch (error) {
            console.error('加载部分失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = (part, moduleKey) => {
        navigate(`/english/learn/${selectedUnit?.id}/${part.id}/${moduleKey}`, {
            state: { part, unit: selectedUnit, textbook: selectedTextbook, module: moduleKey },
        });
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 pb-20 md:pb-8">
            {/* 已选课本：桌面端右侧悬浮卡（封面+标题），手机端隐藏 */}
            {selectedTextbook && (
                <div className="hidden lg:flex fixed top-24 right-8 z-40 card p-3 items-center gap-3 w-52 shadow-[var(--shadow-md)]">
                    <div className="relative w-12 shrink-0 aspect-[3/4] bg-[var(--color-card-alt)] border border-[var(--color-divider)] overflow-hidden">
                        {selectedTextbook.cover ? (
                            <img src={`/${selectedTextbook.cover}`} alt={selectedTextbook.textbook_name} className="w-full h-full object-cover" draggable={false} />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]">
                                <BookOpen size={16} />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--color-text)] leading-snug line-clamp-2">
                            {selectedTextbook.textbook_name}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{selectedTextbook.code}</div>
                        <button
                            onClick={() => { setSelectedTextbook(null); setSelectedUnit(null); setParts([]); }}
                            className="text-xs text-[var(--color-primary)] hover:underline mt-1"
                        >
                            重选课本
                        </button>
                    </div>
                </div>
            )}

            {/* 步骤一：课本 */}
            <section className="mb-8">
                {selectedTextbook ? (
                    /* 手机/中屏面包屑（大屏由右侧浮卡承担） */
                    <button
                        onClick={() => { setSelectedTextbook(null); setSelectedUnit(null); setParts([]); }}
                        className="lg:hidden inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-card)] text-sm hover:border-[var(--color-primary)] transition-colors"
                        title="点击重新选择课本"
                    >
                        <BookOpen size={14} className="text-[var(--color-primary)]" />
                        <span className="truncate max-w-[240px]">{selectedTextbook.textbook_name}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">（点击重选）</span>
                    </button>
                ) : (
                    <>
                        <h2 className="text-base font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
                            <span className="w-5 h-5 inline-flex items-center justify-center bg-[var(--color-primary)] text-white text-xs rounded-sm">1</span>
                            选择课本
                        </h2>
                        <p className="text-xs text-[var(--color-text-muted)] mb-4 ml-7">点击课本查看单元</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {textbooks.map((book) => {
                                const active = selectedTextbook?.id === book.id;
                                return (
                                    <button
                                        key={book.id}
                                        onClick={() => handleSelectTextbook(book)}
                                        className={`card p-3 text-left transition-all flex flex-col ${active ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
                                    >
                                        <Cover book={book} />
                                        <div className="mt-2 font-medium text-sm text-[var(--color-text)] leading-snug line-clamp-2">
                                            {book.textbook_name}
                                            <span className={`ml-1.5 align-middle text-[10px] px-1 py-0.5 rounded-sm border ${
                                                book.type === 'wordbook'
                                                    ? 'text-[var(--color-warning)] border-[var(--color-warning)]'
                                                    : 'text-[var(--color-primary)] border-[var(--color-primary)]'
                                            }`}>
                                                {book.type === 'wordbook' ? '词书' : '课本'}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between">
                                            <span className="text-xs text-[var(--color-text-muted)]">{book.code}</span>
                                            {active && (
                                                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)]">
                                                    <Check size={13} />已选
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>

            {/* 步骤二：单元 */}
            {selectedTextbook && (
                <section className="mb-8">
                    <h2 className="text-base font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
                        <span className={`w-5 h-5 inline-flex items-center justify-center bg-[var(--color-primary)] text-white text-xs rounded-sm ${selectedUnit ? 'opacity-60' : ''}`}>2</span>
                        选择单元
                        {selectedUnit && (
                            <button
                                onClick={() => { setSelectedUnit(null); setParts([]); }}
                                className="text-xs font-normal text-[var(--color-primary)] hover:underline"
                            >
                                （{selectedUnit.unit_name}，点击重选）
                            </button>
                        )}
                    </h2>
                    {loading && !units.length ? (
                        <div className="text-center py-8 text-[var(--color-text-muted)]">加载中...</div>
                    ) : (
                        !selectedUnit && (
                            <div className="flex flex-wrap gap-2">
                                {units.map((unit) => (
                                    <button
                                        key={unit.id}
                                        onClick={() => handleSelectUnit(unit)}
                                        className="px-4 min-h-[44px] inline-flex items-center gap-2 border transition-colors text-sm border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                                    >
                                        {unit.unit_name}
                                        <span className="text-xs opacity-70">{unit.total_words}词</span>
                                    </button>
                                ))}
                            </div>
                        )
                    )}
                </section>
            )}

            {/* 步骤三：部分 + 模块打钩 */}
            {selectedUnit && (
                <section className="mb-10">
                    <h2 className="text-base font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
                        <span className="w-5 h-5 inline-flex items-center justify-center bg-[var(--color-primary)] text-white text-xs rounded-sm">3</span>
                        选择模块开始学习
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)] mb-4 ml-7">
                        {selectedUnit.unit_name} · 打钩表示该模块已完成，点击任意模块即开始
                    </p>

                    {loading ? (
                        <div className="text-center py-8 text-[var(--color-text-muted)]">加载中...</div>
                    ) : (
                        <div className="space-y-4">
                            {parts.map((part) => {
                                const total = part.actual_word_count || 0;
                                const allDone = !!part.finished;
                                const mp = part.module_progress || {};
                                const doneCount = MODULES.filter((m) => (mp[m.key]?.done || 0) >= total && total > 0).length;
                                return (
                                    <div
                                        key={part.id}
                                        className={`card relative p-4 ${allDone ? 'border-2 border-[var(--color-error)]' : ''}`}
                                    >
                                        {/* 全部模块完成印章 */}
                                        {allDone && (
                                            <svg
                                                viewBox="0 0 100 100"
                                                className="absolute top-1 right-1 w-16 h-16 pointer-events-none stamp-in"
                                                style={{ transform: 'rotate(12deg)' }}
                                            >
                                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-error)" strokeWidth="5" opacity="0.85" />
                                                <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-error)" strokeWidth="2" opacity="0.85" />
                                                <text x="50" y="46" textAnchor="middle" fontSize="17" fontWeight="bold" fill="var(--color-error)">已学习</text>
                                                <path d="M40 58 L47 66 L62 52" fill="none" stroke="var(--color-error)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}

                                        <div className="flex items-center justify-between mb-3 pr-16">
                                            <div>
                                                <span className="font-semibold text-[var(--color-text)]">第 {part.part_number} 部分</span>
                                                <span className="ml-3 text-xs text-[var(--color-text-muted)]">{total} 词</span>
                                            </div>
                                            <div className="text-xs text-[var(--color-text-muted)]">
                                                模块完成 {doneCount}/7
                                            </div>
                                        </div>

                                        {/* 模块打钩选择器 */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                                            {MODULES.map((m) => {
                                                const stat = mp[m.key] || { done: 0, total };
                                                const isDone = total > 0 && stat.done >= total;
                                                const inProgress = !isDone && (stat.done || 0) > 0;
                                                return (
                                                    <button
                                                        key={m.key}
                                                        onClick={() => handleStart(part, m.key)}
                                                        title={isDone ? '已完成，点击再学一遍' : inProgress ? '继续学习' : `开始${m.label}`}
                                                        className={`flex flex-col items-center justify-center gap-1 px-2 min-h-[64px] border-2 transition-colors ${
                                                            isDone
                                                                ? 'border-[var(--color-success)] bg-[var(--color-success-bg)]'
                                                                : inProgress
                                                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                                                                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-hover-bg)]'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`w-4 h-4 inline-flex items-center justify-center rounded-sm border ${
                                                                isDone
                                                                    ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
                                                                    : inProgress
                                                                        ? 'border-[var(--color-primary)]'
                                                                        : 'border-[var(--color-text-muted)]'
                                                            }`}
                                                        >
                                                            {isDone && <Check size={11} strokeWidth={4} />}
                                                        </span>
                                                        <span className={`text-xs ${
                                                            isDone ? 'text-[var(--color-success)]' : inProgress ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-secondary)]'
                                                        }`}>
                                                            {m.label}
                                                        </span>
                                                        <span className="text-[10px] text-[var(--color-text-muted)]">
                                                            {stat.done}/{stat.total}
                                                            {(stat.learn_count || 0) > 0 && ` · 学${stat.learn_count}次`}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
