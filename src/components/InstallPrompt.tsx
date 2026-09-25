import { useEffect, useState } from 'react';
import { X, Download, Share2, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'arcle_pwa_install_dismiss';
const INSTALLED_KEY = 'arcle_pwa_installed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * 首页 PWA 安装提示：
 * - Chrome/Edge 等：捕获 beforeinstallprompt，点击按钮拉起系统安装弹窗
 * - iOS Safari：无安装事件，展示「分享 → 添加到主屏幕」引导
 * - 已安装（standalone 运行）或用户关闭后不再显示
 * - variant="card"：底部悬浮卡（门户首页）；"topbar"：顶部细条（聊天页，避免遮挡输入框）
 */
export function InstallPrompt({ variant = 'card' }: { variant?: 'card' | 'topbar' }) {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      localStorage.setItem(INSTALLED_KEY, '1');
      return;
    }
    if (localStorage.getItem(INSTALLED_KEY) === '1') return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    // 事件可能在组件挂载前触发：先读全局缓存，再监听后续事件
    if ((window as any).__arcleInstallPrompt) {
      setPromptEvent((window as any).__arcleInstallPrompt);
    }
    const onPrompt = () => setPromptEvent((window as any).__arcleInstallPrompt);
    window.addEventListener('arcle:installprompt', onPrompt);
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, '1');
      setVisible(false);
    };
    window.addEventListener('arcle:appinstalled', onInstalled);

    // iOS 没有 beforeinstallprompt：短暂延迟后显示引导卡（避免抢首屏焦点）
    let timer: number | undefined;
    if (isIOS()) {
      timer = window.setTimeout(() => setShowIOSGuide(true), 1500);
    }
    return () => {
      window.removeEventListener('arcle:installprompt', onPrompt);
      window.removeEventListener('arcle:appinstalled', onInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // promptEvent 就绪 / iOS 引导就绪后显示横幅
  useEffect(() => {
    if (promptEvent) setVisible(true);
  }, [promptEvent]);

  // iOS 引导显示（且未安装）
  useEffect(() => {
    if (showIOSGuide && !promptEvent) setVisible(true);
  }, [showIOSGuide, promptEvent]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!promptEvent) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === 'accepted') {
        localStorage.setItem(INSTALLED_KEY, '1');
      }
    } catch {
      /* 用户关闭系统弹窗等 */
    } finally {
      setInstalling(false);
      setPromptEvent(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  if (variant === 'topbar') {
    return (
      <div
        className="fixed top-[57px] left-0 right-0 z-30 px-4 py-2 flex items-center gap-3 border-b"
        role="dialog"
        aria-label="安装弧光应用"
        style={{ background: 'var(--color-primary-light)', borderColor: 'var(--color-divider)' }}
      >
        <Smartphone size={16} className="flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
        <p className="text-xs sm:text-sm flex-1 min-w-0" style={{ color: 'var(--color-text-secondary)' }}>
          {showIOSGuide && !promptEvent ? (
            <>
              点击 Safari 底部 <Share2 size={12} className="inline -mt-0.5" /> 分享按钮，选择「添加到主屏幕」，像原生应用一样使用弧光
            </>
          ) : (
            '安装弧光到桌面，像原生应用一样使用，支持离线打开'
          )}
        </p>
        {promptEvent ? (
          <button
            onClick={install}
            disabled={installing}
            className="btn btn-primary btn-sm flex-shrink-0"
            style={{ minHeight: 30, borderRadius: 8 }}
          >
            <Download size={13} />
            {installing ? '安装中…' : '安装'}
          </button>
        ) : null}
        <button
          onClick={dismiss}
          aria-label="关闭安装提示"
          className="p-1 flex-shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md"
      role="dialog"
      aria-label="安装弧光应用"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 shadow-[var(--shadow-lg)]"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12 }}
      >
        <div
          className="w-10 h-10 flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-primary-light)', borderRadius: 10 }}
        >
          <Smartphone size={20} style={{ color: 'var(--color-primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            安装弧光到桌面
          </p>
          {showIOSGuide && !promptEvent ? (
            <p className="text-xs mt-0.5 leading-5" style={{ color: 'var(--color-text-muted)' }}>
              点击 Safari 底部 <Share2 size={11} className="inline -mt-0.5" /> 分享按钮，选择「添加到主屏幕」
            </p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              像原生应用一样使用，支持离线打开
            </p>
          )}
        </div>
        {promptEvent ? (
          <button
            onClick={install}
            disabled={installing}
            className="btn btn-primary btn-sm flex-shrink-0"
            style={{ minHeight: 34, borderRadius: 8 }}
          >
            <Download size={14} />
            {installing ? '安装中…' : '安装'}
          </button>
        ) : null}
        <button
          onClick={dismiss}
          aria-label="关闭安装提示"
          className="p-1 flex-shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
