import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { getApiBaseUrl } from '../lib/api';

/**
 * TriviaBar — "你知道吗"加载提示条
 *
 * 用途：页面数据加载中（骨架屏显示时），在页面底部固定显示一条
 *       "你知道吗"趣味提示，减轻用户等待焦虑。
 * 文案来源：GET /chat/public/trivia（数据库 system_trivia 表，后台可管理）。
 * 行为：挂载即拉取一条随机文案；请求失败时静默降级为不显示。
 * 展示：固定底部，半透明卡片 + 左侧色条，加载完成后由父组件卸载即消失。
 */
export function TriviaBar({ visible = true }: { visible?: boolean }) {
  const [trivia, setTrivia] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setTrivia(null);
      return;
    }
    let cancelled = false;
    fetch(`${getApiBaseUrl()}/chat/public/trivia`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.code === 200 && data.data?.content) {
          setTrivia(data.data.content);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible || !trivia) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 border-t shadow-[var(--shadow-md)]"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-divider)',
      }}
      role="status"
      aria-live="polite"
    >
      {/* 左侧色条 */}
      <div
        className="w-1 self-stretch flex-shrink-0"
        style={{ background: 'var(--color-primary)' }}
      />
      <Lightbulb size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
      <p className="text-sm flex-1 min-w-0" style={{ color: 'var(--color-text-secondary)' }}>
        {trivia}
      </p>
    </div>
  );
}
