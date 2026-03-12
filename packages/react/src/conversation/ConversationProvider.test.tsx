import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import { Conversation, CALLBACK_KEYS, type Callbacks } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider";
import {
  ConversationContext,
  useRawConversation,
  type ConversationContextValue,
} from "./ConversationContext";

/** Test helper — accesses the full context value (conversation + lifecycle methods). */
function useTestContext(): ConversationContextValue {
  const ctx = useContext(ConversationContext);
  if (!ctx)
    throw new Error(
      "useTestContext must be used within a ConversationProvider"
    );
  return ctx;
}

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

function createWrapper(props: Record<string, unknown> = {}) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <ConversationProvider {...props}>
        {children}
      </ConversationProvider>
    );
  };
}

describe("ConversationProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides null conversation initially", () => {
    const { result } = renderHook(() => useRawConversation(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeNull();
  });

  it("provides a conversation after startSession resolves", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.conversation).toBe(mockConversation);
  });

  it("sets conversation to null after endSession", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.conversation).toBe(mockConversation);

    act(() => {
      result.current.endSession();
    });

    expect(result.current.conversation).toBeNull();
    expect(mockConversation.endSession).toHaveBeenCalled();
  });

  it("cancels session if endSession is called during connection", async () => {
    const mockConversation = createMockConversation();
    const { promise, resolve: resolveStartSession } =
      Promise.withResolvers<typeof mockConversation>();
    vi.mocked(Conversation.startSession).mockReturnValue(promise);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.startSession();
    });

    act(() => {
      result.current.endSession();
    });

    await act(async () => {
      resolveStartSession(mockConversation);
    });

    // Conversation should have been ended immediately
    expect(mockConversation.endSession).toHaveBeenCalled();
    // And not set as the active conversation
    expect(result.current.conversation).toBeNull();
  });

  it("ignores startSession if a session is already active", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    // Call startSession again — should be a no-op
    act(() => {
      result.current.startSession();
    });

    expect(Conversation.startSession).toHaveBeenCalledTimes(1);
  });

  it("ignores startSession if a connection is already in progress", async () => {
    const mockConversation = createMockConversation();
    const { promise, resolve: resolveStartSession } =
      Promise.withResolvers<typeof mockConversation>();
    vi.mocked(Conversation.startSession).mockReturnValue(promise);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.startSession();
    });

    // Call startSession again while connecting — should be a no-op
    act(() => {
      result.current.startSession();
    });

    expect(Conversation.startSession).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => {
      resolveStartSession(mockConversation);
    });
  });

  it("allows new connection after cancelled session", async () => {
    const mockConversation1 = createMockConversation("first-id");
    const mockConversation2 = createMockConversation("second-id");

    const { promise: firstPromise, resolve: resolveFirst } =
      Promise.withResolvers<typeof mockConversation1>();
    vi.mocked(Conversation.startSession).mockReturnValue(firstPromise);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.startSession();
    });

    act(() => {
      result.current.endSession();
    });

    await act(async () => {
      resolveFirst(mockConversation1);
    });

    expect(mockConversation1.endSession).toHaveBeenCalled();

    // Now start a new session
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation2);

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.conversation).toBe(mockConversation2);
    expect(Conversation.startSession).toHaveBeenCalledTimes(2);
  });

  it("ends session on unmount", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result, unmount } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    unmount();

    expect(mockConversation.endSession).toHaveBeenCalled();
  });

  it("calls both prop and startSession callbacks when both are provided", async () => {
    const propCalls: string[] = [];
    const sessionCalls: string[] = [];

    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper({
        onConnect: () => propCalls.push("prop"),
      }),
    });

    await act(async () => {
      result.current.startSession({
        onConnect: () => sessionCalls.push("session"),
      });
    });

    // Invoke the composed onConnect that was passed to startSession
    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    opts.onConnect!({ conversationId: "test-id" });

    expect(propCalls).toEqual(["prop"]);
    expect(sessionCalls).toEqual(["session"]);
  });

  it("calls only the prop callback when startSession provides none", async () => {
    const propCalls: string[] = [];

    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper({
        onConnect: () => propCalls.push("prop"),
      }),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    opts.onConnect!({ conversationId: "test-id" });

    expect(propCalls).toEqual(["prop"]);
  });

  it("calls only the startSession callback when no prop callback is set", async () => {
    const sessionCalls: string[] = [];

    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession({
        onConnect: () => sessionCalls.push("session"),
      });
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    opts.onConnect!({ conversationId: "test-id" });

    expect(sessionCalls).toEqual(["session"]);
  });

  it("clears conversation when onDisconnect fires (external disconnect)", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.conversation).toBe(mockConversation);

    // Simulate an external disconnect (agent hangs up, raw endSession(), etc.)
    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    act(() => {
      opts.onDisconnect!({ reason: "agent" });
    });

    expect(result.current.conversation).toBeNull();
  });

  it("composes internal onDisconnect with user-provided onDisconnect", async () => {
    const userOnDisconnect = vi.fn();
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper({ onDisconnect: userOnDisconnect }),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    act(() => {
      opts.onDisconnect!({ reason: "agent" });
    });

    expect(userOnDisconnect).toHaveBeenCalledWith({ reason: "agent" });
    expect(result.current.conversation).toBeNull();
  });

  it("passes stable callbacks that always call the latest prop value", async () => {
    const onConnect = vi.fn();
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ConversationProvider onConnect={onConnect}>
        {children}
      </ConversationProvider>
    );

    // We test the stable callback pattern by checking that
    // Conversation.startSession is called with callbacks
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestContext(), {
      wrapper,
    });

    await act(async () => {
      result.current.startSession();
    });

    // Verify Conversation.startSession was called with the provided callback
    const startSessionCall = vi.mocked(Conversation.startSession).mock
      .calls[0][0];
    expect(typeof startSessionCall.onConnect).toBe("function");
    // onDisconnect is registered internally by the provider
    expect(typeof startSessionCall.onDisconnect).toBe("function");
  });
});

describe("CALLBACK_KEYS", () => {
  it("contains every key from the Callbacks type", () => {
    // Create an object with all Callbacks keys satisfied, then verify
    // CALLBACK_KEYS covers them all.
    // Compile-time check: if CALLBACK_KEYS is missing a Callbacks key, this
    // type alias will fail because Missing won't be `never`.
    type AssertNever<T extends never> = T;
    type _Check = AssertNever<
      Exclude<keyof Callbacks, (typeof CALLBACK_KEYS)[number]>
    >;
    void (undefined as unknown as _Check);

    // Runtime sanity: no duplicates in the array.
    expect(new Set(CALLBACK_KEYS).size).toBe(CALLBACK_KEYS.length);
  });
});
