import { Sun, Moon, Contrast, Eye } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import type { ThemeName } from '../types';

interface ThemeOption {
  name: ThemeName;
  label: string;
  icon: typeof Sun;
}

const themes: ThemeOption[] = [
  { name: 'light', label: '浅色', icon: Sun },
  { name: 'dark', label: '深色', icon: Moon },
  { name: 'high1', label: '高对比1', icon: Contrast },
  { name: 'high2', label: '高对比2', icon: Eye },
];

export function ThemeToggle() {
  const { theme, setTheme } = useApp();

  return (
    <div className="flex items-center gap-1">
      {themes.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.name;
        return (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            title={t.label}
            className="p-2 btn-sm"
            style={
              isActive
                ? {
                    background: 'var(--color-primary)',
                    color: '#FFFFFF',
                    borderColor: 'var(--color-primary)',
                  }
                : undefined
            }
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
