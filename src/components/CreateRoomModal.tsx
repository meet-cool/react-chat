import { useEffect, useState } from 'react';
import { X, Hash, Globe, Lock } from 'lucide-react';
import { roomApi } from '../lib/api';
import type { Room } from '../types';
import { useApp } from '../lib/AppContext';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (room: Room) => void;
}

export function CreateRoomModal({ open, onClose, onCreated }: CreateRoomModalProps) {
  const { addToast } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [saving, setSaving] = useState(false);

  // Escape 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      addToast('聊天室名称长度需为 2-50 个字符', 'warning');
      return;
    }
    setSaving(true);
    try {
      const room = await roomApi.create({
        name: trimmed,
        description: description.trim(),
        type,
      });
      addToast(`聊天室「${room.name}」创建成功`, 'success');
      setName('');
      setDescription('');
      setType('public');
      onCreated(room);
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '创建失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded outline-none transition-colors';
  const inputStyle: React.CSSProperties = { background: 'var(--color-bg-page)', border: '1px solid var(--color-border)', color: 'var(--color-text)' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-md flex flex-col shadow-[var(--shadow-lg)]"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="flex items-center gap-2">
            <Hash size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>新建聊天室</h3>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>名称 <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="2-50 个字符"
              maxLength={50}
              autoFocus
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>简介</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="介绍一下这个聊天室（选填，最多 255 字）"
              maxLength={255}
              rows={3}
              className={inputCls}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>类型</label>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-sm flex-1 justify-center"
                style={type === 'public'
                  ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                  : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                onClick={() => setType('public')}
              >
                <Globe size={14} />公开
              </button>
              <button
                type="button"
                className="btn btn-sm flex-1 justify-center"
                style={type === 'private'
                  ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                  : { background: 'var(--color-hover-bg)', color: 'var(--color-text-muted)' }}
                onClick={() => setType('private')}
              >
                <Lock size={14} />私密
              </button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {type === 'public' ? '所有人可以在列表中看到并加入' : '仅受邀用户可以加入'}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0" style={{ borderColor: 'var(--color-divider)' }}>
          <button onClick={onClose} className="btn btn-sm" style={{ minHeight: 36 }}>取消</button>
          <button onClick={handleCreate} disabled={saving || !name.trim()} className="btn btn-primary btn-sm" style={{ minHeight: 36 }}>
            {saving ? '创建中…' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
