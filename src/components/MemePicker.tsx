import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Search, ImageOff, Star, Flame, History, Clock, Loader2, Plus, Trash2 } from 'lucide-react';
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
const MAX_FAVS = 50;          // 我的表情上限
const MAX_RECENT = 10;        // 最近搜索上限
const MAX_VISIBLE = 200;      // 搜索区最多同时展示（防 DOM 膨胀）

const RECENT_KEY = 'arcle_meme_recent';
const FAV_KEY = 'arcle_meme_favs';
const RECOMMEND_POOL = ['笑哭', '开心', '可爱', '赞', '难过', '生气', '委屈', '比心', 'OK', '666'];

type Tab = 'search' | 'favorites' | 'recent';

/** 安全解析 localStorage JSON（损坏时返回兜底值，不抛错） */
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 存储不可用/超限时静默 */
  }
}

/**
 * 表情包搜索选择面板
 *
 * 三个 Tab：
 * - 搜索：关键词 + 分页「加载更多」（xiaoapi 实测 page 1/2/3 无重复，返回 < PAGE_SIZE 即到头）
 * - 我的表情：收藏的表情包（localStorage，上限 MAX_FAVS），点图可取消收藏
 * - 最近：最近搜索关键词（localStorage，上限 MAX_RECENT），点关键词即重搜
 *
 * 未输入关键词时默认展示「推荐」：从 RECOMMEND_POOL 轮播取一批通用词搜索。
 * 样式遵守 CLAUDE.md：容器 0 圆角、CSS 变量、无渐变无发光、内部小元素 3px。
 */
