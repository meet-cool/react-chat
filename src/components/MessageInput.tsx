import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Code2, Type, Loader2, Smile, X, Reply as ReplyIcon } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import type { MessageReply } from '../types';

interface MessageInputProps {
  onSend: (content: string, type: string) => void | Promise<void>;
  disabled?: boolean;
  sending?: boolean;
  insertTextRef?: React.MutableRefObject<((text: string) => void) | null>;
  replyTo?: { id: number; username: string; content_short: string } | null;
  onCancelReply?: () => void;
}

export function MessageInput({ onSend, disabled, sending, insertTextRef, replyTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'text' | 'markdown'>('text');
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (insertTextRef) {
      insertTextRef.current = (text: string) => {
        const ta = textareaRef.current;
        if (!ta) { setContent((c) => c + text); return; }
        const start = ta.selectionStart ?? content.length;
        const end = ta.selectionEnd ?? content.length;
        const next = content.slice(0, start) + text + content.slice(end);
        setContent(next);
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length); });
      };
    }
    return () => { if (insertTextRef) insertTextRef.current = null; };
  }, [content, insertTextRef]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    // onSend 返回 Promise 时：成功才清空输入，失败保留内容；同步返回时行为不变
    const p = onSend(trimmed, mode);
    if (p && typeof p.then === 'function') {
      try {
        await p;
        setContent('');
      } catch {
        /* 发送失败，保留输入内容 */
      }
    } else {
      setContent('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) { setContent((c) => c + emoji); return; }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); });
  };

  return (
    <div className="p-3 border-t relative flex-shrink-0" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card)' }}>
      {replyTo && (
        <div className="flex items-center gap-2 px-2 py-1.5 mb-2 text-xs" style={{ background: 'var(--color-card-alt)', borderLeft: '3px solid var(--color-primary)', color: 'var(--color-text-secondary)' }}>
          <ReplyIcon size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span className="font-medium" style={{ color: 'var(--color-primary)' }}>回复 {replyTo.username}:</span>
          <span className="truncate flex-1">{replyTo.content_short}</span>
          <button onClick={onCancelReply} className="p-0.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} title="取消回复">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setMode('text')} className="btn btn-sm flex items-center gap-1" style={mode === 'text' ? { background: 'var(--color-primary)', color: '#FFFFFF', borderColor: 'var(--color-primary)' } : undefined}>
          <Type size={13} /> 纯文本
        </button>
        <button onClick={() => setMode('markdown')} className="btn btn-sm flex items-center gap-1" style={mode === 'markdown' ? { background: 'var(--color-primary)', color: '#FFFFFF', borderColor: 'var(--color-primary)' } : undefined}>
          <Code2 size={13} /> Markdown
        </button>
        {mode === 'markdown' && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>支持代码块、表格、列表等语法</span>}
      </div>
      <div className="flex items-end gap-2">
        <button onClick={() => setShowEmoji((s) => !s)} className="btn flex-shrink-0" style={{ minHeight: 44, minWidth: 44 }} title="表情" type="button">
          <Smile size={18} />
        </button>
        {showEmoji && (
          <div className="absolute z-50" style={{ bottom: 72, left: 12 }}>
            <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'markdown' ? '输入 Markdown 消息…（Enter 发送，Shift+Enter 换行）' : '输入消息…（Enter 发送，Shift+Enter 换行）'}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none"
          style={{ minHeight: 44, maxHeight: 160 }}
        />
        <button onClick={handleSend} disabled={disabled || !content.trim() || sending} className="btn btn-primary" style={{ minHeight: 44 }}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          发送
        </button>
      </div>
    </div>
  );
}
