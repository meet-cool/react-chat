import { useState } from 'react';
import {
  Hash,
  Heart,
  Star,
  Sparkles,
  GraduationCap,
  Palette,
  ChevronLeft,
  ChevronRight,
  Rocket,
} from 'lucide-react';

const STEPS: { title: string; desc: string; icon: React.ReactNode }[] = [
  {
    title: '欢迎来到弧光',
    desc: '弧光是一个集聊天、社区、学习于一体的社交平台。这份新手指导带你 1 分钟了解全部核心功能，随时可在左侧「菜单」中再次打开。',
    icon: <Rocket size={28} />,
  },
  {
    title: '聊天与群聊',
    desc: '「聊天室」加入公共房间实时畅聊；「群聊」支持入群审批、禁言等管理能力；「通讯录」可关注用户并发起私聊。消息支持表情回应、引用回复与转发。',
    icon: <Hash size={28} />,
  },
  {
    title: '社区与趣味玩法',
    desc: '「表白墙」匿名/实名表白，支持点赞评论排行；「漂流瓶」把心事扔进大海，捡起陌生人的瓶子；「朋友圈」记录生活动态。',
    icon: <Heart size={28} />,
  },
  {
    title: '积分与插件',
    desc: '签到、发言、被点赞都能赚积分；「积分中心」可兑换商城好礼；「插件市场」内置数独、记忆翻牌、猜数字等小游戏。',
    icon: <Star size={28} />,
  },
  {
    title: 'AI 助手',
    desc: '「AI 广场」提供快速/专业两种回答模式，支持深度思考与流式输出，随时帮你答疑解惑。',
    icon: <Sparkles size={28} />,
  },
  {
    title: '英语背单词',
    desc: '「英语学习」模块提供教材词书、听词选词、看词选意、听写默写等 7 种训练，并基于记忆曲线科学安排复习。',
    icon: <GraduationCap size={28} />,
  },
  {
    title: '个性化与安装',
    desc: '「菜单 → 设置」可切换浅色/深色/高对比主题；在支持的浏览器中可点击顶部「安装」把弧光装到桌面，像原生应用一样使用。',
    icon: <Palette size={28} />,
  },
];

export function BeginnerGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Escape 关闭
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      onKeyDown={onKeyDown}
    >
      <div
        className="w-full max-w-md flex flex-col shadow-[var(--shadow-lg)]"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === step ? 18 : 6,
                  height: 6,
                  background: i === step ? 'var(--color-primary)' : 'var(--color-border)',
                }}
              />
            ))}
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--color-text-muted)' }} aria-label="关闭新手指导">
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-5 text-center overflow-y-auto">
          <div
            className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 16 }}
          >
            {s.icon}
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            {s.title}
          </h3>
          <p className="text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
            {s.desc}
          </p>
        </div>

        {/* 底部操作 */}
        <div
          className="px-5 py-4 border-t flex items-center justify-between"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <button
            onClick={() => setStep((v) => Math.max(0, v - 1))}
            disabled={step === 0}
            className="btn btn-sm"
            style={{ minHeight: 34, borderRadius: 8, opacity: step === 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={14} /> 上一步
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {step + 1} / {STEPS.length}
          </span>
          {isLast ? (
            <button
              onClick={onClose}
              className="btn btn-primary btn-sm"
              style={{ minHeight: 34, borderRadius: 8 }}
            >
              开始使用 <Rocket size={13} className="ml-1" />
            </button>
          ) : (
            <button
              onClick={() => setStep((v) => Math.min(STEPS.length - 1, v + 1))}
              className="btn btn-primary btn-sm"
              style={{ minHeight: 34, borderRadius: 8 }}
            >
              下一步 <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
