import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { useConversation } from "./index";

jest.mock("@elevenlabs/client", () => ({
  Conversation: {
    startSession: jest.fn(),
  },
}));

const createMockConversation = (id = "test-id") => ({
  getId: jest.fn().mockReturnValue(id),
  isOpen: jest.fn().mockReturnValue(true),
  endSession: jest.fn().mockResolvedValue(undefined),
  setMicMuted: jest.fn(),
  setVolume: jest.fn(),
});

describe("useConversation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws error when session is cancelled during connection", async () => {
    const mockConversation = createMockConversation();
    let resolveStartSession!: (value: typeof mockConversation) => void;
    const startSessionPromise = new Promise<typeof mockConversation>(
      resolve => {
        resolveStartSession = resolve;
      }
    );
    (Conversation.startSession as jest.Mock).mockReturnValue(
      startSessionPromise
    );

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
    (Conversation.startSession as jest.Mock).mockReturnValue(
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

    (Conversation.startSession as jest.Mock).mockResolvedValue(
      mockConversation2
    );

    let secondSessionId: string | undefined;
    await act(async () => {
      secondSessionId = await result.current.startSession();
    });

    expect(secondSessionId).toBe("second-id");
    expect(Conversation.startSession).toHaveBeenCalledTimes(2);
  });
});
