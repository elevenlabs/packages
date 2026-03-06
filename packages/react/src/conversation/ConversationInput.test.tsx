import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext";
import { useConversationInput } from "./ConversationInput";

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
  const input = useConversationInput();
  return { startSession: ctx.startSession, input };
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

describe("ConversationInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when used outside a ConversationProvider", () => {
    expect(() => renderHook(() => useConversationInput())).toThrow(
      "useConversationInput must be used within a ConversationProvider"
    );
  });

  it("returns isMuted false initially", () => {
    const { result } = renderHook(() => useConversationInput(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isMuted).toBe(false);
  });

  it("setMuted updates isMuted state", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.input.setMuted(true);
    });

    expect(result.current.input.isMuted).toBe(true);

    act(() => {
      result.current.input.setMuted(false);
    });

    expect(result.current.input.isMuted).toBe(false);
  });

  it("setMuted calls conversation.setMicMuted when session is active", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.input.setMuted(true);
    });

    expect(result.current.input.isMuted).toBe(true);
    expect(mockConversation.setMicMuted).toHaveBeenCalledWith(true);
  });

  it("setMuted throws when no session is active", () => {
    const { result } = renderHook(() => useConversationInput(), {
      wrapper: createWrapper(),
    });

    expect(() => {
      act(() => {
        result.current.setMuted(true);
      });
    }).toThrow("No active conversation. Call startSession() first.");
  });

  it("setMuted reference is stable across renders", () => {
    const { result, rerender } = renderHook(() => useConversationInput(), {
      wrapper: createWrapper(),
    });

    const firstSetMuted = result.current.setMuted;

    rerender();

    expect(result.current.setMuted).toBe(firstSetMuted);
  });
});
