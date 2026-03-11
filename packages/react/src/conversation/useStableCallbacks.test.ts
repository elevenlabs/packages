import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Callbacks } from "@elevenlabs/client";
import { useStableCallbacks } from "./useStableCallbacks";

type Props = { onConnect: Callbacks["onConnect"] };

describe("useStableCallbacks", () => {
  it("returns the same function references across re-renders", () => {
    const { result, rerender } = renderHook(
      ({ onConnect }: Props) => useStableCallbacks({ onConnect }),
      { initialProps: { onConnect: vi.fn() } }
    );

    const first = result.current;
    rerender({ onConnect: vi.fn() });
    const second = result.current;

    expect(first.onConnect).toBe(second.onConnect);
  });

  it("invokes the latest callback value", () => {
    const calls: string[] = [];

    const { result, rerender } = renderHook(
      ({ onConnect }: Props) => useStableCallbacks({ onConnect }),
      {
        initialProps: {
          onConnect: () => calls.push("first"),
        },
      }
    );

    rerender({ onConnect: () => calls.push("second") });

    result.current.onConnect!({ conversationId: "test-id" });

    expect(calls).toEqual(["second"]);
  });

  it("omits keys that are not provided", () => {
    const { result } = renderHook(() => useStableCallbacks({}));

    expect(result.current.onConnect).toBeUndefined();
    expect(result.current.onDisconnect).toBeUndefined();
    expect(result.current.onError).toBeUndefined();
  });

  it("only includes keys that are provided", () => {
    const { result } = renderHook(() =>
      useStableCallbacks({ onConnect: vi.fn(), onError: vi.fn() })
    );

    expect(typeof result.current.onConnect).toBe("function");
    expect(typeof result.current.onError).toBe("function");
    expect(result.current.onDisconnect).toBeUndefined();
    expect(result.current.onMessage).toBeUndefined();
  });
});
