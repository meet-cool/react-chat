import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Coins, Package, Store, School, Building2, Coffee, Inbox } from 'lucide-react';
import { shopApi, type ShopScope } from '../lib/api';
import { useApp } from '../lib/AppContext';
import type { ShopItem, ShopOrder } from '../types';

const TABS: { key: ShopScope | 'orders'; label: string; icon: typeof Store }[] = [
  { key: 'school', label: '学校商城', icon: School },
  { key: 'campus', label: '校区商城', icon: Building2 },
  { key: 'tuckshop', label: '小卖部', icon: Coffee },
  { key: 'orders', label: '我的兑换', icon: Package },
];

export function MallPage() {
    const navigate = useNavigate();
    const { addToast, confirm } = useApp();
    const [tab, setTab] = useState<ShopScope | 'orders'>('school');
    const [items, setItems] = useState<ShopItem[]>([]);
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<number | null>(null);
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [ordersLoaded, setOrdersLoaded] = useState(false);
    const [ordersPage, setOrdersPage] = useState(1);
    const [hasMoreOrders, setHasMoreOrders] = useState(false);

    const loadItems = useCallback(async (scope: ShopScope) => {
        setLoading(true);
        try {
            const res = await shopApi.items(scope);
            setItems(res.items);
            setBalance(res.balance);
        } catch (e) {
            addToast(e instanceof Error ? e.message : '加载失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        if (tab !== 'orders') loadItems(tab);
    }, [tab, loadItems]);

    const loadOrders = useCallback(async (page: number, append: boolean) => {
        try {
            const res = await shopApi.orders(page);
            setOrders(prev => (append ? [...prev, ...res.items] : res.items));
            setOrdersPage(page);
            setHasMoreOrders(page < res.pagination.last_page);
            setOrdersLoaded(true);
        } catch (e) {
            addToast(e instanceof Error ? e.message : '加载失败', 'error');
        }
    }, [addToast]);

    useEffect(() => {
        if (tab === 'orders' && !ordersLoaded) loadOrders(1, false);
    }, [tab, ordersLoaded, loadOrders]);

    const handleBuy = async (item: ShopItem) => {
        const okToBuy = await confirm(
            `确定花费 ${item.price} 积分兑换「${item.name}」吗？`,
            '积分兑换'
        );
        if (!okToBuy) return;
        setBuyingId(item.id);
        try {
            const res = await shopApi.buy(item.id, 1);
            addToast(res.message || '兑换成功', 'success');
            setBalance(res.balance);
            setItems(prev => prev.map(it =>
                it.id === item.id && it.stock > 0 ? { ...it, stock: it.stock - 1 } : it
            ));
            if (ordersLoaded) loadOrders(1, false);
        } catch (e) {
            addToast(e instanceof Error ? e.message : '兑换失败', 'error');
        } finally {
            setBuyingId(null);
        }
    };

    const scopeIcon = (s: ShopScope) =>
        s === 'school' ? <School size={14} /> : s === 'campus' ? <Building2 size={14} /> : <Coffee size={14} />;

    return (
        <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
            {/* 顶栏 */}
            <div className="sticky top-0 z-40 border-b px-4 py-3 flex items-center gap-3"
                style={{ background: 'var(--nav-bg)', borderColor: 'var(--color-divider)', backdropFilter: 'blur(8px)' }}>
                <button onClick={() => navigate('/chat')} className="btn btn-sm" style={{ minHeight: 36 }}>
                    <ArrowLeft size={16} />
                    <span className="hidden sm:inline">返回</span>
                </button>
                <h1 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <ShoppingBag size={20} style={{ color: 'var(--color-primary)' }} />
                    弧光商城
                </h1>
                <div className="flex-1" />
                {balance !== null && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold rounded-sm"
                        style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                        <Coins size={15} />
                        {balance}
                    </span>
                )}
            </div>

            {/* 店铺切换 */}
            <div className="sticky top-[57px] z-30 border-b px-4 py-2 flex gap-1 overflow-x-auto"
                style={{ background: 'var(--color-card)', borderColor: 'var(--color-divider)' }}>
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-sm"
                        style={
                            tab === key
                                ? { background: 'var(--color-primary)', color: '#fff' }
                                : { color: 'var(--color-text-secondary)', background: 'transparent' }
                        }
                    >
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            <div className="max-w-5xl mx-auto px-4 py-5">
                {loading && tab !== 'orders' ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 animate-spin rounded-sm"
                            style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
                    </div>
                ) : tab === 'orders' ? (
                    /* 我的兑换 */
                    orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <Inbox size={48} style={{ color: 'var(--color-text-muted)' }} />
                            <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                还没有兑换记录，去店铺逛逛吧
                            </p>
                            <button onClick={() => setTab('school')} className="btn btn-sm mt-4">去逛逛</button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {orders.map(o => (
                                    <div key={o.id} className="flex items-center gap-3 p-3 border rounded-sm"
                                        style={{ background: 'var(--color-card)', borderColor: 'var(--color-divider)' }}>
                                        <span className="w-10 h-10 flex items-center justify-center text-xl rounded-sm"
                                            style={{ background: 'var(--color-card-alt)' }}>{o.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                                                {o.item_name} <span className="text-xs">×{o.quantity}</span>
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                                {o.create_time_fmt}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-sm font-bold shrink-0"
                                            style={{ color: 'var(--color-warning)' }}>
                                            <Coins size={14} />
                                            -{o.total_price}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {hasMoreOrders && (
                                <div className="text-center mt-4">
                                    <button onClick={() => loadOrders(ordersPage + 1, true)} className="btn btn-sm">
                                        加载更多
                                    </button>
                                </div>
                            )}
                        </>
                    )
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Store size={48} style={{ color: 'var(--color-text-muted)' }} />
                        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>该店铺暂无商品</p>
                    </div>
                ) : (
                    /* 商品网格 */
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {items.map(item => {
                            const soldOut = item.stock === 0;
                            return (
                                <div key={item.id} className="flex flex-col border rounded-sm p-3 transition-all"
                                    style={{ background: 'var(--color-card)', borderColor: 'var(--color-divider)' }}>
                                    <div className="w-full aspect-square max-h-28 flex items-center justify-center mb-3 rounded-sm"
                                        style={{ background: 'var(--color-card-alt)', fontSize: 44 }}>
                                        {item.icon}
                                    </div>
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                                        {item.name}
                                    </p>
                                    <p className="text-xs mt-1 line-clamp-2 flex-1" style={{ color: 'var(--color-text-muted)' }}>
                                        {item.description}
                                    </p>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="inline-flex items-center gap-1 text-sm font-bold"
                                            style={{ color: 'var(--color-warning)' }}>
                                            <Coins size={14} />
                                            {item.price}
                                        </span>
                                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                            {item.stock < 0 ? '库存充足' : `剩 ${item.stock}`}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleBuy(item)}
                                        disabled={soldOut || buyingId === item.id || (balance !== null && balance < item.price)}
                                        className="btn btn-sm w-full mt-2"
                                        style={
                                            soldOut || buyingId === item.id || (balance !== null && balance < item.price)
                                                ? { opacity: 0.5, cursor: 'not-allowed' }
                                                : { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                                        }
                                    >
                                        {soldOut ? '已售罄' : buyingId === item.id ? '兑换中…' : '立即兑换'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {balance !== null && tab !== 'orders' && (
                    <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
                        当前积分 {balance} · 每日签到与游戏可赚取积分
                    </p>
                )}
            </div>
        </div>
    );
}
