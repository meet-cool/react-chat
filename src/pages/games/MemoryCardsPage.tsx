import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { gameApi } from '../../lib/api';
import { useApp } from '../../lib/AppContext';

interface Props {
  onBack: () => void;
}

export function MemoryCardsPage({ onBack }: Props) {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium'>('easy');
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [matched, setMatched] = useState<boolean[]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [won, setWon] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    initGame();
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [difficulty]);

  async function initGame() {
    const data = await gameApi.memoryCardsState(difficulty);
    setCards(data.cards);
    setFlipped(new Array(data.cards.length).fill(false));
    setMatched(new Array(data.cards.length).fill(false));
    setMoves(0);
    setTimer(0);
    setWon(false);
    setLocked(false);
  }

  function handleCardClick(index: number) {
    if (flipped[index] || matched[index] || locked || won) return;

    const newFlipped = [...flipped];
    newFlipped[index] = true;
    setFlipped(newFlipped);

    const flippedIndices = newFlipped.map((f, i) => f && !matched[i] ? i : -1).filter(i => i >= 0);

    if (flippedIndices.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);
      const [first, second] = flippedIndices;

      if (cards[first] === cards[second]) {
        setTimeout(() => {
          const newMatched = [...matched];
          newMatched[first] = true;
          newMatched[second] = true;
          setMatched(newMatched);
          setFlipped(new Array(cards.length).fill(false));
          setLocked(false);

          if (newMatched.every(m => m)) {
            setWon(true);
            const score = Math.max(100 - moves * 2 - Math.floor(timer / 5), 10);
            gameApi.submitScore('memory_cards', { score, level: difficulty === 'easy' ? 1 : 2, time_used: timer }).then(() => {
              addToast('恭喜通关！积分已发放', 'success');
            });
          }
        }, 500);
      } else {
        setTimeout(() => {
          const newFlipped = [...flipped];
          newFlipped[first] = false;
          newFlipped[second] = false;
          setFlipped(newFlipped);
          setLocked(false);
        }, 1000);
      }
    }
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
        <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ minHeight: 36 }}>← 返回</button>
        <h1 className="text-lg font-semibold flex-1" style={{ color: 'var(--color-text)' }}>记忆翻牌</h1>
        <button onClick={initGame} className="btn btn-sm" style={{ minHeight: 36 }}>
          <RefreshCw size={14} /> 重置
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(['easy', 'medium'] as const).map(d => (
              <button key={d} onClick={() => setDifficulty(d)} className="btn btn-sm" style={{ minHeight: 32 }}>
                {d === 'easy' ? '简单 (6对)' : '中等 (8对)'}
              </button>
            ))}
          </div>
          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            步数: {moves} | 时间: {formatTime(timer)}
          </div>
        </div>

        {won ? (
          <div className="text-center py-12" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>恭喜通关！</h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>用了 {moves} 步，耗时 {formatTime(timer)}</p>
            <button onClick={initGame} className="btn btn-primary" style={{ minHeight: 44 }}>再来一局</button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2" style={{ aspectRatio: '1' }}>
            {cards.map((card, index) => (
              <button
                key={index}
                onClick={() => handleCardClick(index)}
                className="flex items-center justify-center text-3xl transition-all duration-300 border"
                style={{
                  background: matched[index] ? 'var(--color-success-light)' : flipped[index] ? 'var(--color-primary-light)' : 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  opacity: matched[index] ? 0.6 : 1,
                }}
              >
                {flipped[index] || matched[index] ? card : '?'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
