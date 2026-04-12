import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import {
  Conversation,
  type Callbacks,
  type ConversationLifecycleOptions,
} from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider.js";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext.js";
import { useConversationStatus } from "./ConversationStatus.js";

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
  const status = useConversationStatus();
  return { startSession: ctx.startSession, status };
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

describe("ConversationStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when used outside a ConversationProvider", () => {
    expect(() => renderHook(() => useConversationStatus())).toThrow(
      "useConversationStatus must be used within a ConversationProvider"
    );
  });

  it("returns disconnected status initially", () => {
    const { result } = renderHook(() => useConversationStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("disconnected");
    expect(result.current.message).toBeUndefined();
  });

  it("reflects status changes from onStatusChange callback", async () => {
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
      opts.onStatusChange!({ status: "connecting" });
    });
    expect(result.current.status.status).toBe("connecting");

    act(() => {
      opts.onStatusChange!({ status: "connected" });
    });
    expect(result.current.status.status).toBe("connected");

    act(() => {
      opts.onStatusChange!({ status: "disconnected" });
    });
    expect(result.current.status.status).toBe("disconnected");
  });

  it("sets error status and message from onError callback", async () => {
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
      opts.onError!("Something went wrong");
    });

    expect(result.current.status.status).toBe("error");
    expect(result.current.status.message).toBe("Something went wrong");
  });

  it("clears error message when status transitions to non-error", async () => {
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
      opts.onError!("Something went wrong");
    });
    expect(result.current.status.status).toBe("error");
    expect(result.current.status.message).toBe("Something went wrong");

    act(() => {
      opts.onStatusChange!({ status: "connected" });
    });
    expect(result.current.status.status).toBe("connected");
    expect(result.current.status.message).toBeUndefined();
  });

  it("transitions to error status when startSession rejects", async () => {
    vi.mocked(Conversation.startSession).mockRejectedValue(
      new Error("agent not found")
    );

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.status.status).toBe("error");
    expect(result.current.status.message).toBe("agent not found");
  });

  it("transitions to error status when onConnect throws", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockImplementation(async options => {
      driveConnectedSessionLifecycle(
        options as MockStartSessionOptions,
        mockConversation
      );
      return mockConversation;
    });

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession({
        onConnect: () => {
          throw new Error("boom");
        },
      });
    });

    expect(result.current.status.status).toBe("error");
    expect(result.current.status.message).toBe("boom");
  });

  it("ignores disconnecting status (transient)", async () => {
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
      opts.onStatusChange!({ status: "connected" });
    });
    expect(result.current.status.status).toBe("connected");

    act(() => {
      opts.onStatusChange!({ status: "disconnecting" });
    });
    expect(result.current.status.status).toBe("connected");
  });

  it("composes with user-provided onStatusChange callback", async () => {
    const userOnStatusChange = vi.fn();
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper({ onStatusChange: userOnStatusChange }),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock.calls;

    act(() => {
      opts.onStatusChange!({ status: "connected" });
    });

    expect(userOnStatusChange).toHaveBeenCalledWith({ status: "connected" });
    expect(result.current.status.status).toBe("connected");
  });
});
