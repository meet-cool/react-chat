import { useState } from 'react';
import { Flag, X, Loader2 } from 'lucide-react';
import { type ThemeKey, THEMES } from '../lib/themes';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting?: boolean;
  theme?: ThemeKey;
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
  theme = 'default',
}: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const T = THEMES[theme];

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
        className="w-full max-w-sm"
        style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${T.divider}` }}
        >
          <div className="flex items-center gap-2">
            <Flag size={18} style={{ color: 'var(--color-error)' }} />
            <h3 className="font-semibold text-sm" style={{ color: T.text }}>
              举报内容
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: T.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.labelBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-1.5">
          <p className="text-xs mb-2.5" style={{ color: T.textMuted }}>
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
                        background: T.labelBg,
                        border: `1px solid ${T.primary}`,
                        color: T.primary,
                      }
                    : {
                        background: 'transparent',
                        border: `1px solid ${T.cardBorder}`,
                        color: T.text,
                      }
                }
                onClick={() => setReason(r)}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = T.labelBg;
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: selected ? T.primary : T.cardBorder,
                    background: selected ? T.primary : 'transparent',
                  }}
                >
                  {selected && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#fff' }} />
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
                background: 'rgba(0,0,0,0.2)',
                border: `1px solid ${T.cardBorder}`,
                color: T.text,
                borderRadius: '3px',
                padding: '6px 10px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          )}
        </div>

        <div
          className="px-4 py-3 flex items-center justify-end gap-2"
          style={{ borderTop: `1px solid ${T.divider}` }}
        >
          <button className="btn btn-sm" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-sm btn-error"
            disabled={!finalReason || submitting}
            style={{ background: T.error, color: '#fff', borderColor: T.error }}
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
