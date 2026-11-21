import { useEffect, useRef } from 'react';

/**
 * 顺序阻塞式 Long Polling 通用 Hook
 *
 * 设计目标：与后端 `poll?timeout=20` 的挂起语义对齐——
 * 后端服务端挂起最长 20 秒（有新消息立即返回、无则超时返回 timeout=true），
 * 前端不再用固定 setInterval（会白占 20s 挂起且造成消息延迟），
 * 而是「收到响应立即合并 → 立即发起下一轮」的顺序阻塞循环。
 *
 * 核心行为：
 * 1. 顺序执行：发起 pollFn → 响应到达立即通过 onMessage 合并 → 立刻发起下一次；
 *    无论本次是否拿到新消息（含后端超时返回 timeout=true）都立即重发，形成持续长轮询链路。
 * 2. 网络错误 / 401 采用指数退避（1s → 2s → 4s → 8s 封顶）后重发；
 *    连续失败 5 次降级为 30s 间隔，避免打挂服务端。
 * 3. `document.hidden === true` 时停止轮询；切回前台立即补一轮。
 * 4. 组件卸载 / 依赖（会话 id 等）变化时，用 AbortController 取消在途请求。
 * 5. 防重入：同一会话同一时刻只有一个在途 poll。
 *
 * 类型约定：
 * - TPollResult：pollFn 解析出的结果类型（各调用方数据结构可不同）。
 * - ctx.signal：当前轮次的 AbortSignal（会话切换/卸载时 abort），调用方可据此透传给 fetch。
 *
 * 稳定性约定（重要）：
 * 为避免 effect 因 pollFn / onMessage 的闭包重建而反复重启循环，
 * 调用方应传入「稳定引用」：用 useRef 持有最新闭包（每次渲染更新 .current），
 * 再传入一个稳定包装函数 `(ctx) => fnRef.current(ctx)`。
 * 这样 effect 只依赖 deps（会话 id / 激活状态），轮询循环在组件生命周期内只跑一条。
 *
 * 风格规范：仅使用 const/let，禁止 var；禁止引入新依赖。
 */

export interface LongPollContext {
  /** 当前轮次的 AbortSignal：会话切换/卸载时会 abort，调用方可据此透传给 fetch 取消在途请求。 */
  signal: AbortSignal;
}

export interface UseLongPollingOptions<TPollResult> {
  /**
   * 长轮询请求函数（需稳定引用，见文件头「稳定性约定」）。
   * 返回值类型即 TPollResult，通常封装为「带 20s 挂起超时的 poll 请求」。
   */
  pollFn: (ctx: LongPollContext) => Promise<TPollResult>;
  /**
   * 会话 id / 激活状态等依赖数组；任一变化都会取消在途请求并重启循环。
   * 传空数组表示常驻轮询（不随任何外部条件重启）。
   */
  deps: readonly unknown[];
  /**
   * 收到 poll 结果后的合并回调（需稳定引用）。调用方据此适配自己的数据结构：
   * 更新 lastId、合并新消息、触发提示音/Toast 等。同步调用，hook 会吞掉其异常。
   */
  onMessage: (payload: TPollResult, ctx: LongPollContext) => void;
  /** 退避失败达到该次数后降级为 degradedIntervalMs 间隔。默认 5。 */
  maxConsecutiveFailures?: number;
  /** 降级后的固定轮询间隔（毫秒）。默认 30000。 */
  degradedIntervalMs?: number;
  /** 退避序列（毫秒），依次取用，取完后封顶在最后一项。默认 [1000, 2000, 4000, 8000]。 */
  backoffStepsMs?: number[];
}

const DEFAULT_BACKOFF = [1000, 2000, 4000, 8000];
const DEFAULT_MAX_FAILS = 5;
const DEFAULT_DEGRADED_MS = 30000;

export function useLongPolling<TPollResult>(options: UseLongPollingOptions<TPollResult>): void {
  const {
    deps,
    maxConsecutiveFailures = DEFAULT_MAX_FAILS,
    degradedIntervalMs = DEFAULT_DEGRADED_MS,
    backoffStepsMs = DEFAULT_BACKOFF,
  } = options;

  // 持有最新 options（pollFn/onMessage 由调用方保证稳定，这里只是兜底读取最新数值参数）
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;
    // 防重入：同一会话同一时刻只有一个在途 poll
    let running = false;
    let consecutiveFails = 0;

    const pick = (ms: number, signal: AbortSignal) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        const onAbort = () => {
          clearTimeout(t);
          resolve();
        };
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      });

    const runLoop = async () => {
      while (!cancelled) {
        if (running) break; // 防重入：上一轮尚未结束则本轮不重发
        running = true;
        controller = new AbortController();
        const signal = controller.signal;
        const ctx: LongPollContext = { signal };
        const current = optionsRef.current;

        let delayMs = 0;
        try {
          const payload = await current.pollFn(ctx);
          if (cancelled) break;
          // 收到响应（含后端超时 timeout=true）：立即合并，并立即发起下一轮
          try {
            current.onMessage(payload, ctx);
          } catch {
            // 调用方合并逻辑异常不中断轮询
          }
          consecutiveFails = 0; // 成功一次即重置退避
        } catch (err) {
          if (cancelled) break;
          // AbortError（会话切换/卸载导致取消）不算失败、不退避
          const isAbort = err instanceof DOMException && err.name === 'AbortError';
          if (!isAbort) {
            consecutiveFails += 1;
            const step = current.backoffStepsMs
              ? current.backoffStepsMs[Math.min(consecutiveFails - 1, current.backoffStepsMs.length - 1)]
              : DEFAULT_BACKOFF[Math.min(consecutiveFails - 1, DEFAULT_BACKOFF.length - 1)];
            delayMs =
              consecutiveFails >= (current.maxConsecutiveFailures ?? DEFAULT_MAX_FAILS)
                ? (current.degradedIntervalMs ?? DEFAULT_DEGRADED_MS)
                : step;
            await pick(delayMs, signal);
          }
        } finally {
          running = false;
        }

        if (cancelled) break;

        // 后台停止轮询：切到后台时每 500ms 醒一次判断，一旦回前台立即 continue → 重发 poll
        if (typeof document !== 'undefined' && document.hidden) {
          await pick(500, signal);
          continue;
        }

        // 正常路径：立即发起下一轮（无额外等待，靠后端 20s 挂起实现准实时）
        // 退避路径已在 catch 内 sleep，这里不重复等待
      }
    };

    runLoop();

    return () => {
      cancelled = true;
      if (controller) controller.abort(); // 取消在途请求
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
