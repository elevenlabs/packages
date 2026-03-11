import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext";
import { useConversationMode } from "./ConversationMode";

vi.mock("@elevenlabs/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@elevenlabs/client")>();
  return { ...actual, Conversation: { startSession: vi.fn() } };
});

const createMockConversation = (id = "test-id") =>
  ({
    getId: vi.fn().mockReturnValue(id),
    isOpen: vi.fn().mockReturnValue(true),
    endSession: vi.fn().mockResolvedValue(undefined),
    setMicMuted: vi.fn(),
    setVolume: vi.fn(),
  }) as unknown as Conversation;

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

  it("reflects mode changes from onModeChange callback", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;

    act(() => {
      opts.onModeChange!({ mode: "speaking" });
    });
    expect(result.current.mode.mode).toBe("speaking");
    expect(result.current.mode.isSpeaking).toBe(true);
    expect(result.current.mode.isListening).toBe(false);

    act(() => {
      opts.onModeChange!({ mode: "listening" });
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

    act(() => {
      opts.onModeChange!({ mode: "speaking" });
    });

    expect(userOnModeChange).toHaveBeenCalledWith({ mode: "speaking" });
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

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;

    act(() => {
      opts.onModeChange!({ mode: "speaking" });
    });
    expect(result.current.mode.mode).toBe("speaking");

    act(() => {
      opts.onDisconnect!({ reason: "agent" });
    });
    expect(result.current.mode.mode).toBe("listening");
    expect(result.current.mode.isListening).toBe(true);
    expect(result.current.mode.isSpeaking).toBe(false);
  });
});
