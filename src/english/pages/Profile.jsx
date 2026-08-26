import { useState, useEffect } from 'react';
import api from '@eng/utils/api';
import { useAuth } from '@eng/contexts/AuthContext';
import { User, PenTool, Award, Calendar } from 'lucide-react';
import { Avatar } from '../../components/Avatar';

export default function Profile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await api.get('/api/profile.php');
            if (response.data.success) {
                setProfile(response.data.data);
                setFormData(response.data.data);
            }
        } catch (error) {
            console.error('加载资料失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/profile.php', formData);
            if (response.data.success) {
                setProfile(formData);
                setEditing(false);
            }
        } catch (error) {
            console.error('保存失败:', error);
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
                <User size={24} />
                个人资料
            </h1>

            <div className="card p-6">
                {/* 头像（统一账号体系：使用主站头像） */}
                <div className="flex items-center gap-4 mb-6">
                    <Avatar username={profile?.username} avatar={profile?.avatar} size={80} />
                    <div>
                        <h2 className="text-xl font-semibold text-[var(--color-text)]">
                            {profile?.username}
                        </h2>
                        <p className="text-[var(--color-text-muted)]">ID: {profile?.id}</p>
                    </div>
                </div>

                {/* 统计信息 */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-[var(--color-card-alt)]">
                        <Award className="mx-auto text-[var(--color-warning)] mb-2" size={24} />
                        <div className="text-2xl font-bold text-[var(--color-text)]">
                            {profile?.points || 0}
                        </div>
                        <div className="text-sm text-[var(--color-text-muted)]">积分</div>
                    </div>
                    <div className="text-center p-4 bg-[var(--color-card-alt)]">
                        <Calendar className="mx-auto text-[var(--color-success)] mb-2" size={24} />
                        <div className="text-2xl font-bold text-[var(--color-text)]">
                            {profile?.total_sign_days || 0}
                        </div>
                        <div className="text-sm text-[var(--color-text-muted)]">签到天数</div>
                    </div>
                    <div className="text-center p-4 bg-[var(--color-card-alt)]">
                        <PenTool className="mx-auto text-[var(--color-info)] mb-2" size={24} />
                        <div className="text-2xl font-bold text-[var(--color-text)]">
                            {profile?.total_words_learned || 0}
                        </div>
                        <div className="text-sm text-[var(--color-text-muted)]">已学单词</div>
                    </div>
                </div>

                {/* 编辑表单 */}
                {editing ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                                昵称
                            </label>
                            <input
                                type="text"
                                value={formData.nickname || ''}
                                onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                                简介
                            </label>
                            <textarea
                                value={formData.bio || ''}
                                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                className="w-full"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" className="btn btn-primary">保存</button>
                            <button 
                                type="button" 
                                onClick={() => setEditing(false)}
                                className="btn"
                            >
                                取消
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                {profile?.nickname && (
                                    <div className="text-[var(--color-text)]">
                                        昵称: {profile.nickname}
                                    </div>
                                )}
                                {profile?.bio && (
                                    <div className="text-[var(--color-text-muted)] mt-1">
                                        {profile.bio}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => setEditing(true)}
                                className="btn btn-sm"
                            >
                                编辑资料
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
