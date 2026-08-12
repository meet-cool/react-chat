export type ThemeKey = 'ocean' | 'pink' | 'default';

export const THEMES: Record<ThemeKey, {
  primary: string;
  primaryLight: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  divider: string;
  labelBg: string;
  inputBg: string;
  warning: string;
  error: string;
}> = {
  ocean: {
    primary: '#4fc3f7',
    primaryLight: 'rgba(79,195,247,0.15)',
    cardBg: 'rgba(5,25,50,0.72)',
    cardBorder: 'rgba(79,195,247,0.25)',
    text: 'rgba(230,245,255,0.95)',
    textMuted: 'rgba(180,220,245,0.6)',
    textSecondary: 'rgba(200,230,250,0.75)',
    divider: 'rgba(79,195,247,0.15)',
    labelBg: 'rgba(79,195,247,0.18)',
    inputBg: 'rgba(0,0,0,0.2)',
    warning: '#fbbf24',
    error: '#f87171',
  },
  pink: {
    primary: '#ff69b4',
    primaryLight: 'rgba(255,105,180,0.15)',
    cardBg: 'rgba(60,10,40,0.65)',
    cardBorder: 'rgba(255,105,180,0.30)',
    text: 'rgba(255,235,245,0.95)',
    textMuted: 'rgba(255,182,205,0.65)',
    textSecondary: 'rgba(255,220,240,0.85)',
    divider: 'rgba(255,105,180,0.18)',
    labelBg: 'rgba(255,105,180,0.18)',
    inputBg: 'rgba(0,0,0,0.15)',
    warning: '#fbbf24',
    error: '#f87171',
  },
  default: {
    primary: 'var(--color-primary)',
    primaryLight: 'var(--color-primary-light)',
    cardBg: 'var(--color-card)',
    cardBorder: 'var(--color-border)',
    text: 'var(--color-text)',
    textMuted: 'var(--color-text-muted)',
    textSecondary: 'var(--color-text-secondary)',
    divider: 'var(--color-divider)',
    labelBg: 'var(--color-primary-light)',
    inputBg: 'var(--color-bg-page)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
  },
};
