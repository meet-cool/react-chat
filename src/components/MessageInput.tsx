import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Code2, Type, Loader2, Smile, X, Reply as ReplyIcon } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import type { MessageReply } from '../types';

interface MessageInputProps {
  onSend: (content: string, type: string) => void;
  disabled?: boolean;
  sending?: boolean;
  // 用于外部插入文本（如 @提及）
  insertTextRef?: React.MutableRefObject<((text: string) => void) | null>;
  // 引用回复预览
  replyTo?: { id: number; username: string; content_short: string } | null;
  onCancelReply?: () => void;
}

export function MessageInput({
  onSend,
  disabled,
  sending,
  insertTextRef,
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'text' | 'markdown'>('text');
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);

  // 暴露插入文本方法给父组件
  useEffect(() => {
    if (insertTextRef) {
      insertTextRef.current = (text: string) => {
        const ta = textareaRef.current;
        if (!ta) {
          setContent((c) => c + text);
          return;
        }
        const start = ta.selectionStart ?? content.length;
        const end = ta.selectionEnd ?? content.length;
        const next = content.slice(0, start) + text + content.slice(end);
        setContent(next);
        requestAnimationFrame(() => {
          ta.focus();
          const pos = start + text.length;
          ta.setSelectionRange(pos, pos);
        });
      };
    }
    return () => {
      if (insertTextRef) insertTextRef.current = null;
    };
  }, [content, insertTextRef]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, mode);
    setContent('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((c) => c + emoji);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div
      className="p-3 border-t relative"
      style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}
    >
      {/* 引用回复预览 */}
      {replyTo && (
        <div
          className="flex items-center gap-2 px-2 py-1.5 mb-2 text-xs"
          style={{
            background: 'var(--color-card-alt)',
            borderLeft: '3px solid var(--color-primary)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ReplyIcon size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
            回复 {replyTo.username}:
          </span>
          <span className="truncate flex-1">{replyTo.content_short}</span>
          <button
            onClick={onCancelReply}
            className="p-0.5 flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            title="取消回复"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 模式切换 */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setMode('text')}
          className="btn btn-sm flex items-center gap-1"
          style={
            mode === 'text'
              ? {
                  background: 'var(--color-primary)',
                  color: '#FFFFFF',
                  borderColor: 'var(--color-primary)',
                }
              : undefined
          }
        >
          <Type size={13} /> 纯文本
        </button>
        <button
          onClick={() => setMode('markdown')}
          className="btn btn-sm flex items-center gap-1"
          style={
            mode === 'markdown'
              ? {
                  background: 'var(--color-primary)',
                  color: '#FFFFFF',
                  borderColor: 'var(--color-primary)',
                }
              : undefined
          }
        >
          <Code2 size={13} /> Markdown
        </button>
        {mode === 'markdown' && (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            支持代码块、表格、列表等语法
          </span>
        )}
      </div>

      {/* 输入区 */}
      <div className="flex items-end gap-2">
        {/* Emoji 按钮 */}
        <button
          ref={emojiBtnRef}
          onClick={() => setShowEmoji((s) => !s)}
          className="btn flex-shrink-0"
          style={{ minHeight: 44, minWidth: 44 }}
          title="表情"
          type="button"
        >
          <Smile size={18} />
        </button>

        {/* Emoji 面板 */}
        {showEmoji && (
          <div
            className="absolute z-50"
            style={{ bottom: 72, left: 12 }}
          >
            <EmojiPicker
              onPick={insertEmoji}
              onClose={() => setShowEmoji(false)}
            />
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'markdown'
              ? '输入 Markdown 消息…（Enter 发送，Shift+Enter 换行）'
              : '输入消息…（Enter 发送，Shift+Enter 换行）'
          }
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none"
          style={{ minHeight: 44, maxHeight: 160 }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !content.trim() || sending}
          className="btn btn-primary"
          style={{ minHeight: 44 }}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          发送
        </button>
      </div>
    </div>
  );
}
