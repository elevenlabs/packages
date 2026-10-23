import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioFormat, RealtimeEvents, Scribe } from "@elevenlabs/client";
import type { RealtimeConnection } from "@elevenlabs/client";
import { useScribe } from "./scribe.js";
import type { ScribeHookOptions } from "./scribe.js";

vi.mock("@elevenlabs/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@elevenlabs/client")>();
  return {
    ...actual,
    Scribe: {
      connect: vi.fn(),
    },
  };
});

function createMockConnection(): RealtimeConnection {
  return {
    on: vi.fn(),
    close: vi.fn(),
    send: vi.fn(),
    commit: vi.fn(),
  } as unknown as RealtimeConnection;
}

function handlerFor(connection: RealtimeConnection, event: RealtimeEvents) {
  return vi
    .mocked(connection.on)
    .mock.calls.find(([registered]) => registered === event)?.[1] as
    | ((data: unknown) => void)
    | undefined;
}

describe("useScribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Scribe.connect).mockReturnValue(createMockConnection());
  });

  it("passes constrained microphone device IDs through to the client", async () => {
    const deviceId = { exact: "selected-microphone-id" };

    const { result } = renderHook(() => useScribe());

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        microphone: {
          deviceId,
        },
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        microphone: expect.objectContaining({
          deviceId,
        }),
      })
    );
  });

  it("passes language detection through to the client", async () => {
    const { result } = renderHook(() =>
      useScribe({ includeLanguageDetection: true })
    );

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        includeLanguageDetection: true,
      })
    );
  });

  it("passes secondaryLanguages through to the client", async () => {
    const { result } = renderHook(() =>
      useScribe({ languageCode: "da", secondaryLanguages: ["en"] })
    );

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        microphone: {},
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        languageCode: "da",
        secondaryLanguages: ["en"],
      })
    );
  });

  it("passes secondaryLanguages given to connect() through to the client", async () => {
    const { result } = renderHook(() => useScribe({ languageCode: "da" }));

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
        secondaryLanguages: ["en", "sv"],
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        secondaryLanguages: ["en", "sv"],
      })
    );
  });

  it("lets connect() replace the hook-level secondaryLanguages", async () => {
    const { result } = renderHook(() =>
      useScribe({ secondaryLanguages: ["en"] })
    );

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        microphone: {},
        secondaryLanguages: [],
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        secondaryLanguages: [],
      })
    );
  });

  it("passes filterBackgroundAudio through to the client", async () => {
    const { result } = renderHook(() =>
      useScribe({ filterBackgroundAudio: true })
    );

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        microphone: {},
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        filterBackgroundAudio: true,
      })
    );
  });

  it("passes previousText through to the client in microphone mode", async () => {
    const { result } = renderHook(() =>
      useScribe({ previousText: "The quick brown fox" })
    );

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        microphone: {},
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        previousText: "The quick brown fox",
      })
    );
  });

  it("passes enableLogging through to the client", async () => {
    const { result } = renderHook(() => useScribe({ enableLogging: false }));

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        enableLogging: false,
      })
    );
  });

  it("lets connect() disable logging for a session enabled at the hook level", async () => {
    const { result } = renderHook(() => useScribe({ enableLogging: true }));

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        microphone: {},
        enableLogging: false,
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        enableLogging: false,
      })
    );
  });

  it("passes transcriptEdit through to the client", async () => {
    const { result } = renderHook(() =>
      useScribe({
        transcriptEdit: "Write all dates in ISO 8601 format (YYYY-MM-DD)",
      })
    );

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        transcriptEdit: "Write all dates in ISO 8601 format (YYYY-MM-DD)",
      })
    );
  });

  describe("transcript editing", () => {
    it("attaches edited_transcript to the matching committed segment", async () => {
      const connection = createMockConnection();
      vi.mocked(Scribe.connect).mockReturnValue(connection);

      const onEditedTranscript = vi.fn();
      const { result } = renderHook(() =>
        useScribe({
          transcriptEdit: "Write all dates in ISO 8601 format (YYYY-MM-DD)",
          onEditedTranscript,
        })
      );

      await act(async () => {
        await result.current.connect({
          token: "test-token",
          modelId: "scribe_v2_realtime",
          microphone: {},
        });
      });

      const committed = {
        message_type: "committed_transcript",
        text: "our next meeting is on the twelfth of July twenty twenty-six",
      };
      const edited = {
        message_type: "edited_transcript",
        text: committed.text,
        edited_text: "our next meeting is on 2026-07-12",
      };

      act(() => {
        handlerFor(
          connection,
          RealtimeEvents.COMMITTED_TRANSCRIPT
        )?.(committed);
      });
      expect(
        result.current.committedTranscripts[0]?.editedText
      ).toBeUndefined();

      act(() => {
        handlerFor(connection, RealtimeEvents.EDITED_TRANSCRIPT)?.(edited);
      });

      expect(result.current.committedTranscripts).toHaveLength(1);
      expect(result.current.committedTranscripts[0]?.editedText).toBe(
        edited.edited_text
      );
      expect(onEditedTranscript).toHaveBeenCalledWith(edited);
    });
  });

  describe("committed segments", () => {
    const partial = {
      message_type: "partial_transcript",
      text: "The quick brown",
    };
    const committed = {
      message_type: "committed_transcript",
      text: "The quick brown fox.",
    };
    const committedWithTimestamps = {
      message_type: "committed_transcript_with_timestamps",
      text: committed.text,
      language_code: "en",
      words: [{ text: "The", start: 0, end: 0.2, type: "word" }],
    };

    async function connectWith(options: ScribeHookOptions) {
      const connection = createMockConnection();
      vi.mocked(Scribe.connect).mockReturnValue(connection);

      const { result } = renderHook(() => useScribe(options));
      await act(async () => {
        await result.current.connect({
          token: "test-token",
          modelId: "scribe_v2_realtime",
          microphone: {},
        });
      });

      const receive = (event: RealtimeEvents, data: unknown) =>
        act(() => {
          handlerFor(connection, event)?.(data);
        });

      return { result, receive };
    }

    it("adds one segment with words when timestamps are on", async () => {
      const onCommittedTranscript = vi.fn();
      const onCommittedTranscriptWithTimestamps = vi.fn();
      const { result, receive } = await connectWith({
        onCommittedTranscript,
        onCommittedTranscriptWithTimestamps,
      });

      receive(RealtimeEvents.PARTIAL_TRANSCRIPT, partial);
      receive(RealtimeEvents.COMMITTED_TRANSCRIPT, committed);
      receive(
        RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS,
        committedWithTimestamps
      );

      expect(result.current.committedTranscripts).toHaveLength(1);
      expect(result.current.committedTranscripts[0]?.words).toEqual(
        committedWithTimestamps.words
      );
      expect(result.current.partialTranscript).toBe("");
      expect(onCommittedTranscript).toHaveBeenCalledWith(committed);
      expect(onCommittedTranscriptWithTimestamps).toHaveBeenCalledWith(
        committedWithTimestamps
      );
    });

    it("adds one segment with the language when language detection is on", async () => {
      const { result, receive } = await connectWith({
        includeLanguageDetection: true,
      });

      receive(RealtimeEvents.COMMITTED_TRANSCRIPT, committed);
      receive(
        RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS,
        committedWithTimestamps
      );

      expect(result.current.committedTranscripts).toHaveLength(1);
      expect(result.current.committedTranscripts[0]?.languageCode).toBe("en");
    });

    it("keeps the segment of a commit whose timestamped copy never arrives", async () => {
      const { result, receive } = await connectWith({
        includeTimestamps: true,
        onCommittedTranscript: () => result.current.disconnect(),
      });

      receive(RealtimeEvents.COMMITTED_TRANSCRIPT, committed);

      expect(result.current.committedTranscripts).toHaveLength(1);
    });
  });

  describe("close handling", () => {
    const SESSION = {
      token: "test-token",
      modelId: "scribe_v2_realtime",
      microphone: {},
    };

    function closeHandlerFor(connection: RealtimeConnection) {
      return vi
        .mocked(connection.on)
        .mock.calls.find(([event]) => event === RealtimeEvents.CLOSE)?.[1] as
        | (() => void)
        | undefined;
    }

    it("ignores a close from a connection that has been replaced", async () => {
      const first = createMockConnection();
      const second = createMockConnection();
      vi.mocked(Scribe.connect)
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);

      const onDisconnect = vi.fn();
      const { result } = renderHook(() => useScribe({ onDisconnect }));

      await act(async () => {
        await result.current.connect(SESSION);
      });
      act(() => {
        result.current.disconnect();
      });
      await act(async () => {
        await result.current.connect(SESSION);
      });

      expect(Scribe.connect).toHaveBeenCalledTimes(2);

      // The replaced socket only closes now. It must not tear down the
      // session that took its place.
      act(() => {
        closeHandlerFor(first)?.();
      });

      expect(onDisconnect).not.toHaveBeenCalled();
      expect(result.current.status).not.toBe("disconnected");
    });

    it("still reports a close for the current connection after disconnect()", async () => {
      const connection = createMockConnection();
      vi.mocked(Scribe.connect).mockReturnValue(connection);

      const onDisconnect = vi.fn();
      const { result } = renderHook(() => useScribe({ onDisconnect }));

      await act(async () => {
        await result.current.connect(SESSION);
      });

      // disconnect() releases the ref before the socket's close arrives, so
      // the close still belongs to this session.
      act(() => {
        result.current.disconnect();
      });
      act(() => {
        closeHandlerFor(connection)?.();
      });

      expect(onDisconnect).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe("disconnected");
    });
  });
});
