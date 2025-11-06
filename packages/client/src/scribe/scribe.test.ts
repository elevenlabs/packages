import { it, expect, describe, vi } from "vitest";
import { Server } from "mock-socket";
import type { Client } from "mock-socket";
import { Scribe, AudioFormat, CommitStrategy, RealtimeEvents } from "./index";

const TEST_TOKEN = "sutkn_123";
const TEST_MODEL_ID = "scribe_realtime_v2";
const TEST_SESSION_ID = "test-session-id";
const PARTIAL_TRANSCRIPT_TEXT = "Hello, this is a partial";
const COMMITTED_TRANSCRIPT_TEXT = "Hello, this is a committed transcript.";

describe("Scribe", () => {
  describe("WebSocket URI Building", () => {
    it("builds URI with required parameters", () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=sutkn_123"
      );

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      expect(connection).toBeDefined();

      connection.close();
      server.close();
    });

    it("builds URI with commit strategy", () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=sutkn_123&commit_strategy=vad"
      );

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
        commitStrategy: CommitStrategy.VAD,
      });

      expect(connection).toBeDefined();

      connection.close();
      server.close();
    });

    it("builds URI with language code", () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=sutkn_123&language_code=en"
      );

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
        languageCode: "en",
      });

      expect(connection).toBeDefined();

      connection.close();
      server.close();
    });

    it("builds URI with custom base URI", () => {
      const server = new Server(
        "wss://custom.api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=sutkn_123"
      );

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
        baseUri: "wss://custom.api.elevenlabs.io",
      });

      expect(connection).toBeDefined();

      connection.close();
      server.close();
    });

    it("throws error when modelId is missing", () => {
      expect(() => {
        Scribe.connect({
          token: TEST_TOKEN,
          modelId: "",
          audioFormat: AudioFormat.PCM_16000,
          sampleRate: 16000,
        });
      }).toThrow("modelId is required");
    });
  });

  describe("Parameter Validation", () => {
    it("validates vadSilenceThresholdSecs is above 0.3", () => {
      expect(() => {
        Scribe.connect({
          token: TEST_TOKEN,
          modelId: TEST_MODEL_ID,
          audioFormat: AudioFormat.PCM_16000,
          sampleRate: 16000,
          vadSilenceThresholdSecs: 0.2,
        });
      }).toThrow("vadSilenceThresholdSecs must be between 0.3 and 3.0");
    });

    it("validates vadSilenceThresholdSecs is below or equal to 3.0", () => {
      expect(() => {
        Scribe.connect({
          token: TEST_TOKEN,
          modelId: TEST_MODEL_ID,
          audioFormat: AudioFormat.PCM_16000,
          sampleRate: 16000,
          vadSilenceThresholdSecs: 3.5,
        });
      }).toThrow("vadSilenceThresholdSecs must be between 0.3 and 3.0");
    });

    it("validates vadThreshold is within range", () => {
      expect(() => {
        Scribe.connect({
          token: TEST_TOKEN,
          modelId: TEST_MODEL_ID,
          audioFormat: AudioFormat.PCM_16000,
          sampleRate: 16000,
          vadThreshold: 0.05,
        });
      }).toThrow("vadThreshold must be between 0.1 and 0.9");

      expect(() => {
        Scribe.connect({
          token: TEST_TOKEN,
          modelId: TEST_MODEL_ID,
          audioFormat: AudioFormat.PCM_16000,
          sampleRate: 16000,
          vadThreshold: 1.5,
        });
      }).toThrow("vadThreshold must be between 0.1 and 0.9");
    });

    it("validates minSpeechDurationMs is within range", () => {
      expect(() => {
        Scribe.connect({
          token: TEST_TOKEN,
          modelId: TEST_MODEL_ID,
          audioFormat: AudioFormat.PCM_16000,
          sampleRate: 16000,
          minSpeechDurationMs: 40,
        });
      }).toThrow("minSpeechDurationMs must be between 50 and 2000");

      expect(() => {
        Scribe.connect({
          token: TEST_TOKEN,
          modelId: TEST_MODEL_ID,
          audioFormat: AudioFormat.PCM_16000,
          sampleRate: 16000,
          minSpeechDurationMs: 3000,
        });
      }).toThrow("minSpeechDurationMs must be between 50 and 2000");
    });

    it("validates minSilenceDurationMs is within range", () => {
      expect(() => {
        Scribe.connect({
          token: TEST_TOKEN,
          modelId: TEST_MODEL_ID,
          audioFormat: AudioFormat.PCM_16000,
          sampleRate: 16000,
          minSilenceDurationMs: 40,
        });
      }).toThrow("minSilenceDurationMs must be between 50 and 2000");

      expect(() => {
        Scribe.connect({
          token: TEST_TOKEN,
          modelId: TEST_MODEL_ID,
          audioFormat: AudioFormat.PCM_16000,
          sampleRate: 16000,
          minSilenceDurationMs: 3000,
        });
      }).toThrow("minSilenceDurationMs must be between 50 and 2000");
    });

    it("accepts valid parameter values", () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=sutkn_123&vad_silence_threshold_secs=1.5&vad_threshold=0.5&min_speech_duration_ms=100&min_silence_duration_ms=200"
      );

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
        vadSilenceThresholdSecs: 1.5,
        vadThreshold: 0.5,
        minSpeechDurationMs: 100,
        minSilenceDurationMs: 200,
      });

      expect(connection).toBeDefined();

      connection.close();
      server.close();
    });
  });

  describe("Connection and Events", () => {
    it("handles session_started event", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=sutkn_123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const onSessionStarted = vi.fn();
      const onOpen = vi.fn();

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      connection.on(RealtimeEvents.OPEN, onOpen);
      connection.on(RealtimeEvents.SESSION_STARTED, onSessionStarted);

      const client = await clientPromise;

      // Wait for open event
      await sleep(100);
      expect(onOpen).toHaveBeenCalledTimes(1);

      // Send session_started message
      client.send(
        JSON.stringify({
          message_type: "session_started",
          session_id: TEST_SESSION_ID,
        })
      );

      await sleep(100);
      expect(onSessionStarted).toHaveBeenCalledTimes(1);
      expect(onSessionStarted).toHaveBeenCalledWith({
        message_type: "session_started",
        session_id: TEST_SESSION_ID,
      });

      connection.close();
      server.close();
    });

    it("handles partial_transcript event", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=sutkn_123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const onPartialTranscript = vi.fn();

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, onPartialTranscript);

      const client = await clientPromise;
      await sleep(100);

      // Send partial_transcript message
      client.send(
        JSON.stringify({
          message_type: "partial_transcript",
          transcript: PARTIAL_TRANSCRIPT_TEXT,
        })
      );

      await sleep(100);
      expect(onPartialTranscript).toHaveBeenCalledTimes(1);
      expect(onPartialTranscript).toHaveBeenCalledWith({
        message_type: "partial_transcript",
        transcript: PARTIAL_TRANSCRIPT_TEXT,
      });

      connection.close();
      server.close();
    });

    it("handles committed_transcript event", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=sutkn_123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const onCommittedTranscript = vi.fn();

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, onCommittedTranscript);

      const client = await clientPromise;
      await sleep(100);

      // Send committed_transcript message
      client.send(
        JSON.stringify({
          message_type: "committed_transcript",
          transcript: COMMITTED_TRANSCRIPT_TEXT,
        })
      );

      await sleep(100);
      expect(onCommittedTranscript).toHaveBeenCalledTimes(1);
      expect(onCommittedTranscript).toHaveBeenCalledWith({
        message_type: "committed_transcript",
        transcript: COMMITTED_TRANSCRIPT_TEXT,
      });

      connection.close();
      server.close();
    });

    it("handles error event", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=test-token-123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const onError = vi.fn();

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      connection.on(RealtimeEvents.ERROR, onError);

      const client = await clientPromise;
      await sleep(100);

      // Send error message
      client.send(
        JSON.stringify({
          message_type: "error",
          message: "Test error message",
        })
      );

      await sleep(100);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith({
        message_type: "error",
        message: "Test error message",
      });

      connection.close();
      server.close();
    });

    it("handles auth_error event", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=test-token-123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const onAuthError = vi.fn();

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      connection.on(RealtimeEvents.AUTH_ERROR, onAuthError);

      const client = await clientPromise;
      await sleep(100);

      // Send auth_error message
      client.send(
        JSON.stringify({
          message_type: "auth_error",
          message: "Invalid token",
        })
      );

      await sleep(100);
      expect(onAuthError).toHaveBeenCalledTimes(1);
      expect(onAuthError).toHaveBeenCalledWith({
        message_type: "auth_error",
        message: "Invalid token",
      });

      connection.close();
      server.close();
    });

    it("handles close event", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=test-token-123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const onClose = vi.fn();

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      connection.on(RealtimeEvents.CLOSE, onClose);

      await clientPromise;
      await sleep(100);

      // Close connection
      connection.close();

      await sleep(100);
      expect(onClose).toHaveBeenCalledTimes(1);

      server.close();
    });
  });

  describe("Sending Audio and Commit", () => {
    it("sends audio chunks", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=test-token-123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      const client = await clientPromise;
      const onMessageSend = vi.fn();
      client.on("message", onMessageSend);

      await sleep(100);

      // Send audio chunk
      const testAudioBase64 = "dGVzdCBhdWRpbyBkYXRh"; // "test audio data" in base64
      connection.send({ audioBase64: testAudioBase64 });

      await sleep(100);
      expect(onMessageSend).toHaveBeenCalledTimes(1);

      const sentMessage = JSON.parse(onMessageSend.mock.calls[0][0]);
      expect(sentMessage).toEqual({
        message_type: "input_audio_chunk",
        audio_base_64: testAudioBase64,
        commit: false,
        sample_rate: 16000,
      });

      connection.close();
      server.close();
    });

    it("sends commit message", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=test-token-123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      const client = await clientPromise;
      const onMessageSend = vi.fn();
      client.on("message", onMessageSend);

      await sleep(100);

      // Send commit
      connection.commit();

      await sleep(100);
      expect(onMessageSend).toHaveBeenCalledTimes(1);

      const sentMessage = JSON.parse(onMessageSend.mock.calls[0][0]);
      expect(sentMessage).toEqual({
        message_type: "input_audio_chunk",
        audio_base_64: "",
        commit: true,
        sample_rate: 16000,
      });

      connection.close();
      server.close();
    });

    it("throws error when sending audio before connection is open", () => {
      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      // Try to send before connection is established
      expect(() => {
        connection.send({ audioBase64: "dGVzdA==" });
      }).toThrow("WebSocket is not connected");

      connection.close();
    });

    it("throws error when committing before connection is open", () => {
      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      // Try to commit before connection is established
      expect(() => {
        connection.commit();
      }).toThrow("WebSocket is not connected");

      connection.close();
    });

    it("sends audio with custom sample rate", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=test-token-123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_44100,
        sampleRate: 44100,
      });

      const client = await clientPromise;
      const onMessageSend = vi.fn();
      client.on("message", onMessageSend);

      await sleep(100);

      // Send audio chunk with custom sample rate
      const testAudioBase64 = "dGVzdCBhdWRpbyBkYXRh";
      connection.send({
        audioBase64: testAudioBase64,
        sampleRate: 48000,
      });

      await sleep(100);

      const sentMessage = JSON.parse(onMessageSend.mock.calls[0][0]);
      expect(sentMessage.sample_rate).toBe(48000);

      connection.close();
      server.close();
    });
  });

  describe("Event Listener Management", () => {
    it("can add and remove event listeners", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=test-token-123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const onPartialTranscript = vi.fn();

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });

      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, onPartialTranscript);

      const client = await clientPromise;
      await sleep(100);

      // Send partial transcript - should trigger callback
      client.send(
        JSON.stringify({
          message_type: "partial_transcript",
          transcript: "First transcript",
        })
      );

      await sleep(100);
      expect(onPartialTranscript).toHaveBeenCalledTimes(1);

      // Remove listener
      connection.off(RealtimeEvents.PARTIAL_TRANSCRIPT, onPartialTranscript);

      // Send another partial transcript - should NOT trigger callback
      client.send(
        JSON.stringify({
          message_type: "partial_transcript",
          transcript: "Second transcript",
        })
      );

      await sleep(100);
      expect(onPartialTranscript).toHaveBeenCalledTimes(1); // Still 1, not 2

      connection.close();
      server.close();
    });
  });

  describe("Full Transcription Flow", () => {
    it("handles complete transcription flow with multiple events", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_realtime_v2&token=sutkn_123"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const onSessionStarted = vi.fn();
      const onPartialTranscript = vi.fn();
      const onFinalTranscript = vi.fn();
      const transcripts: string[] = [];

      const connection = Scribe.connect({
        token: TEST_TOKEN,
        modelId: TEST_MODEL_ID,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
        commitStrategy: CommitStrategy.MANUAL,
      });

      connection.on(RealtimeEvents.SESSION_STARTED, onSessionStarted);
      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, data => {
        onPartialTranscript(data);
        transcripts.push((data as { transcript: string }).transcript);
      });
      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, data => {
        onFinalTranscript(data);
        transcripts.push((data as { transcript: string }).transcript);
      });

      const client = await clientPromise;
      const onMessageSend = vi.fn();
      client.on("message", onMessageSend);

      await sleep(100);

      // Server sends session_started
      client.send(
        JSON.stringify({
          message_type: "session_started",
          session_id: TEST_SESSION_ID,
        })
      );

      await sleep(50);

      // Client sends audio chunks
      connection.send({ audioBase64: "Y2h1bmsx" });
      await sleep(50);

      // Server sends partial transcript
      client.send(
        JSON.stringify({
          message_type: "partial_transcript",
          transcript: "Hello",
        })
      );

      await sleep(50);

      // Client sends more audio
      connection.send({ audioBase64: "Y2h1bmsz" });
      await sleep(50);

      // Server sends another partial transcript
      client.send(
        JSON.stringify({
          message_type: "partial_transcript",
          transcript: "Hello world",
        })
      );

      await sleep(50);

      // Client commits
      connection.commit();
      await sleep(50);

      // Server sends final transcript
      client.send(
        JSON.stringify({
          message_type: "committed_transcript",
          transcript: "Hello world!",
        })
      );

      await sleep(50);

      // Verify the flow
      expect(onSessionStarted).toHaveBeenCalledTimes(1);
      expect(onPartialTranscript).toHaveBeenCalledTimes(2);
      expect(onFinalTranscript).toHaveBeenCalledTimes(1);
      expect(transcripts).toEqual(["Hello", "Hello world", "Hello world!"]);

      connection.close();
      server.close();
    });
  });
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
