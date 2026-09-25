import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { gameApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';

interface Props {
  onBack: () => void;
}

type Board = number[][];

// 华容道经典布局：4x5 网格，数字代表方块编号
// 0 = 空格，1 = 关羽（2x2大块），2-5 = 小卒（1x1）
const INITIAL_BOARD: Board = [
  [1, 1, 2, 3],
  [1, 1, 4, 5],
  [6, 6, 7, 3],
  [8, 6, 8, 5],
  [0, 2, 4, 7],
];

const BOARD_ROWS = 5;
const BOARD_COLS = 4;
const TILE_SIZE = 72; // px per cell

export function SlidingPuzzlePage({ onBack }: Props) {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [board, setBoard] = useState<Board>(() => shuffleBoard(INITIAL_BOARD));
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [won, setWon] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sliding_puzzle_best');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  useEffect(() => {
    if (won) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [won]);

  // 键盘控制
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (won) return;
      const zeroPos = findZero(board);
      switch (e.key) {
        case 'ArrowUp':    tryMove(zeroPos[0] + 1, zeroPos[1]); break;
        case 'ArrowDown':  tryMove(zeroPos[0] - 1, zeroPos[1]); break;
        case 'ArrowLeft':  tryMove(zeroPos[0], zeroPos[1] + 1); break;
        case 'ArrowRight': tryMove(zeroPos[0], zeroPos[1] - 1); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [board, won]);

  function findZero(b: Board): [number, number] {
    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++)
        if (b[r][c] === 0) return [r, c];
    return [0, 0];
  }

  function tryMove(fromR: number, fromC: number) {
    if (fromR < 0 || fromR >= BOARD_ROWS || fromC < 0 || fromC >= BOARD_COLS) return;
    if (board[fromR][fromC] === 0) return;
    const newBoard = board.map(row => [...row]);
    const [zr, zc] = findZero(board);
    // swap with zero
    [newBoard[zr][zc], newBoard[fromR][fromC]] = [newBoard[fromR][fromC], newBoard[zr][zc]];
    setBoard(newBoard);
    setMoves(m => m + 1);
  }

  function checkWin(b: Board): boolean {
    // 目标：关羽(1)在右上角 2x2，其余按顺序排列
    if (b[0][0] !== 1 || b[0][1] !== 1 || b[1][0] !== 1 || b[1][1] !== 1) return false;
    const flat = b.flat().filter(v => v !== 0);
    const target = [2, 3, 4, 5, 6, 7, 8];
    return flat.join(',') === target.join(',');
  }

  useEffect(() => {
    if (checkWin(board) && !won) {
      setWon(true);
      const key = 'sliding_puzzle_best';
      const current = localStorage.getItem(key);
      if (!current || moves < parseInt(current, 10)) {
        localStorage.setItem(key, String(moves));
        setBestScore(moves);
      }
      addToast(`恭喜通关！用了 ${moves} 步，耗时 ${formatTime(timer)}`, 'success');
    }
  }, [board, moves, timer, won, addToast]);

  function shuffleBoard(original: Board): Board {
    // 从目标状态反向随机移动足够步数来打乱，保证有解
    let b = original.map(row => [...row]);
    let lastFrom = [-1, -1];
    const shuffleCount = 200;
    for (let i = 0; i < shuffleCount; i++) {
      const [zr, zc] = findZero(b);
      const neighbors: [number, number][] = [];
      if (zr > 0) neighbors.push([zr - 1, zc]);
      if (zr < BOARD_ROWS - 1) neighbors.push([zr + 1, zc]);
      if (zc > 0) neighbors.push([zr, zc - 1]);
      if (zc < BOARD_COLS - 1) neighbors.push([zr, zc + 1]);
      // 避免立即还原上一步
      const filtered = neighbors.filter(([r, c]) => !(r === lastFrom[0] && c === lastFrom[1]));
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      if (!pick) continue;
      const [fr, fc] = pick;
      lastFrom = [zr, zc];
      [b[zr][zc], b[fr][fc]] = [b[fr][fc], b[zr][zc]];
    }
    return b;
  }

  function handleNewGame() {
    setBoard(shuffleBoard(INITIAL_BOARD));
    setMoves(0);
    setTimer(0);
    setWon(false);
  }

  function formatTime(s: number): string {
    return `${Math.floor(s / 60)}分${s % 60}秒`;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-page)' }}>
      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ background: 'var(--color-card)', borderColor: 'var(--color-divider)' }}>
        <button onClick={onBack} className="btn btn-sm p-2" style={{ minHeight: 36, minWidth: 36 }} title="返回">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold flex-1" style={{ color: 'var(--color-text)' }}>华容道</h1>
        <button onClick={handleNewGame} className="btn btn-sm" style={{ minHeight: 36 }} title="新游戏">
          <RefreshCw size={14} /> 新游戏
        </button>
      </div>

      {/* 游戏信息 */}
      <div className="flex items-center gap-6 px-4 py-3" style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="text-center">
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>步数</div>
          <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{moves}</div>
        </div>
        <div className="text-center">
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>时间</div>
          <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{formatTime(timer)}</div>
        </div>
        {bestScore !== null && (
          <div className="text-center flex items-center gap-1">
            <Trophy size={14} style={{ color: 'var(--color-warning)' }} />
            <div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>最佳</div>
              <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{bestScore}步</div>
            </div>
          </div>
        )}
      </div>

      {/* 游戏棋盘 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="relative border-2 overflow-hidden"
          style={{
            width: BOARD_COLS * TILE_SIZE,
            height: BOARD_ROWS * TILE_SIZE,
            background: 'var(--color-bg)',
            borderColor: 'var(--color-border)',
          }}
        >
          {board.map((row, r) =>
            row.map((val, c) =>
              val === 0 ? null : (
                <Tile
                  key={`${r}-${c}`}
                  value={val}
                  row={r}
                  col={c}
                  size={TILE_SIZE}
                  onClick={() => {
                    if (!won) {
                      const [zr, zc] = findZero(board);
                      // 检查是否与空格相邻
                      if (Math.abs(r - zr) + Math.abs(c - zc) === 1) {
                        tryMove(r, c);
                      }
                    }
                  }}
                  isKing={val === 1}
                  canMove={!won && Math.abs(r - findZero(board)[0]) + Math.abs(c - findZero(board)[1]) === 1}
                />
              ),
            ),
          )}
        </div>
      </div>

      {/* 提示 */}
      <p className="text-center text-xs pb-4" style={{ color: 'var(--color-text-muted)' }}>
        点击方块移到空格 | 方向键移动 | 将关羽移至右上角即可通关
      </p>
    </div>
  );
}

