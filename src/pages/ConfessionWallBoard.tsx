import { useCallback, useEffect, useRef, useState } from 'react';
import type { TouchEvent as ReactTouchEvent, Touch } from 'react';
declare global {
  interface Window { __lastTouch: Touch | null; }
}
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  MapPin,
  Plus,
  X,
  Heart,
  MessageCircle,
  Trophy,
} from 'lucide-react';
import { confessionApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { Confession } from '../types';
import { CONFESSION_THEMES, SOLID_BG_COLORS, SVG_BG_OPTIONS } from '../lib/confessionThemes';
import type { ConfessionTheme } from '../lib/confessionThemes';

interface WallPos {
  id: number;
  row: number;
  col: number;
  bg_type: string;
  bg_color: string;
  bg_svg: string;
  confession: {
    id: number;
    slug: string;
    content: string;
    target_name: string;
    username: string;
    avatar: string;
    like_count: number;
  };
}

export function ConfessionWallBoard() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [myWall, setMyWall] = useState<WallPos[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [allConfessions, setAllConfessions] = useState<Confession[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedConfession, setSelectedConfession] = useState<Confession | null>(null);
  const [selectedRow, setSelectedRow] = useState(0);
  const [selectedCol, setSelectedCol] = useState(0);
  const [placeBgType, setPlaceBgType] = useState<'solid' | 'svg'>('solid');
  const [placeBgColor, setPlaceBgColor] = useState('#FFFFFF');
  const [placeBgSvg, setPlaceBgSvg] = useState('');
  const [placing, setPlacing] = useState(false);
  const [gridRows, setGridRows] = useState(6);
  const [gridCols, setGridCols] = useState(6);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ active: boolean; fromRow: number; fromCol: number; timer: ReturnType<typeof setTimeout> | null; lastMoveX: number; lastMoveY: number }>({ active: false, fromRow: -1, fromCol: -1, timer: null, lastMoveX: 0, lastMoveY: 0 });
  const [dragHover, setDragHover] = useState<{ r: number; c: number } | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; r: number; c: number } | null>(null);
  const placedCellRef = useRef<{ r: number; c: number } | null>(null);

  const loadMyWall = useCallback(async () => {
    try {
      const data = await confessionApi.myWall();
      setMyWall(data);
    } catch {
      // 未登录
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfessions = useCallback(async () => {
    try {
      const res = await confessionApi.list(1, { sort: 'likes' });
      setAllConfessions(res.items);
    } catch {}
  }, []);

  useEffect(() => {
    loadMyWall();
    loadConfessions();
  }, [loadMyWall, loadConfessions]);

  useEffect(() => {
  }, []);

  const occupiedKeys = new Set(myWall.map((w) => `${w.row},${w.col}`));

  const getEmptyPositions = useCallback(async (rows: number, cols: number) => {
    try {
      const data = await confessionApi.emptyPositions(rows, cols);
      return data;
    } catch {
      return [];
    }
  }, []);

  const handlePlace = async () => {
    if (!selectedConfession) return;
    setPlacing(true);
    try {
      const useRow = placedCellRef.current ? placedCellRef.current.r : selectedRow;
      const useCol = placedCellRef.current ? placedCellRef.current.c : selectedCol;
      placedCellRef.current = null;
      await confessionApi.placeOnWall({
        confession_id: selectedConfession.id,
        row: useRow,
        col: useCol,
        bg_type: placeBgType,
        bg_color: placeBgColor,
        bg_svg: placeBgSvg,
      });
      addToast('已贴上墙', 'success');
      setShowPlaceModal(false);
      setSelectedConfession(null);
      loadMyWall();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '放置失败', 'error');
    } finally {
      setPlacing(false);
    }
  };

  const openPlaceModal = (confession: Confession) => {
    setSelectedConfession(confession);
    setSelectedRow(0);
    setSelectedCol(0);
    setPlaceBgType('solid');
    setPlaceBgColor('#FFFFFF');
    setPlaceBgSvg('');
    setShowPlaceModal(true);
  };

  const handleOpenPlaceModal = () => {
    loadConfessions().then(() => setShowPlaceModal(true));
  };

  const handleClickEmptyCell = useCallback((r: number, c: number) => {
    loadConfessions().catch(() => {});
    setSelectedRow(r);
    setSelectedCol(c);
    placedCellRef.current = { r, c };
    setShowPlaceModal(true);
  }, [loadConfessions]);

  const filteredConfessions = allConfessions.filter((c) =>
    searchKeyword === ''
      ? true
      : c.content.includes(searchKeyword) || c.target_name.includes(searchKeyword)
  );

  const alreadyOnWall = new Set(myWall.map((w) => w.confession.slug));

  // 长按拖动逻辑
  const startDrag = useCallback((r: number, c: number) => {
    const ws = dragStateRef.current;
    if (ws.active) return;
    ws.timer = setTimeout(() => {
      ws.active = true;
      ws.fromRow = r;
      ws.fromCol = c;
    }, 300);
  }, []);

  const cancelDrag = useCallback(() => {
    const ws = dragStateRef.current;
    if (ws.timer) { clearTimeout(ws.timer); ws.timer = null; }
    ws.active = false;
    setDragHover(null);
  }, []);

  const findCellUnderTouch = useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cell = el.closest('[data-wall-cell]');
    if (!cell) return null;
    const row = Number((cell as HTMLElement).dataset.row);
    const col = Number((cell as HTMLElement).dataset.col);
    return { r: row, c: col };
  }, []);

  const handleTouchStart = useCallback((e: ReactTouchEvent, r: number, c: number) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, r, c };
  }, []);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    const ws = dragStateRef.current;
    if (!ws.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    ws.lastMoveX = touch.clientX;
    ws.lastMoveY = touch.clientY;
    const hit = findCellUnderTouch(touch.clientX, touch.clientY);
    setDragHover(hit);
  }, [findCellUnderTouch]);

  const handleTouchEnd = useCallback(async (e: ReactTouchEvent) => {
    const ws = dragStateRef.current;
    if (!ws.active) return;
    ws.active = false;
    if (ws.timer) { clearTimeout(ws.timer); ws.timer = null; }
    const hover = dragHover;
    setDragHover(null);
    if (hover && !(hover.r === ws.fromRow && hover.c === ws.fromCol)) {
      try {
        await confessionApi.moveOnWall({
          from_row: ws.fromRow,
          from_col: ws.fromCol,
          to_row: hover.r,
          to_col: hover.c,
        });
        addToast('已移动', 'success');
        loadMyWall();
      } catch (err) {
        addToast(err instanceof Error ? err.message : '移动失败', 'error');
      }
    }
  }, [dragHover, addToast, loadMyWall]);

  const isDragging = dragStateRef.current.active;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg-page)' }}>
      {/* 顶部 */}
      <header
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
      >
        <button className="btn btn-sm" onClick={() => navigate('/confessions')} style={{ borderRadius: '3px' }}>
          <ArrowLeft size={14} /> 返回
        </button>
        <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
        <span className="font-bold text-base" style={{ color: 'var(--color-text)' }}>我的表白墙</span>
        <div className="flex-1" />
        <button
          className="btn btn-sm btn-primary"
          onClick={handleOpenPlaceModal}
          style={{ borderRadius: '3px' }}
        >
          <Plus size={14} /> 贴一张
        </button>
      </header>

      {/* 墙面板 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 animate-spin rounded-full" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中...</span>
            </div>
          </div>
        ) : (
          <div
            ref={gridRef}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="inline-grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(160px, 1fr))`,
              maxWidth: '100%',
            }}
          >
            {Array.from({ length: gridRows }, (_, r) =>
              Array.from({ length: gridCols }, (_, c) => {
                const wallPos = myWall.find((w) => w.row === r && w.col === c);
                const isSource = dragStateRef.current.active && dragStateRef.current.fromRow === r && dragStateRef.current.fromCol === c;
                const isHoverTarget = dragHover?.r === r && dragHover?.c === c;
                return (
                  <div
                    key={`${r}-${c}`}
                    className="relative aspect-square"
                    data-wall-cell
                    data-row={r}
                    data-col={c}
                    style={{ minWidth: 160 }}
                  >
                    {wallPos ? (
                      <WallCard
                        wallPos={wallPos}
                        onDetail={() => navigate(`/confessions/${wallPos.confession.slug}`)}
                        onLongPress={() => startDrag(r, c)}
                        isDragSource={isSource}
                        isDragHoverTarget={isHoverTarget}
                        isDragging={isDragging}
                        onTouchStart={(e) => handleTouchStart(e, r, c)}
                      />
                    ) : (
                      <div
                        className="w-full h-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all active:scale-95"
                        style={{
                          borderColor: isHoverTarget ? 'var(--color-primary)' : 'var(--color-border-light)',
                          borderRadius: '3px',
                          opacity: isHoverTarget ? 1 : 0.5,
                        }}
                        onClick={() => handleClickEmptyCell(r, c)}
                        onTouchStart={(e) => {
                          const t = e.touches[0];
                          touchStartPosRef.current = { x: t.clientX, y: t.clientY, r, c };
                        }}
                        onTouchEnd={(e) => {
                          if (dragStateRef.current.active) return;
                          handleClickEmptyCell(r, c);
                        }}
                      >
                        <Plus size={20} style={{ color: isHoverTarget ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 贴墙弹窗 */}
      {showPlaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-divider)' }}>
              <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>贴上墙</span>
              <div className="flex-1" />
              <button onClick={() => setShowPlaceModal(false)} style={{ color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* 表白列表选择 */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-divider)', maxHeight: 200, overflowY: 'auto' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-light)' }}>选择表白</div>
              {allConfessions.length === 0 ? (
                <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-muted)' }}>暂无表白</p>
              ) : (
                <div className="space-y-1">
                  {allConfessions.map((c) => (
                    <button
                      key={c.id}
                      className={`w-full text-left px-3 py-2 text-xs transition-all rounded-sm ${alreadyOnWall.has(c.slug) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'}`}
                      style={{ background: selectedConfession?.id === c.id ? 'var(--color-primary-light)' : 'transparent', borderRadius: '3px', color: 'var(--color-text)' }}
                      disabled={alreadyOnWall.has(c.slug)}
                      onClick={() => !alreadyOnWall.has(c.slug) && openPlaceModal(c)}
                    >
                      <span className="truncate block">{c.content}</span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {c.target_name && `→ ${c.target_name}`} · {c.like_count}喜欢{alreadyOnWall.has(c.slug) ? ' · 已上墙' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedConfession && (
            <div className="px-4 py-3" style={{ background: 'var(--color-card-alt)', borderBottom: '1px solid var(--color-divider)' }}>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                {selectedConfession.content}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {selectedConfession.target_name && `→ ${selectedConfession.target_name}`} · {selectedConfession.like_count} 喜欢
                {placedCellRef.current && <span style={{ color: 'var(--color-primary)', marginLeft: 8 }}>→ 第{placedCellRef.current.r + 1}行 第{placedCellRef.current.c + 1}列</span>}
              </p>
            </div>
            )}

            {/* 位置选择 */}
            <div className="p-4">
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-light)' }}>选择位置</div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>行:</span>
                <select value={selectedRow} onChange={(e) => setSelectedRow(Number(e.target.value))}
                  className="text-sm" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '4px 8px', color: 'var(--color-text)' }}>
                  {Array.from({ length: gridRows }, (_, i) => <option key={i} value={i}>第{i+1}行</option>)}
                </select>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>列:</span>
                <select value={selectedCol} onChange={(e) => setSelectedCol(Number(e.target.value))}
                  className="text-sm" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '4px 8px', color: 'var(--color-text)' }}>
                  {Array.from({ length: gridCols }, (_, i) => <option key={i} value={i}>第{i+1}列</option>)}
                </select>
                {(occupiedKeys.has(`${selectedRow},${selectedCol}`)) && (
                  <span className="text-xs" style={{ color: 'var(--color-error)' }}>该位置已被占用</span>
                )}
              </div>

              {/* 背景样式 */}
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-light)' }}>背景样式</div>
              <div className="flex gap-2 mb-3">
                <button
                  className={`btn btn-sm ${placeBgType === 'solid' ? 'btn-primary' : ''}`}
                  onClick={() => { setPlaceBgType('solid'); setPlaceBgSvg(''); }}
                  style={{ borderRadius: '3px' }}
                >
                  纯色
                </button>
                <button
                  className={`btn btn-sm ${placeBgType === 'svg' ? 'btn-primary' : ''}`}
                  onClick={() => { setPlaceBgType('svg'); setPlaceBgColor('#FFFFFF'); }}
                  style={{ borderRadius: '3px' }}
                >
                  SVG图案
                </button>
              </div>

              {placeBgType === 'solid' ? (
                <div className="flex flex-wrap gap-2">
                  {SOLID_BG_COLORS.map((c) => (
                    <button
                      key={c}
                      className="w-8 h-8 border-2 transition-all hover:scale-110"
                      style={{
                        background: c,
                        borderColor: placeBgColor === c ? 'var(--color-primary)' : 'var(--color-border)',
                        borderRadius: '3px',
                      }}
                      onClick={() => setPlaceBgColor(c)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {SVG_BG_OPTIONS.filter((s) => s.value !== '').map((s) => (
                    <button
                      key={s.name}
                      className={`px-3 py-1.5 text-xs border transition-all ${placeBgSvg === s.value ? 'border-primary' : ''}`}
                      style={{
                        borderColor: placeBgSvg === s.value ? 'var(--color-primary)' : 'var(--color-border)',
                        background: placeBgSvg === s.value ? 'var(--color-primary-light)' : 'var(--color-card)',
                        color: 'var(--color-text)',
                        borderRadius: '3px',
                      }}
                      onClick={() => setPlaceBgSvg(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--color-divider)' }}>
              <button className="btn btn-sm" onClick={() => setShowPlaceModal(false)} style={{ borderRadius: '3px' }}>取消</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handlePlace}
                disabled={placing || occupiedKeys.has(`${selectedRow},${selectedCol}`)}
                style={{ borderRadius: '3px' }}
              >
                {placing ? '保存中...' : '确认贴上'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WallCard({ wallPos, onDetail, onLongPress, isDragSource, isDragHoverTarget, isDragging, onTouchStart }: {
  wallPos: WallPos;
  onDetail: () => void;
  onLongPress?: () => void;
  isDragSource?: boolean;
  isDragHoverTarget?: boolean;
  isDragging?: boolean;
  onTouchStart?: (e: ReactTouchEvent) => void;
}) {
  const themeKey = (wallPos.confession.slug ? 'default' : 'default') as ConfessionTheme;
  const T = CONFESSION_THEMES[themeKey];
  const cardStyle: React.CSSProperties = wallPos.bg_type === 'svg' && wallPos.bg_svg
    ? { backgroundImage: `url(/${wallPos.bg_svg}.svg)`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: wallPos.bg_color || T.cardBg };

  return (
    <div
      className={`transition-all duration-150 ${isDragSource ? 'opacity-30 scale-95' : 'hover:scale-105 hover:z-10'} ${isDragHoverTarget ? 'ring-2 ring-[var(--color-primary)] ring-offset-1' : ''}`}
      style={{
        ...cardStyle,
        border: `1px solid ${wallPos.bg_type === 'solid' ? T.cardBorder : 'transparent'}`,
        borderRadius: '3px',
        boxShadow: T.cardShadow,
        height: '100%',
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
        touchAction: 'none',
      }}
      onClick={() => { if (!isDragging) onDetail(); }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        window.__lastTouch = t;
        if (onTouchStart) onTouchStart(e);
        if (onLongPress) onLongPress();
      }}
      onTouchMove={(e) => {
        window.__lastTouch = e.touches[0] as unknown as Touch;
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Heart size={11} style={{ color: T.accent }} />
        <span className="text-[10px]" style={{ color: T.muted }}>{wallPos.confession.like_count}</span>
        <div className="flex-1" />
        <MessageCircle size={11} style={{ color: T.muted }} />
      </div>
      <p className="text-xs flex-1 line-clamp-3 leading-relaxed" style={{ color: T.cardText }}>
        {wallPos.confession.content}
      </p>
      <div className="mt-1.5 text-[10px]" style={{ color: T.muted }}>
        {wallPos.confession.target_name && `→ ${wallPos.confession.target_name}`}
      </div>
    </div>
  );
}
