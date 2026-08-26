// Anki 风格遗忘曲线迷你图（30 天窗口）
// k 由错误次数决定（错得越多衰减越快），与后端保持度估算公式一致
export default function MemoryCurve({ daysElapsed, retention, wrongCount = 1 }) {
    const W = 64;
    const H = 26;
    const k = 0.25 + 0.15 * Math.max(0, (wrongCount || 1) - 1);

    const yAt = (d) => H - 2 - (H - 6) * Math.exp(-k * d);
    const pts = [];
    for (let d = 0; d <= 30; d += 1) {
        pts.push(`${((d / 30) * (W - 4) + 2).toFixed(1)},${yAt(d).toFixed(1)}`);
    }
    const markD = Math.min(Math.max(daysElapsed ?? 0, 0), 30);
    const markerX = (markD / 30) * (W - 4) + 2;
    const markerY = yAt(markD);
    const color =
        retention < 40 ? 'var(--color-error)' : retention < 70 ? 'var(--color-warning)' : 'var(--color-success)';

    return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
            {/* 70% 及格线 */}
            <line
                x1="2" x2={W - 2} y1={yAt(Math.log(0.7) / -k)} y2={yAt(Math.log(0.7) / -k)}
                stroke="var(--color-divider)" strokeWidth="1" strokeDasharray="3 2"
            />
            <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" />
            <circle cx={markerX} cy={markerY.toFixed(1)} r="2.5" fill={color} />
            <text x={W - 2} y={H - 1} fontSize="7" textAnchor="end" fill="var(--color-text-muted)">
                {(daysElapsed ?? 0) >= 999 ? '-' : `${daysElapsed}天`}
            </text>
        </svg>
    );
}
