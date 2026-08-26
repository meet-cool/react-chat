import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ADMIN_STORAGE_KEY, authApi, getApiBaseUrl, getAdminToken } from '../lib/api';
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

// 管理员 token 独立存储（键名统一定义在 lib/api.ts 的 ADMIN_STORAGE_KEY），与用户 arcle_token 彻底隔离
const STORAGE_KEY = ADMIN_STORAGE_KEY;

function setAdminToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}
function clearAdminToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // 独立校验管理员凭证：带显式 Authorization 的独立请求，不经过全局 request()
    const token = getAdminToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${getApiBaseUrl()}/chat/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        // 仅在凭证确认为无效时清除管理员会话
        clearAdminToken();
        setAdmin(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const u = json?.data as AdminUser | undefined;
      if (!u || !ADMIN_ROLES.includes(u.role)) {
        clearAdminToken();
        setAdmin(null);
      } else {
        setAdmin(u);
      }
    } catch (e) {
      // 网络错误等异常：保留管理员 token（可能是临时故障），仅视为未登录并告警
      console.warn('[AdminContext] 校验管理员凭证失败', e);
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
