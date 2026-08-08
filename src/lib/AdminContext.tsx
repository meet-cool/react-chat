import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { adminApi, authApi, clearToken, setToken } from '../lib/api';
import type { AdminUserRole, UserInfo } from '../types';

export interface AdminUser extends UserInfo {
  role: AdminUserRole;
}

interface AdminAuthState {
  admin: AdminUser | null;
  loading: boolean;
  login: (account: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

const ADMIN_ROLES: AdminUserRole[] = ['admin', 'super_admin'];

const STORAGE_KEY = 'arcle_admin_token';

function getAdminToken(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}
function setAdminToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
  setToken(token); // 复用通用 token 头（request 读取的是 arcle_token）
}
function clearAdminToken(): void {
  localStorage.removeItem(STORAGE_KEY);
  clearToken();
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // 同时使用 admin 专用 token，确保 request() 取到
    const token = getAdminToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      // 写入到通用 token 存储，确保 request() 读取
      setToken(token);
      const u = (await authApi.profile()) as unknown as AdminUser;
      if (!ADMIN_ROLES.includes(u.role)) {
        clearAdminToken();
        setAdmin(null);
      } else {
        setAdmin(u);
      }
    } catch {
      clearAdminToken();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (account: string, password: string) => {
    // 先使用通用登录
    const res = await authApi.login({ account, password });
    const u = res.userinfo as unknown as AdminUser;
    if (!ADMIN_ROLES.includes(u.role)) {
      clearAdminToken();
      throw new Error('该账号无管理员权限');
    }
    setAdminToken(res.token);
    setAdmin(u);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, loading, login, logout, refresh }),
    [admin, loading, login, logout, refresh],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth 必须在 AdminAuthProvider 中使用');
  return ctx;
}

// 便于在 Admin 专属请求中带上 token（与用户 token 分开）
export function getAdminAuthToken(): string {
  return getAdminToken();
}
