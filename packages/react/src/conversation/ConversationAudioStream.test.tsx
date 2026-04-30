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
import { useConversationAudioStream } from "./ConversationAudioStream.js";
import { useConversation } from "./useConversation.js";

vi.mock("@elevenlabs/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@elevenlabs/client")>();
  return { ...actual, Conversation: { startSession: vi.fn() } };
});

const createMockConversation = (audioStream: MediaStream | null = null) =>
  ({
    getId: vi.fn().mockReturnValue("test-id"),
    endSession: vi.fn().mockResolvedValue(undefined),
    setMicMuted: vi.fn(),
    setVolume: vi.fn(),
    getAudioStream: vi.fn().mockReturnValue(audioStream),
  }) as unknown as Conversation;

function useTestHook() {
  const ctx = useContext(ConversationContext) as ConversationContextValue;
  const audioStream = useConversationAudioStream();
  return { startSession: ctx.startSession, audioStream };
}

function createWrapper(props: Record<string, unknown> = {}) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return <ConversationProvider {...props}>{children}</ConversationProvider>;
  };
}

type MockStartSessionOptions = Partial<Callbacks & ConversationLifecycleOptions> &
  Record<string, unknown>;

describe("useConversationAudioStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when used outside a ConversationProvider", () => {
    expect(() => renderHook(() => useConversationAudioStream())).toThrow(
      "useConversationAudioStream must be used within a ConversationProvider"
    );
  });

  it("returns null initially", () => {
    const { result } = renderHook(() => useConversationAudioStream(), {
      wrapper: createWrapper(),
    });

    expect(result.current.audioStream).toBeNull();
  });

  it("updates when onAudioStream fires", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock
      .calls as [[MockStartSessionOptions]];
    const stream = {} as MediaStream;

    act(() => {
      opts.onAudioStream?.(stream);
    });

    expect(result.current.audioStream.audioStream).toBe(stream);
  });

  it("clears the stream when the session disconnects", async () => {
    const stream = {} as MediaStream;
    const mockConversation = createMockConversation(stream);
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock
      .calls as [[MockStartSessionOptions]];

    act(() => {
      opts.onAudioStream?.(stream);
    });
    expect(result.current.audioStream.audioStream).toBe(stream);

    act(() => {
      opts.onDisconnect?.({ reason: "user" });
    });
    expect(result.current.audioStream.audioStream).toBeNull();
  });

  it("is included in useConversation", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock
      .calls as [[MockStartSessionOptions]];
    const stream = {} as MediaStream;

    act(() => {
      opts.onAudioStream?.(stream);
    });

    expect(result.current.audioStream).toBe(stream);
  });
});
