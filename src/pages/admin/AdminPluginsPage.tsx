import { useEffect, useState } from 'react';
import { useApp } from '../../lib/AppContext';

interface Plugin {
  id: number;
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  color: string;
  route_path: string;
  status: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export function AdminPluginsPage() {
  const { addToast } = useApp();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlugins();
  }, []);

  async function loadPlugins() {
    try {
      const pluginsRes = await fetch('/chat/plugins', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('arcle_token')}` }
      });
      const data = await pluginsRes.json();
      setPlugins(data.data || []);
    } catch (e) {
      addToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(plugin: Plugin) {
    try {
      const newStatus = plugin.status === 1 ? 0 : 1;
      const res = await fetch(`/chat/admin/plugins/${plugin.slug}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('arcle_token')}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.code === 200) {
        setPlugins(plugins.map((p: Plugin) => p.slug === plugin.slug ? { ...p, status: newStatus } : p));
        addToast(newStatus === 1 ? '已启用' : '已禁用', 'success');
      } else {
        addToast(data?.message || '操作失败', 'error');
        loadPlugins();
      }
    } catch (e) {
      addToast('操作失败', 'error');
      loadPlugins();
    }
  }

  if (loading) {
    return <div className="p-6 text-center" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>插件管理</h2>
      <div className="space-y-2">
        {plugins.map(plugin => (
          <div key={plugin.slug} className="flex items-center gap-4 p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="w-10 h-10 flex items-center justify-center" style={{ background: `${plugin.color}20`, color: plugin.color }}>
              <span className="text-xl">🔌</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>{plugin.name}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>v{plugin.version}</span>
                <span className={`text-xs px-2 py-0.5 ${plugin.status === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {plugin.status === 1 ? '启用' : '禁用'}
                </span>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{plugin.description}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>作者: {plugin.author} | 路径: {plugin.route_path}</p>
            </div>
            <button
              onClick={() => toggleStatus(plugin)}
              className={`btn btn-sm ${plugin.status === 1 ? 'btn-warning' : 'btn-success'}`}
              style={{ minHeight: 36 }}
            >
              {plugin.status === 1 ? '禁用' : '启用'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
