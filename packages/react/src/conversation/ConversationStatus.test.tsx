import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider.js";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext.js";
import { useConversationStatus } from "./ConversationStatus.js";
import { createMockConversation, type MockConversation } from "./test-utils.js";

vi.mock("@elevenlabs/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@elevenlabs/client")>();
  return { ...actual, Conversation: { startSession: vi.fn() } };
});

function useTestHook() {
  const ctx = useContext(ConversationContext) as ConversationContextValue;
  const status = useConversationStatus();
  return {
    startSession: ctx.startSession,
    endSession: ctx.endSession,
    status,
  };
}

function createWrapper(props: Record<string, unknown> = {}) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <ConversationProvider {...props}>{children}</ConversationProvider>
    );
  };
}

describe("ConversationStatus", () => {
  let mockConversation: MockConversation;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConversation = createMockConversation();
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

  it("returns connecting status while session is starting", async () => {
    const { promise, resolve } = Promise.withResolvers<Conversation>();
    vi.mocked(Conversation.startSession).mockReturnValue(promise);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.startSession();
    });

    expect(result.current.status.status).toBe("connecting");

    await act(async () => {
      resolve(mockConversation as Conversation);
    });
  });

  it("returns connected status after session starts", async () => {
    vi.mocked(Conversation.startSession).mockResolvedValue(
      mockConversation as Conversation
    );

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.status.status).toBe("connected");
    expect(result.current.status.message).toBeUndefined();
  });

  it("returns error status with message when startSession rejects", async () => {
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

  it("returns error status with message from runtime error event", async () => {
    vi.mocked(Conversation.startSession).mockResolvedValue(
      mockConversation as Conversation
    );

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.status.status).toBe("connected");

    act(() => {
      mockConversation.__emit("error", "Something went wrong");
    });

    expect(result.current.status.status).toBe("error");
    expect(result.current.status.message).toBe("Something went wrong");
  });

  it("clears runtime error when starting a new session", async () => {
    const firstConversation = createMockConversation("first");
    const secondConversation = createMockConversation("second");

    vi.mocked(Conversation.startSession).mockResolvedValueOnce(
      firstConversation as Conversation
    );

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    // Start first session
    await act(async () => {
      result.current.startSession();
    });

    // Trigger a runtime error
    act(() => {
      firstConversation.__emit("error", "Something went wrong");
    });

    expect(result.current.status.status).toBe("error");
    expect(result.current.status.message).toBe("Something went wrong");

    // End the session so we can start a new one
    act(() => {
      result.current.endSession();
    });

    // Start a new session — error should clear during connecting phase
    const { promise, resolve } = Promise.withResolvers<Conversation>();
    vi.mocked(Conversation.startSession).mockReturnValue(promise);

    act(() => {
      result.current.startSession();
    });

    expect(result.current.status.status).toBe("connecting");
    expect(result.current.status.message).toBeUndefined();

    await act(async () => {
      resolve(secondConversation as Conversation);
    });

    expect(result.current.status.status).toBe("connected");
  });

  it("returns error status when onConnect throws", async () => {
    vi.mocked(Conversation.startSession).mockImplementation(async options => {
      const conv = mockConversation as Conversation;
      options.onConversationCreated?.(conv);
      options.onConnect?.({ conversationId: conv.getId() });
      return conv;
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

  it("returns disconnected status after endSession", async () => {
    vi.mocked(Conversation.startSession).mockResolvedValue(
      mockConversation as Conversation
    );

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.status.status).toBe("connected");

    act(() => {
      result.current.endSession();
    });

    expect(result.current.status.status).toBe("disconnected");
    expect(result.current.status.message).toBeUndefined();
  });
});
