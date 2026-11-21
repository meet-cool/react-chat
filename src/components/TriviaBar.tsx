import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * TriviaBar — "你知道吗"加载提示条
 *
 * 用途：页面数据加载中（骨架屏显示时），在页面底部固定显示一条
 *       "你知道吗"趣味提示，减轻用户等待焦虑。
 * 文案来源：前端本地内置（原为 GET /chat/public/trivia 后端接口，
 *           现改为本地随机，零请求、零延迟、离线可用）。
 * 行为：挂载即从本地文案池随机取一条；加载完成后由父组件卸载即消失。
 * 展示：固定底部，半透明卡片 + 左侧色条。
 *
 * 文案池说明：与数据库 system_trivia 表的初始种子文案保持一致（去重 10 条）；
 * 后台新增文案不会同步到前端，如需更换请修改下方 TRIVIA_POOL。
 */
const TRIVIA_POOL = [
  'Arcle 的"弧光"象征着每一次交流都是人与人的能量连接。',
  '聊天室支持 Long Polling，比 WebSocket 更适配 PHP 虚拟主机环境。',
  '你可以给关注的用户设置专属备注名，方便在通讯录中快速识别。',
  '积分不仅可以通过签到获取，完成游戏关卡也能赢取。',
  'AI 广场的 Bot 聊天支持自定义 Prompt，打造专属智能助手。',
  '漂流瓶扔出去后，随机一位用户会捡到它，开启一段匿名缘分。',
  '表白墙支持匿名发布，点赞和评论时也会隐藏真实身份。',
  '群聊管理员可以设置审批入群、禁言和转让群主等高级管理功能。',
  '游戏中心的排行榜会记录你的最高分，和好友一较高下。',
  '所有敏感操作（如修改密码）都需要二级密码确认，保障账号安全。',
];

export function TriviaBar({ visible = true }: { visible?: boolean }) {
  const [trivia, setTrivia] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setTrivia(null);
      return;
    }
    // 本地随机取一条（纯前端，不发请求）
    setTrivia(TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)]);
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
        你知道吗：{trivia}
      </p>
    </div>
  );
}
