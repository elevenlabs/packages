import { describe, it, expect, vi } from "vitest";
import { mergeOptions } from "./mergeOptions.js";

type Config = {
  a?: string;
  b?: number;
  nested?: {
    x?: number;
    y?: string;
  };
  deep?: {
    level1?: {
      level2?: string;
      other?: string;
    };
  };
  onEvent?: (value: string) => void;
};

describe("mergeOptions", () => {
  it("returns an empty object when called with no arguments", () => {
    expect(mergeOptions()).toEqual({});
  });

  it("returns a shallow copy of a single config", () => {
    const config = { a: "hello", b: 42 };
    const result = mergeOptions<Config>(config);
    expect(result).toEqual({ a: "hello", b: 42 });
    expect(result).not.toBe(config);
  });

  it("later values override earlier ones for scalar fields", () => {
    const result = mergeOptions<Config>({ a: "first" }, { a: "second" });
    expect(result.a).toBe("second");
  });

  it("preserves fields that only appear in one config", () => {
    const result = mergeOptions<Config>({ a: "hello" }, { b: 42 });
    expect(result).toEqual({ a: "hello", b: 42 });
  });

  it("deep-merges nested plain objects", () => {
    const result = mergeOptions<Config>(
      { nested: { x: 1, y: "keep" } },
      { nested: { x: 2 } }
    );
    expect(result.nested).toEqual({ x: 2, y: "keep" });
  });

  it("deep-merges more than two levels", () => {
    const result = mergeOptions<Config>(
      { deep: { level1: { level2: "original", other: "keep" } } },
      { deep: { level1: { level2: "updated" } } }
    );
    expect(result.deep).toEqual({
      level1: { level2: "updated", other: "keep" },
    });
  });

  it("introduces a nested object that did not exist before", () => {
    const result = mergeOptions<Config>({ a: "hello" }, { nested: { x: 1 } });
    expect(result).toEqual({ a: "hello", nested: { x: 1 } });
  });

  it("merges across three or more configs", () => {
    const result = mergeOptions<Config>(
      { nested: { x: 1 } },
      { nested: { y: "two" } },
      { a: "three" }
    );
    expect(result).toEqual({ a: "three", nested: { x: 1, y: "two" } });
  });

  it("does not mutate any of the input objects", () => {
    const first = { nested: { x: 1 } };
    const second = { nested: { x: 2, y: "hello" } };
    mergeOptions<Config>(first, second);
    expect(first.nested).toEqual({ x: 1 });
    expect(second.nested).toEqual({ x: 2, y: "hello" });
  });

  it("treats arrays as atomic values (last wins, no concat)", () => {
    type WithArray = { items?: number[] };
    const result = mergeOptions<WithArray>({ items: [1, 2] }, { items: [3] });
    expect(result.items).toEqual([3]);
  });

  it("ignores undefined values without overwriting", () => {
    const result = mergeOptions<Config>({ a: "keep" }, { a: undefined });
    expect(result.a).toBe("keep");
  });

  describe("function composition", () => {
    it("composes two functions so both are called", () => {
      const first = vi.fn();
      const second = vi.fn();

      const result = mergeOptions<Config>(
        { onEvent: first },
        { onEvent: second }
      );

      result.onEvent!("hello");
      expect(first).toHaveBeenCalledWith("hello");
      expect(second).toHaveBeenCalledWith("hello");
    });

    it("calls composed functions in order (earlier first)", () => {
      const calls: string[] = [];

      const result = mergeOptions<Config>(
        { onEvent: v => calls.push(`first:${v}`) },
        { onEvent: v => calls.push(`second:${v}`) }
      );

      result.onEvent!("arg");
      expect(calls).toEqual(["first:arg", "second:arg"]);
    });

    it("composes across three configs", () => {
      const calls: string[] = [];

      const result = mergeOptions<Config>(
        { onEvent: v => calls.push(`1:${v}`) },
        { onEvent: v => calls.push(`2:${v}`) },
        { onEvent: v => calls.push(`3:${v}`) }
      );

      result.onEvent!("val");
      expect(calls).toEqual(["1:val", "2:val", "3:val"]);
    });

    it("uses the sole function when only one config has it", () => {
      const fn = vi.fn();
      const result = mergeOptions<Config>({ a: "hello" }, { onEvent: fn });
      result.onEvent!("val");
      expect(fn).toHaveBeenCalledWith("val");
    });
  });
});
