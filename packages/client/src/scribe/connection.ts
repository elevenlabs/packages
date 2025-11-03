import type {
  InputAudioChunk,
  SessionStartedMessage,
  PartialTranscriptMessage,
  FinalTranscriptMessage,
  FinalTranscriptWithTimestampsMessage,
  ScribeErrorMessage,
  ScribeAuthErrorMessage,
} from "@elevenlabs/types";

// Re-export types for public API
export type {
  SessionStartedMessage,
  PartialTranscriptMessage,
  FinalTranscriptMessage,
  FinalTranscriptWithTimestampsMessage,
  ScribeErrorMessage,
  ScribeAuthErrorMessage,
};

export type WebSocketMessage =
  | SessionStartedMessage
  | PartialTranscriptMessage
  | FinalTranscriptMessage
  | FinalTranscriptWithTimestampsMessage
  | ScribeErrorMessage
  | ScribeAuthErrorMessage;

/**
 * Simple EventEmitter implementation for browser compatibility.
 */
class EventEmitter {
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  on(event: string, listener: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.add(listener);
    }
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        listener(...args);
      });
    }
  }
}

/**
 * Events emitted by the RealtimeConnection.
 */
export enum RealtimeEvents {
  /** Emitted when the session is successfully started */
  SESSION_STARTED = "session_started",
  /** Emitted when a partial (interim) transcript is available */
  PARTIAL_TRANSCRIPT = "partial_transcript",
  /** Emitted when a final transcript is available */
  FINAL_TRANSCRIPT = "final_transcript",
  /** Emitted when a final transcript with timestamps is available */
  FINAL_TRANSCRIPT_WITH_TIMESTAMPS = "final_transcript_with_timestamps",
  /** Emitted when an authentication error occurs */
  AUTH_ERROR = "auth_error",
  /** Emitted when an error occurs */
  ERROR = "error",
  /** Emitted when the WebSocket connection is opened */
  OPEN = "open",
  /** Emitted when the WebSocket connection is closed */
  CLOSE = "close",
}

/**
 * Manages a real-time transcription WebSocket connection.
 *
 * @example
 * ```typescript
 * const connection = await Scribe.connect({
 *     token: "...",
 *     modelId: "scribe_realtime_v2",
 *     audioFormat: AudioFormat.PCM_16000,
 *     sampleRate: 16000,
 * });
 *
 * connection.on(RealtimeEvents.SESSION_STARTED, (data) => {
 *     console.log("Session started");
 * });
 *
 * connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
 *     console.log("Partial:", data.transcript);
 * });
 *
 * connection.on(RealtimeEvents.FINAL_TRANSCRIPT, (data) => {
 *     console.log("Final:", data.transcript);
 *     connection.close();
 * });
 *
 * // Send audio data
 * connection.send({ audioBase64: base64String });
 *
 * // Commit and close
 * connection.commit();
 * ```
 */
export class RealtimeConnection {
  private websocket: WebSocket | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private currentSampleRate: number = 16000;
  public _audioCleanup?: () => void;

  constructor(sampleRate: number) {
    this.currentSampleRate = sampleRate;
  }

