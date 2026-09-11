import { describe, it, expect, vi, afterEach } from "vitest";

import { throttle } from "./throttle.js";

describe("throttle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes the wrapped function immediately on the leading edge", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 2000);

    throttled("a", 1);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a", 1);
  });

  it("suppresses further calls within the wait window", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 2000);

    throttled();
    vi.advanceTimersByTime(500);
    throttled();
    vi.advanceTimersByTime(1000);
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fires again once the wait window has elapsed", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 2000);

    throttled();
    vi.advanceTimersByTime(2000);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("resets the leading-edge window when cancelled", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 2000);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    throttled.cancel();
    // Without advancing the timer, the next call fires immediately because the
    // pending window was cleared.
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("supports a trailing invocation with the latest arguments", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 2000, { leading: false, trailing: true });

    throttled("first");
    throttled("second");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it("does not fire a trailing invocation after cancel", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 2000, { leading: false, trailing: true });

    throttled("pending");
    throttled.cancel();
    vi.advanceTimersByTime(2000);

    expect(fn).not.toHaveBeenCalled();
  });
});
