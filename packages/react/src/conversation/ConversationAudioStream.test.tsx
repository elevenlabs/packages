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

const createMockConversation = (
  inputAudioStream: MediaStream | null = null,
  outputAudioStream: MediaStream | null = null
) =>
  ({
    getId: vi.fn().mockReturnValue("test-id"),
    endSession: vi.fn().mockResolvedValue(undefined),
    setMicMuted: vi.fn(),
    setVolume: vi.fn(),
    getInputAudioStream: vi.fn().mockReturnValue(inputAudioStream),
    getOutputAudioStream: vi.fn().mockReturnValue(outputAudioStream),
  }) as unknown as Conversation;

function useTestHook() {
  const ctx = useContext(ConversationContext) as ConversationContextValue;
  const streams = useConversationAudioStream();
  return { startSession: ctx.startSession, streams };
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

    expect(result.current.inputAudioStream).toBeNull();
    expect(result.current.outputAudioStream).toBeNull();
  });

  it("updates when input and output audio stream callbacks fire", async () => {
    const mockConversation = createMockConversation();
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock
      .calls as unknown as [[MockStartSessionOptions]];
    const inputStream = {} as MediaStream;
    const outputStream = {} as MediaStream;

    act(() => {
      opts.onInputAudioStream?.(inputStream);
      opts.onOutputAudioStream?.(outputStream);
    });

    expect(result.current.streams.inputAudioStream).toBe(inputStream);
    expect(result.current.streams.outputAudioStream).toBe(outputStream);
  });

  it("clears streams when the session disconnects", async () => {
    const inputStream = {} as MediaStream;
    const outputStream = {} as MediaStream;
    const mockConversation = createMockConversation(inputStream, outputStream);
    vi.mocked(Conversation.startSession).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useTestHook(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.startSession();
    });

    const [[opts]] = vi.mocked(Conversation.startSession).mock
      .calls as unknown as [[MockStartSessionOptions]];

    act(() => {
      opts.onInputAudioStream?.(inputStream);
      opts.onOutputAudioStream?.(outputStream);
    });
    expect(result.current.streams.inputAudioStream).toBe(inputStream);
    expect(result.current.streams.outputAudioStream).toBe(outputStream);

    act(() => {
      opts.onDisconnect?.({ reason: "user" });
    });
    expect(result.current.streams.inputAudioStream).toBeNull();
    expect(result.current.streams.outputAudioStream).toBeNull();
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
      .calls as unknown as [[MockStartSessionOptions]];
    const inputStream = {} as MediaStream;
    const outputStream = {} as MediaStream;

    act(() => {
      opts.onInputAudioStream?.(inputStream);
      opts.onOutputAudioStream?.(outputStream);
    });

    expect(result.current.inputAudioStream).toBe(inputStream);
    expect(result.current.outputAudioStream).toBe(outputStream);
  });
});
