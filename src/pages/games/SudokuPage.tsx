import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-react';
import { gameApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';

interface Props {
  onBack: () => void;
}

type Board = number[][];

export function SudokuPage({ onBack }: Props) {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [puzzle, setPuzzle] = useState<Board>([]);
  const [solution, setSolution] = useState<Board>([]);
  const [board, setBoard] = useState<Board>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [timer, setTimer] = useState(0);
  const [won, setWon] = useState(false);
  const [errors, setErrors] = useState(0);

  useEffect(() => {
    generateNewGame();
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [difficulty]);

  async function generateNewGame() {
    const res = await gameApi.generateSudoku(difficulty);
    const puzzleBoard = res.puzzle;
    setPuzzle(puzzleBoard);
    setBoard(puzzleBoard.map((row: number[]) => [...row]));
    setSolution(generateSolution(puzzleBoard));
    setTimer(0);
    setWon(false);
    setErrors(0);
    setSelected(null);
  }

  function generateSolution(puzzle: Board): Board {
    const solved = puzzle.map(row => [...row]);
    solveSudoku(solved);
    return solved;
  }

  function solveSudoku(board: Board): boolean {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (board[i][j] === 0) {
          const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (isValid(board, i, j, num)) {
              board[i][j] = num;
              if (solveSudoku(board)) return true;
              board[i][j] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function isValid(board: Board, row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num) return false;
      if (board[i][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = startRow; i < startRow + 3; i++) {
      for (let j = startCol; j < startCol + 3; j++) {
        if (board[i][j] === num) return false;
      }
    }
    return true;
  }

  function shuffle(arr: number[]): number[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function handleCellClick(row: number, col: number) {
    if (puzzle[row][col] !== 0 || won) return;
    setSelected([row, col]);
  }

  function handleNumberInput(num: number) {
    if (!selected || won) return;
    const [row, col] = selected;
    if (puzzle[row][col] !== 0) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = num;
    setBoard(newBoard);

    if (num !== solution[row][col]) {
      setErrors(e => e + 1);
      if (errors + 1 >= 3) {
        addToast('错误次数过多，请重新开始', 'warning');
      }
    }

    if (checkWin(newBoard)) {
      setWon(true);
      gameApi.submitScore('sudoku', {
        score: Math.max(100 - errors * 10 - Math.floor(timer / 10), 10),
        level: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        time_used: timer,
      }).then(() => addToast('恭喜通关！积分已发放', 'success'));
    }
  }

  function checkWin(b: Board): boolean {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (b[i][j] !== solution[i][j]) return false;
      }
    }
    return true;
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
      <div className="sticky top-0 z-40 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--color-divider)', backdropFilter: 'blur(8px)' }}>
        <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ minHeight: 36 }}>
          ← 返回
        </button>
        <h1 className="text-lg font-semibold flex-1" style={{ color: 'var(--color-text)' }}>数独</h1>
        <button onClick={generateNewGame} className="btn btn-sm" style={{ minHeight: 36 }}>
          <RefreshCw size={14} /> 新游戏
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="btn btn-sm"
                style={{ minHeight: 32, opacity: difficulty === d ? 1 : 0.6 }}
              >
                {d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
              </button>
            ))}
          </div>
          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            时间: {formatTime(timer)} | 错误: {errors}/3
          </div>
        </div>

        {won ? (
          <div className="text-center py-12" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>恭喜通关！</h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>用时 {formatTime(timer)}，错误 {errors} 次</p>
            <button onClick={generateNewGame} className="btn btn-primary" style={{ minHeight: 44 }}>
              再来一局
            </button>
          </div>
        ) : (
          <>
            <div className="aspect-square w-full max-w-sm mx-auto mb-4" style={{ border: '2px solid var(--color-border)' }}>
              <div className="grid grid-cols-9 h-full">
                {board.map((row, i) =>
                  row.map((cell, j) => {
                    const isSelected = selected?.[0] === i && selected?.[1] === j;
                    const isFixed = puzzle[i][j] !== 0;
                    const boxBorder = (j + 1) % 3 === 0 && j < 8 ? 'border-r-2' : '';
                    const rowBorder = (i + 1) % 3 === 0 && i < 8 ? 'border-b-2' : '';
                    return (
                      <button
                        key={`${i}-${j}`}
                        onClick={() => handleCellClick(i, j)}
                        className={`flex items-center justify-center text-lg font-medium transition-all ${boxBorder} ${rowBorder}`}
                        style={{
                          border: '1px solid var(--color-border-light)',
                          background: isSelected ? 'var(--color-primary-light)' : isFixed ? 'var(--color-card-alt)' : 'var(--color-card)',
                          color: isFixed ? 'var(--color-text)' : cell !== 0 ? 'var(--color-primary)' : 'transparent',
                        }}
                      >
                        {cell !== 0 ? cell : ''}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-9 gap-1 max-w-sm mx-auto">
              {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num)}
                  className="aspect-square btn btn-sm"
                  style={{ minHeight: 40 }}
                >
                  {num}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
