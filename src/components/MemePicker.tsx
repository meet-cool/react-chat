import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Search, ImageOff } from 'lucide-react';
import { memeApi, type MemeItem } from '../lib/api';

interface MemePickerProps {
  /** 打开时的初始关键词（可空；输入框可编辑） */
  keyword: string;
  /** 选中某张表情包图片（URL 插入聊天输入框） */
  onPick: (url: string) => void;
  /** 关闭面板 */
  onClose: () => void;
}

const PAGE_SIZE = 20;
const MAX_KEYWORD_LEN = 50;

/**
 * 表情包搜索选择面板
 *
 * 布局：搜索输入框 + 4 列网格图片 + 加载骨架屏 + 空态。
 * - 调 GET /meme/search（走 Vite 同源代理，后端 60s 文件缓存）；
 * - 图片 loading="lazy" + referrerpolicy="no-referrer"（防外部图床防盗链）；
 * - 点图 → onPick(url)；
 * - 后端降级（外部 API 失败）时前端按 Promise 异常走空态提示，不白屏。
 * 样式遵守 CLAUDE.md：容器 0 圆角、CSS 变量、无渐变无发光。
 */
export function MemePicker({ keyword: initialKeyword, onPick, onClose }: MemePickerProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [items, setItems] = useState<MemeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const seqRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 聚焦搜索框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = async (msg: string, page: number) => {
    const q = msg.trim();
    if (q.length === 0 || q.length > MAX_KEYWORD_LEN) return;
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await memeApi.search(q, page, PAGE_SIZE);
      if (seq !== seqRef.current) return; // 旧请求结果丢弃
      setItems(res.list);
      setSearched(true);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setItems([]);
      setSearched(true);
      setError(e instanceof Error ? e.message : '表情包搜索失败，请稍后再试');
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  // 打开面板时带初始关键词则自动搜一次
  useEffect(() => {
    const q = initialKeyword.trim();
    if (q.length >= 1 && q.length <= MAX_KEYWORD_LEN) {
      void doSearch(q, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (q.length === 0) return;
    setKeyword(q.slice(0, MAX_KEYWORD_LEN));
    void doSearch(q, 1);
  };

  return (
    <div
      className="shadow-[var(--shadow-lg)] flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 0,
        width: 320,
        maxHeight: 420,
      }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-divider)', background: 'var(--color-card-alt)' }}
      >
        <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
          <ImageOff size={13} style={{ color: 'var(--color-primary)' }} />
          表情包搜索
        </span>
        <button onClick={onClose} className="p-0.5" style={{ color: 'var(--color-text-muted)' }} title="关闭">
          <X size={14} />
        </button>
      </div>

      {/* 搜索输入框 */}
      <div className="p-2 flex-shrink-0" style={{ background: 'var(--color-card)' }}>
        <form onSubmit={submitSearch} className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索表情包，如：鄙视"
            maxLength={MAX_KEYWORD_LEN}
            className="flex-1 min-w-0 text-sm bg-transparent border outline-none"
            style={{
              color: 'var(--color-text)',
              borderColor: 'var(--color-border)',
              padding: '6px 10px',
            }}
          />
          <button
            type="submit"
            className="btn btn-sm flex-shrink-0"
            style={{ minHeight: 30, minWidth: 30, padding: '0 8px' }}
            title="搜索"
          >
            <Search size={14} />
          </button>
        </form>
      </div>

      {/* 结果区：骨架屏 / 空态 / 4 列网格 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && (
          <div className="grid grid-cols-4 gap-1.5 p-2">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: '100%', aspectRatio: '1/1' }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <ImageOff size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{error}</p>
            <button
              onClick={() => void doSearch(keyword.trim(), 1)}
              className="btn btn-sm mt-3"
              style={{ minHeight: 30 }}
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && searched && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <ImageOff size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>没有找到相关表情包</p>
          </div>
        )}

        {!loading && !error && !searched && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <ImageOff size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>输入关键词搜索表情包</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 p-2">
            {items.map((item, i) => (
              <button
                key={`${item.url}-${i}`}
                onClick={() => onPick(item.url)}
                className="block w-full overflow-hidden transition-transform hover:scale-105"
                style={{ aspectRatio: '1/1', border: '1px solid var(--color-divider)' }}
                title="插入到输入框"
              >
                <img
                  src={item.url}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
