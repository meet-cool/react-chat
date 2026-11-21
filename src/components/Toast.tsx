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
  const { removeToast, addToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const Icon = iconMap[toast.type];
  const color = colorMap[toast.type];

  const handleCopy = async () => {
    const text = toast.message ?? '';
    if (!text) return;
    let ok = false;

    // 1) 现代异步剪贴板 API（仅在安全上下文可用）
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = false;
      }
    }

    // 2) 兜底：textarea + execCommand（非安全上下文 / 旧浏览器）
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text;
      // 放在视口内（top/left 0）但视觉隐藏：部分浏览器无法选中被移出视口的元素
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.width = '1px';
      ta.style.height = '1px';
      ta.style.padding = '0';
      ta.style.border = 'none';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      // 全局 CSS 对 * 设了 user-select:none，需在此显式允许选择，select() 才能生效
      ta.style.userSelect = 'text';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        ta.setSelectionRange(0, text.length);
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
    }

    if (ok) {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1500);
    } else {
      // 复制失败不再静默吞掉：给出可见反馈，并提示可手动选中
      setCopyFailed(true);
      addToast('复制失败，请手动选中文字后复制', 'warning');
      setTimeout(() => setCopyFailed(false), 1500);
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
        title="可手动选中文字复制，或点右侧复制按钮"
      >
        {toast.message}
      </span>
      <button
        onClick={handleCopy}
        className="p-1.5 transition-colors"
        style={{ color: copied ? 'var(--color-success)' : copyFailed ? 'var(--color-error)' : 'var(--color-text-muted)' }}
        title={copied ? '已复制' : copyFailed ? '复制失败' : '复制消息'}
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
