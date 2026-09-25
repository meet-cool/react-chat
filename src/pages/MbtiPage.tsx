import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import { socialApi } from '../lib/api';
import { useApp } from '../lib/AppContext';

const SCALE = [
  { v: 1, label: '非常不同意' },
  { v: 2, label: '比较不同意' },
  { v: 3, label: '一般' },
  { v: 4, label: '比较同意' },
  { v: 5, label: '非常同意' },
];

export function MbtiPage() {
  const { addToast } = useApp();
  const [phase, setPhase] = useState<'loading' | 'test' | 'result'>('loading');
  const [questions, setQuestions] = useState<{ id: number; text: string }[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: string; description: string } | null>(null);

  const loadQuestions = useCallback(() => {
    setPhase('loading');
    socialApi.mbtiQuestions()
      .then((r) => {
        setQuestions(r.questions);
        setPhase('test');
      })
      .catch((e) => {
        addToast(e instanceof Error ? e.message : '加载失败', 'error');
      });
  }, [addToast]);

  // 已有结果直接展示
  useEffect(() => {
    socialApi.mbtiResult()
      .then((r) => {
        if (r.type) {
          setResult({ type: r.type, description: r.description });
          setPhase('result');
        } else {
          loadQuestions();
        }
      })
      .catch(() => loadQuestions());
  }, [loadQuestions]);

  const pick = (qid: number, v: number) => {
    setAnswers((prev) => ({ ...prev, [qid]: v }));
    // 自动跳下一题
    if (current < questions.length - 1) {
      setTimeout(() => setCurrent((c) => Math.min(questions.length - 1, c + 1)), 150);
    }
  };

  const submit = async () => {
    if (Object.keys(answers).length < questions.length) {
      addToast('还有题目未完成', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const r = await socialApi.mbtiSubmit(answers);
      setResult({ type: r.type, description: r.description });
      setPhase('result');
      addToast('测试完成，结果已保存', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : '提交失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setAnswers({});
    setCurrent(0);
    setResult(null);
    loadQuestions();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
      {/* 头部 */}
      <div className="sticky top-0 z-40 border-b px-4 py-3 flex items-center gap-3" style={{ background: 'var(--nav-bg)', borderColor: 'var(--color-divider)', backdropFilter: 'blur(8px)' }}>
        <button onClick={() => { window.history.length > 1 ? window.history.back() : (window.location.href = '/chat'); }} className="btn btn-ghost btn-sm" style={{ minHeight: 36 }}>
          ← 返回
        </button>
        <h1 className="text-lg font-semibold flex-1" style={{ color: 'var(--color-text)' }}>MBTI 人格测试</h1>
        {phase === 'result' && (
          <button onClick={restart} className="btn btn-sm" style={{ minHeight: 36 }}>
            <RefreshCw size={14} /> 重新测试
          </button>
        )}
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {phase === 'loading' && (
          <p className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中…</p>
        )}

        {/* 答题 */}
        {phase === 'test' && questions.length > 0 && (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                <span>第 {current + 1} 题 / 共 {questions.length} 题</span>
                <span>已答 {Object.keys(answers).length}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden" style={{ background: 'var(--color-hover-bg)', borderRadius: 9999 }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%`, background: 'var(--color-primary)', borderRadius: 9999 }}
                />
              </div>
            </div>

            <div className="p-5 mb-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-base leading-7" style={{ color: 'var(--color-text)' }}>
                {questions[current]?.text}
              </p>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {SCALE.map((s) => {
                const qid = questions[current]?.id;
                const active = answers[qid] === s.v;
                return (
                  <button
                    key={s.v}
                    onClick={() => pick(qid, s.v)}
                    className="w-full py-3 text-sm text-left px-4 transition-all"
                    style={active
                      ? { background: 'var(--color-primary-light)', border: '2px solid var(--color-primary)', color: 'var(--color-primary)', fontWeight: 600 }
                      : { background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="btn btn-sm"
                style={{ minHeight: 36, opacity: current === 0 ? 0.4 : 1 }}
              >
                <ChevronLeft size={14} /> 上一题
              </button>
              {current < questions.length - 1 ? (
                <button
                  onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                  className="btn btn-primary btn-sm"
                  style={{ minHeight: 36 }}
                >
                  下一题 <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={submitting || Object.keys(answers).length < questions.length}
                  className="btn btn-primary btn-sm"
                  style={{ minHeight: 36 }}
                >
                  {submitting ? '计算中…' : '提交并查看结果'}
                </button>
              )}
            </div>
          </>
        )}

        {/* 结果 */}
        {phase === 'result' && result && (
          <div className="text-center py-10">
            <div
              className="w-20 h-20 mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'var(--color-primary-light)', borderRadius: 20 }}
            >
              <Sparkles size={36} style={{ color: 'var(--color-primary)' }} />
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>你的 MBTI 人格类型</p>
            <h2 className="text-4xl font-black mb-3 tracking-widest" style={{ color: 'var(--color-primary)' }}>
              {result.type}
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>{result.description}</p>
            <div className="inline-flex items-center gap-2 text-xs px-3 py-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-muted)' }}>
              <Trophy size={13} /> 结果已保存，将展示在你的个人主页
            </div>
            <div className="mt-8">
              <button onClick={restart} className="btn btn-sm" style={{ minHeight: 36 }}>
                <RefreshCw size={14} /> 重新测一次
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
