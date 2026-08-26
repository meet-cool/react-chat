import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@eng/utils/api';
import {
    Clock, Check, X, ChevronLeft, ChevronRight,
    Award, Coins, RotateCcw, AlertTriangle,
} from 'lucide-react';

function defTextOf(w) {
    const d = (w?.definitions || [])[0];
    return d ? `${d.pos || ''} ${d.def || d.meaning || ''}`.trim() : '';
}

function formatTime(s) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

/* 各题型每词作答秒数（考试倒计时 = 词数 × 题型秒数） */
const PER_TYPE_SECONDS = {
    test: 20,
    listen_word: 15,
    listen_meaning: 15,
    word_select: 12,
    meaning_select: 12,
    dictation: 30,
    write: 30,
};

/**
 * 综合测试（考试模式）
 * 左侧答题卡（已答/未答/跳题）+ 逐题作答 + 交卷后端判分 + 金币奖励
 */
export default function AnswerSheet() {
    const navigate = useNavigate();
    // 路由参数：/english/learn/:unitId/:partId/test（动态定位 learn 段）
    const pathParts = window.location.pathname.split('/');
    const learnIdx = pathParts.indexOf('learn');
    const unitId = Number(pathParts[learnIdx + 1]);
    const partId = Number(pathParts[learnIdx + 2]);

    const [sessionId, setSessionId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [distractors, setDistractors] = useState([]);
    const [selections, setSelections] = useState({});
    const [current, setCurrent] = useState(0);
    const [phase, setPhase] = useState('loading');
    const [result, setResult] = useState(null);
    const [left, setLeft] = useState(0); // 倒计时剩余秒数
    const [submitError, setSubmitError] = useState(null); // 交卷失败提示（附手动重试按钮）
    const gradingRef = useRef(false);
    const leftRef = useRef(0);
    const autoRetryRef = useRef(false); // 自动交卷已失败：倒计时保持停止，等待手动重试
    const jumpTimerRef = useRef(null); // 选中后 180ms 自动跳题的定时器

    /* 加载试卷 */
    useEffect(() => {
        (async () => {
            try {
                const s = await api.post('/api/start_session.php', { unit_id: unitId, part_id: partId });
                setSessionId(s.data?.data?.session_id ?? null);
                const res = await api.get(`/api/get_questions.php?unit_id=${unitId}&part_id=${partId}&question_type=test`);
                if (res.data.success) {
                    const qs = res.data.data.questions || [];
                    if (qs.length === 0) {
                        setResult({ empty: true, score: 0, coins_earned: 0, review: [] });
                        setPhase('result');
                        return;
                    }
                    setQuestions(qs);
                    setDistractors(res.data.data.distractors || []);
                    // 倒计时：词数 × 题型秒数
                    const total = qs.length * (PER_TYPE_SECONDS.test || 20);
                    setLeft(total);
                    leftRef.current = total;
                    setPhase('exam');
                } else {
                    console.error('[Exam] 试卷加载失败:', res.data);
                    setPhase('error');
                }
            } catch (e) {
                console.error('[Exam] 加载异常:', e);
                setPhase('error');
            }
        })();
    }, [unitId, partId]);

    /* 倒计时：归零自动交卷（自动交卷失败后 autoRetryRef 置位，不再重启倒计时） */
    useEffect(() => {
        if (phase !== 'exam' && phase !== 'confirm') return undefined;
        if (autoRetryRef.current) return undefined; // 交卷失败等待手动重试：倒计时保持停止
        const t = setInterval(() => {
            setLeft((v) => {
                const next = v - 1;
                leftRef.current = Math.max(0, next);
                if (next <= 0) {
                    clearInterval(t);
                    submitPaper(true); // 倒计时归零触发：自动交卷
                }
                return Math.max(0, next);
            });
        }, 1000);
        return () => clearInterval(t);
    }, [phase]);

    /* 每题选项（本部分词优先，跨分区补足到 4 个） */
    const optionMap = useMemo(() => {
        const map = {};
        for (const q of questions) {
            const correctText = defTextOf(q);
            const opts = correctText ? [{ text: correctText, correct: true }] : [];
            const localTexts = [...new Set(
                questions
                    .filter((w) => w.id !== q.id)
                    .map(defTextOf)
                    .filter((t) => t && t !== correctText)
            )].sort(() => Math.random() - 0.5);
            for (const t of localTexts) {
                if (opts.length >= 4) break;
                opts.push({ text: t, correct: false });
            }
            if (opts.length < 4) {
                const extraTexts = [...new Set(
                    distractors
                        .filter((w) => w.id !== q.id)
                        .map(defTextOf)
                        .filter((t) => t && t !== correctText && !opts.some((o) => o.text === t))
                )].sort(() => Math.random() - 0.5);
                for (const t of extraTexts) {
                    if (opts.length >= 4) break;
                    opts.push({ text: t, correct: false });
                }
            }
            map[q.id] = opts.sort(() => Math.random() - 0.5);
        }
        return map;
    }, [questions, distractors]);

    const answeredCount = Object.keys(selections).length;
    const unanswered = questions.length - answeredCount;
    const currentWord = questions[current] || null;
    const currentSelection = currentWord ? (selections[currentWord.id] ?? null) : null;

    function selectOption(text) {
        if (!currentWord) return;
        setSelections((prev) => ({ ...prev, [currentWord.id]: text }));
        // 选中后自动跳下一题（最后一题停留，等待交卷）；手动跳题时取消该定时器
        if (current < questions.length - 1) {
            clearTimeout(jumpTimerRef.current);
            jumpTimerRef.current = setTimeout(() => setCurrent((c) => Math.min(c + 1, questions.length - 1)), 180);
        }
    }

    function jump(idx) {
        clearTimeout(jumpTimerRef.current); // 手动跳题：取消挂起的自动跳题
        if (idx >= 0 && idx < questions.length) setCurrent(idx);
    }

    /* 交卷失败统一处理：isAuto=true（倒计时归零）时停止倒计时等待手动重试，避免每秒无限重提交 */
    function handleSubmitFailure(isAuto, msg) {
        gradingRef.current = false;
        if (isAuto) {
            autoRetryRef.current = true;
            leftRef.current = 0;
            setLeft(0);
        }
        setSubmitError(msg || '交卷失败，请检查网络后重试');
        setPhase('exam');
    }

    /* 交卷：后端判分（gradingRef 防止倒计时与手动交卷重复提交） */
    async function submitPaper(isAuto = false) {
        if (gradingRef.current) return;
        gradingRef.current = true;
        setSubmitError(null);
        setPhase('grading');
        try {
            const answers = questions.map((q) => ({
                word_id: q.id,
                selected: selections[q.id] ?? '',
            }));
            const totalSeconds = questions.length * (PER_TYPE_SECONDS.test || 20);
            const res = await api.post('/api/submit_test.php', {
                session_id: sessionId,
                unit_id: unitId,
                part_id: partId,
                duration: Math.max(0, totalSeconds - leftRef.current),
                answers,
            });
            if (res.data?.success) {
                autoRetryRef.current = false; // 手动重试成功，恢复常规状态
                setResult(res.data.data);
                setPhase('result');
                // 胜利音效
                new Audio('/sound/part_over.mp3').play().catch(() => {});
            } else {
                console.error('[Exam] 交卷失败:', res.data);
                handleSubmitFailure(isAuto, res.data?.message);
            }
        } catch (e) {
            console.error('[Exam] 交卷异常:', e);
            handleSubmitFailure(isAuto, '');
        }
    }

    if (phase === 'loading') {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
                <div className="text-[var(--color-text-muted)]">试卷生成中...</div>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 text-center">
                <div className="card p-8">
                    <h2 className="font-semibold mb-4">试卷加载失败</h2>
                    <button onClick={() => navigate('/english')} className="btn btn-primary">返回主页</button>
                </div>
            </div>
        );
    }

    if (phase === 'result') {
        return (
            <ResultView
                result={result}
                onBack={() => navigate('/english')}
            />
        );
    }

    return (
        <ExamBody
            questions={questions}
            optionMap={optionMap}
            selections={selections}
            current={current}
            left={left}
            unanswered={unanswered}
            grading={phase === 'grading'}
            submitError={submitError}
            onSelect={selectOption}
            onJump={jump}
            onSubmit={submitPaper}
            onExit={() => navigate('/english')}
            currentWord={currentWord}
            currentSelection={currentSelection}
        />
    );
}