  /**
   * @internal
   * Used internally by ScribeRealtime to attach the WebSocket after connection is created.
   */
  public setWebSocket(websocket: WebSocket): void {
    this.websocket = websocket;

    // If WebSocket is already open, emit OPEN event immediately
    if (this.websocket.readyState === WebSocket.OPEN) {
      this.eventEmitter.emit(RealtimeEvents.OPEN);
    } else {
      // Otherwise, wait for the open event
      this.websocket.addEventListener("open", () => {
        this.eventEmitter.emit(RealtimeEvents.OPEN);
      });
    }

    this.websocket.addEventListener("message", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;

        switch (data.message_type) {
          case "session_started":
            this.eventEmitter.emit(RealtimeEvents.SESSION_STARTED, data);
            break;
          case "partial_transcript":
            this.eventEmitter.emit(RealtimeEvents.PARTIAL_TRANSCRIPT, data);
            break;
          case "final_transcript":
            this.eventEmitter.emit(RealtimeEvents.FINAL_TRANSCRIPT, data);
            break;
          case "final_transcript_with_timestamps":
            this.eventEmitter.emit(
              RealtimeEvents.FINAL_TRANSCRIPT_WITH_TIMESTAMPS,
              data
            );
            break;
          case "auth_error":
            this.eventEmitter.emit(RealtimeEvents.AUTH_ERROR, data);
            break;
          case "error":
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          default:
            console.warn("Unknown message type:", data);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error, event.data);
        this.eventEmitter.emit(
          RealtimeEvents.ERROR,
          new Error(`Failed to parse message: ${error}`)
        );
      }
    });

    this.websocket.addEventListener("error", (error: Event) => {
      console.error("WebSocket error:", error);
      this.eventEmitter.emit(RealtimeEvents.ERROR, error);
    });

    this.websocket.addEventListener("close", (event: CloseEvent) => {
      console.log(
        `WebSocket closed: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`
      );

      // Emit error if close was not clean or had an error code
      if (!event.wasClean || (event.code !== 1000 && event.code !== 1005)) {
        const errorMessage = `WebSocket closed unexpectedly: ${event.code} - ${event.reason || "No reason provided"}`;
        console.error(errorMessage);
        this.eventEmitter.emit(RealtimeEvents.ERROR, new Error(errorMessage));
      }

      this.eventEmitter.emit(RealtimeEvents.CLOSE, event);
    });
  }

  /**
   * Attaches an event listener for the specified event.
   *
   * @param event - The event to listen for (use RealtimeEvents enum)
   * @param listener - The callback function to execute when the event fires
   *
   * @example
   * ```typescript
   * connection.on(RealtimeEvents.SESSION_STARTED, (data) => {
   *     console.log("Session started", data);
   * });
   *
   * connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
   *     console.log("Partial:", data.transcript);
   * });
   *
   * connection.on(RealtimeEvents.FINAL_TRANSCRIPT, (data) => {
   *     console.log("Final:", data.transcript);
   * });
   * ```
   */
  public on(
    event: RealtimeEvents,
    listener: (...args: unknown[]) => void
  ): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Removes an event listener for the specified event.
   *
   * @param event - The event to stop listening for
   * @param listener - The callback function to remove
   *
   * @example
   * ```typescript
   * const handler = (data) => console.log(data);
   * connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, handler);
   *
   * // Later, remove the listener
   * connection.off(RealtimeEvents.PARTIAL_TRANSCRIPT, handler);
   * ```
   */
  public off(
    event: RealtimeEvents,
    listener: (...args: unknown[]) => void
  ): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Sends audio data to the transcription service.
   *
   * @param data - Audio data configuration
   * @param data.audioBase64 - Base64-encoded audio data
   * @param data.commit - Whether to commit the transcription after this chunk. You likely want to use connection.commit() instead (default: false)
   * @param data.sampleRate - Sample rate of the audio (default: configured sample rate)
   *
   * @throws {Error} If the WebSocket connection is not open
   *
   * @example
   * ```typescript
   * // Send audio chunk without committing
   * connection.send({
   *     audioBase64: base64EncodedAudio,
   * });
   *
   * // Send audio chunk with custom sample rate
   * connection.send({
   *     audioBase64: base64EncodedAudio,
   *     sampleRate: 16000,
   * });
   * ```
   */
  public send(data: {
    audioBase64: string;
    commit?: boolean;
    sampleRate?: number;
  }): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const message: InputAudioChunk = {
      message_type: "input_audio_chunk",
      audio_base_64: data.audioBase64,
      commit: data.commit ?? false,
      sample_rate: data.sampleRate ?? this.currentSampleRate,
    };

    this.websocket.send(JSON.stringify(message));
  }

  /**
   * Commits the transcription, signaling that all audio has been sent.
   * This finalizes the transcription and triggers a FINAL_TRANSCRIPT event.
   *
   * @throws {Error} If the WebSocket connection is not open
   *
   * @remarks
   * Only needed when using CommitStrategy.MANUAL.
   * When using CommitStrategy.VAD, commits are handled automatically by the server.
   *
   * @example
   * ```typescript
   * // Send all audio chunks
   * for (const chunk of audioChunks) {
   *     connection.send({ audioBase64: chunk });
   * }
   *
   * // Finalize the transcription
   * connection.commit();
   * ```
   */
  public commit(): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const message: InputAudioChunk = {
      message_type: "input_audio_chunk",
      audio_base_64: "",
      commit: true,
      sample_rate: this.currentSampleRate,
    };

    this.websocket.send(JSON.stringify(message));
  }

  /**
   * Closes the WebSocket connection and cleans up resources.
   * This will terminate any ongoing transcription and stop microphone streaming if active.
   *
   * @remarks
   * After calling close(), this connection cannot be reused.
   * Create a new connection if you need to start transcribing again.
   *
   * @example
   * ```typescript
   * connection.on(RealtimeEvents.FINAL_TRANSCRIPT, (data) => {
   *     console.log("Final:", data.transcript);
   *     connection.close();
   * });
   * ```
   */
  public close(): void {
    // Cleanup audio resources (microphone stream, audio context)
    if (this._audioCleanup) {
      this._audioCleanup();
    }

    // Close WebSocket connection
    if (this.websocket) {
      this.websocket.close();
    }
  }
}
