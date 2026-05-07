import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider.js";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext.js";
import { useConversationMode } from "./ConversationMode.js";
import { createMockConversation } from "./test-utils.js";

vi.mock("@elevenlabs/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@elevenlabs/client")>();
  return { ...actual, Conversation: { startSession: vi.fn() } };
});

function useTestHook() {
  const ctx = useContext(ConversationContext) as ConversationContextValue;
  const mode = useConversationMode();
  return { startSession: ctx.startSession, mode };
}

function createWrapper(props: Record<string, unknown> = {}) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <ConversationProvider {...props}>
        {children}
      </ConversationProvider>
    );
  };
}

describe("ConversationMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when used outside a ConversationProvider", () => {
    expect(() => renderHook(() => useConversationMode())).toThrow(
      "useConversationMode must be used within a ConversationProvider"
    );
  });

  it("returns listening mode initially", () => {
    const { result } = renderHook(() => useConversationMode(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mode).toBe("listening");
    expect(result.current.isListening).toBe(true);
    expect(result.current.isSpeaking).toBe(false);
  });

  it("reflects mode changes from mode-change event", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      mockConversation.__emit("mode-change", { mode: "speaking" });
    });
    expect(result.current.mode.mode).toBe("speaking");
    expect(result.current.mode.isSpeaking).toBe(true);
    expect(result.current.mode.isListening).toBe(false);

    act(() => {
      mockConversation.__emit("mode-change", { mode: "listening" });
    });
    expect(result.current.mode.mode).toBe("listening");
    expect(result.current.mode.isListening).toBe(true);
    expect(result.current.mode.isSpeaking).toBe(false);
  });

  it("composes with user-provided onModeChange callback", async () => {
    const userOnModeChange = vi.fn();
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper({ onModeChange: userOnModeChange }),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;

    // The user's onModeChange is passed through as a session option callback
    expect(opts.onModeChange).toBeDefined();

    // Fire via opts to trigger the user callback (stableCallbacks pass-through)
    act(() => {
      opts.onModeChange!({ mode: "speaking" });
    });
    expect(userOnModeChange).toHaveBeenCalledWith({ mode: "speaking" });

    // Fire via event to trigger the mode sub-provider
    act(() => {
      mockConversation.__emit("mode-change", { mode: "speaking" });
    });
    expect(result.current.mode.mode).toBe("speaking");
  });

  it("resets mode to listening when session disconnects", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      mockConversation.__emit("mode-change", { mode: "speaking" });
    });
    expect(result.current.mode.mode).toBe("speaking");

    // Disconnect event causes ConversationProvider to clear conversation to null,
    // which triggers ConversationModeProvider's effect to reset mode to "listening"
    act(() => {
      mockConversation.__emit("disconnect", { reason: "agent" });
    });
    expect(result.current.mode.mode).toBe("listening");
    expect(result.current.mode.isListening).toBe(true);
    expect(result.current.mode.isSpeaking).toBe(false);
  });
});
