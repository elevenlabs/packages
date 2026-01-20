import type {
  InputAudioChunk,
  SessionStartedMessage,
  PartialTranscriptMessage,
  CommittedTranscriptMessage,
  CommittedTranscriptWithTimestampsMessage,
  ScribeErrorMessage,
  ScribeAuthErrorMessage,
  ScribeQuotaExceededErrorMessage,
  ScribeCommitThrottledErrorMessage,
  ScribeTranscriberErrorMessage,
  ScribeUnacceptedTermsErrorMessage,
  ScribeRateLimitedErrorMessage,
  ScribeInputErrorMessage,
  ScribeQueueOverflowErrorMessage,
  ScribeResourceExhaustedErrorMessage,
  ScribeSessionTimeLimitExceededErrorMessage,
  ScribeChunkSizeExceededErrorMessage,
  ScribeInsufficientAudioActivityErrorMessage,
} from "@ambernexus/types";

// Re-export types for public API
export type {
  SessionStartedMessage,
  PartialTranscriptMessage,
  CommittedTranscriptMessage,
  CommittedTranscriptWithTimestampsMessage,
  ScribeErrorMessage,
  ScribeAuthErrorMessage,
  ScribeQuotaExceededErrorMessage,
  ScribeCommitThrottledErrorMessage,
  ScribeTranscriberErrorMessage,
  ScribeUnacceptedTermsErrorMessage,
  ScribeRateLimitedErrorMessage,
  ScribeInputErrorMessage,
  ScribeQueueOverflowErrorMessage,
  ScribeResourceExhaustedErrorMessage,
  ScribeSessionTimeLimitExceededErrorMessage,
  ScribeChunkSizeExceededErrorMessage,
  ScribeInsufficientAudioActivityErrorMessage,
};

export type WebSocketMessage =
  | SessionStartedMessage
  | PartialTranscriptMessage
  | CommittedTranscriptMessage
  | CommittedTranscriptWithTimestampsMessage
  | ScribeErrorMessage
  | ScribeAuthErrorMessage
  | ScribeQuotaExceededErrorMessage
  | ScribeCommitThrottledErrorMessage
  | ScribeTranscriberErrorMessage
  | ScribeUnacceptedTermsErrorMessage
  | ScribeRateLimitedErrorMessage
  | ScribeInputErrorMessage
  | ScribeQueueOverflowErrorMessage
  | ScribeResourceExhaustedErrorMessage
  | ScribeSessionTimeLimitExceededErrorMessage
  | ScribeChunkSizeExceededErrorMessage
  | ScribeInsufficientAudioActivityErrorMessage;

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
  COMMITTED_TRANSCRIPT = "committed_transcript",
  /** Emitted when a final transcript with timestamps is available */
  COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS = "committed_transcript_with_timestamps",
  /** Emitted when an authentication error occurs */
  AUTH_ERROR = "auth_error",
  /** Emitted when an error occurs (also emitted for all specific error types) */
  ERROR = "error",
  /** Emitted when the WebSocket connection is opened */
  OPEN = "open",
  /** Emitted when the WebSocket connection is closed */
  CLOSE = "close",
  /** Emitted when a quota exceeded error occurs */
  QUOTA_EXCEEDED = "quota_exceeded",
  /** Emitted when commit is throttled */
  COMMIT_THROTTLED = "commit_throttled",
  /** Emitted when a transcriber error occurs */
  TRANSCRIBER_ERROR = "transcriber_error",
  /** Emitted when terms have not been accepted */
  UNACCEPTED_TERMS = "unaccepted_terms",
  /** Emitted when rate limited */
  RATE_LIMITED = "rate_limited",
  /** Emitted when there's an input error */
  INPUT_ERROR = "input_error",
  /** Emitted when the queue overflows */
  QUEUE_OVERFLOW = "queue_overflow",
  /** Emitted when resources are exhausted */
  RESOURCE_EXHAUSTED = "resource_exhausted",
  /** Emitted when session time limit is exceeded */
  SESSION_TIME_LIMIT_EXCEEDED = "session_time_limit_exceeded",
  /** Emitted when chunk size is exceeded */
  CHUNK_SIZE_EXCEEDED = "chunk_size_exceeded",
  /** Emitted when there's insufficient audio activity */
  INSUFFICIENT_AUDIO_ACTIVITY = "insufficient_audio_activity",
}

/**
 * Map of event types to their payload types.
 */
export interface RealtimeEventMap {
  [RealtimeEvents.SESSION_STARTED]: SessionStartedMessage;
  [RealtimeEvents.PARTIAL_TRANSCRIPT]: PartialTranscriptMessage;
  [RealtimeEvents.COMMITTED_TRANSCRIPT]: CommittedTranscriptMessage;
  [RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS]: CommittedTranscriptWithTimestampsMessage;
  [RealtimeEvents.ERROR]: ScribeErrorMessage;
  [RealtimeEvents.AUTH_ERROR]: ScribeAuthErrorMessage;
  [RealtimeEvents.QUOTA_EXCEEDED]: ScribeQuotaExceededErrorMessage;
  [RealtimeEvents.COMMIT_THROTTLED]: ScribeCommitThrottledErrorMessage;
  [RealtimeEvents.TRANSCRIBER_ERROR]: ScribeTranscriberErrorMessage;
  [RealtimeEvents.UNACCEPTED_TERMS]: ScribeUnacceptedTermsErrorMessage;
  [RealtimeEvents.RATE_LIMITED]: ScribeRateLimitedErrorMessage;
  [RealtimeEvents.INPUT_ERROR]: ScribeInputErrorMessage;
  [RealtimeEvents.QUEUE_OVERFLOW]: ScribeQueueOverflowErrorMessage;
  [RealtimeEvents.RESOURCE_EXHAUSTED]: ScribeResourceExhaustedErrorMessage;
  [RealtimeEvents.SESSION_TIME_LIMIT_EXCEEDED]: ScribeSessionTimeLimitExceededErrorMessage;
  [RealtimeEvents.CHUNK_SIZE_EXCEEDED]: ScribeChunkSizeExceededErrorMessage;
  [RealtimeEvents.INSUFFICIENT_AUDIO_ACTIVITY]: ScribeInsufficientAudioActivityErrorMessage;
  [RealtimeEvents.OPEN]: undefined;
  [RealtimeEvents.CLOSE]: CloseEvent;
}

