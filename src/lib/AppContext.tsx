import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ThemeName, ToastItem } from '../types';

interface AppContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  toasts: ToastItem[];
  exitingIds: Set<number>;
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: number) => void;
  confirm: (message: string, title?: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

const THEME_KEY = 'arcle_theme';
const TOAST_LIFETIME = 4000; // 显示时长
const TOAST_EXIT_DURATION = 300; // 退出动画时长（与 CSS 一致）

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('light');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // 记录正在退出动画中的 toast id
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());

  // 简单确认弹窗
  const confirmRef = useRef<{
    open: boolean;
    title: string;
    message: string;
    resolve: ((ok: boolean) => void) | null;
  }>({ open: false, title: '确认操作', message: '', resolve: null });

  const [, setTick] = useState(0);

  const confirm = useCallback((message: string, title = '确认操作'): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmRef.current = { open: true, title, message, resolve };
      // 触发重新渲染
      setTick((t) => t + 1);
    });
  }, []);

  const closeConfirm = useCallback((ok: boolean) => {
    const r = confirmRef.current.resolve;
    confirmRef.current = { open: false, title: '', message: '', resolve: null };
    setTick((t) => t + 1);
    r?.(ok);
  }, []);

  // 初始化主题
  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as ThemeName) || 'light';
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  const applyTheme = (t: ThemeName) => {
    if (t === 'light') {
      document.body.className = '';
    } else {
      document.body.className = `theme-${t}`;
    }
  };

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    applyTheme(t);
    localStorage.setItem(THEME_KEY, t);
  };

  // 真正从列表移除
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setExitingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // 触发退出动画，动画结束后再移除
  const removeToast = useCallback((id: number) => {
    setExitingIds((prev) => {
      if (prev.has(id)) return prev; // 已在退出中，避免重复
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => dismissToast(id), TOAST_EXIT_DURATION);
  }, [dismissToast]);

  const addToast = useCallback(
    (message: string, type: ToastItem['type'] = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      // 到期后触发退出动画
      setTimeout(() => removeToast(id), TOAST_LIFETIME);
    },
    [removeToast],
  );

  const { open: confirmOpen, title: confirmTitle, message: confirmMessage } = confirmRef.current;

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        toasts,
        exitingIds,
        addToast,
        removeToast,
        confirm,
      }}
    >
      {children}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => closeConfirm(false)}
        >
          <div
            className="w-full max-w-sm shadow-[var(--shadow-lg)]"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: 'var(--color-divider)' }}
            >
              <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {confirmTitle}
              </h3>
            </div>
            <div
              className="px-4 py-4 text-sm whitespace-pre-wrap break-words"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {confirmMessage}
            </div>
            <div
              className="px-4 py-3 border-t flex items-center justify-end gap-2"
              style={{ borderColor: 'var(--color-divider)' }}
            >
              <button className="btn btn-sm" onClick={() => closeConfirm(false)}>
                取消
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => closeConfirm(true)}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp 必须在 AppProvider 内使用');
  }
  return ctx;
}
