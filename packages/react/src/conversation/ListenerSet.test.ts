import { describe, it, expect, vi } from "vitest";
import { ListenerSet } from "./ListenerSet.js";

describe("ListenerSet", () => {
  it("invokes a single listener", () => {
    const set = new ListenerSet<[string]>();
    const fn = vi.fn();
    set.add(fn);

    set.invoke("hello");

    expect(fn).toHaveBeenCalledWith("hello");
  });

  it("invokes multiple listeners in registration order", () => {
    const set = new ListenerSet<[number]>();
    const calls: number[] = [];
    set.add(v => calls.push(v * 10));
    set.add(v => calls.push(v * 100));

    set.invoke(3);

    expect(calls).toEqual([30, 300]);
  });

  it("add returns a function that removes the listener", () => {
    const set = new ListenerSet<[string]>();
    const kept = vi.fn();
    const removed = vi.fn();

    set.add(kept);
    const remove = set.add(removed);

    remove();
    set.invoke("after");

    expect(kept).toHaveBeenCalledWith("after");
    expect(removed).not.toHaveBeenCalled();
  });

  it("invoking with no listeners does nothing", () => {
    const set = new ListenerSet<[string]>();
    expect(() => set.invoke("nothing")).not.toThrow();
  });

  it("size reflects current listener count", () => {
    const set = new ListenerSet<[string]>();
    expect(set.size).toBe(0);

    const remove1 = set.add(() => {});
    expect(set.size).toBe(1);

    set.add(() => {});
    expect(set.size).toBe(2);

    remove1();
    expect(set.size).toBe(1);
  });

  it("handles multiple argument types", () => {
    const set = new ListenerSet<[string, number, boolean]>();
    const fn = vi.fn();
    set.add(fn);

    set.invoke("test", 42, true);

    expect(fn).toHaveBeenCalledWith("test", 42, true);
  });

  it("handles zero-argument listeners", () => {
    const set = new ListenerSet<[]>();
    const fn = vi.fn();
    set.add(fn);

    set.invoke();

    expect(fn).toHaveBeenCalledWith();
  });
});
