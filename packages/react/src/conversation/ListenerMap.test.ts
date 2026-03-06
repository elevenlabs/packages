import { describe, it, expect, vi } from "vitest";
import { ListenerMap } from "./ListenerMap";

type TestCallbacks = {
  onConnect?: (props: { id: string }) => void;
  onError?: (message: string) => void;
  onDisconnect?: () => void;
};

describe("ListenerMap", () => {
  it("invokes a registered listener through compose", () => {
    const map = new ListenerMap<TestCallbacks>();
    const fn = vi.fn();
    map.register({ onConnect: fn });

    const composed = map.compose();
    composed.onConnect?.({ id: "abc" });

    expect(fn).toHaveBeenCalledWith({ id: "abc" });
  });

  it("invokes multiple listeners for the same key", () => {
    const map = new ListenerMap<TestCallbacks>();
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
    const map = new ListenerMap<TestCallbacks>();
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
    const map = new ListenerMap<TestCallbacks>();
    const onConnect = vi.fn();
    const onError = vi.fn();
    const remove = map.register({ onConnect, onError });

    const composed = map.compose();
    composed.onConnect?.({ id: "x" });
    composed.onError?.("bad");

    expect(onConnect).toHaveBeenCalledWith({ id: "x" });
    expect(onError).toHaveBeenCalledWith("bad");

    remove();

    // After removal, new compose should have no listeners
    const empty = map.compose();
    expect(empty.onConnect).toBeUndefined();
    expect(empty.onError).toBeUndefined();
  });

  it("compose omits keys with no listeners", () => {
    const map = new ListenerMap<TestCallbacks>();
    const composed = map.compose();

    expect(composed).toEqual({});
    expect(composed.onConnect).toBeUndefined();
  });

  it("compose reflects live listener state", () => {
    const map = new ListenerMap<TestCallbacks>();
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

  it("throws on undefined values in the callbacks object", () => {
    const map = new ListenerMap<TestCallbacks>();
    expect(() =>
      map.register({ onConnect: undefined, onError: vi.fn() })
    ).toThrow('Expected function for key "onConnect"');
  });
});
