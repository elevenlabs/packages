import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext";
import { useConversationInput } from "./ConversationInput";

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
  const input = useConversationInput();
  return { startSession: ctx.startSession, endSession: ctx.endSession, input };
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

describe("ConversationInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when used outside a ConversationProvider", () => {
    expect(() => renderHook(() => useConversationInput())).toThrow(
      "useConversationInput must be used within a ConversationProvider"
    );
  });

  it("returns isMuted false initially", () => {
    const { result } = renderHook(() => useConversationInput(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isMuted).toBe(false);
  });

  it("setMuted updates isMuted state", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.input.setMuted(true);
    });

    expect(result.current.input.isMuted).toBe(true);

    act(() => {
      result.current.input.setMuted(false);
    });

    expect(result.current.input.isMuted).toBe(false);
  });

  it("setMuted calls conversation.setMicMuted when session is active", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.input.setMuted(true);
    });

    expect(result.current.input.isMuted).toBe(true);
    expect(mockConversation.setMicMuted).toHaveBeenCalledWith(true);
  });

  it("setMuted throws when no session is active", () => {
    const { result } = renderHook(() => useConversationInput(), {
      wrapper: createWrapper(),
    });

    expect(() => {
      act(() => {
        result.current.setMuted(true);
      });
    }).toThrow("No active conversation. Call startSession() first.");
  });

  it("setMuted reference is stable across renders", () => {
    const { result, rerender } = renderHook(() => useConversationInput(), {
      wrapper: createWrapper(),
    });

    const firstSetMuted = result.current.setMuted;

    rerender();

    expect(result.current.setMuted).toBe(firstSetMuted);
  });

  it("resets isMuted to false when session ends", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.input.setMuted(true);
    });

    expect(result.current.input.isMuted).toBe(true);

    // Simulate the onDisconnect callback that the conversation instance fires
    const startSessionCall = vi.mocked(Conversation.startSession).mock.calls[0][0];
    act(() => {
      startSessionCall?.onDisconnect?.({ reason: "agent" });
    });

    expect(result.current.input.isMuted).toBe(false);
  });

  it("supports controlled isMuted state", () => {
    const { result } = renderHook(() => useConversationInput(), {
      wrapper: createWrapper({ isMuted: true }),
    });

    expect(result.current.isMuted).toBe(true);
  });

  it("calls onMutedChange in controlled mode", async () => {
    const mockConversation = createMockConversation();
    const onMutedChange = vi.fn();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper({
        isMuted: true,
        onMutedChange,
      }),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.input.setMuted(false);
    });

    // Controlled mode reads value from props, so it remains true
    // until the parent updates it.
    expect(result.current.input.isMuted).toBe(true);
    expect(onMutedChange).toHaveBeenCalledWith(false);
    expect(mockConversation.setMicMuted).toHaveBeenCalledWith(false);
  });

  it("syncs current mute state on connect", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper({ isMuted: true }),
    });

    await act(async () => {
      result.current.startSession();
    });

    const startSessionCall = vi.mocked(Conversation.startSession).mock.calls[0][0];
    act(() => {
      startSessionCall?.onConnect?.({ conversationId: "test-id" });
    });

    expect(mockConversation.setMicMuted).toHaveBeenCalledWith(true);
  });

  it("syncs controlled isMuted prop changes to active session", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    let setControlledMuted: ((muted: boolean) => void) | null = null;
    const Wrapper = ({ children }: React.PropsWithChildren) => {
      const [isMuted, setIsMuted] = React.useState(true);
      React.useEffect(() => {
        setControlledMuted = setIsMuted;
      }, [setIsMuted]);
      return <ConversationProvider isMuted={isMuted}>{children}</ConversationProvider>;
    };

    const { result } = renderHook(() => useTestHook(), { wrapper: Wrapper });

    await act(async () => {
      result.current.startSession();
    });

    const startSessionCall = vi.mocked(Conversation.startSession).mock.calls[0][0];
    act(() => {
      startSessionCall?.onConnect?.({ conversationId: "test-id" });
    });

    act(() => {
      setControlledMuted?.(false);
    });

    expect(mockConversation.setMicMuted).toHaveBeenLastCalledWith(false);
  });

  it("reapplies controlled mute state when a new session starts", async () => {
    const firstConversation = createMockConversation("first");
    const secondConversation = createMockConversation("second");
    vi.mocked(Conversation.startSession)
      .mockResolvedValueOnce(firstConversation)
      .mockResolvedValueOnce(secondConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper({ isMuted: true }),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(firstConversation.setMicMuted).toHaveBeenCalledWith(true);

    act(() => {
      result.current.endSession();
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(secondConversation.setMicMuted).toHaveBeenCalledWith(true);
  });

  it("restores muted state after remount and reapplies on next session", async () => {
    const firstConversation = createMockConversation("first");
    const secondConversation = createMockConversation("second");
    vi.mocked(Conversation.startSession)
      .mockResolvedValueOnce(firstConversation)
      .mockResolvedValueOnce(secondConversation);

    let persistedMuted = false;
    const Wrapper = ({ children }: React.PropsWithChildren) => {
      const [isMuted, setIsMuted] = React.useState(() => persistedMuted);
      const handleMutedChange = React.useCallback((muted: boolean) => {
        persistedMuted = muted;
        setIsMuted(muted);
      }, []);

      return (
        <ConversationProvider isMuted={isMuted} onMutedChange={handleMutedChange}>
          {children}
        </ConversationProvider>
      );
    };

    const firstRender = renderHook(() => useTestHook(), { wrapper: Wrapper });

    await act(async () => {
      firstRender.result.current.startSession();
    });

    act(() => {
      firstRender.result.current.input.setMuted(true);
    });

    expect(persistedMuted).toBe(true);
    firstRender.unmount();

    const secondRender = renderHook(() => useTestHook(), { wrapper: Wrapper });

    await act(async () => {
      secondRender.result.current.startSession();
    });

    expect(secondRender.result.current.input.isMuted).toBe(true);
    expect(secondConversation.setMicMuted).toHaveBeenCalledWith(true);
  });
});
