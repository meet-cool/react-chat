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
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              举报内容
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-1.5">
          <p className="text-xs mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
            请选择举报原因
          </p>
          {REASONS.map((r) => {
            const selected = reason === r;
            return (
              <label
                key={r}
                className="flex items-center gap-3 px-3 py-2.5 rounded text-sm cursor-pointer transition-all"
                style={
                  selected
                    ? {
                        background: 'var(--color-primary-light)',
                        border: '1px solid var(--color-primary)',
                        color: 'var(--color-primary)',
                      }
                    : {
                        background: 'transparent',
                        border: '1px solid var(--color-border-light)',
                        color: 'var(--color-text)',
                      }
                }
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = 'var(--color-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                    background: selected ? 'var(--color-primary)' : 'transparent',
                  }}
                >
                  {selected && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: '#fff' }}
                    />
                  )}
                </span>
                <span>{r}</span>
              </label>
            );
          })}

          {reason === '其他' && (
            <textarea
              rows={2}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="请描述举报原因（选填）"
              maxLength={200}
              className="mt-2 w-full text-sm"
              style={{
                background: 'var(--color-bg-page)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                borderRadius: '3px',
                padding: '6px 10px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          )}
        </div>

        <div
          className="px-4 py-3 border-t flex items-center justify-end gap-2"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <button className="btn btn-sm" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-sm btn-error"
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
