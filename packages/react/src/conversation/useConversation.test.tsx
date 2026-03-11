import React from "react";
import { it, expect, describe, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { useConversation } from "./useConversation";
import { ConversationProvider } from "./ConversationProvider";

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
    sendUserMessage: vi.fn(),
    sendContextualUpdate: vi.fn(),
    sendUserActivity: vi.fn(),
    sendMCPToolApprovalResult: vi.fn(),
    getInputByteFrequencyData: vi.fn(),
    getOutputByteFrequencyData: vi.fn(),
    getInputVolume: vi.fn().mockReturnValue(0),
    getOutputVolume: vi.fn().mockReturnValue(0),
  }) as unknown as Conversation;

function createWrapper(props: Record<string, unknown> = {}) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <ConversationProvider {...props}>{children}</ConversationProvider>
    );
  };
}

describe("useConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when used outside a ConversationProvider", () => {
    expect(() => {
      renderHook(() => useConversation());
    }).toThrow("ConversationProvider");
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useConversation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("disconnected");
    expect(result.current.isMuted).toBe(false);
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isListening).toBe(true);
    expect(result.current.canSendFeedback).toBe(false);
    expect(typeof result.current.startSession).toBe("function");
    expect(typeof result.current.endSession).toBe("function");
  });

  it("cancels session when endSession is called during connection", async () => {
    const mockConversation = createMockConversation();
    const { promise, resolve: resolveStartSession } =
      Promise.withResolvers<typeof mockConversation>();
    vi.mocked(Conversation.startSession).mockReturnValue(promise);

    const { result } = renderHook(() => useConversation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.startSession({ signedUrl: "wss://test.example.com" });
    });

    act(() => {
      result.current.endSession();
    });

    await act(async () => {
      resolveStartSession(mockConversation);
    });

    expect(mockConversation.endSession).toHaveBeenCalled();
  });

  it("allows new connection after cancelled session", async () => {
    const mockConversation1 = createMockConversation("first-id");
    const mockConversation2 = createMockConversation("second-id");

    const { promise: firstPromise, resolve: resolveFirst } =
      Promise.withResolvers<typeof mockConversation1>();
    vi.mocked(Conversation.startSession).mockReturnValue(firstPromise);

    const { result } = renderHook(() => useConversation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.startSession({ signedUrl: "wss://test.example.com" });
    });

    act(() => {
      result.current.endSession();
    });

    await act(async () => {
      resolveFirst(mockConversation1);
    });

    expect(mockConversation1.endSession).toHaveBeenCalled();

    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation2);

    await act(async () => {
      result.current.startSession({ signedUrl: "wss://test.example.com" });
    });

    expect(Conversation.startSession).toHaveBeenCalledTimes(2);
  });

  it("syncs controlled micMuted prop", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result, rerender } = renderHook(
      ({ micMuted }: { micMuted?: boolean }) =>
        useConversation({ micMuted }),
      { wrapper: createWrapper(), initialProps: {} },
    );

    await act(async () => {
      result.current.startSession({ signedUrl: "wss://test.example.com" });
    });

    expect(result.current.isMuted).toBe(false);

    rerender({ micMuted: true });

    expect(result.current.isMuted).toBe(true);
  });
});
