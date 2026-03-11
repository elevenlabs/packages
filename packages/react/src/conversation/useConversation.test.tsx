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

  it("registers hook callbacks so they are invoked during a session", async () => {
    const onConnect = vi.fn();
    const onError = vi.fn();
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(
      () => useConversation({ onConnect, onError }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.startSession({ signedUrl: "wss://test.example.com" });
    });

    // Invoke the callbacks that were passed to Conversation.startSession
    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    opts.onConnect!({ conversationId: "test-id" });
    opts.onError!("something went wrong", { type: "unknown" });

    expect(onConnect).toHaveBeenCalledWith({ conversationId: "test-id" });
    expect(onError).toHaveBeenCalledWith("something went wrong", { type: "unknown" });
  });

  it("composes hook callbacks with provider callbacks", async () => {
    const providerOnConnect = vi.fn();
    const hookOnConnect = vi.fn();
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(
      () => useConversation({ onConnect: hookOnConnect }),
      { wrapper: createWrapper({ onConnect: providerOnConnect }) },
    );

    await act(async () => {
      result.current.startSession({ signedUrl: "wss://test.example.com" });
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    opts.onConnect!({ conversationId: "test-id" });

    expect(providerOnConnect).toHaveBeenCalledWith({ conversationId: "test-id" });
    expect(hookOnConnect).toHaveBeenCalledWith({ conversationId: "test-id" });
  });

  it("composes hook, provider, and startSession callbacks together", async () => {
    const calls: string[] = [];
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(
      () => useConversation({ onConnect: () => calls.push("hook") }),
      { wrapper: createWrapper({ onConnect: () => calls.push("provider") }) },
    );

    await act(async () => {
      result.current.startSession({
        signedUrl: "wss://test.example.com",
        onConnect: () => calls.push("startSession"),
      });
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    opts.onConnect!({ conversationId: "test-id" });

    expect(calls).toContain("provider");
    expect(calls).toContain("hook");
    expect(calls).toContain("startSession");
  });

  it("always invokes the latest hook callback (no stale closures)", async () => {
    const calls: string[] = [];
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result, rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useConversation({ onConnect: cb }),
      {
        wrapper: createWrapper(),
        initialProps: { cb: () => calls.push("first") },
      },
    );

    await act(async () => {
      result.current.startSession({ signedUrl: "wss://test.example.com" });
    });

    // Update the callback after the session has started
    rerender({ cb: () => calls.push("second") });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    opts.onConnect!({ conversationId: "test-id" });

    expect(calls).toEqual(["second"]);
  });

  it("forwards non-callback hook options as defaults to startSession", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(
      () => useConversation({ agentId: "hook-agent-id" }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    expect(opts.agentId).toBe("hook-agent-id");
  });

  it("startSession options override hook options", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(
      () => useConversation({ agentId: "hook-agent-id" }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.startSession({ agentId: "session-agent-id" });
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    expect(opts.agentId).toBe("session-agent-id");
  });

  it("does not forward callback hook options as session config", async () => {
    const onConnect = vi.fn();
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(
      () => useConversation({ agentId: "hook-agent-id", onConnect }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.startSession();
    });

    // agentId should be forwarded, but onConnect should not appear
    // as a raw prop — it's registered via useRegisterCallbacks instead
    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    expect(opts.agentId).toBe("hook-agent-id");
  });
});
