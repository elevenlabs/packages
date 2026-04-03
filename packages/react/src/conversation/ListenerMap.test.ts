import { describe, it, expect, vi } from "vitest";
import { ListenerMap } from "./ListenerMap.js";

type TestCallbacks = {
  onConnect?: (props: { id: string }) => void;
  onError?: (message: string) => void;
  onDisconnect?: () => void;
};

describe("ListenerMap", () => {
  it("invokes a registered listener through compose", () => {
    const map = new ListenerMap<TestCallbacks>([
      "onConnect",
      "onError",
      "onDisconnect",
    ]);
    const fn = vi.fn();
    map.register({ onConnect: fn });

    const composed = map.compose();
    composed.onConnect?.({ id: "abc" });

    expect(fn).toHaveBeenCalledWith({ id: "abc" });
  });

  it("invokes multiple listeners for the same key", () => {
    const map = new ListenerMap<TestCallbacks>([
      "onConnect",
      "onError",
      "onDisconnect",
    ]);
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    map.register({ onError: fn1 });
    map.register({ onError: fn2 });

    const composed = map.compose();
    composed.onError?.("fail");

    expect(fn1).toHaveBeenCalledWith("fail");
    expect(fn2).toHaveBeenCalledWith("fail");
  });

  it("register returns a function that removes all its listeners", () => {
    const map = new ListenerMap<TestCallbacks>([
      "onConnect",
      "onError",
      "onDisconnect",
    ]);
    const kept = vi.fn();
    const removed = vi.fn();
    map.register({ onError: kept });
    const remove = map.register({ onError: removed });

    remove();

    const composed = map.compose();
    composed.onError?.("after");

    expect(kept).toHaveBeenCalledWith("after");
    expect(removed).not.toHaveBeenCalled();
  });

  it("register handles multiple keys at once", () => {
    const map = new ListenerMap<TestCallbacks>([
      "onConnect",
      "onError",
      "onDisconnect",
    ]);
    const onConnect = vi.fn();
    const onError = vi.fn();
    const remove = map.register({ onConnect, onError });

    const composed = map.compose();
    composed.onConnect?.({ id: "x" });
    composed.onError?.("bad");

    expect(onConnect).toHaveBeenCalledWith({ id: "x" });
    expect(onError).toHaveBeenCalledWith("bad");

    remove();

    // Removed listeners are no longer invoked, but late-registered ones still fire
    const onConnectSpy = vi.fn();
    map.register({ onConnect: onConnectSpy });
    const composed2 = map.compose();
    composed2.onConnect?.({ id: "y" });
    expect(onConnect).not.toHaveBeenCalledWith({ id: "y" });
    expect(onConnectSpy).toHaveBeenCalledWith({ id: "y" });
  });

  it("compose only includes keys with registered listeners", () => {
    const map = new ListenerMap<TestCallbacks>([
      "onConnect",
      "onError",
      "onDisconnect",
    ]);
    const composed = map.compose();

    expect(composed.onConnect).toBeUndefined();
    expect(composed.onError).toBeUndefined();
    expect(composed.onDisconnect).toBeUndefined();

    // After registering a listener, only that key appears
    map.register({ onError: vi.fn() });
    const composed2 = map.compose();
    expect(composed2.onConnect).toBeUndefined();
    expect(typeof composed2.onError).toBe("function");
    expect(composed2.onDisconnect).toBeUndefined();
  });

  it("compose reflects live listener state", () => {
    const map = new ListenerMap<TestCallbacks>([
      "onConnect",
      "onError",
      "onDisconnect",
    ]);
    const fn = vi.fn();
    const remove = map.register({ onDisconnect: fn });

    // Compose before removal
    const composed = map.compose();

    // Remove the listener after compose
    remove();

    // The composed function should reflect the removal
    composed.onDisconnect?.();
    expect(fn).not.toHaveBeenCalled();
  });

  it("compose picks up listeners registered after compose was called", () => {
    const map = new ListenerMap<TestCallbacks>([
      "onConnect",
      "onError",
      "onDisconnect",
    ]);

    // Register an initial listener so compose includes the key
    const early = vi.fn();
    map.register({ onConnect: early });
    const composed = map.compose();

    // Register another listener after compose
    const late = vi.fn();
    map.register({ onConnect: late });

    // The previously composed function should invoke both listeners
    composed.onConnect?.({ id: "late" });
    expect(early).toHaveBeenCalledWith({ id: "late" });
    expect(late).toHaveBeenCalledWith({ id: "late" });
  });

  it("skips undefined values in the callbacks object", () => {
    const map = new ListenerMap<TestCallbacks>([
      "onConnect",
      "onError",
      "onDisconnect",
    ]);
    const onError = vi.fn();
    const remove = map.register({ onConnect: undefined, onError });
    const composed = map.compose();
    composed.onConnect?.({ id: "test" });
    expect(onError).not.toHaveBeenCalled();
    composed.onError?.("boom");
    expect(onError).toHaveBeenCalledWith("boom");
    remove();
  });

  it("throws on unknown callback keys", () => {
    const map = new ListenerMap<TestCallbacks>(["onConnect"]);
    expect(() =>
      map.register({ onError: vi.fn() } as Partial<TestCallbacks>)
    ).toThrow('Unknown callback key "onError"');
  });
});
