/**
 * DiceIcon — SVG 骰子面（1~6 点全套点型）
 *
 * 用于聊天 dice 消息：按点数渲染标准骰子面（圆角方块 + 圆点），
 * 替代 emoji 🎲（不同平台渲染不一致、且固定是 1 点样式）。
 * 点型遵循标准骰子布局（对角/十字排列）。
 */

// 标准骰子点型：3x3 网格（row, col ∈ 0..2）
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
};

interface DiceIconProps {
  /** 点数 1-6（其它值按 1 显示） */
  value: number;
  size?: number;
  /** 边框颜色（默认 currentColor） */
  strokeColor?: string;
  /** 圆点颜色（默认 primary） */
  pipColor?: string;
}

export function DiceIcon({ value, size = 24, strokeColor = 'currentColor', pipColor }: DiceIconProps) {
  const pips = PIP_LAYOUTS[value] ?? PIP_LAYOUTS[1];
  // 3x3 网格在 24 视口内的中心坐标
  const grid = [6.5, 12, 17.5];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label={`骰子 ${value} 点`}
      role="img"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        fill="var(--color-card)"
        stroke={strokeColor}
        strokeWidth="1.5"
      />
      {pips.map(([r, c], i) => (
        <circle key={i} cx={grid[c]} cy={grid[r]} r="2" fill={pipColor ?? 'var(--color-primary)'} />
      ))}
    </svg>
  );
}
