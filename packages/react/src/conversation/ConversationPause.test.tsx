import { describe, it, expect } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import { ConversationProvider } from "./ConversationProvider.js";
import { useConversationPause } from "./ConversationPause.js";

function createWrapper() {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return <ConversationProvider>{children}</ConversationProvider>;
  };
}

describe("useConversationPause", () => {
  it("throws when used outside a ConversationProvider", () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => renderHook(() => useConversationPause())).toThrow(
      "useConversationPause must be used within a ConversationProvider"
    );
    console.error = consoleError;
  });

  it("returns isPaused false initially", () => {
    const { result } = renderHook(() => useConversationPause(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPaused).toBe(false);
  });
});
