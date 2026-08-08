import { useState } from 'react';
import { Flag, X, Loader2 } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting?: boolean;
}

const REASONS = [
  '垃圾广告 / 推广信息',
  '辱骂 / 人身攻击',
  '色情 / 低俗内容',
  '政治敏感 / 违法信息',
  '诈骗 / 恶意链接',
  '其他',
];

export function ReportDialog({
  open,
  onClose,
  onConfirm,
  submitting,
}: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');

  if (!open) return null;

  const finalReason = reason === '其他' ? custom.trim() : reason;

  const submit = () => {
    if (!finalReason) return;
    onConfirm(finalReason);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm shadow-[var(--shadow-lg)]"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2">
            <Flag size={18} style={{ color: 'var(--color-error)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              举报消息
            </h3>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--color-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            请选择举报原因：
          </p>
          {REASONS.map((r) => (
            <label
              key={r}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors"
              style={{
                border:
                  reason === r
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--color-border-light)',
                background:
                  reason === r ? 'var(--color-primary-light)' : 'transparent',
                color: 'var(--color-text)',
              }}
            >
              <input
                type="radio"
                name="report-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span>{r}</span>
            </label>
          ))}

          {reason === '其他' && (
            <textarea
              rows={2}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="请描述举报原因"
              maxLength={200}
              className="mt-2"
            />
          )}
        </div>

        <div
          className="px-4 py-3 border-t flex items-center justify-end gap-2"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-error"
            disabled={!finalReason || submitting}
            onClick={submit}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> 提交中…
              </>
            ) : (
              <>
                <Flag size={14} /> 提交举报
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
