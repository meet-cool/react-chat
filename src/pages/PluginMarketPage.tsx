import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  Gift,
  CalendarCheck,
  Image as ImageIcon,
  Settings,
  ChevronRight,
  Star,
  Trophy,
} from 'lucide-react';
import { pluginApi, gameApi, giftApi } from '../lib/api';
import type { PluginInfo, GameInfo, GiftInfo } from '../lib/api';

interface Props {
  onBack: () => void;
}

export function PluginMarketPage({ onBack }: Props) {
  const navigate = useNavigate();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [gifts, setGifts] = useState<GiftInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      pluginApi.list(),
      gameApi.list(),
      giftApi.list(),
    ]).then(([p, g, gi]) => {
      setPlugins(p);
      setGames(g);
      setGifts(gi);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const enabledPlugins = plugins.filter(p => p.status === 1);
  const disabledPlugins = plugins.filter(p => p.status === 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
      {/* 头部 */}
      <div className="sticky top-0 z-40 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--color-divider)', backdropFilter: 'blur(8px)' }}>
        <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ minHeight: 36 }}>
          ← 返回
        </button>
        <h1 className="text-lg font-semibold flex-1" style={{ color: 'var(--color-text)' }}>
          插件中心
        </h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* 游戏中心 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Gamepad2 size={20} style={{ color: 'var(--color-success)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>小游戏中心</h2>
            <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>启用中</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {loading
              ? [0, 1, 2, 3].map(i => (
                  <div key={i} className="p-4 border animate-pulse" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                    <div className="w-10 h-10 mb-2" style={{ background: 'var(--color-hover-bg)' }} />
                    <div className="h-4 w-14 mb-2" style={{ background: 'var(--color-hover-bg)' }} />
                    <div className="h-3 w-24" style={{ background: 'var(--color-hover-bg)' }} />
                  </div>
                ))
              : games.length === 0
                ? <div className="col-span-2 md:col-span-4 text-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>暂无可用小游戏</div>
                : games.map(game => (
              <button
                key={game.slug}
                onClick={() => navigate(`/plugins/games/${game.slug.replace(/_/g, '-')}`)}
                className="p-4 flex flex-col items-start text-left transition-all duration-200 hover:scale-105 border whitespace-normal"
                style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div className="w-10 h-10 flex items-center justify-center mb-2" style={{ background: `${game.color}20`, color: game.color }}>
                  <Gamepad2 size={20} />
                </div>
                <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{game.name}</div>
                <div className="text-xs mt-1 line-clamp-2 whitespace-normal" style={{ color: 'var(--color-text-muted)' }}>{game.description}</div>
              </button>
                ))}
          </div>
        </section>

        {/* 礼物系统 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Gift size={20} style={{ color: 'var(--color-error)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>礼物系统</h2>
            <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: 'var(--color-error-light)', color: 'var(--color-error)' }}>启用中</span>
          </div>
          <div className="p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex flex-wrap gap-3">
              {loading
                ? [0, 1, 2].map(i => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 border animate-pulse" style={{ borderColor: 'var(--color-border-light)' }}>
                      <span className="w-7 h-7" style={{ background: 'var(--color-hover-bg)' }} />
                      <div>
                        <div className="h-3.5 w-10 mb-1" style={{ background: 'var(--color-hover-bg)' }} />
                        <div className="h-2.5 w-12" style={{ background: 'var(--color-hover-bg)' }} />
                      </div>
                    </div>
                  ))
                : gifts.map(gift => (
                <div key={gift.id} className="flex items-center gap-2 px-3 py-2 border" style={{ borderColor: 'var(--color-border-light)' }}>
                  <span className="text-2xl">{gift.icon}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{gift.name}</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{gift.cost} 积分</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 签到增强 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck size={20} style={{ color: 'var(--color-warning)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>签到增强</h2>
            <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>启用中</span>
          </div>
          <div className="p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              连续签到奖励倍数提升，打破签到记录获得更多积分！
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <Star size={12} />
              <span>连续签到 7 天可获得额外奖励</span>
            </div>
          </div>
        </section>

        {/* 表白墙海报 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={20} style={{ color: '#7C3AED' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>表白墙海报</h2>
            <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: '#EDE9FE', color: '#7C3AED' }}>启用中</span>
          </div>
          <div className="p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              生成精美表白墙分享海报，支持添加水印和自定义样式。
            </p>
          </div>
        </section>

        {/* 所有插件列表 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={20} style={{ color: 'var(--color-text-muted)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>全部插件</h2>
          </div>
          <div className="space-y-2">
            {loading
              ? [0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 border animate-pulse" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                    <div className="w-10 h-10 flex-shrink-0" style={{ background: 'var(--color-hover-bg)' }} />
                    <div className="flex-1">
                      <div className="h-3.5 w-28 mb-1.5" style={{ background: 'var(--color-hover-bg)' }} />
                      <div className="h-2.5 w-44" style={{ background: 'var(--color-hover-bg)' }} />
                    </div>
                  </div>
                ))
              : (<>
                {enabledPlugins.map(plugin => (
                  <PluginCard key={plugin.slug} plugin={plugin} enabled />
                ))}
                {disabledPlugins.map(plugin => (
                  <PluginCard key={plugin.slug} plugin={plugin} enabled={false} />
                ))}
              </>)}
          </div>
        </section>
      </div>
    </div>
  );
}

function PluginCard({ plugin, enabled }: { plugin: PluginInfo; enabled: boolean }) {
  const IconComponent = plugin.icon || 'Plugin';
  return (
    <div className="flex items-center gap-3 p-3 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', opacity: enabled ? 1 : 0.6 }}>
      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: `${plugin.color}20`, color: plugin.color }}>
        <Settings size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{plugin.name}</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>v{plugin.version}</span>
          {!enabled && <span className="text-xs px-1.5 py-0.5" style={{ background: 'var(--color-error-light)', color: 'var(--color-error)' }}>已禁用</span>}
        </div>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{plugin.description}</p>
      </div>
      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{plugin.author}</div>
      <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
    </div>
  );
}
