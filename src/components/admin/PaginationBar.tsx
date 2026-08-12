import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

export interface PaginationBarProps {
  current: number;
  last: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export function PaginationBar({
  current,
  last,
  total,
  perPage,
  onChange,
}: PaginationBarProps) {
  const from = total === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, total);

  const pages: (number | '…')[] = [];
  const window = 2;
  for (let i = 1; i <= last; i++) {
    if (
      i === 1 ||
      i === last ||
      (i >= current - window && i <= current + window)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  const btnBase = 'inline-flex items-center justify-center min-w-8 h-8 px-2 text-xs font-medium rounded-lg transition-all duration-150';
  const btnDisabled = 'opacity-40 cursor-not-allowed';
  const btnEnabled = 'hover:opacity-80 active:scale-95';
  const btnActive = 'bg-[var(--color-primary)] text-white border border-[var(--color-primary)]';
  const btnGhost = 'bg-transparent border border-[var(--color-border)] text-[var(--color-text)]';

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 flex-wrap">
      {/* 信息 */}
      <p className="text-xs text-[var(--color-text-muted)] shrink-0">
        共 <span className="text-[var(--color-text)] font-semibold">{total}</span> 条
      </p>

      {/* 分页控件 */}
      <div className="flex items-center gap-1.5 flex-shrink min-w-0">
        <button
          className={`${btnBase} ${current <= 1 ? btnDisabled : btnGhost + ' ' + btnEnabled}`}
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
          title="上一页"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === '…' ? (
              <span
                key={idx}
                className="w-8 h-8 flex items-center justify-center text-xs text-[var(--color-text-muted)]"
              >
                <MoreHorizontal size={14} />
              </span>
            ) : (
              <button
                key={idx}
                className={`${btnBase} ${p === current ? btnActive : btnGhost + ' ' + btnEnabled}`}
                onClick={() => onChange(p as number)}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button
          className={`${btnBase} ${current >= last ? btnDisabled : btnGhost + ' ' + btnEnabled}`}
          disabled={current >= last}
          onClick={() => onChange(current + 1)}
          title="下一页"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
