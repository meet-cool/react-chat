import { useEffect, useRef, useState } from 'react';

export type MobileView = 'list' | 'room' | 'private';

export interface UseMobileViewOptions {
  /** 窄桌面（max-width:1099px）变化时回调，用于联动折叠右侧成员栏 */
  onNarrowChange?: (isNarrow: boolean) => void;
}

export interface UseMobileViewReturn {
  isMobile: boolean;
  isNarrow: boolean;
  mobileView: MobileView;
  setMobileView: (v: MobileView) => void;
}

/**
 * 移动端响应式视图 Hook
 *
 * 职责：
 * - 监听 matchMedia('(max-width: 767px)') 判断是否移动端
 * - 监听 matchMedia('(max-width: 1099px)') 判断是否窄桌面
 * - 管理 mobileView 状态（list / room / private）
 *
 * 从 ChatPage.tsx 抽离，降低单文件复杂度。
 */
export function useMobileView(opts: UseMobileViewOptions = {}): UseMobileViewReturn {
  const { onNarrowChange } = opts;
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [isNarrow, setIsNarrow] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1099px)').matches
  );
  const [mobileView, setMobileView] = useState<MobileView>('list');

  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 767px)');
    const mqNarrow = window.matchMedia('(max-width: 1099px)');
    const onMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const onNarrowChange = (e: MediaQueryListEvent) => {
      setIsNarrow(e.matches);
      opts.onNarrowChange?.(e.matches);
    };
    setIsMobile(mqMobile.matches);
    setIsNarrow(mqNarrow.matches);
    mqMobile.addEventListener('change', onMobileChange);
    mqNarrow.addEventListener('change', onNarrowChange);
    return () => {
      mqMobile.removeEventListener('change', onMobileChange);
      mqNarrow.removeEventListener('change', onNarrowChange);
    };
    // 仅挂载一次；onNarrowChange 通过 ref 持有最新闭包
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 用 ref 持有最新 onNarrowChange，避免 effect 重建
  const cbRef = useRef(opts.onNarrowChange);
  cbRef.current = opts.onNarrowChange;

  return { isMobile, isNarrow, mobileView, setMobileView };
}
