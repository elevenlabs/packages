export interface ThrottledFunction<Args extends unknown[]> {
  (...args: Args): void;
  /** Cancels any pending trailing invocation and resets the leading-edge window. */
  cancel: () => void;
}

export interface ThrottleOptions {
  /** Invoke on the leading edge of the wait window. Defaults to `true`. */
  leading?: boolean;
  /** Invoke on the trailing edge of the wait window. Defaults to `false`. */
  trailing?: boolean;
}

/**
 * Creates a throttled wrapper around `fn` that limits how often it runs within
 * a `waitMs` window.
 *
 * With the default (`leading: true`, `trailing: false`) configuration the first
 * call invokes `fn` immediately and any further calls within `waitMs` are
 * suppressed until the window elapses.
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
  options: ThrottleOptions = {}
): ThrottledFunction<Args> {
  const leading = options.leading ?? true;
  const trailing = options.trailing ?? false;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let trailingArgs: Args | undefined;

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const startWindow = () => {
    timer = setTimeout(() => {
      timer = undefined;
      if (trailingArgs === undefined) return;
      const pendingArgs = trailingArgs;
      trailingArgs = undefined;
      startWindow();
      fn(...pendingArgs);
    }, waitMs);
  };

  const throttled = (...args: Args) => {
    if (timer !== undefined) {
      if (trailing) trailingArgs = args;
      return;
    }

    startWindow();
    if (leading) {
      fn(...args);
    } else if (trailing) {
      trailingArgs = args;
    }
  };

  throttled.cancel = () => {
    clearTimer();
    trailingArgs = undefined;
  };

  return throttled;
}
