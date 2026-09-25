/*
 * 外观自定义：界面圆角 + 透明效果 + 彩色背景
 * 配置持久化到 localStorage，通过 <html> 的 data-radius / data-trans 属性驱动 CSS 生效。
 */

export type RadiusName = 'none' | 'sm' | 'md' | 'lg';

const RADIUS_KEY = 'arcle_radius';
const TRANS_KEY = 'arcle_trans';
const COLOR_BG_KEY = 'arcle_color_bg';

export const RADIUS_OPTIONS: { value: RadiusName; label: string }[] = [
  { value: 'none', label: '关闭' },
  { value: 'sm', label: '小' },
  { value: 'md', label: '中' },
  { value: 'lg', label: '大' },
];

const RADIUS_WHITELIST: RadiusName[] = ['none', 'sm', 'md', 'lg'];

/** 应用圆角设置（写入 html data-radius，CSS 侧按 --app-radius 生效） */
export function applyRadius(r: RadiusName): void {
  document.documentElement.dataset.radius = r;
}

/** 应用透明效果（写入 html data-trans） */
export function applyTransparency(on: boolean): void {
  document.documentElement.dataset.trans = on ? 'on' : 'off';
}

export function getRadius(): RadiusName {
  const saved = localStorage.getItem(RADIUS_KEY) as RadiusName | null;
  return saved && RADIUS_WHITELIST.includes(saved) ? saved : 'none';
}

export function getTransparency(): boolean {
  return localStorage.getItem(TRANS_KEY) === '1';
}

export function getColorBg(): boolean {
  return localStorage.getItem(COLOR_BG_KEY) !== '0';
}

export function setRadius(r: RadiusName): void {
  localStorage.setItem(RADIUS_KEY, r);
  applyRadius(r);
}

export function setTransparency(on: boolean): void {
  localStorage.setItem(TRANS_KEY, on ? '1' : '0');
  applyTransparency(on);
}

export function setColorBg(on: boolean): void {
  localStorage.setItem(COLOR_BG_KEY, on ? '1' : '0');
  document.documentElement.dataset.colorBg = on ? 'on' : 'off';
}

/** 应用启动时调用：恢复持久化的外观设置 */
export function loadAppearance(): void {
  applyRadius(getRadius());
  applyTransparency(getTransparency());
  setColorBg(getColorBg());
}
