import { Users, Crown } from 'lucide-react';
import type { RoomMember } from '../types';
import { Avatar } from './Avatar';

interface MemberListProps {
  members: RoomMember[];
  loading?: boolean;
}

export function MemberList({ members, loading }: MemberListProps) {
  const online = members.filter((m) => m.online);
  const offline = members.filter((m) => !m.online);

  // 排序：群主 → 管理员 → 普通成员
  const sortFn = (a: RoomMember, b: RoomMember) => {
    const aOrder = a.is_owner ? 0 : a.role === 'admin' ? 1 : 2;
    const bOrder = b.is_owner ? 0 : b.role === 'admin' ? 1 : 2;
    return aOrder - bOrder;
  };
  const sortedOnline = [...online].sort(sortFn);
  const sortedOffline = [...offline].sort(sortFn);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-card)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Users size={18} /> 成员
          <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>
            ({online.length} 在线 / {members.length})
          </span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        ) : (
          <>
            {sortedOnline.length > 0 && (
              <div className="px-4 py-2 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                在线 - {sortedOnline.length}
              </div>
            )}
            {sortedOnline.map((m) => (
              <MemberItem key={`o-${m.id}`} member={m} />
            ))}

            {sortedOffline.length > 0 && (
              <div className="px-4 py-2 text-xs font-medium mt-2" style={{ color: 'var(--color-text-muted)' }}>
                离线 - {sortedOffline.length}
              </div>
            )}
            {sortedOffline.map((m) => (
              <MemberItem key={`f-${m.id}`} member={m} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function MemberItem({ member }: { member: RoomMember }) {
  const isOwner = member.is_owner;
  const isAdmin = member.role === 'admin';

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 transition-colors"
      style={{ opacity: member.online ? 1 : 0.6 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Avatar username={member.username} avatar={member.avatar} size={32} online={member.online} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
            {member.username}
          </span>
          {isOwner && <Crown size={12} style={{ color: 'var(--color-warning)' }} />}
          {!isOwner && isAdmin && (
            <span
              className="text-[10px] px-1 py-0.5"
              style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary)',
              }}
            >
              管理
            </span>
          )}
        </div>
        {member.bio && (
          <p className="text-xs truncate" style={{ color: 'var(--color-text-light)' }}>
            {member.bio}
          </p>
        )}
      </div>
    </div>
  );
}
