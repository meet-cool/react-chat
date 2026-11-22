import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Code2, Type, Loader2, Smile, X, Reply as ReplyIcon, Dices, Images } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { MemePicker } from './MemePicker';
import { resolveMessageType } from '../lib/bbcode';
import type { MessageReply } from '../types';

interface MessageInputProps {
  onSend: (content: string, type: string) => void | Promise<void>;
  disabled?: boolean;
  sending?: boolean;
  insertTextRef?: React.MutableRefObject<((text: string) => void) | null>;
  replyTo?: { id: number; username: string; content_short: string } | null;
  onCancelReply?: () => void;
  /** 摇骰子：由父组件发送 dice 类型消息 */
  onDice?: () => void;
}

export function MessageInput({ onSend, disabled, sending, insertTextRef, replyTo, onCancelReply, onDice }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'text' | 'bbcode'>('text');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMeme, setShowMeme] = useState(false);
  // 窄屏（手机/窄面板）下使用短占位符，避免长提示文字折行被裁切
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 骰子连点锁：sending 是 React state（异步更新），同帧/快速双击挡不住，
  // 用 ref 立即锁 800ms（本地一次往返 ~200ms 足够释放）；后端 2 秒同内容去重兜底。
  const diceLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 发送本地锁（防 Enter/按钮快速双触发跨 in-flight 窗口双发，见 handleSend）
  const sendLockRef = useRef(false);

  useEffect(() => () => {
    if (diceLockRef.current) clearTimeout(diceLockRef.current);
  }, []);

  const rollDice = () => {
    if (!onDice || disabled || sending || diceLockRef.current !== null) return;
    onDice();
    diceLockRef.current = setTimeout(() => { diceLockRef.current = null; }, 800);
  };

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
    // 本地 in-flight 锁（600ms）：父组件 sendingRef 只挡「进行中」的重复调用；
    // 两次快速触发（Enter 后紧跟点发送/再按 Enter）若跨在 in-flight 窗口之间，
    // 会各发一条真请求 → 后端 2 秒去重窗口之外就双双进库。本地锁兜底。
    if (sendLockRef.current) return;
    sendLockRef.current = true;
    setTimeout(() => { sendLockRef.current = false; }, 600);
    // 消息类型判定：BBCode 模式，或内容里含成对 BBCode 标签（如表情包插入的 [img]url[/img]、
    // 用户在纯文本模式下随手写的 [b]粗[/b]）时，都以 type='bbcode' 发送，
    // 否则前端会按纯文本把标签原样显示出来（表现为「BBCode 无法被解析」）。
    const sendType = resolveMessageType(trimmed, mode);
    // onSend 返回 Promise 时：成功才清空输入，失败保留内容；同步返回时行为不变
    const p = onSend(trimmed, sendType);
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
    // e.repeat：按住 Enter 不放会持续触发 keydown（系统按键重复 ~30 次/秒）→
    // 不加此守卫，一条消息会在 in-flight 间隙被反复发出（「发两次」的典型来源）
    if (e.repeat) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
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
        <button onClick={() => setMode('bbcode')} className="btn btn-sm flex items-center gap-1" style={mode === 'bbcode' ? { background: 'var(--color-primary)', color: '#FFFFFF', borderColor: 'var(--color-primary)' } : undefined}>
          <Code2 size={13} /> BBCode
        </button>
        {mode === 'bbcode' && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>支持 [b][i][u][color=红][url][img][quote][code] 等标签</span>}
      </div>
      <div className="flex items-end gap-2">
        <button onClick={() => setShowEmoji((s) => !s)} className="btn flex-shrink-0" style={{ minHeight: 44, minWidth: 44 }} title="表情" type="button">
          <Smile size={18} />
        </button>
        <button
          onClick={() => { if (!disabled) setShowMeme((s) => !s); }}
          className="btn flex-shrink-0"
          style={{ minHeight: 44, minWidth: 44 }}
          title="表情包"
          type="button"
          disabled={disabled}
        >
          <Images size={18} />
        </button>
        {onDice && (
          <button
            onClick={rollDice}
            className="btn flex-shrink-0"
            style={{ minHeight: 44, minWidth: 44, opacity: sending ? 0.6 : 1 }}
            title="摇骰子"
            type="button"
            disabled={disabled || sending}
          >
            <Dices size={18} />
          </button>
        )}
        {showEmoji && (
          <div className="absolute z-50" style={{ bottom: 72, left: 12 }}>
            <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
          </div>
        )}
        {showMeme && (
          <div className="absolute z-50" style={{ bottom: 72, left: 60 }}>
            <MemePicker
              keyword=""
              onPick={(url) => {
                // 表情包点击后直接作为一条 bbcode 消息发送（不再插入输入框等待手动发）。
                // [img]url[/img] 以 type='bbcode' 发送，前端渲染成 <img>（no-referrer 防盗链）。
                if (!disabled) {
                  void onSend(`[img]${url}[/img]`, 'bbcode');
                  setShowMeme(false);
                }
              }}
              onClose={() => setShowMeme(false)}
            />
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={compact ? '输入消息…' : (mode === 'bbcode' ? '输入 BBCode 消息…（Enter 发送，Shift+Enter 换行）' : '输入消息…（Enter 发送，Shift+Enter 换行）')}
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
