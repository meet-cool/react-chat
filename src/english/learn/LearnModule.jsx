import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@eng/utils/api';
import { ArrowLeft, Clock, Volume2, Keyboard, Flag, Check, X, PenLine } from 'lucide-react';
import MemoryChartCard from './MemoryChartCard';

const META = {
    listen_word:    { audio: true,  input: 'choice', choiceOf: 'word', label: '听词选词' },
    listen_meaning: { audio: true,  input: 'choice', choiceOf: 'def',  label: '听词选意' },
    word_select:    { audio: false, showWord: true,  showDef: false,   input: 'choice', choiceOf: 'def',  label: '看词选意' },
    meaning_select: { audio: false, showWord: false, showDef: true,    input: 'choice', choiceOf: 'word', label: '看意选词' },
    dictation:      { audio: true,  input: 'text',   label: '听写单词' },
    write:          { audio: false, showDef: true,   input: 'text',   label: '默写单词' },
    test:           { audio: false, showWord: true,  showDef: true,   input: 'choice', choiceOf: 'def',  label: '综合测试' },
};

function defTextOf(w) {
    const d = (w?.definitions || [])[0];
    return d ? `${d.pos || ''} ${d.def || d.meaning || ''}`.trim() : '';
}

/* 全角字母/数字/空格 → 半角（中文输入法上屏兼容） */
function normalizeInput(s) {
    return (s ?? '')
        .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        .replace(/\u3000/g, ' ');
}

/* 符号分类（横杠辅助：数字/撇号/连字符/句点固定展示） */
function classifyChar(ch) {
    if (/[a-zA-Z]/.test(ch)) return 'letter';
    if (/[0-9]/.test(ch)) return 'digit';
    if (ch === "'") return 'apostrophe';
    if (ch === '-') return 'hyphen';
    if (ch === '.') return 'period';
    if (ch === ' ') return 'space';
    return 'other';
}

const DEFAULT_SYMBOL_OPTS = { digit: true, apostrophe: true, hyphen: true, period: true, space: true };

