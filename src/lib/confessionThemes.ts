// 表白墙主题配置 - 5套独立于全局主题的表白专用主题
export type ConfessionTheme = 'default' | 'pink' | 'ocean' | 'sunset' | 'midnight';

export const CONFESSION_THEMES: Record<ConfessionTheme, {
  name: string;
  label: string;
  // 详情页背景
  detailBg: string;
  detailGradient: string;
  // 卡片（墙上展示）
  cardBg: string;
  cardBorder: string;
  cardText: string;
  cardShadow: string;
  // 按钮/强调色
  accent: string;
  accentLight: string;
  // 文字
  text: string;
  textSecondary: string;
  muted: string;
}> = {
  default: {
    name: 'default',
    label: '简约白',
    detailBg: '#FFFFFF',
    detailGradient: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
    cardBg: '#FFFFFF',
    cardBorder: '#D0DEE8',
    cardText: '#0A1628',
    cardShadow: '0 2px 8px rgba(0,0,0,0.08)',
    accent: '#0077CC',
    accentLight: '#E6F0FA',
    text: '#0A1628',
    textSecondary: '#1A2D44',
    muted: '#8AA0B8',
  },
  pink: {
    name: 'pink',
    label: '樱花粉',
    detailBg: '#FFF0F5',
    detailGradient: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4EC 100%)',
    cardBg: 'rgba(255,255,255,0.85)',
    cardBorder: 'rgba(255,105,180,0.3)',
    cardText: '#8B1A4D',
    cardShadow: '0 2px 12px rgba(255,105,180,0.15)',
    accent: '#FF69B4',
    accentLight: 'rgba(255,105,180,0.12)',
    text: '#8B1A4D',
    textSecondary: '#C2185B',
    muted: 'rgba(183,105,133,0.7)',
  },
  ocean: {
    name: 'ocean',
    label: '深海蓝',
    detailBg: '#05192E',
    detailGradient: 'linear-gradient(135deg, #05192E 0%, #0A2E4A 100%)',
    cardBg: 'rgba(10,40,70,0.8)',
    cardBorder: 'rgba(79,195,247,0.25)',
    cardText: '#E6F5FF',
    cardShadow: '0 2px 16px rgba(0,150,200,0.2)',
    accent: '#4FC3F7',
    accentLight: 'rgba(79,195,247,0.15)',
    text: '#E6F5FF',
    textSecondary: '#B0D4F1',
    muted: 'rgba(140,190,220,0.6)',
  },
  sunset: {
    name: 'sunset',
    label: '落日橙',
    detailBg: '#1A0A00',
    detailGradient: 'linear-gradient(135deg, #1A0A00 0%, #3D1500 50%, #6B2D00 100%)',
    cardBg: 'rgba(60,20,5,0.85)',
    cardBorder: 'rgba(255,152,0,0.3)',
    cardText: '#FFE0B2',
    cardShadow: '0 2px 16px rgba(255,100,0,0.2)',
    accent: '#FF9800',
    accentLight: 'rgba(255,152,0,0.15)',
    text: '#FFE0B2',
    textSecondary: '#FFCC80',
    muted: 'rgba(255,183,77,0.6)',
  },
  midnight: {
    name: 'midnight',
    label: '午夜紫',
    detailBg: '#0D0D1A',
    detailGradient: 'linear-gradient(135deg, #0D0D1A 0%, #1A1A3E 50%, #2D1B69 100%)',
    cardBg: 'rgba(20,20,50,0.85)',
    cardBorder: 'rgba(156,39,240,0.3)',
    cardText: '#E8DAFF',
    cardShadow: '0 2px 16px rgba(100,0,200,0.25)',
    accent: '#9C27B0',
    accentLight: 'rgba(156,39,240,0.15)',
    text: '#E8DAFF',
    textSecondary: '#CE93D8',
    muted: 'rgba(186,130,200,0.6)',
  },
};

// 纯色背景预设（用于墙上卡片）
export const SOLID_BG_COLORS = [
  '#FFFFFF', '#FFF0F5', '#F0F8FF', '#FFF8E1', '#F3E5F5',
  '#E8F5E9', '#FFF3E0', '#E3F2FD', '#FCE4EC', '#E0F7FA',
];

// SVG 背景预设（简短名称，对应 public/ 下的文件）
export const SVG_BG_OPTIONS = [
  { name: 'none', label: '纯色', value: '' },
  { name: 'hearts', label: '爱心', value: 'hearts' },
  { name: 'stars', label: '星光', value: 'stars' },
  { name: 'waves', label: '波浪', value: 'waves' },
  { name: 'dots', label: '圆点', value: 'dots' },
];
