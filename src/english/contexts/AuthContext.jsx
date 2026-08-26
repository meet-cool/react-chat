import { createContext, useState, useEffect, useContext } from 'react';
import api, { arcleApi } from '@eng/utils/api';

/**
 * english 模块认证上下文（统一账号体系 / SSO）
 *
 * - 凭证为主站 token（localStorage 'arcle_token'），登录/注册在主站完成；
 * - checkAuth 校验主站会话，并合并 english 模块的扩展资料
 *   （eng_role 等，来自 /english/api/profile.php）供面板/管理页做角色判断；
 * - 模块内不再提供 login/register（与主站重复）。
 */
export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('arcle_token');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            // 1) 主站会话校验
            const response = await arcleApi.get('/chat/profile');
            if (response.data.code !== 200) {
                localStorage.removeItem('arcle_token');
                localStorage.removeItem('eng_user');
                setUser(null);
                return;
            }
            let u = response.data.data;
            // 2) 合并 english 扩展角色（eng_role）
            try {
                const p = await api.get('/api/profile.php');
                if (p.data?.success) {
                    u = { ...u, eng_role: p.data.data.eng_role || '' };
                }
            } catch {
                // english 资料失败不影响主会话
            }
            localStorage.setItem('eng_user', JSON.stringify(u));
            setUser(u);
        } catch (error) {
            // 仅确认的 401（凭证失效）才清除本地凭证；
            // 网络错误/超时/5xx 等保留凭证，避免临时故障被误判为登出（arcleApi 无响应拦截器，error 为原始 axios error）
            if (error?.response?.status === 401) {
                localStorage.removeItem('arcle_token');
                localStorage.removeItem('eng_user');
            } else {
                console.warn('[AuthContext] 会话校验失败（非401），保留本地凭证:', error?.message || error);
            }
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        // 统一账号：登出即清除主站凭证（主站与英语模块同时退出）
        localStorage.removeItem('arcle_token');
        localStorage.removeItem('eng_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
