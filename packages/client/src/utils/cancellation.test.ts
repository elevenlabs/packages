import { describe, expect, it } from "vitest";
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
});
