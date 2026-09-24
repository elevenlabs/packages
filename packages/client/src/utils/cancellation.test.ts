import { afterEach, describe, expect, it, vi } from "vitest";
import {
  observeWithCancellation,
  registerSessionCleanup,
  waitForSessionCleanup,
} from "./cancellation.js";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("session cancellation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("preserves an operation failure that settled before a synchronous abort", async () => {
    const controller = new AbortController();
    const operationError = new Error("connection failed");
    const observed = observeWithCancellation(
      Promise.reject(operationError),
      controller.signal
    );

    controller.abort();

    await expect(observed).rejects.toBe(operationError);
  });

  it("waits for registered cleanup barriers", async () => {
    const controller = new AbortController();
    const cleanup = createDeferred<void>();
    registerSessionCleanup(controller.signal, cleanup.promise);

    let settled = false;
    const waiting = waitForSessionCleanup(controller.signal).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    cleanup.resolve();
    await waiting;
    expect(settled).toBe(true);
  });

  it("bounds cleanup when timeoutMs expires", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const controller = new AbortController();
    const cleanup = createDeferred<void>();
    registerSessionCleanup(controller.signal, cleanup.promise);

    let settled = false;
    const waiting = waitForSessionCleanup(controller.signal, {
      timeoutMs: 10_000,
    }).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(9_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(settled).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[ConversationalAI] Session cleanup exceeded 10000ms; continuing while late cleanup remains observed."
    );

    cleanup.resolve();
    await waitForSessionCleanup(controller.signal);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid cleanup timeout", async () => {
    const controller = new AbortController();
    await expect(
      waitForSessionCleanup(controller.signal, { timeoutMs: -1 })
    ).rejects.toThrow(
      new RangeError("timeoutMs must be a non-negative number")
    );
    await expect(
      waitForSessionCleanup(controller.signal, { timeoutMs: Number.NaN })
    ).rejects.toThrow(
      new RangeError("timeoutMs must be a non-negative number")
    );
  });
});
