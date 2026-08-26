import axios from 'axios';

// ============================================================================
// english 模块 API 适配器（axios 实例）
//
// - 账号体系统一：登录/注册/头像/积分使用主站 arcle 接口（见 arcleApi），
//   本实例仅负责 english 学习业务接口：{API_BASE}/english/api/*.php
// - Token 使用主站凭证：localStorage 'arcle_token'（与主站单点登录）
// ============================================================================

/** 与主站 lib/api.ts 的 getApiBaseUrl() 等价（JS 版） */
export function getApiBaseUrl() {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('arcle_api_base') : null;
    return stored || import.meta.env.VITE_API_BASE_URL || '';
}

/** 主站接口实例（/chat/*，登录注册资料积分） */
export const arcleApi = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
});

/** english 学习业务实例（/english/api/*.php） */
const api = axios.create({
    baseURL: `${getApiBaseUrl()}/english`,
    timeout: 10000,
});

// 统一附加主站 Bearer Token
[api, arcleApi].forEach((instance) => {
    instance.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('arcle_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
});

// 响应拦截：401 时跳转主站登录页（携带回跳地址；不清除主站 token）
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isAuthPage = ['/login', '/register'].includes(window.location.pathname);
            if (!isAuthPage) {
                const back = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/login?redirect=${back}`;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
