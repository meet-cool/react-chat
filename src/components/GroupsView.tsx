import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UsersRound, Plus, Search, CheckCheck, Clock, ShieldCheck, X } from 'lucide-react';
import type { GroupInfo } from '../types';
import { groupApi } from '../lib/api';
import { HashAvatar } from './HashAvatar';

interface GroupsViewProps {
  activeGroupId: number | null;
  onSelectGroup: (group: GroupInfo) => void;
  onGroupsChanged: () => void;
  /** 移动端全屏展开时关闭侧边栏 */
  onClose?: () => void;
}

/**
 * 群聊侧栏：我的群聊 / 发现（申请入群）/ 创建群聊
 * 与聊天室不同：群聊默认开启入群审批，列表中展示申请状态。
 */
export function GroupsView({ activeGroupId, onSelectGroup, onGroupsChanged, onClose }: GroupsViewProps) {
  const [tab, setTab] = useState<'my' | 'discover'>('my');
  const [my, setMy] = useState<GroupInfo[]>([]);
  const [discover, setDiscover] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await groupApi.list();
      setMy(res.my || []);
      setDiscover(res.discover || []);
    } catch {
      // 静默：保持旧数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setTip(msg);
    setTimeout(() => setTip(''), 2500);
  };

  const handleCreate = async () => {
    if (newName.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      const res = await groupApi.create({ name: newName.trim(), description: newDesc.trim() });
      setCreateOpen(false);
      setNewName(''); setNewDesc('');
      await load();
      onGroupsChanged();
      const created = await groupApi.detail(res.id);
      onSelectGroup(created);
    } catch (e: any) {
      showToast(e.message || '创建失败');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (g: GroupInfo) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await groupApi.join(g.id);
      showToast(res.pending ? '申请已提交，等待管理员审批' : '已加入群聊');
      if (res.joined) {
        const detail = await groupApi.detail(g.id);
        onSelectGroup(detail);
      }
      await load();
      onGroupsChanged();
    } catch (e: any) {
      showToast(e.message || '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const kw = keyword.trim().toLowerCase();
  const myFiltered = kw ? my.filter((g) => g.name.toLowerCase().includes(kw)) : my;
  const discoverFiltered = kw ? discover.filter((g) => g.name.toLowerCase().includes(kw)) : discover;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-card)' }}>
      {/* 头部 */}
      <div className="flex-shrink-0 p-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <UsersRound size={15} /> 群聊
            <span className="text-[10px] px-1 py-0.5" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              需审批
            </span>
          </h2>
          <div className="flex items-center gap-1">
            {onClose && (
              <button
                onClick={onClose}
                className="btn btn-sm p-1.5"
                style={{ minHeight: 28, minWidth: 28 }}
                aria-label="收起"
              >
                <X size={14} />
              </button>
            )}
            <button className="btn btn-sm p-2" title="创建群聊" onClick={() => setCreateOpen(true)} style={{ minHeight: 30, minWidth: 30 }}>
              <Plus size={15} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'var(--color-card-alt)', border: '1px solid var(--color-border-light)' }}>
          <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索群聊"
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: 'var(--color-text)' }}
          />
        </div>
        <div className="flex gap-1 mt-2">
          {(['my', 'discover'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1.5 text-xs transition-colors"
              style={tab === t
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-card-alt)', color: 'var(--color-text-secondary)' }}
            >
              {t === 'my' ? `我的群聊 ${my.length}` : `发现 ${discover.length}`}
            </button>
          ))}
        </div>
      </div>

      {tip && (
        <div className="px-3 py-1.5 text-xs" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
          {tip}
        </div>
      )}

      {/* 列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-xs" style={{ color: 'var(--color-text-muted)' }}>加载中…</div>
        ) : tab === 'my' ? (
          myFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
              <UsersRound size={28} />
              <p className="text-xs">还没有群聊，点击 + 创建</p>
            </div>
          ) : myFiltered.map((g) => (
            <button
              key={g.id}
              onClick={() => onSelectGroup(g)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={activeGroupId === g.id
                ? { background: 'var(--color-hover-bg)', borderLeft: '3px solid var(--color-primary)' }
                : { borderLeft: '3px solid transparent' }}
              onMouseEnter={(e) => { if (activeGroupId !== g.id) e.currentTarget.style.background = 'var(--color-hover-bg)'; }}
              onMouseLeave={(e) => { if (activeGroupId !== g.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <HashAvatar seed={g.avatar_seed} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>{g.name}</span>
                  {g.is_owner && (
                    <span className="text-[10px] px-1 py-0.5 flex-shrink-0" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>群主</span>
                  )}
                  {!g.is_owner && g.my_role === 'admin' && (
                    <span className="text-[10px] px-1 py-0.5 flex-shrink-0" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>管理</span>
                  )}
                  {g.my_muted && (
                    <span className="text-[10px] px-1 py-0.5 flex-shrink-0" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>禁言</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  <UsersRound size={11} />
                  <span className="text-[11px]">{g.member_count}/{g.max_members} 人</span>
                </div>
              </div>
            </button>
          ))
        ) : discoverFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <Search size={28} />
            <p className="text-xs">没有可发现的群聊</p>
          </div>
        ) : discoverFiltered.map((g) => (
          <div key={g.id} className="w-full flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--color-divider)' }}>
            <HashAvatar seed={g.avatar_seed} size={40} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>{g.name}</div>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-light)' }}>
                {g.description || '暂无简介'}
              </p>
              <div className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <UsersRound size={11} />
                <span className="text-[11px]">{g.member_count}/{g.max_members} 人</span>
                {g.my_request_status === 'pending' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] ml-1" style={{ color: 'var(--color-warning)' }}>
                    <Clock size={10} /> 待审批
                  </span>
                )}
                {g.my_request_status === 'rejected' && (
                  <span className="text-[10px] ml-1" style={{ color: 'var(--color-error)' }}>已被拒绝</span>
                )}
              </div>
            </div>
            <button
              className="btn btn-sm flex-shrink-0"
              disabled={busy || g.my_request_status === 'pending' || g.member_count >= g.max_members}
              onClick={() => handleJoin(g)}
              style={{ minHeight: 32, padding: '4px 10px' }}
              title="入群需管理员审批"
            >
              {g.my_request_status === 'pending'
                ? <><Clock size={12} /> 审批中</>
                : g.member_count >= g.max_members ? '已满' : <><CheckCheck size={12} /> 申请</>}
            </button>
          </div>
        ))}
      </div>

      {/* 创建群聊弹窗（Portal 直挂 body：脱离聊天布局堆叠上下文，z-[100] 在根层生效） */}
      {createOpen && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="w-full max-w-sm p-5"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} /> 创建群聊
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              群聊采用严格管理：新成员加入需管理员审批
            </p>
            <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>群名称（2-30 字）</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={30}
              placeholder="例如：技术交流群"
              className="w-full mb-3"
            />
            <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>群简介（选填）</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="介绍一下这个群"
              className="w-full resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button className="btn btn-sm" onClick={() => setCreateOpen(false)}>取消</button>
              <button className="btn btn-sm btn-primary" disabled={busy || newName.trim().length < 2} onClick={handleCreate}>
                {busy ? '创建中…' : '创建'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
