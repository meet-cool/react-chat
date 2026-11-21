/*
 * 消息提示音
 *
 * 开关持久化在 localStorage 'arcle_sound'：
 *   - 未设置 / '1' → 开启（默认开启，首次使用即有提示音）
 *   - '0'          → 关闭
 * 与 SettingsModal 的开关共用同一键。
 */

const SOUND_KEY = 'arcle_sound';
/** 提示音源（public/sound/typing.mp3，约 1.6KB，轻量短促） */
const MESSAGE_SOUND = '/sound/typing.mp3';
/** 去抖窗口：批量返回多条消息时只播一次，避免连播轰炸 */
const DEBOUNCE_MS = 300;

/** 是否开启消息提示音（默认开启，仅显式设为 '0' 才静音） */
export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0';
  } catch {
    // localStorage 不可用（隐私模式等）时按开启处理
    return true;
  }
}

/** 设置消息提示音开关（供设置页调用） */
export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

let lastPlayAt = 0;

/**
 * 播放消息提示音。
 * 静默失败：未开启、去抖窗口内、浏览器阻止自动播放、音频加载失败都不抛错。
 */
export function playMessageSound(): void {
  if (!isSoundEnabled()) return;
  const now = Date.now();
  if (now - lastPlayAt < DEBOUNCE_MS) return;
  lastPlayAt = now;
  try {
    const audio = new Audio(MESSAGE_SOUND);
    // 循环引用被丢弃后浏览器仍能播完；显式 catch 避免 unhandled rejection
    void audio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}