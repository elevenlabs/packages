import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useContext } from "react";
import { renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider.js";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext.js";
import { useConversationInput } from "./ConversationInput.js";
import { createMockConversation } from "./test-utils.js";

vi.mock("@elevenlabs/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@elevenlabs/client")>();
  return { ...actual, Conversation: { startSession: vi.fn() } };
});

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

    // endSession sets conversation to null, which triggers the useEffect reset
    await act(async () => {
      result.current.endSession();
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
    // In controlled mode, setMuted does NOT eagerly call setMicMuted.
    // The useEffect syncs the SDK when the controlled prop changes.
    expect(mockConversation.setMicMuted).not.toHaveBeenCalledWith(false);
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

  it("does not reset controlled isMuted on disconnect", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper({ isMuted: true }),
    });

    await act(async () => {
      result.current.startSession();
    });

    // endSession sets conversation to null, but controlled mode preserves isMuted
    await act(async () => {
      result.current.endSession();
    });

    expect(result.current.input.isMuted).toBe(true);
  });

  it("fires onMutedChange in uncontrolled mode", async () => {
    const mockConversation = createMockConversation();
    const onMutedChange = vi.fn();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper({ onMutedChange }),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.input.setMuted(true);
    });

    // In uncontrolled mode, internal state updates AND onMutedChange fires.
    expect(result.current.input.isMuted).toBe(true);
    expect(onMutedChange).toHaveBeenCalledWith(true);
  });

  it("does not desync SDK state when parent rejects mute change", async () => {
    const mockConversation = createMockConversation();
    // Parent ignores onMutedChange — never updates isMuted prop
    const onMutedChange = vi.fn();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper({ isMuted: false, onMutedChange }),
    });

    await act(async () => {
      result.current.startSession();
    });

    // Clear initial sync call from useEffect
    mockConversation.setMicMuted = vi.fn();

    act(() => {
      result.current.input.setMuted(true);
    });

    // Parent didn't update the prop, so isMuted stays false
    expect(result.current.input.isMuted).toBe(false);
    expect(onMutedChange).toHaveBeenCalledWith(true);
    // SDK should NOT have been mutated since the parent rejected the change
    expect(mockConversation.setMicMuted).not.toHaveBeenCalled();
  });

  it("setMuted throws in controlled mode when no session is active", () => {
    const { result } = renderHook(() => useConversationInput(), {
      wrapper: createWrapper({ isMuted: false }),
    });

    expect(() => {
      act(() => {
        result.current.setMuted(true);
      });
    }).toThrow("No active conversation. Call startSession() first.");
  });
});
