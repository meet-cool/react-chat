import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  Hash,
  Zap,
  Shield,
  Smile,
  Lock,
  ArrowRight,
  TrendingUp,
  Globe,
  Heart,
} from 'lucide-react';
import { getToken } from '../lib/api';
import type { UserInfo } from '../types';
import titleImg from '../../public/title.png';

interface PublicStats {
  total_users: number;
  today_users: number;
  online_users: number;
  total_rooms: number;
  active_rooms: number;
  total_messages: number;
  today_messages: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="p-5 flex items-start gap-4 transition-all duration-200 hover:scale-105"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="w-12 h-12 flex items-center justify-center flex-shrink-0"
        style={{ background: color, color: '#FFFFFF' }}
      >
        <Icon size={24} />
      </div>
      <div>
        <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
          {value}
        </div>
        <div className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </div>
        {sub && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof MessageSquare;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="p-6 transition-all duration-200 hover:scale-105"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="w-12 h-12 flex items-center justify-center mb-4"
        style={{
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-primary)',
        }}
      >
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {desc}
      </p>
    </div>
  );
}

function StepItem({
  num,
  title,
  desc,
}: {
  num: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold text-lg"
        style={{
          background: 'var(--color-primary)',
          color: '#FFFFFF',
        }}
      >
        {num}
      </div>
      <div>
        <div className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          {title}
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

export function PortalPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  const navigatedRef = useRef(false);

  useEffect(() => {
    // 防止重复导航
    if (navigatedRef.current) return;
    navigatedRef.current = true;

    // 等待 App 完成用户检查后再跳转，避免循环重定向
    const timer = setTimeout(() => {
      const token = getToken();
      if (token) {
        navigate('/chat', { replace: true });
      }
    }, 800);

    // 加载公开统计数据
    fetch('/chat/public/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 200) {
          setStats(data.data);
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-bg-page)', color: 'var(--color-text)' }}
    >
      {/* 顶部导航 */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--color-divider)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
            >
              <MessageSquare size={18} />
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
              ARCLE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="btn btn-outline btn-sm"
              style={{ minHeight: 36 }}
            >
              登录
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-sm"
              style={{ minHeight: 36 }}
            >
              免费注册
            </button>
          </div>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* 标题图 */}

          <div
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm"
            style={{
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
            }}
          >
            <Zap size={16} />
            <span>实时群聊 · 多主题切换</span>
          </div>

          <h1
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
            style={{ color: 'var(--color-text)' }}
          >
            让沟通{' '}
            <span style={{ color: 'var(--color-primary)' }}>更高效</span>
            <br />
            让连接{' '}
            <span style={{ color: 'var(--color-primary)' }}>更简单</span>
          </h1>
          <img
            src={titleImg}
            alt="Arcle 聊天互联"
            className="w-full max-w-3xl mx-auto mb-10 rounded-xl shadow-[var(--shadow-lg)]"
            style={{ objectFit: 'contain', maxHeight: '220px' }}
          />
          <p
            className="text-lg md:text-xl mb-10 max-w-2xl mx-auto"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            ARCLE 是一个现代化的在线聊天平台，支持实时群聊、私聊、表情反应、Markdown 消息，
            帮助你和团队轻松沟通。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-lg"
              style={{ minHeight: 52, minWidth: 200 }}
            >
              立即开始 <ArrowRight size={18} />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('features');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn btn-outline btn-lg"
              style={{ minHeight: 52 }}
            >
              了解更多
            </button>
          </div>
        </div>
      </section>

      {/* 实时数据统计 */}
      <section className="py-16 px-4" style={{ background: 'var(--color-card)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              活跃社区
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              数千用户信赖的平台，实时在线交流
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 skeleton"
                  style={{ borderRadius: 0 }}
                />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="总用户数"
                value={stats.total_users}
                sub={`今日新增 ${stats.today_users}`}
                color="var(--color-primary)"
              />
              <StatCard
                icon={Zap}
                label="在线用户"
                value={stats.online_users}
                sub="5分钟内活跃"
                color="var(--color-success)"
              />
              <StatCard
                icon={Hash}
                label="聊天房间"
                value={stats.total_rooms}
                sub={`今日活跃 ${stats.active_rooms}`}
                color="var(--color-info)"
              />
              <StatCard
                icon={MessageSquare}
                label="消息总数"
                value={stats.total_messages}
                sub={`今日 ${stats.today_messages} 条`}
                color="var(--color-warning)"
              />
            </div>
          ) : (
            <div className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
              数据加载中...
            </div>
          )}
        </div>
      </section>

      {/* 功能特性 */}
      <section id="features" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              强大功能
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              为高效沟通打造的完整工具集
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={MessageSquare}
              title="实时群聊"
              desc="加入或创建聊天室，与团队成员实时交流。支持 Markdown 格式，让消息更生动。"
            />
            <FeatureCard
              icon={Lock}
              title="私密私聊"
              desc="基于关注关系建立私密对话，只有双方可见，保护你的隐私。"
            />
            <FeatureCard
              icon={Smile}
              title="丰富表情"
              desc="支持 Emoji 表情、表情反应、引用回复，让沟通更有趣味。"
            />
            <FeatureCard
              icon={Globe}
              title="多主题切换"
              desc="提供浅色、深色、高对比度等多种主题，适应不同使用场景。"
            />
            <FeatureCard
              icon={Shield}
              title="安全可靠"
              desc="JWT 认证、数据加密、管理员审核，全方位保护你的信息安全。"
            />
            <FeatureCard
              icon={TrendingUp}
              title="数据同步"
              desc="消息实时同步，断线重连自动恢复，不错过任何重要信息。"
            />
            <FeatureCard
              icon={Heart}
              title="表白墙"
              desc="匿名或实名表白，公开浏览，支持点赞评论，让心意被看见。"
            />
          </div>
        </div>
      </section>

      {/* 如何使用 */}
      <section className="py-16 px-4" style={{ background: 'var(--color-card)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              快速开始
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              三步即可加入聊天
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepItem
              num={1}
              title="注册账号"
              desc="使用邮箱或用户名注册，获取专属账户"
            />
            <StepItem
              num={2}
              title="创建或加入房间"
              desc="创建你自己的聊天室，或加入已有的房间"
            />
            <StepItem
              num={3}
              title="开始聊天"
              desc="发送消息、添加表情、与其他用户互动"
            />
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold mb-6"
            style={{ color: 'var(--color-text)' }}
          >
            准备好开始了吗？
          </h2>
          <p
            className="text-lg mb-10"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            加入 ARCLE，与数千用户一起交流互动
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary btn-lg"
            style={{ minHeight: 56, minWidth: 200 }}
          >
            立即开始 <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* 底部 */}
      <footer
        className="py-8 px-4 border-t text-center text-sm"
        style={{ borderColor: 'var(--color-divider)', color: 'var(--color-text-muted)' }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <MessageSquare size={16} style={{ color: 'var(--color-primary)' }} />
          <span style={{ color: 'var(--color-text)' }}>ARCLE</span>
        </div>
        <p className="mb-3">© 2024 ARCLE 在线聊天平台</p>
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Build v1.0.18 | {new Date().toLocaleDateString('zh-CN')}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => navigate('/terms')} className="hover:underline" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>服务条款</button>
          <button onClick={() => navigate('/privacy')} className="hover:underline" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>隐私政策</button>
        </div>
      </footer>
    </div>
  );
}