export function MemePicker({ keyword: initialKeyword, onPick, onClose }: MemePickerProps) {
  const [tab, setTab] = useState<Tab>('search');
  const [keyword, setKeyword] = useState(initialKeyword);
  const [items, setItems] = useState<MemeItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [favs, setFavs] = useState<MemeItem[]>(() => readJson<MemeItem[]>(FAV_KEY, []));
  const [recent, setRecent] = useState<string[]>(() => readJson<string[]>(RECENT_KEY, []));
  const seqRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  // 聚焦搜索框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 持久化
  useEffect(() => { writeJson(FAV_KEY, favs); }, [favs]);
  useEffect(() => { writeJson(RECENT_KEY, recent); }, [recent]);

  const pushRecent = useCallback((q: string) => {
    const t = q.trim();
    if (t.length === 0) return;
    setRecent((prev) => [t, ...prev.filter((x) => x !== t)].slice(0, MAX_RECENT));
  }, []);

  const isFav = useCallback((url: string) => favs.some((f) => f.url === url), [favs]);

  const toggleFav = useCallback((item: MemeItem) => {
    setFavs((prev) => {
      const exists = prev.some((f) => f.url === item.url);
      if (exists) return prev.filter((f) => f.url !== item.url);
      const next = [item, ...prev];
      return next.length > MAX_FAVS ? next.slice(0, MAX_FAVS) : next;
    });
  }, []);

  /** 搜索第 page 页并「替换」列表（page=1）或「追加」（page>1） */
  const doSearch = useCallback(async (msg: string, page: number, append: boolean) => {
    const q = msg.trim();
    if (q.length === 0 || q.length > MAX_KEYWORD_LEN) return;
    const seq = ++seqRef.current;
    busyRef.current = true;
    if (append) setLoadingMore(true); else { setError(''); }
    try {
      const res = await memeApi.search(q, page, PAGE_SIZE);
      if (seq !== seqRef.current) return; // 旧请求结果丢弃
      pageRef.current = page;
      const fresh = res.list.slice(0, PAGE_SIZE);
      setItems((prev) => {
        if (!append) return fresh;
        const seen = new Set(prev.map((i) => i.url));
        const dedup = fresh.filter((i) => !seen.has(i.url));
        const merged = [...prev, ...dedup];
        return merged.length > MAX_VISIBLE ? merged.slice(0, MAX_VISIBLE) : merged;
      });
      setHasMore(fresh.length >= PAGE_SIZE);
      setSearched(true);
    } catch (e) {
      if (seq !== seqRef.current) return;
      if (!append) { setItems([]); setSearched(true); }
      setError(e instanceof Error ? e.message : '表情包搜索失败，请稍后再试');
    } finally {
      if (seq === seqRef.current) busyRef.current = false;
      if (seq === seqRef.current) setLoadingMore(false);
    }
  }, []);

  const searchKeyword = useCallback((q: string) => {
    setKeyword(q.slice(0, MAX_KEYWORD_LEN));
    pushRecent(q);
    void doSearch(q, 1, false);
  }, [doSearch, pushRecent]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const q = keyword.trim();
    if (q.length === 0) return;
    void doSearch(q, pageRef.current + 1, true);
  }, [loadingMore, hasMore, keyword, doSearch]);

  // 打开面板时：带初始关键词则搜；空关键词则展示「推荐」（轮播词）
  useEffect(() => {
    const q = initialKeyword.trim();
    if (q.length >= 1 && q.length <= MAX_KEYWORD_LEN) {
      void doSearch(q, 1, false);
    } else {
      // 推荐：取 1 个池内词做首搜（不记入最近，不切 tab）
      const recommendWord = RECOMMEND_POOL[0];
      setSearched(false);
      void doSearch(recommendWord, 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (q.length === 0) return;
    searchKeyword(q);
  };

  // 点「最近」关键词 → 切搜索 tab 并重搜
  const onRecentClick = (q: string) => {
    setTab('search');
    searchKeyword(q);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const isRecommend = !keyword.trim(); // 当前无关键词（展示的是推荐结果）

  const tabBtns: { key: Tab; label: string; icon: typeof Search }[] = [
    { key: 'search', label: '搜索', icon: Search },
    { key: 'favorites', label: '我的表情', icon: Star },
    { key: 'recent', label: '最近', icon: History },
  ];

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
          表情包
        </span>
        <button onClick={onClose} className="p-0.5" style={{ color: 'var(--color-text-muted)' }} title="关闭">
          <X size={14} />
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex flex-shrink-0 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        {tabBtns.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-2 text-xs flex items-center justify-center gap-1 transition-colors"
              style={active
                ? { color: 'var(--color-primary)', background: 'var(--color-primary-light)', borderBottom: '2px solid var(--color-primary)' }
                : { color: 'var(--color-text-muted)', background: 'transparent', borderBottom: '2px solid transparent' }}
              >
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>

      {/* 搜索输入框（仅搜索 tab） */}
      {tab === 'search' && (
        <div className="p-2 flex-shrink-0" style={{ background: 'var(--color-card)' }}>
          <form onSubmit={submitSearch} className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={isRecommend ? '搜索表情包，如：鄙视' : '换个词试试'}
              maxLength={MAX_KEYWORD_LEN}
              className="flex-1 min-w-0 text-sm bg-transparent border outline-none"
              style={{
                color: 'var(--color-text)',
                borderColor: 'var(--color-border)',
                padding: '6px 10px',
              }}
            />
            {isRecommend && (
              <span className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--color-warning)' }}>
                <Flame size={12} /> 推荐
              </span>
            )}
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
      )}

      {/* 内容区 */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {/* ===== 搜索 / 推荐 ===== */}
        {tab === 'search' && (
          <>
            {loadingMore && (
              <div className="flex items-center justify-center py-3">
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
              </div>
            )}

            {!loadingMore && error && (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <ImageOff size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{error}</p>
                <button onClick={() => void doSearch(keyword.trim() || RECOMMEND_POOL[0], 1, false)} className="btn btn-sm mt-3" style={{ minHeight: 30 }}>
                  重试
                </button>
              </div>
            )}

            {!loadingMore && !error && searched && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <ImageOff size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>没有找到相关表情包</p>
              </div>
            )}

            {!loadingMore && !error && items.length > 0 && (
              <>
                {isRecommend && (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <Flame size={12} style={{ color: 'var(--color-warning)' }} />
                    为你推荐的热门表情包，输入关键词搜索更多
                  </div>
                )}
                <div className="grid grid-cols-4 gap-1.5 p-2">
                  {items.map((item, i) => (
                    <MemeThumb
                      key={`${item.url}-${i}`}
                      item={item}
                      isFav={isFav(item.url)}
                      onPick={onPick}
                      onToggleFav={toggleFav}
                    />
                  ))}
                </div>
                {hasMore && !isRecommend && (
                  <div className="flex justify-center py-2">
                    <button onClick={loadMore} disabled={loadingMore} className="btn btn-sm" style={{ minHeight: 30 }}>
                      {loadingMore ? <Loader2 size={13} className="animate-spin" /> : '加载更多'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== 我的表情 ===== */}
        {tab === 'favorites' && (
          <>
            {favs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Star size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>还没有收藏的表情包</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>搜索时点图片右上角 ★ 即可收藏</p>
                <button onClick={() => setTab('search')} className="btn btn-sm mt-3" style={{ minHeight: 30 }}>
                  去搜索
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 p-2">
                {favs.map((item, i) => (
                  <MemeThumb key={`fav-${item.url}-${i}`} item={item} isFav onPick={onPick} onToggleFav={toggleFav} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== 最近 ===== */}
        {tab === 'recent' && (
          <>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Clock size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>还没有搜索记录</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {recent.map((q) => (
                  <div key={q} className="flex items-center gap-2 px-2 py-1.5 text-sm group" style={{ background: 'var(--color-bg-page)' }}>
                    <Search size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    <button
                      onClick={() => onRecentClick(q)}
                      className="flex-1 text-left truncate transition-colors"
                      style={{ color: 'var(--color-text)' }}
                      title="再次搜索"
                    >
                      {q}
                    </button>
                    <button
                      onClick={() => setRecent((prev) => prev.filter((x) => x !== q))}
                      className="opacity-0 group-hover:opacity-100 p-0.5 transition-opacity flex-shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}
                      title="删除这条记录"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {recent.length > 0 && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setRecent([])}
                      className="text-xs flex items-center gap-1 px-2 py-1 transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Trash2 size={12} /> 清空
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** 单张表情包缩略图：点图插入输入框，右上角 ★ 收藏/取消 */
function MemeThumb({ item, isFav, onPick, onToggleFav }: {
  item: MemeItem;
  isFav: boolean;
  onPick: (url: string) => void;
  onToggleFav: (item: MemeItem) => void;
}) {
  return (
    <div className="relative block w-full" style={{ aspectRatio: '1/1' }}>
      <button
        onClick={() => onPick(item.url)}
        className="block w-full h-full overflow-hidden transition-transform hover:scale-105"
        style={{ border: '1px solid var(--color-divider)' }}
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
      <button
        onClick={() => onToggleFav(item)}
        className="absolute top-0.5 right-0.5 p-1 transition-colors"
        style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 3 }}
        title={isFav ? '取消收藏' : '收藏到「我的表情」'}
      >
        {isFav ? (
          <Star size={12} style={{ color: 'var(--color-warning)', fill: 'var(--color-warning)' }} />
        ) : (
          <Plus size={12} style={{ color: '#FFFFFF' }} />
        )}
      </button>
    </div>
  );
}
