import { useState } from 'react';
import { X } from 'lucide-react';

// 常用 Emoji 分组（不依赖外部库，直接内嵌）
const EMOJI_GROUPS: { name: string; emojis: string[] }[] = [
  {
    name: '表情',
    emojis: ['😀', '😄', '😁', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤔', '😴', '😜', '🙃', '🥳', '😭', '生气', '🤯', '😱', '🥺', '😏'],
  },
  {
    name: '手势',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤙', '👋', '🙏', '💪', '👏', '🙌', '🤝', '✊', '👊'],
  },
  {
    name: '心情',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💖', '💘', '🔥', '⭐', '✨', '🎉', '💯', '💢'],
  },
  {
    name: '物品',
    emojis: ['☕', '🍵', '🍻', '🎂', '🍰', '🍔', '🍕', '🎮', '⚽', '🏀', '🎵', '📚', '💻', '📱', '🎁', '🌈', '☀️', '🌙', '⚡', '💊'],
  },
];

// 快捷反应 emoji（消息菜单顶部展示）
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose?: () => void;
  quickOnly?: boolean;
}

/** 快捷反应条（用于消息菜单顶部） */
export function QuickReactionBar({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1">
      {QUICK_REACTIONS.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="w-9 h-9 flex items-center justify-center text-xl transition-transform"
          style={{ border: '1px solid transparent', background: 'transparent' }}
          onMouseEnter={(el) => {
            el.currentTarget.style.transform = 'scale(1.25)';
            el.currentTarget.style.background = 'var(--color-hover-bg)';
          }}
          onMouseLeave={(el) => {
            el.currentTarget.style.transform = 'scale(1)';
            el.currentTarget.style.background = 'transparent';
          }}
          title={`反应 ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

/** 完整 Emoji 选择面板（用于输入框） */
export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const [group, setGroup] = useState(0);

  return (
    <div
      className="shadow-[var(--shadow-lg)] flex flex-col"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        width: 300,
      }}
    >
      {/* 分组标签 */}
      <div
        className="flex items-center justify-between px-2 py-1.5 border-b"
        style={{ borderColor: 'var(--color-divider)' }}
      >
        <div className="flex items-center gap-1">
          {EMOJI_GROUPS.map((g, i) => (
            <button
              key={g.name}
              onClick={() => setGroup(i)}
              className="px-2 py-1 text-xs transition-colors"
              style={
                group === i
                  ? {
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary)',
                    }
                  : {
                      color: 'var(--color-text-secondary)',
                      border: '1px solid transparent',
                    }
              }
            >
              {g.name}
            </button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-0.5" style={{ color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Emoji 网格 */}
      <div
        className="grid grid-cols-7 gap-0.5 p-2 overflow-y-auto"
        style={{ maxHeight: 200 }}
      >
        {EMOJI_GROUPS[group].emojis.map((e, i) => (
          <button
            key={`${e}-${i}`}
            onClick={() => onPick(e)}
            className="w-9 h-9 flex items-center justify-center text-xl transition-transform"
            style={{ border: '1px solid transparent', background: 'transparent' }}
            onMouseEnter={(el) => {
              el.currentTarget.style.transform = 'scale(1.25)';
              el.currentTarget.style.background = 'var(--color-hover-bg)';
            }}
            onMouseLeave={(el) => {
              el.currentTarget.style.transform = 'scale(1)';
              el.currentTarget.style.background = 'transparent';
            }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
