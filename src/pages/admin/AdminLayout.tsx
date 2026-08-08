import { useMemo, useState } from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  MessageCircle,
} from 'lucide-react';
import { useAdminAuth } from '../../lib/AdminContext';
import { Avatar } from '../../components/Avatar';

const menuItems = [
  { k: 'dashboard', label: '仪表盘', path: '/admin/dashboard', icon: LayoutDashboard },
  { k: 'users', label: '用户管理', path: '/admin/users', icon: Users },
  { k: 'rooms', label: '房间管理', path: '/admin/rooms', icon: MessageSquare },
  { k: 'messages', label: '消息审查', path: '/admin/messages', icon: MessageCircle },
];

export function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const activeKey = useMemo(() => {
    const p = location.pathname;
    return menuItems.find((m) => p.startsWith(m.path))?.k ?? 'dashboard';
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: 'var(--color-bg-page)' }}
    >
      {/* 顶部（移动端） */}
      <header
        className="md:hidden flex items-center justify-between px-4 py-2 border-b"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--color-divider)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center gap-2">
          <button className="btn btn-sm p-2" onClick={() => setOpen(true)}>
            <Menu size={16} />
          </button>
          <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
          <span
            className="font-bold text-sm"
            style={{ color: 'var(--color-text)' }}
          >
            ARCLE Admin
          </span>
        </div>
        {admin && (
          <div className="flex items-center gap-2">
            <Avatar
              username={admin.username}
              avatar={admin.avatar}
              size={26}
              online
            />
          </div>
        )}
      </header>

      {/* 左侧导航 */}
      <>
        {open && (
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          className={`${
            open ? 'translate-x-0 z-50' : '-translate-x-full z-40'
          } md:translate-x-0 md:static md:z-auto fixed inset-y-0 left-0 top-0 md:top-0 w-60 flex-shrink-0 transition-transform duration-200 border-r flex flex-col`}
          style={{
            borderColor: 'var(--color-divider)',
            background: 'var(--color-card)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--color-divider)' }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
              <span
                className="font-bold text-sm"
                style={{ color: 'var(--color-text)' }}
              >
                ARCLE Admin
              </span>
            </div>
            <button
              className="md:hidden p-1"
              onClick={() => setOpen(false)}
              style={{ color: 'var(--color-text-light)' }}
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-1">
            {menuItems.map((m) => {
              const Icon = m.icon;
              const isActive = activeKey === m.k;
              return (
                <NavLink
                  key={m.k}
                  to={m.path}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => ''}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                    style={
                      isActive
                        ? {
                            background: 'var(--color-primary-light)',
                            color: 'var(--color-primary)',
                            border: '1px solid var(--color-primary)',
                          }
                        : {
                            color: 'var(--color-text-secondary)',
                            border: '1px solid transparent',
                          }
                    }
                  >
                    <Icon size={16} />
                    <span>{m.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {admin && (
            <div
              className="px-3 py-3 border-t"
              style={{ borderColor: 'var(--color-divider)' }}
            >
              <div className="flex items-center gap-2 mb-2 px-1">
                <Avatar
                  username={admin.username}
                  avatar={admin.avatar}
                  size={30}
                  online
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {admin.username}
                  </div>
                  <div
                    className="text-[11px] truncate"
                    style={{ color: 'var(--color-text-light)' }}
                  >
                    {admin.role === 'super_admin' ? '超级管理员' : '管理员'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-sm flex-1"
                  onClick={() => navigate('/chat')}
                  title="进入聊天"
                >
                  <MessageSquare size={13} />
                  <span>聊天</span>
                </button>
                <button
                  className="btn btn-sm flex-1"
                  onClick={() => {
                    logout();
                    navigate('/admin/login', { replace: true });
                  }}
                >
                  <LogOut size={13} />
                  <span>退出</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      </>

      {/* 主内容 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