function Tile({ value, row, col, size, isKing, canMove, onClick }: {
  value: number; row: number; col: number; size: number;
  isKing: boolean; canMove: boolean; onClick: () => void;
}) {
  const colors: Record<number, { bg: string; fg: string }> = {
    1: { bg: '#DC2626', fg: '#fff' },   // 关羽 - 红
    2: { bg: '#0077CC', fg: '#fff' },   // 张飞 - 蓝
    3: { bg: '#16A34A', fg: '#fff' },   // 马超 - 绿
    4: { bg: '#D97706', fg: '#fff' },   // 黄忠 - 橙
    5: { bg: '#7C3AED', fg: '#fff' },   // 赵云 - 紫
    6: { bg: '#DC2626', fg: '#fff' },   // 关羽(下)
    7: { bg: '#0077CC', fg: '#fff' },   // 张飞(下)
    8: { bg: '#6B7280', fg: '#fff' },   // 小兵 - 灰
  };
  const color = colors[value] ?? { bg: 'var(--color-primary)', fg: '#fff' };
  return (
    <button
      onClick={onClick}
      disabled={!canMove}
      className="absolute flex items-center justify-center font-bold transition-all duration-100"
      style={{
        left: col * size,
        top: row * size,
        width: size - 2,
        height: size - 2,
        background: color.bg,
        color: color.fg,
        fontSize: isKing ? 20 : 16,
        cursor: canMove ? 'pointer' : 'default',
        opacity: canMove ? 1 : 0.7,
        borderRadius: 3,
        border: 'none',
        outline: 'none',
      }}
    >
      {value}
    </button>
  );
}
