import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Check } from 'lucide-react';
import { gameApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';

interface Props {
  onBack: () => void;
}

interface GuessResult {
  digits: number[];
  bulls: number;
  cows: number;
}

export function NumberGuessPage({ onBack }: Props) {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [secretCode, setSecretCode] = useState('');
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [maxAttempts] = useState(10);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    generateNewGame();
  }, []);

  async function generateNewGame() {
    const code = await gameApi.generateNumberGuess();
    setSecretCode(code.code);
    setGuesses([]);
    setCurrentGuess('');
    setWon(false);
    setLost(false);
  }

  function handleSubmit() {
    if (currentGuess.length !== 4) {
      addToast('请输入4位数字', 'warning');
      return;
    }

    const digits = currentGuess.split('').map(Number);
    let bulls = 0, cows = 0;

    digits.forEach((d, i) => {
      if (d === parseInt(secretCode[i])) {
        bulls++;
      } else if (secretCode.includes(d.toString())) {
        cows++;
      }
    });

    const newGuesses = [{ digits, bulls, cows }, ...guesses];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (bulls === 4) {
      setWon(true);
      gameApi.submitScore('number_guess', { score: Math.max(100 - newGuesses.length * 5, 10), time_used: newGuesses.length * 10 }).then(() => {
        addToast('恭喜猜对！积分已发放', 'success');
      });
    } else if (newGuesses.length >= maxAttempts) {
      setLost(true);
      addToast(`游戏结束，正确答案是 ${secretCode}`, 'error');
    }
  }

  function handleDigitClick(digit: string) {
    if (currentGuess.length < 4) {
      setCurrentGuess(prev => prev + digit);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
      <div className="sticky top-0 z-40 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--color-divider)', backdropFilter: 'blur(8px)' }}>
        <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ minHeight: 36 }}>← 返回</button>
        <h1 className="text-lg font-semibold flex-1" style={{ color: 'var(--color-text)' }}>猜数字</h1>
        <button onClick={generateNewGame} className="btn btn-sm" style={{ minHeight: 36 }}>
          <RefreshCw size={14} /> 新游戏
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-sm mb-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
          猜测4位随机数字，A表示位置正确，B表示数字正确但位置错误
        </p>

        {guesses.length > 0 && (
          <div className="mb-4 space-y-2">
            {guesses.map((g, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                <span className="font-mono text-lg" style={{ color: 'var(--color-text)' }}>
                  {g.digits.join('')}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-success)' }}>{g.bulls}A</span>
                <span className="text-sm" style={{ color: 'var(--color-warning)' }}>{g.cows}B</span>
              </div>
            ))}
          </div>
        )}

        {won ? (
          <div className="text-center py-12" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>恭喜猜对！</h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>用了 {guesses.length} 次尝试</p>
            <button onClick={generateNewGame} className="btn btn-primary" style={{ minHeight: 44 }}>再来一局</button>
          </div>
        ) : lost ? (
          <div className="text-center py-12" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-6xl mb-4">😢</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>游戏结束</h2>
            <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>正确答案是：</p>
            <p className="text-3xl font-mono font-bold mb-4" style={{ color: 'var(--color-primary)' }}>{secretCode}</p>
            <button onClick={generateNewGame} className="btn btn-primary" style={{ minHeight: 44 }}>再来一局</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              {currentGuess.split('').concat(Array(4 - currentGuess.length).fill('')).map((d, i) => (
                <div key={i} className="flex-1 aspect-square flex items-center justify-center text-2xl font-bold border"
                  style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: d ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                  {d || ''}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(d => (
                <button key={d} onClick={() => handleDigitClick(d)} className="btn btn-sm" style={{ minHeight: 48 }}>
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={currentGuess.length !== 4}
              className="btn btn-primary w-full"
              style={{ minHeight: 48, opacity: currentGuess.length === 4 ? 1 : 0.5 }}
            >
              <Check size={16} /> 确认
            </button>

            <p className="text-center text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
              剩余尝试次数: {maxAttempts - guesses.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