/**
 * Manages a real-time transcription WebSocket connection.
 *
 * @example
 * ```typescript
 * const connection = await Scribe.connect({
 *     token: "...",
 *     modelId: "scribe_v2_realtime",
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
 * connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
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
          case "committed_transcript":
            this.eventEmitter.emit(RealtimeEvents.COMMITTED_TRANSCRIPT, data);
            break;
          case "committed_transcript_with_timestamps":
            this.eventEmitter.emit(
              RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS,
              data
            );
            break;
          // Error cases - emit both specific event and generic ERROR
          case "auth_error":
            this.eventEmitter.emit(RealtimeEvents.AUTH_ERROR, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "quota_exceeded":
            this.eventEmitter.emit(RealtimeEvents.QUOTA_EXCEEDED, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "commit_throttled":
            this.eventEmitter.emit(RealtimeEvents.COMMIT_THROTTLED, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "transcriber_error":
            this.eventEmitter.emit(RealtimeEvents.TRANSCRIBER_ERROR, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "unaccepted_terms":
            this.eventEmitter.emit(RealtimeEvents.UNACCEPTED_TERMS, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "rate_limited":
            this.eventEmitter.emit(RealtimeEvents.RATE_LIMITED, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "input_error":
            this.eventEmitter.emit(RealtimeEvents.INPUT_ERROR, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "queue_overflow":
            this.eventEmitter.emit(RealtimeEvents.QUEUE_OVERFLOW, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "resource_exhausted":
            this.eventEmitter.emit(RealtimeEvents.RESOURCE_EXHAUSTED, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "session_time_limit_exceeded":
            this.eventEmitter.emit(
              RealtimeEvents.SESSION_TIME_LIMIT_EXCEEDED,
              data
            );
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "chunk_size_exceeded":
            this.eventEmitter.emit(RealtimeEvents.CHUNK_SIZE_EXCEEDED, data);
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
            break;
          case "insufficient_audio_activity":
            this.eventEmitter.emit(
              RealtimeEvents.INSUFFICIENT_AUDIO_ACTIVITY,
              data
            );
            this.eventEmitter.emit(RealtimeEvents.ERROR, data);
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
   *     console.log("Session started", data.session_id);
   * });
   *
   * connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
   *     console.log("Partial:", data.text);
   * });
   *
   * connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
   *     console.log("Final:", data.text);
   * });
   * ```
   */
  public on<E extends RealtimeEvents>(
    event: E,
    listener: RealtimeEventMap[E] extends undefined
      ? () => void
      : (data: RealtimeEventMap[E]) => void
  ): void {
    this.eventEmitter.on(event, listener as (...args: unknown[]) => void);
  }

  /**
   * Removes an event listener for the specified event.
   *
   * @param event - The event to stop listening for
   * @param listener - The callback function to remove
   *
   * @example
   * ```typescript
   * const handler = (data: PartialTranscriptMessage) => console.log(data.text);
   * connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, handler);
   *
   * // Later, remove the listener
   * connection.off(RealtimeEvents.PARTIAL_TRANSCRIPT, handler);
   * ```
   */
  public off<E extends RealtimeEvents>(
    event: E,
    listener: RealtimeEventMap[E] extends undefined
      ? () => void
      : (data: RealtimeEventMap[E]) => void
  ): void {
    this.eventEmitter.off(event, listener as (...args: unknown[]) => void);
  }

  /**
   * Sends audio data to the transcription service.
   *
   * @param data - Audio data configuration
   * @param data.audioBase64 - Base64-encoded audio data
   * @param data.commit - Whether to commit the transcription after this chunk. You likely want to use connection.commit() instead (default: false)
   * @param data.sampleRate - Sample rate of the audio (default: configured sample rate)
   * @param data.previousText - Send context to the model via base64 encoded audio or text from a previous transcription. Can only be sent alongside the first audio chunk. If sent in a subsequent chunk, an error will be returned.
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
   * // Send audio chunk with custom sample rate and previous text
   * connection.send({
   *     audioBase64: base64EncodedAudio,
   *     sampleRate: 16000,
   *     previousText: "Previous transcription text",
   * });
   * ```
   */
  public send(data: {
    audioBase64: string;
    commit?: boolean;
    sampleRate?: number;
    previousText?: string;
  }): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const message: InputAudioChunk = {
      message_type: "input_audio_chunk",
      audio_base_64: data.audioBase64,
      commit: data.commit ?? false,
      sample_rate: data.sampleRate ?? this.currentSampleRate,
      previous_text: data.previousText,
    };

    this.websocket.send(JSON.stringify(message));
  }

  /**
   * Commits the transcription, signaling that a segment of audio has been sent. This clears the buffer and triggers a COMMITTED_TRANSCRIPT event. Context from previous segments is kept.
   * Committing a segment triggers a COMMITTED_TRANSCRIPT event.
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
   * connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
   *     console.log("Segment committed:", data.transcript);
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
      this.websocket.close(1000, "User ended session");
    }
  }
}
