import MemoryChart from '@eng/components/MemoryChart';

/**
 * 桌面端左侧统计卡：记忆曲线（横轴=学习次数，最右=当前）
 * 未背过的单词（学习次数为 0）不显示记忆曲线
 */
export default function MemoryChartCard({ memory, word }) {
    const times = (memory?.correct_count ?? 0) + (memory?.wrong_answers ?? 0);
    const retention = memory?.retention ?? 100;
    const wrongCount = memory?.wrong_count ?? 0;

    if (times === 0) {
        return (
            <aside className="card p-4 w-60 shrink-0 hidden md:flex md:flex-col">
                <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-3">
                    记忆曲线 · {word}
                </div>
                <svg width="100%" height="110" viewBox="0 0 200 110" className="opacity-60">
                    <line x1="18" y1="95" x2="190" y2="95" stroke="var(--color-border)" strokeWidth="1" />
                    <line x1="18" y1="95" x2="18" y2="8" stroke="var(--color-border)" strokeWidth="1" />
                    <text x="104" y="106" textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">学习次数</text>
                    <text x="8" y="55" textAnchor="middle" fontSize="9" fill="var(--color-text-muted)" transform="rotate(-90 8 55)">记忆率</text>
                    <path
                        d="M 18 20 Q 60 90 100 88 T 185 92"
                        fill="none"
                        stroke="var(--color-text-muted)"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                    />
                    <text x="104" y="45" textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">首次学习后生成</text>
                </svg>
                <div className="mt-auto pt-3 text-xs text-[var(--color-text-muted)] leading-relaxed">
                    该单词尚未学习，完成一次作答后这里会生成记忆曲线。
                </div>
            </aside>
        );
    }

    return (
        <aside className="card p-4 w-60 shrink-0 hidden md:flex md:flex-col overflow-y-auto">
            <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                记忆曲线 · {word}
                <span className="ml-1 text-[var(--color-text-muted)]">S={memory?.stability ?? 1}天</span>
            </div>
            <MemoryChart
                timeline={memory?.timeline}
                retention={retention}
                daysElapsed={memory?.days_elapsed ?? 0}
            />
            <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--color-text-muted)] flex-wrap">
                <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#0077CC]" />当前记忆率
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rotate-45 bg-[#D97706]" />学习时记忆率
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 bg-[var(--color-success-bg)] rounded-sm">
                    <div className="text-lg font-bold text-[var(--color-success)]">{memory?.correct_count ?? 0}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">答对</div>
                </div>
                <div className="p-2 bg-[var(--color-error-bg)] rounded-sm">
                    <div className="text-lg font-bold text-[var(--color-error)]">{memory?.wrong_answers ?? 0}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">答错</div>
                </div>
                <div className="p-2 bg-[var(--color-card-alt)] rounded-sm">
                    <div className="text-lg font-bold text-[var(--color-primary)]">{times}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">学习次数</div>
                </div>
            </div>
            <div className="mt-auto pt-4 text-xs text-[var(--color-text-muted)] leading-relaxed">
                横轴为时间，最右【现在】为当前记忆率；每次复习回到 100% 后逐渐下降，复习越多下降越慢。
            </div>
        </aside>
    );
}
