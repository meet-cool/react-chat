import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@eng/utils/api';
import { Brain, Trash2, RefreshCw, GraduationCap } from 'lucide-react';

const MODULE_LABELS = {
    listen_word: '听词选词',
    listen_meaning: '听词选意',
    word_select: '看词选意',
    meaning_select: '看意选词',
    dictation: '听写单词',
    write: '默写单词',
    test: '综合测试',
};

export default function WrongWords() {
    const [wrongWords, setWrongWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [textbooks, setTextbooks] = useState([]);
    const [textbookId, setTextbookId] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/api/get_textbooks.php')
            .then((res) => {
                const list = res.data.success ? res.data.data || [] : [];
                setTextbooks(list);
                // 课本为空也退出 loading，渲染空态
                if (list.length === 0) setLoading(false);
            })
            .catch((error) => {
                console.error('加载课本列表失败:', error);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!textbooks.length || textbookId === '') return;
        loadWrongWords();
    }, [textbookId]);

    // 首次加载后默认选中第一本课本
    useEffect(() => {
        if (textbooks.length > 0 && textbookId === '') {
            setTextbookId(String(textbooks[0].id));
        }
    }, [textbooks]);

    const loadWrongWords = async () => {
        setLoading(true);
        try {
            const qs = textbookId ? `?textbook_id=${textbookId}` : '';
            const response = await api.get(`/api/wrong_words.php${qs}`);
            if (response.data.success) {
                setWrongWords(response.data.data);
            }
        } catch (error) {
            console.error('加载错词本失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await api.delete(`/api/wrong_words.php?id=${id}`);
            if (response.data.success) {
                setWrongWords((prev) => prev.filter((w) => w.id !== id));
            }
        } catch (error) {
            console.error('删除失败:', error);
        }
    };

    // 按模块分组
    const groups = useMemo(() => {
        const map = {};
        for (const w of wrongWords) {
            const key = w.question_type || 'other';
            (map[key] = map[key] || []).push(w);
        }
        return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
    }, [wrongWords]);

    const dueCount = wrongWords.filter((w) => w.needs_review).length;

    // H-1: 复习本模块 → 错词考试复习页（携带 review=1 + type 查询参数）
    const startReview = (moduleKey) => {
        navigate(`/english/wrong-words-exam?review=1&type=${encodeURIComponent(moduleKey)}`, {
            state: {
                reviewModule: moduleKey,
                reviewTextbookId: textbookId,
            },
        });
    };

    // H-2: 补 /english 前缀，避免跳出模块 404
    const startExamReview = (moduleKey) => {
        navigate(`/english/wrong-words-exam?type=${encodeURIComponent(moduleKey)}`);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-20 md:pb-8">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Brain size={24} />
                    错词本
                </h1>
                <div className="flex gap-2">
                    <select value={textbookId} onChange={(e) => setTextbookId(e.target.value)} className="!py-1.5 text-sm">
                        {textbooks.map((tb) => (
                            <option key={tb.id} value={tb.id}>{tb.textbook_name}</option>
                        ))}
                    </select>
                    <button onClick={loadWrongWords} className="btn btn-sm">
                        <RefreshCw size={14} />
                        刷新
                    </button>
                </div>
            </div>

            {/* 统计条 */}
            <div className="card p-3 mb-5 flex items-center gap-6 text-sm">
                <span className="text-[var(--color-text-secondary)]">
                    错词总数 <strong className="text-[var(--color-text)]">{wrongWords.length}</strong>
                </span>
                <span className="text-[var(--color-text-secondary)]">
                    待复习 <strong className="text-[var(--color-error)]">{dueCount}</strong>
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">保持度低于 70% 建议尽快复习</span>
            </div>

            {loading ? (
                <div className="text-center py-16 text-[var(--color-text-muted)]">加载中...</div>
            ) : groups.length === 0 ? (
                <div className="card p-12 text-center text-[var(--color-text-muted)]">
                    当前课本没有错词，继续保持！
                </div>
            ) : (
                <div className="space-y-6">
                    {groups.map(([type, words]) => (
                        <div key={type} className="card p-4">
                            {/* 分组头 */}
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--color-divider)]">
                                <div className="flex items-center gap-2">
                                    <GraduationCap size={16} className="text-[var(--color-primary)]" />
                                    <span className="font-medium text-[var(--color-text)]">
                                        {MODULE_LABELS[type] || type}
                                    </span>
                                    <span className="text-xs text-[var(--color-text-muted)]">{words.length} 词</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => startExamReview(type)} className="btn btn-sm">
                                        考试复习
                                    </button>
                                    <button onClick={() => startReview(type)} className="btn btn-sm btn-primary">
                                        复习本模块
                                    </button>
                                </div>
                            </div>

                            {/* 错词行 */}
                            <div className="space-y-2.5">
                                {words.map((w) => (
                                    <div key={w.id} className="flex items-center gap-3 p-2 bg-[var(--color-card-alt)]">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <span className="font-semibold text-[var(--color-text)]">{w.word}</span>
                                                {w.phonetic && (
                                                    <span className="text-xs text-[var(--color-text-muted)]">{w.phonetic}</span>
                                                )}
                                                <span className="text-xs text-[var(--color-error)]">错 {w.wrong_count} 次</span>
                                                {w.needs_review && (
                                                    <span className="text-[10px] text-[var(--color-error)] border border-[var(--color-error)] px-1 rounded-sm">
                                                        待复习
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                                                {w.definition}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <div className={`text-lg font-bold ${
                                                w.retention < 40 ? 'text-[var(--color-error)]' : w.retention < 70 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'
                                            }`}>
                                                {w.retention}%
                                            </div>
                                            <div className="text-[10px] text-[var(--color-text-muted)]">保持度</div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(w.id)}
                                            className="btn btn-sm btn-error !px-2 shrink-0"
                                            title="删除"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