function ExamBody(props) {
    const {
        questions, optionMap, selections, current, left, unanswered,
        grading, submitError, onSelect, onJump, onSubmit, onExit,
        currentWord, currentSelection,
    } = props;
    const [confirming, setConfirming] = useState(false);

    const options = currentWord ? (optionMap[currentWord.id] || []) : [];

    return (
        <div className="max-w-6xl mx-auto w-full px-4 py-4 pb-28">
            {/* 顶栏：不显示做题进度，只显示倒计时 */}
            <div className="card flex items-center justify-between p-3 mb-3">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--color-text)]">综合测试</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={14} className={left <= 60 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-muted)]'} />
                    <span className={`text-sm font-semibold mr-2 ${left <= 60 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {formatTime(left)}
                    </span>
                    <button onClick={onExit} className="btn btn-sm"><ChevronLeft size={14} />退出</button>
                </div>
            </div>

            <div className="flex gap-4 items-start">
                {/* 左侧答题卡 */}
                <aside className="card p-4 w-60 shrink-0 sticky top-20">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">答题卡</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((q, i) => {
                            const done = selections[q.id] != null;
                            const isCur = i === current;
                            let cls = 'btn btn-sm w-full aspect-square p-0 text-xs rounded-sm ';
                            if (isCur) cls += 'btn-primary ';
                            else if (done) cls += 'answer-sheet-done ';
                            return (
                                <button key={q.id} onClick={() => onJump(i)} className={cls} title={`第${i + 1}题`}>
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 text-xs text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm bg-[var(--color-primary)]" />已作答
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm border border-[var(--color-border)]" />未作答
                        </span>
                    </div>
                </aside>

                {/* 右侧题目区 */}
                <section className="flex-1 min-w-0">
                    <div className="card p-6">
                        <div className="flex items-center justify-end mb-4">
                            <div className="flex gap-2">
                                <button onClick={() => onJump(current - 1)} disabled={current === 0} className="btn btn-sm">
                                    <ChevronLeft size={14} />上一题
                                </button>
                                <button onClick={() => onJump(current + 1)} disabled={current >= questions.length - 1} className="btn btn-sm">
                                    下一题<ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

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
                                            <button key={opt.text} onClick={() => onSelect(opt.text)} className={cls}>
                                                {opt.text}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* 交卷区 */}
                    <div className="mt-4">
                        {submitError && (
                            <div className="alert flex items-center gap-2 mb-3" style={{ borderColor: 'var(--color-error)', background: 'var(--color-error-bg)' }}>
                                <AlertTriangle size={16} className="text-[var(--color-error)] shrink-0" />
                                <span className="text-sm flex-1">{submitError}</span>
                                <button onClick={() => onSubmit()} disabled={grading} className="btn btn-sm btn-primary shrink-0">
                                    重试交卷
                                </button>
                            </div>
                        )}
                        {confirming && unanswered > 0 && (
                            <div className="alert flex items-center gap-2 mb-3" style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-bg)' }}>
                                <AlertTriangle size={16} className="text-[var(--color-warning)] shrink-0" />
                                <span className="text-sm flex-1">还有 {unanswered} 题未作答，未答题按错误计分。</span>
                            </div>
                        )}
                        <div className="flex gap-3">
                            {confirming ? (
                                <>
                                    <button onClick={() => setConfirming(false)} className="flex-1 btn">继续作答</button>
                                    <button onClick={onSubmit} disabled={grading} className="flex-1 btn btn-primary">
                                        确认交卷
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setConfirming(true)} disabled={grading} className="flex-1 btn btn-primary">
                                    交卷
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

/* ===== 成绩单 SVG 徽章 ===== */
function ScoreBadge({ score }) {
    const good = score >= 60;
    const color = good ? 'var(--color-success)' : 'var(--color-error)';
    return (
        <svg width="150" height="150" viewBox="0 0 150 150" className="mx-auto">
            <circle cx="75" cy="75" r="66" fill="none" stroke={color} strokeWidth="3" />
            <circle cx="75" cy="75" r="58" fill="none" stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * 30 * Math.PI) / 180;
                const x1 = 75 + Math.cos(a) * 70;
                const y1 = 75 + Math.sin(a) * 70;
                const x2 = 75 + Math.cos(a) * 74;
                const y2 = 75 + Math.sin(a) * 74;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" opacity="0.7" />;
            })}
            <text x="75" y="82" textAnchor="middle" fontSize="40" fontWeight="bold" fill={color}>{score}</text>
            <text x="75" y="104" textAnchor="middle" fontSize="12" fill="var(--color-text-muted)">分</text>
        </svg>
    );
}

/* ===== 结果页 ===== */
function ResultView({ result, onBack }) {
    if (!result) return null;

    if (result.empty) {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 text-center">
                <div className="card p-10 finish-card">
                    <Check size={48} strokeWidth={3} className="mx-auto text-[var(--color-success)] mb-4" />
                    <h2 className="text-xl font-bold mb-2">本部分已全部学完</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">没有可测试的单词</p>
                    <button onClick={onBack} className="btn btn-primary">返回主页</button>
                </div>
            </div>
        );
    }

    const { score, total, correct_count, coins_earned, duration, review } = result;
    const hard = score <= 20;

    return (
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
            {/* 成绩卡 */}
            <div className="card p-8 text-center finish-card">
                <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">考试成绩</h1>
                <ScoreBadge score={score} />
                <div className="flex justify-center gap-8 mt-4 text-sm">
                    <span className="finish-item text-[var(--color-text-secondary)]">
                        共 <b>{total}</b> 题
                    </span>
                    <span className="finish-item text-[var(--color-success)]">
                        答对 <b>{correct_count}</b> 题
                    </span>
                    <span className="finish-item text-[var(--color-text-muted)]">
                        用时 <b>{formatTime(duration || 0)}</b>
                    </span>
                </div>

                {/* 金币结算 */}
                <div className="mt-5 finish-item">
                    {hard ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-warning)] rounded-sm" style={{ background: 'var(--color-warning-bg)' }}>
                            <AlertTriangle size={16} className="text-[var(--color-warning)]" />
                            <span className="text-sm text-[var(--color-warning)] font-medium">继续努力，多背多练再来挑战！</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-success)] rounded-sm" style={{ background: 'var(--color-success-bg)' }}>
                            <Coins size={16} className="text-[var(--color-success)]" />
                            <span className="text-sm text-[var(--color-success)] font-medium">获得 {coins_earned} 金币奖励！</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-center gap-3 mt-6 finish-item">
                    <span className="text-xs text-[var(--color-text-muted)] self-center">刷新页面可重新考试</span>
                    <button onClick={onBack} className="btn btn-primary">返回主页</button>
                </div>
            </div>

            {/* 逐题回顾 */}
            <div className="card p-6 mt-4">
                <h3 className="font-semibold text-[var(--color-text)] mb-4">试卷回顾</h3>
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
