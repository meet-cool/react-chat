import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './lib/AppContext';
import { AdminAuthProvider } from './lib/AdminContext';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminRoomsPage } from './pages/admin/AdminRoomsPage';
import { AdminMessagesPage } from './pages/admin/AdminMessagesPage';
import { AdminGuard } from './components/admin/AdminGuard';
import { PortalPage } from './pages/PortalPage';
import { ConfessionWall } from './pages/ConfessionWall';
import { ConfessionPost } from './pages/ConfessionPost';
import { ConfessionRanking } from './pages/ConfessionRanking';
import { ConfessionBookmarks } from './pages/ConfessionBookmarks';
import { ConfessionDetail } from './pages/ConfessionDetail';
import { BottlePage } from './pages/BottlePage';
import { authApi, getToken } from './lib/api';
import type { UserInfo } from './types';

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checking, setChecking] = useState(true);

  // 启动时检查登录状态
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }
    authApi
      .profile()
      .then((u) => setUser(u))
      .catch(() => {
        // token 无效
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-page)' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-2 animate-spin"
            style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            加载中…
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* 门户首页 - 未登录用户可见 */}
          <Route
            path="/"
            element={user ? <Navigate to="/chat" replace /> : <PortalPage />}
          />

          {/* 登录页 */}
          <Route
            path="/login"
            element={!user ? <LoginPage onLogin={setUser} /> : <Navigate to="/chat" replace />}
          />

          {/* 聊天页 */}
          <Route
            path="/chat"
            element={
              user ? <ChatPage user={user} onLogout={() => setUser(null)} /> : <Navigate to="/" replace />
            }
          />

          {/* 表白墙 - 允许访客浏览 */}
          <Route
            path="/confessions"
            element={<ConfessionWall />}
          />
          <Route
            path="/confessions/new"
            element={user ? <ConfessionPost /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/confessions/ranking"
            element={<ConfessionRanking />}
          />
          <Route
            path="/confessions/bookmarks"
            element={user ? <ConfessionBookmarks /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/confessions/:id"
            element={<ConfessionDetail />}
          />

          {/* 漂流瓶 - 允许访客浏览 */}
          <Route
            path="/bottles"
            element={<BottlePage />}
          />

          {/* 管理后台登录（无需鉴权） */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* 管理后台路由（需要管理员） */}
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="rooms" element={<AdminRoomsPage />} />
            <Route path="messages" element={<AdminMessagesPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
