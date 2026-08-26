import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@eng/utils/api';
import { Check, X, ChevronLeft, ChevronRight, Send, Coins, Trash2 } from 'lucide-react';

const MAX_WORDS = 30;

function defTextOf(w) {
    const d = (w?.definitions || [])[0];
    return d ? `${d.pos || ''} ${d.def || d.meaning || ''}`.trim() : '';
}

/**
 * 错词本 · 考试复习
 * 拉取某模块错词（最多 30 个）→ 逐题四选一 → 最后一题交卷 → 出分回顾
 */
export default function WrongWordsExam() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const questionType = searchParams.get('type') || '';
    // 复习本模块入口（WrongWords「复习本模块」）携带 review=1：标题显示「错词复习」
    const isReview = searchParams.get('review') === '1';

    const [words, setWords] = useState([]);
    const [selections, setSelections] = useState({});
    const [current, setCurrent] = useState(0);
    const [phase, setPhase] = useState('loading'); // loading | exam | result | error
    const [graded, setGraded] = useState(null);
    const [removing, setRemoving] = useState(false);
    const [removedDone, setRemovedDone] = useState(false);

    /* 加载错词复习集 */
    useEffect(() => {
        if (!questionType) {
            setPhase('error');
            return;
        }
        (async () => {
            try {
                const res = await api.get(`/api/wrong_words/review_set.php?question_type=${encodeURIComponent(questionType)}`);
                if (res.data.success) {
                    const list = (res.data.data || []).slice(0, MAX_WORDS);
                    if (list.length === 0) {
                        setWords([]);
                    } else {
                        setWords(list);
                    }
                    setPhase('exam');
                } else {
                    console.error('[WrongExam] 复习集加载失败:', res.data);
                    setPhase('error');
                }
            } catch (e) {
                console.error('[WrongExam] 加载异常:', e);
                setPhase('error');
            }
        })();
    }, [questionType]);

    /* 每题选项：正确释义 + 其余错词释义作干扰 */
    const optionMap = useMemo(() => {
        const map = {};
        for (const w of words) {
            const correctText = defTextOf(w);
            const opts = correctText ? [{ text: correctText, correct: true }] : [];
            const others = words
                .filter((x) => x.id !== w.id)
                .map(defTextOf)
                .filter((t) => t && t !== correctText);
            for (const t of [...new Set(others)].sort(() => Math.random() - 0.5)) {
                if (opts.length >= 4) break;
                opts.push({ text: t, correct: false });
            }
            map[w.id] = opts.sort(() => Math.random() - 0.5);
        }
        return map;
    }, [words]);

    const total = words.length;
    const currentWord = words[current] || null;
    const isLast = current >= total - 1;
    const currentSelection = currentWord ? (selections[currentWord.id] ?? null) : null;

    function selectOption(text) {
        if (!currentWord) return;
        setSelections((prev) => ({ ...prev, [currentWord.id]: text }));
    }

    function next() {
        if (!currentSelection) return;
        setCurrent((c) => Math.min(c + 1, total - 1));
    }

    /* 交卷：本地判分 */
    function submitPaper() {
        const review = words.map((w) => {
            const selected = selections[w.id] ?? '';
            const correctText = defTextOf(w);
            const isCorrect = selected !== '' && strcasecmp(selected, correctText);
            return {
                word_id: w.id,
                word: w.word,
                selected,
                correct_text: correctText,
                is_correct: isCorrect,
            };
        });
        const correctCount = review.filter((r) => r.is_correct).length;
        const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        setGraded({ score, total, correct_count: correctCount, review });
        setPhase('result');
        new Audio('/sound/part_over.mp3').play().catch(() => {});
    }

    function strcasecmp(a, b) {
        return a.trim().toLowerCase() === b.trim().toLowerCase();
    }

    /* 移除本次答对的词（出词本） */
    async function removeCorrectWords() {
        if (!graded || removing) return;
        setRemoving(true);
        const correctIds = graded.review.filter((r) => r.is_correct).map((r) => r.word_id);
        let ok = 0;
        for (const wid of correctIds) {
            try {
                const r = await api.post('/api/wrong_words/remove.php', { word_id: wid, question_type: questionType });
                if (r.data?.success) ok++;
            } catch (e) {
                console.error('[WrongExam] 移除失败:', wid, e);
            }
        }
        setRemoving(false);
        setRemovedDone(true);
    }

    /* ===== 渲染 ===== */
    if (phase === 'loading') {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
                <div className="text-[var(--color-text-muted)]">正在生成错词试卷...</div>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 text-center">
                <div className="card p-8">
                    <h2 className="font-semibold mb-4">加载失败</h2>
                    <button onClick={() => navigate('/english/wrong-words')} className="btn btn-primary">返回错词本</button>
                </div>
            </div>
        );
    }

    if (phase === 'exam' && total === 0) {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 text-center">
                <div className="card p-10">
                    <Check size={48} strokeWidth={3} className="mx-auto text-[var(--color-success)] mb-4" />
                    <h2 className="text-xl font-bold mb-2">该模块暂无错词</h2>
                    <button onClick={() => navigate('/english/wrong-words')} className="btn btn-primary">返回错词本</button>
                </div>
            </div>
        );
    }

    if (phase === 'result') {
        return (
            <ResultView
                graded={graded}
                questionType={questionType}
                removing={removing}
                removedDone={removedDone}
                onRemove={removeCorrectWords}
                onBack={() => navigate('/english/wrong-words')}
            />
        );
    }

    const options = currentWord ? (optionMap[currentWord.id] || []) : [];

    return (
        <div className="max-w-3xl mx-auto w-full px-4 py-4 pb-28">
            {/* 顶栏 */}
            <div className="card flex items-center justify-between p-3 mb-4">
                <span className="font-semibold text-[var(--color-text)]">{isReview ? '错词复习' : '错词考试复习'}</span>
                <button onClick={() => navigate('/english/wrong-words')} className="btn btn-sm"><ChevronLeft size={14} />退出</button>
            </div>

            {/* 题目卡 */}
            <div className="card p-6">
                {currentWord && (
                    <>
                        <div className="text-center py-4">
                            <h2 className="text-3xl font-bold text-[var(--color-text)]">{currentWord.word}</h2>
                            {currentWord.phonetic && (
                                <p className="text-sm text-[var(--color-text-muted)] mt-1">{currentWord.phonetic}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                            {options.map((opt) => {
                                const isSelected = currentSelection === opt.text;
                                let cls = 'btn option-btn p-3 text-sm text-left border-2 ';
                                cls += isSelected ? 'option-selected' : '';
                                return (
                                    <button key={opt.text} onClick={() => selectOption(opt.text)} className={cls}>
                                        {opt.text}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* 底部按钮：最后一题=交卷，其余=下一题 */}
            <div className="mt-5">
                {isLast ? (
                    <button onClick={submitPaper} className="w-full btn btn-primary btn-lg">
                        <Send size={16} />交卷
                    </button>
                ) : (
                    <button onClick={next} disabled={!currentSelection} className="w-full btn btn-primary btn-lg">
                        下一题<ChevronRight size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

/* ===== 结果页 ===== */
function ResultView({ graded, questionType, removing, removedDone, onRemove, onBack }) {
    if (!graded) return null;
    const { score, total, correct_count, review } = graded;

    return (
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
            {/* 成绩卡 */}
            <div className="card p-8 text-center finish-card">
                <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">错词考试复习成绩</h1>
                <div className="text-6xl font-bold my-4" style={{ color: score >= 60 ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {score}<span className="text-xl text-[var(--color-text-muted)]">分</span>
                </div>
                <div className="flex justify-center gap-8 mt-2 text-sm">
                    <span className="finish-item text-[var(--color-text-secondary)]">
                        共 <b>{total}</b> 词
                    </span>
                    <span className="finish-item text-[var(--color-success)]">
                        答对 <b>{correct_count}</b> 词
                    </span>
                    <span className="finish-item text-[var(--color-error)]">
                        答错 <b>{total - correct_count}</b> 词
                    </span>
                </div>

                <div className="flex justify-center gap-3 mt-6 finish-item flex-wrap">
                    {!removedDone && correct_count > 0 && (
                        <button onClick={onRemove} disabled={removing} className="btn">
                            <Trash2 size={14} />{removing ? '移除中...' : `移除答对的 ${correct_count} 词`}
                        </button>
                    )}
                    {removedDone && (
                        <span className="text-sm text-[var(--color-success)] self-center">答对的词已移出错词本</span>
                    )}
                    <button onClick={onBack} className="btn btn-primary">返回错词本</button>
                </div>
            </div>

            {/* 逐词回顾 */}
            <div className="card p-6 mt-4">
                <h3 className="font-semibold text-[var(--color-text)] mb-4">回顾</h3>
                <div className="flex flex-col gap-3">
                    {(review || []).map((r, i) => (
                        <div key={r.word_id} className="flex items-start gap-3 p-3 border border-[var(--color-divider)] rounded-sm">
                            <span className="text-xs text-[var(--color-text-muted)] w-6 shrink-0 pt-1">{i + 1}.</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-[var(--color-text)] text-sm">{r.word}</p>
                                <p className="text-xs mt-1">
                                    <span className="text-[var(--color-text-muted)]">你的答案：</span>
                                    <span className={r.is_correct ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
                                        {r.selected || '（未作答）'}
                                    </span>
                                </p>
                                {!r.is_correct && (
                                    <p className="text-xs mt-0.5">
                                        <span className="text-[var(--color-text-muted)]">正确答案：</span>
                                        <span className="text-[var(--color-success)]">{r.correct_text}</span>
                                    </p>
                                )}
                            </div>
                            {r.is_correct
                                ? <Check size={18} className="text-[var(--color-success)] shrink-0 mt-0.5" />
                                : <X size={18} className="text-[var(--color-error)] shrink-0 mt-0.5" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
