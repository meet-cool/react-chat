import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Save, RefreshCw } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';
import type { AdminNotice } from '../../types';

export function AdminNoticePage() {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<AdminNotice>({ content: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getNotice();
      setNotice(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.saveNotice(notice.content);
      addToast('公告已保存', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Megaphone size={20} style={{ color: 'var(--color-primary)' }} /> 公告管理
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            设置首页显示的公告内容
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="btn btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
            <Save size={14} /> 保存
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>公告内容</span>
        </div>
        <div className="p-4">
          <textarea
            className="w-full"
            rows={6}
            value={notice.content}
            onChange={(e) => setNotice({ content: e.target.value })}
            placeholder="输入公告内容，支持换行..."
            style={{ borderRadius: '3px' }}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            公告将显示在首页顶部，建议保持简洁明了。
          </p>
        </div>
      </div>
    </div>
  );
}
