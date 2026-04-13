import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import {
  Conversation,
  type Callbacks,
  type ConversationLifecycleOptions,
} from "@elevenlabs/client";
import { CALLBACK_KEYS } from "@elevenlabs/client/internal";
import { ConversationProvider } from "./ConversationProvider.js";
import {
  ConversationContext,
  useRawConversation,
  type ConversationContextValue,
} from "./ConversationContext.js";

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
    sendUserMessage: vi.fn(),
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

type MockStartSessionOptions = Partial<Callbacks & ConversationLifecycleOptions> &
  Record<string, unknown>;

function driveConnectedSessionLifecycle(
  options: MockStartSessionOptions,
  conversation: Conversation
) {
  options.onConversationCreated?.(conversation);
  options.onStatusChange?.({ status: "connected" });
  options.onConnect?.({ conversationId: conversation.getId() });
}

function mockStartSessionWithLifecycle(conversation = createMockConversation()) {
  vi.mocked(Conversation.startSession).mockImplementation(async options => {
    driveConnectedSessionLifecycle(
      options as MockStartSessionOptions,
      conversation
    );
    return conversation;
  });
  return conversation;
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

    mockStartSessionWithLifecycle();

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

    // onConnect is forwarded through the provider-owned wrapper.
    expect(propCalls).toEqual(["prop"]);
    expect(sessionCalls).toEqual(["session"]);
  });

  it("calls only the prop callback when startSession provides none", async () => {
    const propCalls: string[] = [];

    mockStartSessionWithLifecycle();

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper({
        onConnect: () => propCalls.push("prop"),
      }),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(propCalls).toEqual(["prop"]);
  });

  it("calls only the startSession callback when no prop callback is set", async () => {
    const sessionCalls: string[] = [];

    mockStartSessionWithLifecycle();

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession({
        onConnect: () => sessionCalls.push("session"),
      });
    });

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

  it("does not reconnect when textOnly prop changes while connecting", async () => {
    const mockConversation = createMockConversation();
    const { promise, resolve: resolveStartSession } =
      Promise.withResolvers<typeof mockConversation>();
    vi.mocked(Conversation.startSession).mockReturnValue(promise);

    let textOnly = false;
    const { result, rerender } = renderHook(() => useTestContext(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <ConversationProvider textOnly={textOnly}>
          {children}
        </ConversationProvider>
      ),
    });

    // Start connecting
    act(() => {
      result.current.startSession();
    });

    expect(Conversation.startSession).toHaveBeenCalledTimes(1);

    // Change textOnly while connection is pending
    textOnly = true;
    rerender();

    // No new startSession call should have been made
    expect(Conversation.startSession).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => {
      resolveStartSession(mockConversation);
    });
  });

  it("does not reconnect when connectionType prop changes while connecting", async () => {
    const mockConversation = createMockConversation();
    const { promise, resolve: resolveStartSession } =
      Promise.withResolvers<typeof mockConversation>();
    vi.mocked(Conversation.startSession).mockReturnValue(promise);

    let connectionType: "webrtc" | "websocket" = "webrtc";
    const { result, rerender } = renderHook(() => useTestContext(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <ConversationProvider connectionType={connectionType}>
          {children}
        </ConversationProvider>
      ),
    });

    // Start connecting
    act(() => {
      result.current.startSession();
    });

    expect(Conversation.startSession).toHaveBeenCalledTimes(1);

    // Change connectionType while connection is pending
    connectionType = "websocket";
    rerender();

    // No new startSession call should have been made
    expect(Conversation.startSession).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => {
      resolveStartSession(mockConversation);
    });
  });

  it("does not reconnect when textOnly prop changes while disconnecting", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    let textOnly = false;
    const { result, rerender } = renderHook(() => useTestContext(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <ConversationProvider textOnly={textOnly}>
          {children}
        </ConversationProvider>
      ),
    });

    // Establish a session
    await act(async () => {
      result.current.startSession();
    });

    expect(Conversation.startSession).toHaveBeenCalledTimes(1);
    expect(result.current.conversation).toBe(mockConversation);

    // End session (initiates disconnecting)
    act(() => {
      result.current.endSession();
    });

    expect(result.current.conversation).toBeNull();

    // Change textOnly while disconnecting
    textOnly = true;
    rerender();

    // No new startSession call should have been made
    expect(Conversation.startSession).toHaveBeenCalledTimes(1);
  });

  it("does not reconnect when connectionType prop changes while disconnecting", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    let connectionType: "webrtc" | "websocket" = "webrtc";
    const { result, rerender } = renderHook(() => useTestContext(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <ConversationProvider connectionType={connectionType}>
          {children}
        </ConversationProvider>
      ),
    });

    // Establish a session
    await act(async () => {
      result.current.startSession();
    });

    expect(Conversation.startSession).toHaveBeenCalledTimes(1);
    expect(result.current.conversation).toBe(mockConversation);

    // End session (initiates disconnecting)
    act(() => {
      result.current.endSession();
    });

    expect(result.current.conversation).toBeNull();

    // Change connectionType while disconnecting
    connectionType = "websocket";
    rerender();

    // No new startSession call should have been made
    expect(Conversation.startSession).toHaveBeenCalledTimes(1);
  });

  it("calls onError when startSession rejects", async () => {
    const onError = vi.fn();
    vi.mocked(Conversation.startSession).mockRejectedValue(
      new Error("agent not found")
    );

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper({ onError }),
    });

    await act(async () => {
      result.current.startSession();
    });

    // The composed onError passed to Conversation.startSession should have been called
    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;
    expect(opts.onError).toBeDefined();

    // The user's onError prop should have been called with the error message
    expect(onError).toHaveBeenCalledWith("agent not found", expect.any(Error));
  });

  it("allows new connection after a failed startSession", async () => {
    vi.mocked(Conversation.startSession).mockRejectedValue(
      new Error("agent not found")
    );

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    // lockRef should be cleared — a new connection should be possible
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    await act(async () => {
      result.current.startSession();
    });

    expect(Conversation.startSession).toHaveBeenCalledTimes(2);
    expect(result.current.conversation).toBe(mockConversation);
  });

  it("does not call onError when endSession is called before startSession rejects", async () => {
    const onError = vi.fn();
    const { promise, reject: rejectStartSession } =
      Promise.withResolvers<Conversation>();
    vi.mocked(Conversation.startSession).mockReturnValue(promise);

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper({ onError }),
    });

    act(() => {
      result.current.startSession();
    });

    // User intentionally ends before the connection settles
    act(() => {
      result.current.endSession();
    });

    await act(async () => {
      rejectStartSession(new Error("connection failed"));
    });

    // onError should NOT fire — the user intentionally disconnected
    expect(onError).not.toHaveBeenCalled();
  });

  it("passes stable callbacks that always call the latest prop value", async () => {
    const onConnect = vi.fn();
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ConversationProvider onConnect={onConnect}>
        {children}
      </ConversationProvider>
    );

    mockStartSessionWithLifecycle();

    const { result } = renderHook(() => useTestContext(), {
      wrapper,
    });

    await act(async () => {
      result.current.startSession();
    });

    const startSessionCall = vi.mocked(Conversation.startSession).mock
      .calls[0][0];
    // onConnect is wrapped by the provider and forwarded through the SDK.
    expect(typeof startSessionCall.onConnect).toBe("function");
    expect(
      typeof (startSessionCall as MockStartSessionOptions).onConversationCreated
    ).toBe("function");
    // onDisconnect is registered internally by the provider
    expect(typeof startSessionCall.onDisconnect).toBe("function");
    // Unprovided callbacks are omitted so client feature guards work
    expect(startSessionCall.onUnhandledClientToolCall).toBeUndefined();
    // onConnect should still have been called
    expect(onConnect).toHaveBeenCalledWith({ conversationId: "test-id" });
  });

  it("can send a message from onConnect without throwing", async () => {
    const mockConversation = createMockConversation();

    vi.mocked(Conversation.startSession).mockImplementation(async opts => {
      driveConnectedSessionLifecycle(
        opts as MockStartSessionOptions,
        mockConversation
      );
      return mockConversation;
    });

    const onConnectError = vi.fn();

    function useTestHarness() {
      const ctx = useContext(ConversationContext)!;
      return {
        startSession: () =>
          ctx.startSession({
            onConnect: () => {
              try {
                const conv = ctx.conversationRef.current;
                conv!.sendUserMessage("hello");
              } catch (e) {
                onConnectError(e);
              }
            },
          }),
      };
    }

    const { result } = renderHook(() => useTestHarness(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(onConnectError).not.toHaveBeenCalled();
    expect(mockConversation.sendUserMessage).toHaveBeenCalledWith("hello");
  });

  it("clears the active conversation when onConnect throws", async () => {
    const mockConversation = createMockConversation();
    const onError = vi.fn();

    vi.mocked(Conversation.startSession).mockImplementation(async opts => {
      driveConnectedSessionLifecycle(
        opts as MockStartSessionOptions,
        mockConversation
      );
      return mockConversation;
    });

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper({ onError }),
    });

    await act(async () => {
      result.current.startSession({
        onConnect: () => {
          throw new Error("boom");
        },
      });
    });

    expect(onError).toHaveBeenCalledWith("boom", expect.any(Error));
    expect(result.current.conversation).toBeNull();
  });

  it("forwards user onConversationCreated after provider sets conversationRef", async () => {
    const mockConversation = createMockConversation();
    const userOnConversationCreated = vi.fn();

    vi.mocked(Conversation.startSession).mockImplementation(async opts => {
      driveConnectedSessionLifecycle(
        opts as MockStartSessionOptions,
        mockConversation
      );
      return mockConversation;
    });

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession({
        onConversationCreated(conv) {
          userOnConversationCreated(
            conv,
            result.current.conversationRef.current
          );
        },
      });
    });

    expect(userOnConversationCreated).toHaveBeenCalledTimes(1);
    expect(userOnConversationCreated).toHaveBeenCalledWith(
      mockConversation,
      mockConversation
    );
  });

  it("ignores stale startSession resolution after restarting inside onConnect", async () => {
    const firstConversation = createMockConversation("first-id");
    const secondConversation = createMockConversation("second-id");
    const { promise: firstPromise, resolve: resolveFirst } =
      Promise.withResolvers<Conversation>();
    const { promise: secondPromise, resolve: resolveSecond } =
      Promise.withResolvers<Conversation>();
    let firstOptions: MockStartSessionOptions | null = null;
    let secondOptions: MockStartSessionOptions | null = null;

    vi.mocked(Conversation.startSession).mockImplementation(options => {
      if (!firstOptions) {
        firstOptions = options as MockStartSessionOptions;
        return firstPromise;
      }
      secondOptions = options as MockStartSessionOptions;
      return secondPromise;
    });

    const { result } = renderHook(() => useTestContext(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.startSession({
        onConnect: () => {
          result.current.endSession();
          result.current.startSession();
        },
      });
    });

    act(() => {
      driveConnectedSessionLifecycle(firstOptions!, firstConversation);
    });

    expect(Conversation.startSession).toHaveBeenCalledTimes(2);
    expect(result.current.conversation).toBeNull();

    act(() => {
      driveConnectedSessionLifecycle(secondOptions!, secondConversation);
    });

    expect(result.current.conversation).toBe(secondConversation);

    await act(async () => {
      resolveFirst(firstConversation);
    });

    expect(result.current.conversation).toBe(secondConversation);

    await act(async () => {
      resolveSecond(secondConversation);
    });

    expect(result.current.conversation).toBe(secondConversation);
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
