import { createContext, useState, useEffect, useContext } from 'react';

/**
 * english 模块主题上下文
 *
 * 复用主站全局主题轮子：CSS 变量与 theme-dark / theme-high1 / theme-high2
 * 类名完全一致（同一套样式规范），因此直接读写主站的 localStorage
 * 'arcle_theme' 并切换 body 类名，两个界面主题保持同步。
 */
export const ThemeContext = createContext();

export function useTheme() {
    return useContext(ThemeContext);
}

const THEME_KEY = 'arcle_theme';

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const saved = localStorage.getItem(THEME_KEY) || 'light';
        setTheme(saved);
        applyTheme(saved);
    }, []);

    const applyTheme = (newTheme) => {
        document.body.className = newTheme === 'light' ? '' : `theme-${newTheme}`;
    };

    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
