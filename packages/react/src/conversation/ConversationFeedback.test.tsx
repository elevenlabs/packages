import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext";
import { useConversationFeedback } from "./ConversationFeedback";

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
    sendFeedback: vi.fn(),
  }) as unknown as Conversation;

function useTestHook() {
  const ctx = useContext(ConversationContext) as ConversationContextValue;
  const feedback = useConversationFeedback();
  return { startSession: ctx.startSession, feedback };
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

describe("ConversationFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when used outside a ConversationProvider", () => {
    expect(() => renderHook(() => useConversationFeedback())).toThrow(
      "useConversationFeedback must be used within a ConversationProvider"
    );
  });

  it("returns canSendFeedback false initially", () => {
    const { result } = renderHook(() => useConversationFeedback(), {
      wrapper: createWrapper(),
    });

    expect(result.current.canSendFeedback).toBe(false);
    expect(typeof result.current.sendFeedback).toBe("function");
  });

  it("reflects canSendFeedback changes from onCanSendFeedbackChange callback", async () => {
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
      opts.onCanSendFeedbackChange!({ canSendFeedback: true });
    });
    expect(result.current.feedback.canSendFeedback).toBe(true);

    act(() => {
      opts.onCanSendFeedbackChange!({ canSendFeedback: false });
    });
    expect(result.current.feedback.canSendFeedback).toBe(false);
  });

  it("delegates sendFeedback to the conversation instance", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.feedback.sendFeedback(true);
    });
    expect(mockConversation.sendFeedback).toHaveBeenCalledWith(true);

    act(() => {
      result.current.feedback.sendFeedback(false);
    });
    expect(mockConversation.sendFeedback).toHaveBeenCalledWith(false);
  });

  it("composes with user-provided onCanSendFeedbackChange callback", async () => {
    const userOnCanSendFeedbackChange = vi.fn();
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper({
        onCanSendFeedbackChange: userOnCanSendFeedbackChange,
      }),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;

    act(() => {
      opts.onCanSendFeedbackChange!({ canSendFeedback: true });
    });

    expect(userOnCanSendFeedbackChange).toHaveBeenCalledWith({
      canSendFeedback: true,
    });
    expect(result.current.feedback.canSendFeedback).toBe(true);
  });

  it("resets canSendFeedback to false when session disconnects", async () => {
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
      opts.onCanSendFeedbackChange!({ canSendFeedback: true });
    });
    expect(result.current.feedback.canSendFeedback).toBe(true);

    act(() => {
      opts.onDisconnect!({ reason: "agent" });
    });
    expect(result.current.feedback.canSendFeedback).toBe(false);
  });
});