export default function LearnModule({ module }) {
    const navigate = useNavigate();
    const meta = META[module] || META.word_select;

    // 路由参数：EnglishRoutes 嵌套定义为 learn/:unitId/:partId/<module>，module 由页面组件 prop 传入
    const { unitId: unitIdParam, partId: partIdParam } = useParams();
    const unitId = Number(unitIdParam);
    const partId = Number(partIdParam);

    const [words, setWords] = useState([]);
    const [distractors, setDistractors] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [status, setStatus] = useState('loading'); // loading | answering | answered | done | error
    const [sessionId, setSessionId] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [answerResult, setAnswerResult] = useState(null);
    const [slotAssist, setSlotAssist] = useState(() => localStorage.getItem('eng_dictation_slots') !== '0');
    const [fbOpen, setFbOpen] = useState(false);
    const [fbType, setFbType] = useState('other'); // 反馈类型（wrong_def/wrong_phonetic/wrong_audio/other）
    const [fbContent, setFbContent] = useState('');
    const [fbSubmitting, setFbSubmitting] = useState(false);
    const [fbMsg, setFbMsg] = useState(null); // { ok, text } 反馈提交结果提示
    const [timer, setTimer] = useState(0);
    const [assistMode, setAssistMode] = useState(false); // 首次答错后的辅助重答
    const retriedRef = useRef(new Set()); // 已给过重答机会的单词
    const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 }); // 本次会话对错统计
    const [report, setReport] = useState(null); // end_session 结算报告（含金币）
    const [lastDuration, setLastDuration] = useState(0); // 上一次完成该模块所用秒数
    const [lastStats, setLastStats] = useState({ correct: 0, total: 0 }); // 上一次完成的对错统计
    const [slotFocused, setSlotFocused] = useState(false); // 横杠区焦点（控制自绘光标）
    const [shake, setShake] = useState(false); // 超长输入晃动提示
    const [relearning, setRelearning] = useState(false); // 加强记忆（重学）模式
    const [relearnInfo, setRelearnInfo] = useState({ learnCount: 0 });
    const inputRef = useRef(null);
    const submittingRef = useRef(false);

    const currentWord = words[currentIndex] || null;
    const answered = status === 'answered';

    /* 横杠辅助：单词字符格拆分（字母待填，固定符号直接显示） */
    const slotChars = useMemo(() => {
        if (!currentWord) return [];
        return currentWord.word.split('').map((ch) => ({
            ch,
            type: classifyChar(ch),
            fixed: classifyChar(ch) !== 'letter' && !!DEFAULT_SYMBOL_OPTS[classifyChar(ch)],
        }));
    }, [currentWord]);

    // 待填字母总数
    const lettersTarget = useMemo(
        () => slotChars.filter((s) => !s.fixed && s.type !== 'space').length,
        [slotChars]
    );

    /* 加载 */
    useEffect(() => {
        (async () => {
            try {
                const s = await api.post('/api/start_session.php', { unit_id: unitId, part_id: partId });
                setSessionId(s.data?.data?.session_id ?? null);
                const res = await api.get(`/api/get_questions.php?unit_id=${unitId}&part_id=${partId}&question_type=${module}`);
                if (res.data.success) {
                    const qs = res.data.data.questions || [];
                    setWords(qs);
                    setDistractors(res.data.data.distractors || []);
                    setLastDuration(res.data.data.last_duration || 0);
                    setLastStats({
                        correct: res.data.data.last_correct || 0,
                        total: res.data.data.last_total || 0,
                    });
                    // 已全部学完：进入 done 态（不启动计时），结算卡显示上次用时
                    setStatus(qs.length === 0 ? 'done' : 'answering');
                } else {
                    console.error('[LearnModule] 接口返回失败:', res.data);
                    setStatus('error');
                }
            } catch (e) {
                console.error('[LearnModule] 加载失败:', e);
                setStatus('error');
            }
        })();
    }, [unitId, partId, module]);

    /* 计时器 */
    useEffect(() => {
        if (status !== 'answering') return;
        const t = setInterval(() => setTimer((v) => v + 1), 1000);
        return () => clearInterval(t);
    }, [status]);

    /* 发音 */
    function speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
    }
    const audioRef = useRef(null);
    function playWordAudio(w) {
        if (!w) return;
        // 重播前停止上一个音频，避免重叠
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (w.audio) {
            const a = new Audio(`/assets/audio/${w.audio}`);
            a.addEventListener('error', () => speak(w.word));
            a.addEventListener('ended', () => { audioRef.current = null; });
            a.play().catch(() => speak(w.word));
            audioRef.current = a;
        } else speak(w.word);
    }

    /* 听音模块自动播放（切题时） */
    const prevIdxRef = useRef(-1);
    useEffect(() => {
        if (!meta.audio || !currentWord || prevIdxRef.current === currentIndex) return;
        prevIdxRef.current = currentIndex;
        playWordAudio(currentWord);
    }, [currentIndex, meta, currentWord]);

    /* 输入题聚焦 */
    useEffect(() => {
        if (meta.input === 'text' && status === 'answering') inputRef.current?.focus();
    }, [currentIndex, status, meta, slotAssist]);

    function sound(name) {
        new Audio(`/sound/${name}`).play().catch(() => {});
    }
    function typeSound() {
        new Audio('/sound/typing.mp3').play().catch(() => {});
    }
    function delSound() {
        new Audio('/sound/del.mp3').play().catch(() => {});
    }

    /* 横杠模式：只接收字母，追加到字母流末尾 */
    function appendLetter(letter) {
        if (userAnswer.length >= lettersTarget) {
            delSound();
            setShake(true);
            setTimeout(() => setShake(false), 400);
            return;
        }
        setUserAnswer(userAnswer + letter.toLowerCase());
        typeSound();
    }

    function backspaceLetter() {
        if (userAnswer.length === 0) return;
        setUserAnswer(userAnswer.slice(0, -1));
        delSound();
    }

    /* 横杠模式受控输入（移动端软键盘路径）：与 appendLetter 同规则——全角转半角、小写、仅保留字母、不超过待填数 */
    function handleSlotInputChange(e) {
        const next = normalizeInput(e.target.value)
            .toLowerCase()
            .replace(/[^a-z]/g, '')
            .slice(0, lettersTarget);
        if (next.length > userAnswer.length) typeSound();
        else if (next.length < userAnswer.length) delSound();
        setUserAnswer(next);
    }

    /* 横杠模式：字母流 + 固定符号重建完整答案 */
    function rebuildAnswer() {
        let li = 0;
        let out = '';
        for (const s of slotChars) {
            if (s.type === 'letter' && !s.fixed) {
                out += userAnswer[li] ?? '?';
                li++;
            } else {
                out += s.ch;
            }
        }
        return out;
    }

    function canSubmitNow() {
        if (meta.input === 'choice') return !!selectedOption;
        if (slotAssist) return userAnswer.length >= lettersTarget;
        return !!normalizeInput(userAnswer).trim();
    }

    /* 横杠模式键盘处理：字母拼入、退格删除、回车流转（答题中=提交，已答=下一题） */
    function handleSlotKey(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (status === 'answering') {
                if (canSubmitNow()) submit();
            } else if (status === 'answered') {
                next();
            }
            return;
        }
        if (status !== 'answering') return;
        if (e.key === 'Backspace') {
            e.preventDefault();
            backspaceLetter();
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            e.preventDefault();
            appendLetter(e.key);
        }
    }

    function toggleSlotAssist() {
        setSlotAssist((v) => {
            localStorage.setItem('eng_dictation_slots', v ? '0' : '1');
            return !v;
        });
        setUserAnswer('');
    }

    /* 横杠渲染：字母待填格，固定符号直接显示，空格 gap；光标只画在下一个待填格 */
    function renderSlots() {
        let letterIdx = -1;
        return slotChars.map((s, i) => {
            if (s.type === 'space') {
                return <span key={i} className="inline-block w-4" />;
            }
            if (s.fixed) {
                return (
                    <span key={i} className="relative inline-flex items-center justify-center w-7 h-9 mx-px text-xl font-semibold text-[var(--color-warning)]">
                        {s.ch}
                    </span>
                );
            }
            letterIdx++;
            const typedChar = userAnswer[letterIdx] ?? '';
            const isCaret = status === 'answering' && slotFocused && letterIdx === userAnswer.length && letterIdx < lettersTarget;
            return (
                <span
                    key={i}
                    className={`relative inline-flex items-center justify-center w-7 h-9 mx-px border-b-2 text-xl font-semibold transition-colors ${
                        status === 'answered'
                            ? (answerResult === 'correct'
                                ? 'border-[var(--color-success)] text-[var(--color-success)]'
                                : 'border-[var(--color-error)] text-[var(--color-error)]')
                            : (isCaret ? 'border-[var(--color-primary)]' : 'border-[var(--color-text-muted)] text-[var(--color-text)]')
                    }`}
                >
                    {typedChar}
                    {isCaret && (
                        <span className="caret-blink absolute bottom-1 left-1/2 -translate-x-1/2 w-[2px] h-5 bg-[var(--color-primary)]" />
                    )}
                </span>
            );
        });
    }

    /* 提交 */
    async function submit() {
        if (!currentWord || answered || submittingRef.current) return;
        submittingRef.current = true;

        let isCorrect = false;
        if (meta.input === 'text') {
            isCorrect = slotAssist
                ? rebuildAnswer().toLowerCase() === currentWord.word.toLowerCase()
                : normalizeInput(userAnswer).trim().toLowerCase() === currentWord.word.toLowerCase();
        } else {
            isCorrect = selectedOption === (meta.choiceOf === 'word' ? currentWord.word : defTextOf(currentWord));
        }

        /* 首次答错：记录错误（进错词本）后，带辅助重新作答一次 */
        if (!isCorrect && !assistMode && !retriedRef.current.has(currentWord.id)) {
            retriedRef.current.add(currentWord.id);
            try {
                await api.post('/api/submit_answer.php', {
                    session_id: sessionId,
                    word_id: currentWord.id,
                    is_correct: 0,
                    question_type: module,
                });
            } catch (e) { console.error('[LearnModule] 答案提交异常:', e); }
            setSessionStats((s) => ({ ...s, wrong: s.wrong + 1 }));
            sound('false.mp3');
            setAssistMode(true);
            setSelectedOption(null);
            setUserAnswer('');
            if (meta.audio) {
                setTimeout(() => playWordAudio(currentWord), 600);
            }
            submittingRef.current = false;
            return;
        }

        setAssistMode(false);
        try {
            const r = await api.post('/api/submit_answer.php', {
                session_id: sessionId,
                word_id: currentWord.id,
                is_correct: isCorrect ? 1 : 0,
                question_type: module,
            });
            if (!r.data?.success) console.error('[LearnModule] 答案记录失败:', r.data);
        } catch (e) { console.error('[LearnModule] 答案提交异常:', e); }

        setSessionStats((s) => (isCorrect ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 }));
        setAnswerResult(isCorrect ? 'correct' : 'wrong');
        sound(isCorrect ? 'true.mp3' : 'false.mp3');
        setStatus('answered');
        submittingRef.current = false;
    }

    /* 重新学习：清除该部分该模块的作答记录并重新加载（旧版加强记忆） */
    async function handleRelearn() {
        setStatus('loading');
        setCurrentIndex(0);
        setSelectedOption(null);
        setUserAnswer('');
        setAnswerResult(null);
        setAssistMode(false);
        setSessionStats({ correct: 0, wrong: 0 });
        setReport(null);
        setTimer(0);
        retriedRef.current = new Set();
        prevIdxRef.current = -1;
        try {
            const r = await api.post('/api/reset_progress.php', { part_id: partId, question_type: module });
            if (r.data?.success) {
                setRelearning(true);
                setRelearnInfo({ learnCount: r.data.data?.learn_count || 0 });
            }
        } catch (e) { console.error('[LearnModule] 重置进度失败:', e); }
        try {
            const s = await api.post('/api/start_session.php', { unit_id: unitId, part_id: partId });
            setSessionId(s.data?.data?.session_id ?? null);
            const res = await api.get(`/api/get_questions.php?unit_id=${unitId}&part_id=${partId}&question_type=${module}`);
            if (res.data.success) {
                setWords(res.data.data.questions || []);
                setDistractors(res.data.data.distractors || []);
                setStatus('answering');
            } else {
                console.error('[LearnModule] 重学加载失败:', res.data);
                setStatus('error');
            }
        } catch (e) {
            console.error('[LearnModule] 重学加载异常:', e);
            setStatus('error');
        }
    }

    /* 结束会话（服务端结算学习金币并关闭会话）；finish=true 时播放结算音效 */
    async function endSession(finish = true) {
        if (!sessionId) return;
        if (finish) sound('part_over.mp3');
        try {
            const r = await api.post(`/api/end_session.php?session_id=${sessionId}&question_type=${module}`);
            if (r.data?.success) {
                setReport(r.data.data);
            }
        } catch (e) { console.error('[LearnModule] 结束会话异常:', e); }
    }

    function exitModule() {
        if (!report) endSession(false);
        navigate('/english');
    }

    /* 提交反馈：type 使用弹窗中选择的 fbType；成功/失败均在弹窗内给出可见提示 */
    async function submitFeedback() {
        if (fbSubmitting || !currentWord) return;
        setFbSubmitting(true);
        setFbMsg(null);
        try {
            const r = await api.post('/api/feedback.php', {
                word_id: currentWord.id,
                type: fbType,
                content: fbContent,
            });
            if (r.data?.success) {
                setFbMsg({ ok: true, text: '反馈已提交，感谢！' });
                setFbContent('');
            } else {
                console.error('[LearnModule] 反馈提交失败:', r.data);
                setFbMsg({ ok: false, text: r.data?.message || '提交失败，请稍后重试' });
            }
        } catch (e) {
            console.error('[LearnModule] 反馈提交异常:', e);
            setFbMsg({ ok: false, text: e.response?.data?.message || '提交失败，请稍后重试' });
        } finally {
            setFbSubmitting(false);
        }
    }

    function next() {
        setSelectedOption(null);
        setUserAnswer('');
        setAnswerResult(null);
        setAssistMode(false);
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        if (nextIndex >= words.length) {
            setStatus('done'); // 停止计时，进入结算
            endSession(true);
        } else {
            setStatus('answering');
        }
    }

    /* 干扰项（useMemo 缓存避免每次渲染重排） */
    const options = useMemo(() => {
        if (meta.input !== 'choice' || !currentWord) return [];
        const correctText = meta.choiceOf === 'word' ? currentWord.word : defTextOf(currentWord);
        if (!correctText) return [];
        const toText = (w) => (meta.choiceOf === 'word' ? w.word : defTextOf(w));
        const localTexts = [...new Set(
            words
                .filter((w) => w.id !== currentWord.id)
                .map(toText)
                .filter((t) => t && t !== correctText)
        )].sort(() => Math.random() - 0.5);
        const opts = [{ text: correctText, correct: true }];
        for (const t of localTexts) {
            if (opts.length >= 4) break;
            opts.push({ text: t, correct: false });
        }
        if (opts.length < 4) {
            const extraTexts = [...new Set(
                distractors
                    .filter((w) => w.id !== currentWord.id)
                    .map(toText)
                    .filter((t) => t && t !== correctText && !opts.some((o) => o.text === t))
            )].sort(() => Math.random() - 0.5);
            for (const t of extraTexts) {
                if (opts.length >= 4) break;
                opts.push({ text: t, correct: false });
            }
        }
        return opts.sort(() => Math.random() - 0.5);
    }, [currentIndex, words, distractors, meta]);

    /* 状态分支渲染 */
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
                <div className="text-[var(--color-text-muted)]">加载中...</div>
            </div>
        );
    }
    if (status === 'error') {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 text-center">
                <div className="card p-8">
                    <h2 className="font-semibold mb-4">加载失败</h2>
                    <button onClick={() => navigate('/english')} className="btn btn-primary">返回主页</button>
                </div>
            </div>
        );
    }
    if (!currentWord) {
        // 刚完成本轮 → 用本次实时统计；重进已完成模块 → 用上一次完成的数据
        const justFinished = !!report;
        const doneStats = justFinished ? sessionStats : {
            correct: lastStats.correct,
            wrong: Math.max(0, lastStats.total - lastStats.correct),
        };
        const acc = (doneStats.correct + doneStats.wrong) > 0
            ? Math.round((doneStats.correct / (doneStats.correct + doneStats.wrong)) * 100)
            : 0;
        const shownDuration = justFinished ? timer : lastDuration;
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] pb-20 md:pb-0 px-4">
                <div className="card p-8 text-center w-full max-w-md finish-card">
                    <div className="finish-icon mx-auto mb-6">
                        <Check size={56} strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                        {justFinished ? '本部分完成！' : '您已学完该部分'}
                    </h2>
                    <p className="text-[var(--color-text-muted)] mb-6">{meta.label}</p>

                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="p-4 bg-[var(--color-card-alt)] finish-item" style={{ animationDelay: '0.1s' }}>
                            <div className="text-2xl font-bold text-[var(--color-success)]">{doneStats.correct}</div>
                            <div className="text-xs text-[var(--color-text-muted)] mt-1">答对</div>
                        </div>
                        <div className="p-4 bg-[var(--color-card-alt)] finish-item" style={{ animationDelay: '0.25s' }}>
                            <div className="text-2xl font-bold text-[var(--color-error)]">{doneStats.wrong}</div>
                            <div className="text-xs text-[var(--color-text-muted)] mt-1">答错</div>
                        </div>
                        <div className="p-4 bg-[var(--color-card-alt)] finish-item" style={{ animationDelay: '0.4s' }}>
                            <div className="text-2xl font-bold text-[var(--color-primary)]">{acc}%</div>
                            <div className="text-xs text-[var(--color-text-muted)] mt-1">正确率</div>
                        </div>
                    </div>

                    <div className="text-sm text-[var(--color-text-secondary)] mb-8 finish-item" style={{ animationDelay: '0.55s' }}>
                        {justFinished ? `本次学习 ${words.length} 题 · 用时 ${formatTime(shownDuration)}` : `上一次完成用时 ${formatTime(shownDuration)}`}
                        {report?.earned_coins > 0 && (
                            <span className="ml-2 text-[var(--color-warning)] font-semibold">
                                +{report.earned_coins} 金币
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={exitModule} className="btn btn-primary btn-lg flex-1">返回主页</button>
                        <button onClick={handleRelearn} className="btn btn-lg flex-1">
                            <PenLine size={16} />
                            重新学习
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const defText = currentWord.definitions?.[0]
        ? `${currentWord.definitions[0].pos || ''} ${currentWord.definitions[0].def || ''}`.trim()
        : '';

    return (
        <div className="h-[calc(100vh-3.5rem_-_4rem)] md:h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden max-w-6xl mx-auto w-full px-4 py-4">
            {/* 顶栏 */}
            <div className="card flex items-center justify-between p-3 shrink-0 mb-3">
                <div>
                    <span className="font-semibold text-[var(--color-text)]">{meta.label}</span>
                    {relearning && (
                        <span className="ml-2 text-[10px] text-[var(--color-primary)] bg-[var(--color-primary-light)] border border-[var(--color-primary)] px-1.5 py-0.5 rounded-sm align-middle">
                            加强记忆{relearnInfo.learnCount > 0 ? ` · 第${relearnInfo.learnCount + 1}轮` : ''}
                        </span>
                    )}
                    <span className="ml-3 text-xs text-[var(--color-text-muted)]">{currentIndex + 1} / {words.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[var(--color-text-muted)]" />
                    <span className="text-sm text-[var(--color-text-secondary)] mr-2">{formatTime(timer)}</span>
                    <button onClick={exitModule} className="btn btn-sm"><ArrowLeft size={14} />退出</button>
                </div>
            </div>

            {/* 主体：左统计卡(桌面) + 右题目 */}
            <div className="flex-1 min-h-0 flex gap-4">
                <MemoryChartCard memory={currentWord.memory} word={currentWord.word} />

                {/* 右侧：题干+作答 */}
                <section className={`flex-1 min-w-0 card flex flex-col ${answerResult ? (answerResult === 'correct' ? 'border-2 border-[var(--color-success)]' : 'border-2 border-[var(--color-error)]') : ''}`}>
                    {/* 题干 */}
                    <div className="relative text-center pt-6 pb-4 shrink-0">
                        <button onClick={() => { setFbMsg(null); setFbOpen(true); }} className="absolute top-2 right-2 btn btn-sm !px-1.5" title="反馈此错误">
                            <Flag size={13} className="text-[var(--color-warning)]" />
                        </button>

                        {currentWord.is_review && (
                            <span className="inline-block px-2 py-0.5 mb-2 text-xs rounded-sm border border-[var(--color-warning)] text-[var(--color-warning)]">
                                待复习 · 记忆率过低
                            </span>
                        )}

                        {meta.showWord ? (
                            <>
                                <h2 className="text-3xl font-bold text-[var(--color-text)] mb-1">{currentWord.word}</h2>
                                {currentWord.phonetic && (
                                    <p className="text-sm text-[var(--color-text-muted)] mt-1">{currentWord.phonetic}</p>
                                )}
                            </>
                        ) : meta.showDef && defText ? (
                            <p className="text-xl font-semibold text-[var(--color-text)] px-6">{defText}</p>
                        ) : meta.audio ? (
                            <button
                                onClick={() => playWordAudio(currentWord)}
                                className="mx-auto flex items-center justify-center p-3 rounded-sm transition-colors hover:bg-[var(--color-hover-bg)] active:scale-95"
                                title="点击播放发音"
                            >
                                <Volume2 size={44} className="text-[var(--color-primary)]" />
                            </button>
                        ) : null}
                    </div>

                    {/* 辅助重答横幅 */}
                    {assistMode && (
                        <div className="mx-6 mb-2 p-3 rounded-sm border-2 border-[var(--color-warning)] text-sm shrink-0" style={{ background: 'var(--color-warning-bg)' }}>
                            <span className="text-[var(--color-warning)] font-medium">答错了！请借助提示再作答一次：</span>
                            <span className="text-[var(--color-text)] ml-1">{defText || currentWord.phonetic || currentWord.word}</span>
                        </div>
                    )}

                    {/* 作答区 */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
                        {meta.input === 'choice' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {options.map((opt, i) => {
                                    const isSelected = selectedOption === opt.text;
                                    let cls = 'btn option-btn p-3 text-sm text-left transition-colors border-2 ';
                                    if (answered) {
                                        if (opt.correct) cls += 'answer-correct';
                                        else if (isSelected) cls += 'answer-wrong';
                                        else cls += 'answer-dim';
                                    } else if (isSelected) {
                                        cls += 'option-selected';
                                    }
                                    return (
                                        <button key={i} disabled={answered} onClick={() => setSelectedOption(opt.text)} className={cls}>
                                            <span className="flex items-center justify-between gap-2 w-full">
                                                <span>{opt.text}</span>
                                                {answered && opt.correct && <Check size={14} className="shrink-0" />}
                                                {answered && isSelected && !opt.correct && <X size={14} className="shrink-0" />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : slotAssist ? (
                            /* 虚拟横杠模式（旧版移植）：字母格 + 自绘光标 + 隐藏输入框 */
                            <div className="relative flex flex-col items-center">
                                <div className="flex items-center gap-2 w-full justify-center">
                                    <div
                                        onClick={() => inputRef.current?.focus()}
                                        className={`relative flex flex-wrap items-end justify-center gap-1 min-h-[52px] px-3 py-2 cursor-text flex-1 ${
                                            status === 'answering' ? 'ring-1 ring-[var(--color-divider)]' : ''
                                        } ${shake ? 'shake-x' : ''}`}
                                    >
                                        {renderSlots()}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setUserAnswer(''); delSound(); inputRef.current?.focus(); }}
                                        disabled={answered || !userAnswer}
                                        className="btn btn-sm !px-2 shrink-0 self-center"
                                        title="清除输入"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                                {/* 受控输入框：移动端软键盘经 onChange 写入；桌面单字母/退格由 onKeyDown
                                    preventDefault 拦截后走 appendLetter/backspaceLetter，两条路径不重复输入 */}
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={userAnswer}
                                    onChange={handleSlotInputChange}
                                    onKeyDown={handleSlotKey}
                                    readOnly={answered}
                                    autoComplete="off"
                                    spellCheck={false}
                                    onFocus={() => setSlotFocused(true)}
                                    onBlur={() => setSlotFocused(false)}
                                    className="absolute opacity-0 w-px h-px pointer-events-none"
                                />
                                {status === 'answered' && answerResult === 'wrong' && (
                                    <div className="mt-2 text-sm text-center text-[var(--color-error)]">
                                        正确答案：<strong>{currentWord.word}</strong>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* 普通输入框模式 */
                            <input
                                ref={inputRef}
                                type="text"
                                value={userAnswer}
                                onChange={(e) => { setUserAnswer(e.target.value); typeSound(); }}
                                onKeyDown={(e) => {
                                    if (e.key !== 'Enter') return;
                                    e.preventDefault();
                                    if (answered) { next(); return; }
                                    submit();
                                }}
                                readOnly={answered}
                                autoComplete="off"
                                spellCheck={false}
                                className="w-full text-center text-xl py-4 pr-12 border-2"
                            />
                        )}
                    </div>
                </section>
            </div>

            {/* 操作区 */}
            <div className="flex gap-3 p-4 pt-3 shrink-0 border-t border-[var(--color-divider)]">
                {meta.input === 'text' && (
                    <button
                        onClick={toggleSlotAssist}
                        className="btn !px-3 shrink-0"
                        title={slotAssist ? '横杠辅助：开（点击关闭）' : '横杠辅助：关（点击开启）'}
                    >
                        <Keyboard size={16} className={slotAssist ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} />
                    </button>
                )}
                <button
                    onClick={submit}
                    disabled={
                        answered ||
                        (meta.input === 'choice' && !selectedOption) ||
                        (meta.input === 'text' && (slotAssist ? userAnswer.length < lettersTarget : !normalizeInput(userAnswer).trim()))
                    }
                    className="flex-1 btn btn-primary"
                >
                    <PenLine size={16} />
                    提交答案
                </button>
                <button
                    onClick={() => {
                        next();
                    }}
                    disabled={!answered}
                    className="flex-1 btn"
                >
                    {currentIndex < words.length - 1 ? '下一题' : '完成'}
                </button>
            </div>

            {/* 反馈弹窗 */}
            {fbOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setFbOpen(false)}>
                    <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                        <h3>反馈</h3>
                        {/* 反馈类型单选 */}
                        <div className="my-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                            {[
                                ['wrong_def', '释义错误'],
                                ['wrong_phonetic', '音标错误'],
                                ['wrong_audio', '发音错误'],
                                ['other', '其他'],
                            ].map(([k, label]) => (
                                <label key={k} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                                    <input
                                        type="radio"
                                        name="fb-type"
                                        checked={fbType === k}
                                        onChange={() => setFbType(k)}
                                        className="accent-[var(--color-primary)]"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <textarea rows={3} value={fbContent} onChange={(e) => setFbContent(e.target.value)}
                            placeholder="请描述问题..." className="w-full my-3" />
                        {fbMsg && (
                            <div className={`mb-3 p-2 text-sm border-l-4 ${
                                fbMsg.ok
                                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]'
                                    : 'bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error)]'
                            }`}>{fbMsg.text}</div>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setFbOpen(false)} className="btn btn-sm">取消</button>
                            <button onClick={submitFeedback} disabled={fbSubmitting} className="btn btn-sm btn-primary">
                                {fbSubmitting ? '提交中...' : '提交'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatTime(s) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}
