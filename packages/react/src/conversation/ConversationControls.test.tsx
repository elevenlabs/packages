import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, renderHook, act } from "@testing-library/react";
import { Conversation } from "@elevenlabs/client";
import { ConversationProvider } from "./ConversationProvider.js";
import { useConversationControls } from "./ConversationControls.js";

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
    isPaused: vi.fn().mockReturnValue(false),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    sendUserMessage: vi.fn(),
    sendContextualUpdate: vi.fn(),
    sendUserActivity: vi.fn(),
    sendMCPToolApprovalResult: vi.fn(),
    sendFeedback: vi.fn(),
    getInputByteFrequencyData: vi.fn().mockReturnValue(new Uint8Array(4)),
    getOutputByteFrequencyData: vi.fn().mockReturnValue(new Uint8Array(4)),
    getInputVolume: vi.fn().mockReturnValue(0.5),
    getOutputVolume: vi.fn().mockReturnValue(0.8),
  }) as unknown as Conversation;

function createWrapper(props: Record<string, unknown> = {}) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return <ConversationProvider {...props}>{children}</ConversationProvider>;
  };
}

describe("useConversationControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when used outside a ConversationProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useConversationControls())).toThrow(
      "useConversationControls must be used within a ConversationProvider"
    );
    consoleSpy.mockRestore();
  });

  it("forwards sendUserMessage to the conversation", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.sendUserMessage("hello");
    });

    expect(mockConversation.sendUserMessage).toHaveBeenCalledWith("hello");
  });

  it("forwards sendContextualUpdate to the conversation", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.sendContextualUpdate("context info");
    });

    expect(mockConversation.sendContextualUpdate).toHaveBeenCalledWith(
      "context info",
      undefined
    );
  });

  it("forwards sendUserActivity to the conversation", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.sendUserActivity();
    });

    expect(mockConversation.sendUserActivity).toHaveBeenCalled();
  });

  it("forwards sendMCPToolApprovalResult to the conversation", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.sendMCPToolApprovalResult("tool-call-1", true);
    });

    expect(mockConversation.sendMCPToolApprovalResult).toHaveBeenCalledWith(
      "tool-call-1",
      true
    );
  });

  it("forwards setVolume to the conversation", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    act(() => {
      result.current.setVolume({ volume: 0.5 });
    });

    expect(mockConversation.setVolume).toHaveBeenCalledWith({ volume: 0.5 });
  });

  it("forwards pause and resume to the conversation", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    await act(async () => {
      await result.current.pause();
      await result.current.resume();
    });

    expect(mockConversation.pause).toHaveBeenCalled();
    expect(mockConversation.resume).toHaveBeenCalled();
  });

  it("returns frequency data and volume from the conversation", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.getInputByteFrequencyData()).toBeInstanceOf(
      Uint8Array
    );
    expect(result.current.getOutputByteFrequencyData()).toBeInstanceOf(
      Uint8Array
    );
    expect(result.current.getInputVolume()).toBe(0.5);
    expect(result.current.getOutputVolume()).toBe(0.8);
  });

  it("returns getId from the conversation", async () => {
    const mockConversation = createMockConversation("my-conv-id");
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    expect(result.current.getId()).toBe("my-conv-id");
  });

  it("throws when calling methods without an active session", () => {
    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    expect(() => result.current.sendUserMessage("hi")).toThrow(
      "No active conversation"
    );
    expect(() => result.current.sendContextualUpdate("ctx")).toThrow(
      "No active conversation"
    );
    expect(() => result.current.sendUserActivity()).toThrow(
      "No active conversation"
    );
    expect(() => result.current.pause()).toThrow("No active conversation");
    expect(() => result.current.resume()).toThrow("No active conversation");
    expect(() => result.current.setVolume({ volume: 0.5 })).toThrow(
      "No active conversation"
    );
    expect(() => result.current.getId()).toThrow("No active conversation");
  });

  it("returns default values for volume and frequency data without an active session", () => {
    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    expect(result.current.getInputVolume()).toBe(0);
    expect(result.current.getOutputVolume()).toBe(0);
    expect(result.current.getInputByteFrequencyData()).toEqual(
      new Uint8Array(0)
    );
    expect(result.current.getOutputByteFrequencyData()).toEqual(
      new Uint8Array(0)
    );
  });

  it("changeInputDevice throws for text-only conversations", async () => {
    const mockConversation = createMockConversation();
    // No changeInputDevice on the mock — simulates a TextConversation
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    await expect(
      result.current.changeInputDevice({ format: "pcm", sampleRate: 16000 })
    ).rejects.toThrow(
      "Device switching is only available for voice conversations"
    );
  });

  it("changeOutputDevice throws for text-only conversations", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversationControls(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    await expect(
      result.current.changeOutputDevice({ format: "pcm", sampleRate: 16000 })
    ).rejects.toThrow(
      "Device switching is only available for voice conversations"
    );
  });

  it("controls value is stable — does not change when conversation instance changes", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    let renderCount = 0;

    function ControlsConsumer({
      onRender,
    }: {
      onRender: (v: ReturnType<typeof useConversationControls>) => void;
    }) {
      const controls = useConversationControls();
      renderCount++;
      onRender(controls);
      return null;
    }

    let capturedControls!: ReturnType<typeof useConversationControls>;
    let capturedStartSession!: ReturnType<
      typeof useConversationControls
    >["startSession"];

    function Root() {
      const controls = useConversationControls();
      if (!capturedStartSession) capturedStartSession = controls.startSession;
      capturedControls = controls;
      return null;
    }

    render(
      <ConversationProvider>
        <Root />
        <ControlsConsumer onRender={v => (capturedControls = v)} />
      </ConversationProvider>
    );

    const controlsAfterMount = capturedControls;
    const renderCountAfterMount = renderCount;

    await act(async () => {
      capturedStartSession();
    });

    // The controls value reference should be identical before and after startSession
    expect(capturedControls).toBe(controlsAfterMount);
    // The ControlsConsumer should not have re-rendered due to the conversation state change
    expect(renderCount).toBe(renderCountAfterMount);
  });
});
