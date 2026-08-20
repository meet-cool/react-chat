import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './lib/AppContext';
import { AdminAuthProvider } from './lib/AdminContext';
import { ToastContainer } from './components/Toast';
import { PageTransition } from './components/PageTransition';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminRoomsPage } from './pages/admin/AdminRoomsPage';
import { AdminMessagesPage } from './pages/admin/AdminMessagesPage';
import { AdminConfessionsPage } from './pages/admin/AdminConfessionsPage';
import { AdminGuard } from './components/admin/AdminGuard';
import { AdminAiPage } from './pages/admin/AdminAiPage';
import { AdminNoticePage } from './pages/admin/AdminNoticePage';
import { AdminPluginsPage } from './pages/admin/AdminPluginsPage';
import { PortalPage } from './pages/PortalPage';
import { ConfessionWall } from './pages/ConfessionWall';
import { ConfessionPost } from './pages/ConfessionPost';
import { ConfessionRanking } from './pages/ConfessionRanking';
import { ConfessionBookmarks } from './pages/ConfessionBookmarks';
import { ConfessionDetail } from './pages/ConfessionDetail';
import { ConfessionMine } from './pages/ConfessionMine';
import { ConfessionWallBoard } from './pages/ConfessionWallBoard';
import { AiPanelPage } from './pages/AiPanelPage';
import { BottlePage } from './pages/BottlePage';
import { PluginMarketPage } from './pages/PluginMarketPage';
import { SudokuPage } from './pages/games/SudokuPage';
import { MemoryCardsPage } from './pages/games/MemoryCardsPage';
import { NumberGuessPage } from './pages/games/NumberGuessPage';
import MomentsPage from './pages/MomentsPage';
import { PointsPage } from './pages/PointsPage';
import { ProfilePage } from './pages/ProfilePage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { DebugPage } from './pages/DebugPage';
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
      <AppContent user={user} setUser={setUser} />
    </BrowserRouter>
  );
}

function AppContent({ user, setUser }: { user: UserInfo | null; setUser: (u: UserInfo | null) => void }) {
  const navigate = useNavigate();
  return (
    <AdminAuthProvider>
      <PageTransition>
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
            element={<ConfessionPost />}
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
            path="/confessions/mine"
            element={user ? <ConfessionMine /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/confessions/wall"
            element={<ConfessionWallBoard />}
          />
          <Route
            path="/confessions/:slug"
            element={<ConfessionDetail />}
          />

          {/* 漂流瓶 - 允许访客浏览 */}
          <Route
            path="/bottles"
            element={<BottlePage />}
          />

          {/* 积分中心 - 需登录 */}
          <Route
            path="/points"
            element={<PointsPage onUserUpdate={(u) => setUser(u as UserInfo)} />}
          />

          {/* 个人主页 - 需登录 */}
          <Route
            path="/profile/:username"
            element={user ? <ProfilePage user={user} /> : <Navigate to="/login" replace />}
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
            <Route path="confessions" element={<AdminConfessionsPage />} />
            <Route path="ai" element={<AdminAiPage />} />
            <Route path="notice" element={<AdminNoticePage />} />
            <Route path="plugins" element={<AdminPluginsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />

          {/* 服务条款 */}
          <Route path="/terms" element={<TermsPage />} />
          {/* 隐私政策 */}
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* 开发者调试 */}
          <Route path="/debug" element={<DebugPage />} />

          {/* AI 广场 */}
          <Route
            path="/ai"
            element={user ? <AiPanelPage /> : <Navigate to="/" replace />}
          />
          {/* 朋友圈 */}
          <Route
            path="/moments"
            element={user ? <MomentsPage /> : <Navigate to="/" replace />}
          />

          {/* 插件市场 */}
          <Route
            path="/plugins"
            element={user ? <PluginMarketPage onBack={() => navigate('/chat')} /> : <Navigate to="/" replace />}
          />
          <Route path="/plugins/games/sudoku" element={user ? <SudokuPage onBack={() => navigate('/plugins')} /> : <Navigate to="/" replace />} />
          <Route path="/plugins/games/memory-cards" element={user ? <MemoryCardsPage onBack={() => navigate('/plugins')} /> : <Navigate to="/" replace />} />
          <Route path="/plugins/games/number-guess" element={user ? <NumberGuessPage onBack={() => navigate('/plugins')} /> : <Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </PageTransition>
    </AdminAuthProvider>
  );
}
