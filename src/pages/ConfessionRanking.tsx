import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  ArrowLeft,
  Heart,
  MessageCircle,
  Sparkles,
  Star,
  Palette,
  Clock,
  Calendar,
  Flame,
} from 'lucide-react';
import { confessionApi } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { Confession } from '../types';
import { Avatar } from '../components/Avatar';
import type { ThemeKey } from '../lib/themes';
import { THEMES } from '../lib/themes';

type RankType = 'likes' | 'daily' | 'weekly' | 'monthly' | 'fire';

export function ConfessionRanking() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [rankings, setRankings] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<RankType>('fire');
  const [isLogged, setIsLogged] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('confession_theme');
    // 白名单校验，脏值回退默认主题
    return saved && saved in THEMES ? (saved as ThemeKey) : 'pink';
  });
  const loadSeqRef = useRef(0);
  const [bgImage, setBgImage] = useState<'mbbqbg-dark.svg' | 'bbqbg.svg' | 'bbqbg-dark.svg'>(() => {
    const isOcean = theme === 'ocean';
    return window.innerWidth < 768
      ? (isOcean ? 'mbbqbg-dark.svg' : 'bbqbg.svg')
      : (isOcean ? 'bbqbg-dark.svg' : 'bbqbg.svg');
  });
  const T = THEMES[theme];

  useEffect(() => { localStorage.setItem('confession_theme', theme); }, [theme]);
  useEffect(() => {
    const h = () => {
      const w = window.innerWidth;
      const isOcean = theme === 'ocean';
      setBgImage(w < 768 ? (isOcean ? 'mbbqbg-dark.svg' : 'bbqbg.svg') : (isOcean ? 'bbqbg-dark.svg' : 'bbqbg.svg'));
    };
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [theme]);

  const loadRanking = useCallback(async (type: RankType) => {
    // 请求序号守卫：快速切 tab 时丢弃过期响应
    const seq = ++loadSeqRef.current;
    setLoading(true);
    try {
      const res = await confessionApi.ranking(type, 20);
      if (seq !== loadSeqRef.current) return;
      setRankings(res);
    } catch {} finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLogged(!!localStorage.getItem('arcle_token'));
    loadRanking('fire');
  }, [loadRanking]);

  const handleBookmark = useCallback((slug: string) => {
    if (!isLogged) { addToast('请先登录', 'warning'); navigate('/login'); return; }
    confessionApi.bookmark(slug).then((res) => {
      // 使用服务端返回值更新，避免本地取反与服务端状态漂移
      setRankings((prev) =>
        prev.map((c) => (c.slug === slug ? { ...c, bookmarked: res.bookmarked, bookmark_count: res.bookmark_count } : c))
      );
    });
  }, [isLogged, addToast, navigate]);

  const tabItems: { key: RankType; label: string; icon: typeof Flame; desc: string }[] = [
    { key: 'fire', label: '🔥 综合热榜', icon: Flame, desc: '算法推断·全站最火' },
    { key: 'likes', label: '❤️ 总点赞榜', icon: Heart, desc: '累计最多喜欢' },
    { key: 'daily', label: '📅 今日榜', icon: Clock, desc: '今日新增点赞' },
    { key: 'weekly', label: '📆 本周榜', icon: Calendar, desc: '近7天热度' },
    { key: 'monthly', label: '🗓️ 本月榜', icon: Trophy, desc: '近30天精选' },
  ];

  const renderRankItem = (c: Confession, index: number) => {
    const rankColors = ['var(--color-warning)', 'var(--color-text-light)', '#CD7F32'];
    const medal = index < 3 ? tabMedals[index] : null;
    return (
      <div
        key={c.id}
        className="flex items-center gap-3 p-3 transition-all hover:opacity-90 cursor-pointer"
        style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
        onClick={() => navigate(`/confessions/${c.slug}`)}
      >
        <div className="w-7 h-7 flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: medal ? rankColors[index] : 'var(--color-border-light)', color: medal ? '#fff' : 'var(--color-text-muted)', borderRadius: 3 }}>
          {medal ?? (index + 1)}
        </div>
        {!c.anonymous && <Avatar username={c.username} avatar={c.avatar} size={32} />}
        {c.anonymous && (
          <div className="w-7 h-7 flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ background: T.labelBg, color: T.primary, borderRadius: 3 }}>匿</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" style={{ color: T.text }}>{c.content}</p>
          <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
            {c.target_name ? `→ ${c.target_name}` : ''} · {c.create_time_fmt}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs flex-shrink-0" style={{ color: T.textMuted }}>
          <span className="flex items-center gap-0.5"><Heart size={12} fill="currentColor" /> {c.like_count}</span>
          <span className="flex items-center gap-0.5"><MessageCircle size={12} /> {c.comment_count}</span>
        </div>
        {isLogged && (
          <button
            onClick={(e) => { e.stopPropagation(); handleBookmark(c.slug); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: c.bookmarked ? T.warning : T.textMuted }}
          >
            <Star size={14} fill={c.bookmarked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    );
  };

  const tabMedals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex flex-col h-screen" style={{ background: T.cardBg, backgroundImage: `url(/${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* 头部 */}
      <div className="px-4 py-3 border-b flex items-center gap-3" style={{ background: T.cardBg, borderColor: T.cardBorder }}>
        <button onClick={() => navigate('/confessions')} style={{ padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-primary)' }}>
          <ArrowLeft size={18} style={{ color: T.text }} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold flex items-center gap-2" style={{ color: T.text }}>
            <Trophy size={18} style={{ color: T.warning }} /> 表白墙排行榜
          </h1>
        </div>
        <div className="relative">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm" style={{ background: 'transparent', border: `1px solid ${T.cardBorder}`, color: T.textMuted, cursor: 'pointer', borderRadius: 3 }}
            onClick={() => { const keys: ThemeKey[] = ['pink', 'ocean', 'default']; const idx = keys.indexOf(theme); setTheme(keys[(idx + 1) % keys.length]); }}>
            <Palette size={14} /><span>主题</span>
          </button>
          <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeKey)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 14 }}
            ><option value="pink">粉色</option><option value="ocean">海洋</option><option value="default">默认</option></select>
        </div>
      </div>

      {/* 分类标签 - 横向滚动 */}
      <div className="flex border-b overflow-x-auto px-4 gap-1" style={{ borderColor: T.cardBorder, background: T.cardBg, whiteSpace: 'nowrap' }}>
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); loadRanking(tab.key); }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all flex-shrink-0"
              style={isActive ? { color: T.primary, borderBottom: `2px solid ${T.primary}`, marginBottom: -1 } : { color: T.textMuted }}>
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 当前标签说明 */}
      <div className="px-4 py-1.5 text-xs" style={{ color: T.textMuted, background: T.cardBg }}>
        {tabItems.find((t) => t.key === activeTab)?.desc}
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: T.textMuted }}>加载中...</div>
        ) : rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: T.textMuted }}>
            <Sparkles size={40} opacity={0.4} /><p className="text-sm">暂无数据</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.map((c, i) => renderRankItem(c, i))}
          </div>
        )}
      </div>
    </div>
  );
}
