interface AvatarProps {
  username: string;
  avatar?: string;
  size?: number;
  online?: boolean;
  onClick?: () => void;
}

// 根据用户名生成稳定颜色
function getColor(name: string): string {
  const colors = [
    '#0077CC', '#16A34A', '#D97706', '#DC2626',
    '#7C3AED', '#0891B2', '#DB2777', '#4F46E5',
    '#059669', '#EA580C',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ username, avatar, size = 40, online, onClick }: AvatarProps) {
  const color = getColor(username);
  const initial = username.charAt(0).toUpperCase();

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    background: avatar ? `url("${avatar}") center center / cover no-repeat` : color,
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: Math.round(size * 0.4),
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div
      style={{ ...containerStyle, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {!avatar && initial}
      {online !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: '50%',
            background: online ? 'var(--color-success)' : 'var(--color-text-muted)',
            border: '2px solid var(--color-card)',
          }}
        />
      )}
    </div>
  );
}
