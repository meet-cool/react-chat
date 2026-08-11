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
  },
  pink: {
    primary: '#f472b6',
    primaryLight: 'rgba(244,114,182,0.15)',
    cardBg: 'rgba(55,8,35,0.70)',
    cardBorder: 'rgba(244,114,182,0.28)',
    text: 'rgba(255,228,240,0.95)',
    textMuted: 'rgba(240,180,210,0.6)',
    textSecondary: 'rgba(255,210,230,0.8)',
    divider: 'rgba(244,114,182,0.15)',
    labelBg: 'rgba(244,114,182,0.18)',
    inputBg: 'rgba(0,0,0,0.2)',
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
  },
};
