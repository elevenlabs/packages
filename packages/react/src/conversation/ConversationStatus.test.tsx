import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext";
import { useConversationStatus } from "./ConversationStatus";

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
