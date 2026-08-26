import { useState, useEffect } from 'react';
import api from '@eng/utils/api';
import { Award, Calendar, TrendingUp, History } from 'lucide-react';

export default function Points() {
    const [pointsData, setPointsData] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [pointsRes, recordsRes] = await Promise.all([
                api.get('/api/points.php'),
                api.get('/api/points_records.php'),
            ]);
            if (pointsRes.data.success) {
                setPointsData(pointsRes.data.data);
            }
            if (recordsRes.data.success) {
                setRecords(recordsRes.data.data);
            }
        } catch (error) {
            console.error('加载积分数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        setSigning(true);
        try {
            const response = await api.post('/api/points.php');
            if (response.data.success) {
                setPointsData(response.data.data.pointsInfo);
                // 签到成功后刷新积分记录列表
                const recordsRes = await api.get('/api/points_records.php');
                if (recordsRes.data.success) {
                    setRecords(recordsRes.data.data);
                }
            }
        } catch (error) {
            console.error('签到失败:', error);
        } finally {
            setSigning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-[var(--color-text-muted)]">加载中...</div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6 flex items-center gap-2">
                <Award size={24} />
                积分中心
            </h1>

            {/* 积分卡片 */}
            <div className="card p-6 mb-6 bg-[var(--color-primary-light)]">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[var(--color-text-muted)] text-sm">当前积分</div>
                        <div className="text-4xl font-bold text-[var(--color-primary)]">
                            {pointsData?.points || 0}
                        </div>
                    </div>
                    <button
                        onClick={handleSign}
                        disabled={signing || pointsData?.has_signed}
                        className={`btn ${pointsData?.has_signed ? 'btn-success' : 'btn-primary'}`}
                    >
                        {pointsData?.has_signed ? (
                            <>
                                <Calendar size={16} />
                                已签到
                            </>
                        ) : (
                            <>
                                <Calendar size={16} />
                                每日签到
                            </>
                        )}
                    </button>
                </div>
                <div className="flex gap-6 mt-6">
                    <div>
                        <div className="text-sm text-[var(--color-text-muted)]">连续签到</div>
                        <div className="text-xl font-semibold text-[var(--color-text)]">
                            {pointsData?.continuous_days || 0} 天
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-[var(--color-text-muted)]">总签到天数</div>
                        <div className="text-xl font-semibold text-[var(--color-text)]">
                            {pointsData?.total_sign_days || 0} 天
                        </div>
                    </div>
                </div>
            </div>

            {/* 积分记录 */}
            <div className="card">
                <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
                    <History size={20} />
                    积分记录
                </h2>
                {records.length === 0 ? (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                        暂无积分记录
                    </div>
                ) : (
                    <div className="space-y-2">
                        {records.map((record) => (
                            <div key={record.id} className="flex items-center justify-between py-3 border-b border-[var(--color-divider)] last:border-0">
                                <div>
                                    <div className="text-[var(--color-text)]">{record.description}</div>
                                    <div className="text-sm text-[var(--color-text-muted)]">
                                        {new Date(record.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className={`font-semibold ${
                                    record.points > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                                }`}>
                                    {record.points > 0 ? '+' : ''}{record.points}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
