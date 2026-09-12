const SESSION_ABORT_ERROR = Symbol("session-abort-error");

export function createSessionAbortError(): Error {
  const error = new Error("Session start was cancelled");
  error.name = "AbortError";
  Object.defineProperty(error, SESSION_ABORT_ERROR, { value: true });
  return error;
}

export function isSessionAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as Error & { [SESSION_ABORT_ERROR]?: boolean })[
      SESSION_ABORT_ERROR
    ] === true
  );
}

export function throwIfSessionAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createSessionAbortError();
  }
}

const sessionCleanupBarriers = new WeakMap<AbortSignal, Set<Promise<void>>>();

/**
 * Registers cleanup for work that cannot be interrupted at its source. This
 * lets higher-level lifecycle owners keep replacement sessions gated until a
 * cancelled operation can no longer acquire or reconnect resources.
 */
export function registerSessionCleanup(
  signal: AbortSignal | undefined,
  cleanup: Promise<unknown>
): void {
  if (!signal) return;

  let barriers = sessionCleanupBarriers.get(signal);
  if (!barriers) {
    barriers = new Set();
    sessionCleanupBarriers.set(signal, barriers);
  }

  const observed = cleanup
    .then(
      () => {},
      () => {}
    )
    .finally(() => {
      barriers.delete(observed);
      if (barriers.size === 0) {
        sessionCleanupBarriers.delete(signal);
      }
    });
  barriers.add(observed);
}

/** Waits until all cleanup registered for a session signal has settled. */
export async function waitForSessionCleanup(
  signal: AbortSignal | undefined
): Promise<void> {
  if (!signal) return;

  while (true) {
    const barriers = sessionCleanupBarriers.get(signal);
    if (!barriers || barriers.size === 0) return;
    await Promise.all([...barriers]);
  }
}

/**
 * Rejects promptly on cancellation while keeping observers attached to the
 * underlying operation so a late rejection cannot become unhandled.
 */
export function observeWithCancellation<T>(
  operation: Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (!signal) return operation;
  if (signal.aborted) {
    operation.catch(() => {});
    return Promise.reject(createSessionAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      callback();
    };
    const onAbort = () => {
      // Promise reactions for an operation that already settled are queued
      // before a subsequently dispatched abort. Settle cancellation in its own
      // microtask so that original result keeps first-winner semantics.
      queueMicrotask(() => settle(() => reject(createSessionAbortError())));
    };

    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
    }

    operation.then(
      value => settle(() => resolve(value)),
      error => settle(() => reject(error))
    );
  });
}
