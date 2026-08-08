import { useEffect, useRef, useState } from 'react';
import {
  Reply,
  Forward,
  Flag,
  Copy,
  Smile,
  Trash2,
} from 'lucide-react';
import { QuickReactionBar, EmojiPicker } from './EmojiPicker';

export interface MessageActionMenuProps {
  open: boolean;
  anchor: { x: number; y: number } | null;
  isSelf: boolean;
  canDelete: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onReport: () => void;
  onCopy: () => void;
  onDelete?: () => void;
}

type Tab = 'main' | 'emoji';

export function MessageActionMenu({
  open,
  anchor,
  isSelf,
  canDelete,
  onClose,
  onReact,
  onReply,
  onForward,
  onReport,
  onCopy,
  onDelete,
}: MessageActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('main');
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // 计算菜单位置（避免溢出屏幕）
  useEffect(() => {
    if (!open || !anchor) return;
    const menuW = 240;
    const menuH = tab === 'emoji' ? 320 : 240;
    const padding = 8;
    let left = anchor.x;
    let top = anchor.y;
    if (left + menuW > window.innerWidth - padding) {
      left = window.innerWidth - menuW - padding;
    }
    if (top + menuH > window.innerHeight - padding) {
      top = window.innerHeight - menuH - padding;
    }
    if (left < padding) left = padding;
    if (top < padding) top = padding;
    setPos({ top, left });
  }, [open, anchor, tab]);

  // 点击外部关闭（注意：不监听 contextmenu，避免与消息气泡的 onContextMenu 冲突）
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      // 右键mousedown（button===2）不关闭，让 contextmenu 事件处理
      if (e instanceof MouseEvent && e.button === 2) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open, onClose]);

  // 打开时重置 tab
  useEffect(() => {
    if (open) setTab('main');
  }, [open]);

  if (!open || !anchor) return null;

  const itemClass =
    'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors';

  return (
    <div
      ref={ref}
      className="fixed z-[120] shadow-[var(--shadow-lg)]"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        minWidth: 220,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {tab === 'main' && (
        <>
          {/* 快捷反应 */}
          <div
            className="px-1.5 py-1.5 border-b"
            style={{ borderColor: 'var(--color-divider)' }}
          >
            <QuickReactionBar
              onPick={(emoji) => {
                onReact(emoji);
                onClose();
              }}
            />
          </div>

          {/* 操作列表 */}
          <div className="py-1">
            <button
              className={itemClass}
              style={{ color: 'var(--color-text)' }}
              onMouseEnter={(el) => {
                el.currentTarget.style.background = 'var(--color-hover-bg)';
              }}
              onMouseLeave={(el) => {
                el.currentTarget.style.background = 'transparent';
              }}
              onClick={() => {
                setTab('emoji');
              }}
            >
              <Smile size={15} style={{ color: 'var(--color-text-secondary)' }} />
              <span>更多表情</span>
            </button>

            <button
              className={itemClass}
              style={{ color: 'var(--color-text)' }}
              onMouseEnter={(el) => {
                el.currentTarget.style.background = 'var(--color-hover-bg)';
              }}
              onMouseLeave={(el) => {
                el.currentTarget.style.background = 'transparent';
              }}
              onClick={() => {
                onReply();
                onClose();
              }}
            >
              <Reply size={15} style={{ color: 'var(--color-primary)' }} />
              <span>引用回复</span>
            </button>

            <button
              className={itemClass}
              style={{ color: 'var(--color-text)' }}
              onMouseEnter={(el) => {
                el.currentTarget.style.background = 'var(--color-hover-bg)';
              }}
              onMouseLeave={(el) => {
                el.currentTarget.style.background = 'transparent';
              }}
              onClick={() => {
                onForward();
                onClose();
              }}
            >
              <Forward size={15} style={{ color: 'var(--color-info)' }} />
              <span>转发</span>
            </button>

            <button
              className={itemClass}
              style={{ color: 'var(--color-text)' }}
              onMouseEnter={(el) => {
                el.currentTarget.style.background = 'var(--color-hover-bg)';
              }}
              onMouseLeave={(el) => {
                el.currentTarget.style.background = 'transparent';
              }}
              onClick={() => {
                onCopy();
                onClose();
              }}
            >
              <Copy size={15} style={{ color: 'var(--color-text-secondary)' }} />
              <span>复制</span>
            </button>

            {!isSelf && (
              <button
                className={itemClass}
                style={{ color: 'var(--color-error)' }}
                onMouseEnter={(el) => {
                  el.currentTarget.style.background = 'var(--color-error-bg)';
                }}
                onMouseLeave={(el) => {
                  el.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  onReport();
                  onClose();
                }}
              >
                <Flag size={15} />
                <span>举报</span>
              </button>
            )}

            {canDelete && onDelete && (
              <button
                className={itemClass}
                style={{ color: 'var(--color-error)' }}
                onMouseEnter={(el) => {
                  el.currentTarget.style.background = 'var(--color-error-bg)';
                }}
                onMouseLeave={(el) => {
                  el.currentTarget.style.background = 'transparent';
                }}
                onClick={() => {
                  onDelete();
                  onClose();
                }}
              >
                <Trash2 size={15} />
                <span>删除</span>
              </button>
            )}
          </div>
        </>
      )}

      {tab === 'emoji' && (
        <div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 border-b text-xs"
            style={{ borderColor: 'var(--color-divider)', color: 'var(--color-text-secondary)' }}
          >
            <button
              onClick={() => setTab('main')}
              className="text-xs"
              style={{ color: 'var(--color-primary)' }}
            >
              ← 返回
            </button>
            <span>选择表情</span>
          </div>
          <EmojiPicker
            onPick={(emoji) => {
              onReact(emoji);
              onClose();
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Hook：统一处理长按 + 右键触发 */
export function useMessageActionTrigger(onTrigger: (x: number, y: number) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);

  const startLongPress = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    longPressRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressRef.current = true;
      onTrigger(x, y);
    }, 500);
  };

  const cancelLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onTrigger(e.clientX, e.clientY);
  };

  return {
    onTouchStart: startLongPress,
    onTouchEnd: cancelLongPress,
    onTouchMove: cancelLongPress,
    onContextMenu,
    isLongPress: () => longPressRef.current,
  };
}
