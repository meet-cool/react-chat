import { useEffect, useRef } from 'react';
import {
    Chart, LineController, LineElement, PointElement, LinearScale,
    CategoryScale, Tooltip, Filler,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

/**
 * 个性化记忆曲线（时间轴）
 * 横轴：距首次学习的天数，最右=【现在】；纵轴：记忆率 0~100
 * 每次复习记忆回到 100%，段内按 R=0.9^(t/S) 衰减（S 随复习逐渐增大 → 波谷越来越浅）
 */
export default function MemoryChart({ timeline, retention = 100, daysElapsed = 0 }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        const T = Array.isArray(timeline) && timeline.length > 0
            ? timeline
            : [{ d: 0, s: 1 }];
        const days = Math.max(0, Number(daysElapsed) || 0);
        const curV = Math.max(3, Math.min(100, Number(retention) || 100));
        const nowD = (T[T.length - 1].d || 0) + days;

        // 重建时间轴曲线：段内密集采样保证圆滑；每次学习画一个点（复习前记忆率）
        const pts = [];
        const SEG = 8;
        for (let k = 0; k < T.length; k++) {
            const start = T[k].d || 0;
            const S = Math.max(0.1, Number(T[k].s) || 1);
            const end = k < T.length - 1 ? (T[k + 1].d || start) : nowD;
            const span = Math.max(0, end - start);
            // 学习点：本次复习时刻的复习前记忆率（首次学习=100%）
            if (k > 0) {
                const pS = Math.max(0.1, Number(T[k - 1].s) || 1);
                const pStart = T[k - 1].d || 0;
                const preR = Math.max(2, Math.round(100 * Math.pow(0.9, (start - pStart) / pS) * 10) / 10);
                pts.push({ t: start, v: preR, reviewNo: k + 1 });
            } else {
                pts.push({ t: start, v: 100, reviewNo: 1 });
            }
            const n = k === T.length - 1 ? Math.max(SEG, 6) : (span > 0 ? SEG : 1);
            for (let i = 1; i <= n; i++) {
                const t = start + span * (i / n);
                pts.push({ t, v: Math.max(2, Math.round(100 * Math.pow(0.9, (t - start) / S) * 10) / 10) });
            }
        }
        // 最右=现在，使用真实记忆率
        if (pts.length > 0) {
            pts[pts.length - 1] = { t: nowD, v: curV };
        }

        const labels = pts.map(() => '');
        const data = pts.map((p) => p.v);
        const reviewData = pts.map((p) => (p.reviewNo ? p.v : null));
        // 少量天数刻度 + 最右【现在】（短跨度显示一位小数，避免整数刻度误导）
        const tickIdx = [0, Math.floor(pts.length * 0.35), Math.floor(pts.length * 0.7)];
        const fmtDay = (t) => (nowD < 7 ? `${(Math.round(t * 10) / 10).toFixed(1)}天` : `${Math.round(t)}天`);
        tickIdx.forEach((i) => {
            if (i >= 0 && i < labels.length) labels[i] = fmtDay(pts[i].t);
        });
        labels[labels.length - 1] = '现在';

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const curData = data.map((_, i) => (i === data.length - 1 ? curV : null));
        const meta = pts; // 供 tooltip 读取

        chartRef.current = new Chart(canvasRef.current, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: '记忆率%',
                        data,
                        fill: false,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                    },
                    {
                        label: '学习点',
                        data: reviewData,
                        pointRadius: 4,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#D97706',
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 1.5,
                        showLine: false,
                    },
                    {
                        label: '现在',
                        data: curData,
                        pointRadius: 6,
                        pointHoverRadius: 7,
                        pointBackgroundColor: '#0077CC',
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 2,
                        showLine: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 4, bottom: 2 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (items) => {
                                const i = items[0]?.dataIndex;
                                const p = meta[i];
                                if (!p) return '';
                                if (i === meta.length - 1) return '现在';
                                return p.reviewNo ? `第${p.reviewNo}次学习` : `距首次 ${Math.round(p.t)} 天`;
                            },
                            label: (ctx) => ` 记忆率 ${ctx.parsed.y}%`,
                        },
                    },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#8AA0B8', maxRotation: 0, autoSkip: false } },
                    // 上方留余量避免 100% 圆点被裁剪；>100 的刻度不显示文字
                    y: {
                        min: 0,
                        max: 110,
                        ticks: {
                            stepSize: 25,
                            font: { size: 9 },
                            color: '#8AA0B8',
                            callback: (value) => (value > 100 ? '' : value),
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                },
            },
        });

        return () => chartRef.current?.destroy();
    }, [timeline, retention, daysElapsed]);

    return <div className="relative h-[130px] md:h-[210px]"><canvas ref={canvasRef} /></div>;
}
