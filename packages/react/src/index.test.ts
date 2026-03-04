import { it, expect, describe, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { useConversation } from "./index";

vi.mock("@elevenlabs/client", () => ({
  Conversation: {
    startSession: vi.fn(),
  },
}));

const createMockConversation = (id = "test-id") =>
  ({
    getId: vi.fn().mockReturnValue(id),
    isOpen: vi.fn().mockReturnValue(true),
    endSession: vi.fn().mockResolvedValue(undefined),
    setMicMuted: vi.fn(),
    setVolume: vi.fn(),
  }) as unknown as Conversation;

describe("useConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error when session is cancelled during connection", async () => {
    const mockConversation = createMockConversation();
    let resolveStartSession!: (value: typeof mockConversation) => void;
    const startSessionPromise = new Promise<typeof mockConversation>(
      resolve => {
        resolveStartSession = resolve;
      }
    );
    vi.mocked(Conversation.startSession).mockReturnValue(startSessionPromise);

    const { result } = renderHook(() =>
      useConversation({ signedUrl: "wss://test.example.com" })
    );

    let startSessionError: Error | undefined;
    const startPromise = result.current.startSession().catch(e => {
      startSessionError = e;
    });

    const endPromise = result.current.endSession();

    resolveStartSession(mockConversation);

    await Promise.all([startPromise, endPromise]);

    expect(startSessionError).toBeDefined();
    expect(startSessionError?.message).toBe(
      "Session cancelled during connection"
    );
    expect(mockConversation.endSession).toHaveBeenCalled();
  });

  it("resets lockRef when session is cancelled, allowing new connections", async () => {
    const mockConversation1 = createMockConversation("first-id");
    const mockConversation2 = createMockConversation("second-id");

    let resolveFirst!: (value: typeof mockConversation1) => void;
    const firstConnectionPromise = new Promise<typeof mockConversation1>(
      resolve => {
        resolveFirst = resolve;
      }
    );
    vi.mocked(Conversation.startSession).mockReturnValue(
      firstConnectionPromise
    );

    const { result } = renderHook(() =>
      useConversation({ signedUrl: "wss://test.example.com" })
    );

    const firstStart = result.current.startSession().catch(() => {});
    const endSession = result.current.endSession();

    resolveFirst(mockConversation1);
    await Promise.all([firstStart, endSession]);

    expect(mockConversation1.endSession).toHaveBeenCalled();

    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation2);

    let secondSessionId: string | undefined;
    await act(async () => {
      secondSessionId = await result.current.startSession();
    });

    expect(secondSessionId).toBe("second-id");
    expect(Conversation.startSession).toHaveBeenCalledTimes(2);
  });
});
