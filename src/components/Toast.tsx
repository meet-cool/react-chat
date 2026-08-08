import { useState } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X, Copy, Check } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import type { ToastItem } from '../types';

interface ToastProps {
  toast: ToastItem;
  exiting: boolean;
}

const iconMap: Record<ToastItem['type'], typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap: Record<ToastItem['type'], string> = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
};

export function Toast({ toast, exiting }: ToastProps) {
  const { removeToast } = useApp();
  const [copied, setCopied] = useState(false);
  const Icon = iconMap[toast.type];
  const color = colorMap[toast.type];

  const handleCopy = async () => {
    try {
      // 优先使用现代剪贴板 API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(toast.message);
      } else {
        // 兜底：使用临时 textarea + execCommand
        const ta = document.createElement('textarea');
        ta.value = toast.message;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 复制失败静默处理
    }
  };

  return (
    <div
      className={`${exiting ? 'toast-exit' : 'toast-enter'} flex items-center gap-3 px-4 py-3 shadow-[var(--shadow-lg)] min-w-[280px] max-w-[400px]`}
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <Icon size={18} color={color} />
      <span
        className="flex-1 text-sm break-words"
        style={{ color: 'var(--color-text)', userSelect: 'text' }}
        title="点击右侧复制按钮可复制本消息"
      >
        {toast.message}
      </span>
      <button
        onClick={handleCopy}
        className="p-1 transition-colors"
        style={{ color: copied ? 'var(--color-success)' : 'var(--color-text-muted)' }}
        title={copied ? '已复制' : '复制消息'}
        aria-label="复制消息"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label="关闭"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, exitingIds } = useApp();
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} exiting={exitingIds.has(t.id)} />
      ))}
    </div>
  );
}
