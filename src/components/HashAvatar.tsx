/**
 * 哈希头像（Identicon）
 *
 * 使用 FNV-1a 哈希算法对种子字符串（如 "group:3:技术交流" / "room:1:公共大厅"）
 * 生成确定性结果，再映射为 5×5 对称色块图案与配色：
 * 同一个群聊/聊天室永远得到同一张头像，不同群聊/聊天室头像互不相同。
 */

interface HashAvatarProps {
  seed: string;
  size?: number;
  className?: string;
  title?: string;
}

/** FNV-1a 32 位哈希 */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 线性同余伪随机序列（由种子驱动，保证确定性） */
function makeRng(seedNum: number) {
  let s = seedNum || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function hashAvatarColors(seed: string): { fg: string; fg2: string; bg: string } {
  const h1 = fnv1a(seed) % 360;
  const h2 = fnv1a(seed + '#c2') % 360;
  return {
    fg: `hsl(${h1}, 62%, 48%)`,
    fg2: `hsl(${h2}, 55%, 62%)`,
    bg: `hsl(${h1}, 45%, 90%)`,
  };
}

export function HashAvatar({ seed, size = 40, className, title }: HashAvatarProps) {
  const seedNum = fnv1a(seed);
  const rng = makeRng(seedNum);
  const { fg, fg2, bg } = hashAvatarColors(seed);

  // 5×3 半边网格（左右镜像成 5×5 对称图案）
  const cells: Array<{ x: number; y: number; c: string }> = [];
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 5; y++) {
      const v = rng();
      if (v > 0.52) {
        const color = v > 0.78 ? fg2 : fg;
        cells.push({ x, y, c: color });
        if (x < 2) cells.push({ x: 4 - x, y, c: color }); // 镜像
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 5 5"
      className={className}
      role="img"
      aria-label={title || seed}
      style={{ display: 'block', flexShrink: 0, borderRadius: 3 }}
      shapeRendering="crispEdges"
    >
      {title ? <title>{title}</title> : null}
      <rect width="5" height="5" fill={bg} />
      {cells.map((cell, i) => (
        <rect key={i} x={cell.x} y={cell.y} width="1" height="1" fill={cell.c} />
      ))}
    </svg>
  );
}
