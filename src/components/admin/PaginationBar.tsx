import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const pages: (number | string)[] = [];
  const window = 2;
  const push = (v: number | string) => pages.push(v);
  for (let i = 1; i <= last; i++) {
    if (
      i === 1 ||
      i === last ||
      (i >= current - window && i <= current + window)
    ) {
      push(i);
    } else if (pages[pages.length - 1] !== '…') {
      push('…');
    }
  }

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      <div className="text-xs">
        共 <b style={{ color: 'var(--color-text)' }}>{total}</b> 条，第 {from}-{to} 条
      </div>
      <div className="flex items-center gap-1">
        <button
          className="btn btn-sm"
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
        >
          <ChevronLeft size={14} /> 上一页
        </button>
        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            typeof p === 'string' ? (
              <span
                key={idx}
                className="px-2 text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                …
              </span>
            ) : (
              <button
                key={idx}
                className="btn btn-sm"
                style={
                  p === current
                    ? {
                        background: 'var(--color-primary)',
                        color: '#FFFFFF',
                        borderColor: 'var(--color-primary)',
                      }
                    : undefined
                }
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <button
          className="btn btn-sm"
          disabled={current >= last}
          onClick={() => onChange(current + 1)}
        >
          下一页 <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
