import { useEffect, useRef, useState, useCallback } from "react";
import { Scribe, RealtimeEvents } from "@elevenlabs/client";
import type {
  RealtimeConnection,
  AudioOptions,
  MicrophoneOptions,
  AudioFormat,
  CommitStrategy,
  PartialTranscriptMessage,
  CommittedTranscriptMessage,
  CommittedTranscriptWithTimestampsMessage,
  ScribeErrorMessage,
  ScribeAuthErrorMessage,
} from "@elevenlabs/client";

// ============= Types =============

export type ScribeStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "transcribing"
  | "error";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface ScribeCallbacks {
  onSessionStarted?: () => void;
  onPartialTranscript?: (data: { text: string }) => void;
  onFinalTranscript?: (data: { text: string }) => void;
  onFinalTranscriptWithTimestamps?: (data: {
    text: string;
    timestamps?: { start: number; end: number }[];
  }) => void;
  onError?: (error: Error | Event) => void;
  onAuthError?: (data: { error: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface ScribeHookOptions extends ScribeCallbacks {
  // Connection options
  token?: string;
  modelId?: string;
  baseUri?: string;

  // VAD options
  commitStrategy?: CommitStrategy;
  vadSilenceThresholdSecs?: number;
  vadThreshold?: number;
  minSpeechDurationMs?: number;
  minSilenceDurationMs?: number;
  languageCode?: string;

  // Microphone options (for automatic microphone mode)
  microphone?: {
    deviceId?: string;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    channelCount?: number;
  };

  // Manual audio options
  audioFormat?: AudioFormat;
  sampleRate?: number;

  // Auto-connect on mount
  autoConnect?: boolean;
}

export interface UseScribeReturn {
  // State
  status: ScribeStatus;
  isConnected: boolean;
  isTranscribing: boolean;
  partialTranscript: string;
  finalTranscripts: TranscriptSegment[];
  error: string | null;

  // Connection methods
  connect: (options?: Partial<ScribeHookOptions>) => Promise<void>;
  disconnect: () => void;

  // Audio methods (for manual mode)
  sendAudio: (
    audioBase64: string,
    options?: { commit?: boolean; sampleRate?: number }
  ) => void;
  commit: () => void;

  // Utility methods
  clearTranscripts: () => void;
  getConnection: () => RealtimeConnection | null;
}

// ============= Hook Implementation =============

export function useScribe(options: ScribeHookOptions = {}): UseScribeReturn {
  const {
    // Callbacks
    onSessionStarted,
    onPartialTranscript,
    onFinalTranscript,
    onFinalTranscriptWithTimestamps,
    onError,
    onAuthError,
    onConnect,
    onDisconnect,

    // Connection options
    token: defaultToken,
    modelId: defaultModelId,
    baseUri: defaultBaseUri,
    commitStrategy: defaultCommitStrategy,
    vadSilenceThresholdSecs: defaultVadSilenceThresholdSecs,
    vadThreshold: defaultVadThreshold,
    minSpeechDurationMs: defaultMinSpeechDurationMs,
    minSilenceDurationMs: defaultMinSilenceDurationMs,
    languageCode: defaultLanguageCode,

    // Mode options
    microphone: defaultMicrophone,
    audioFormat: defaultAudioFormat,
    sampleRate: defaultSampleRate,

    // Auto-connect
    autoConnect = false,
  } = options;

  const connectionRef = useRef<RealtimeConnection | null>(null);

  const [status, setStatus] = useState<ScribeStatus>("disconnected");
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const [finalTranscripts, setFinalTranscripts] = useState<TranscriptSegment[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      connectionRef.current?.close();
    };
  }, []);

  const connect = useCallback(
    async (runtimeOptions: Partial<ScribeHookOptions> = {}) => {
      if (connectionRef.current) {
        console.warn("Already connected");
        return;
      }

      try {
        setStatus("connecting");
        setError(null);

        // Merge default options with runtime options
        const token = runtimeOptions.token || defaultToken;
        const modelId = runtimeOptions.modelId || defaultModelId;

        if (!token) {
          throw new Error("Token is required");
        }
        if (!modelId) {
          throw new Error("Model ID is required");
        }

        // Determine mode: microphone or manual
        const microphone = runtimeOptions.microphone || defaultMicrophone;
        const audioFormat = runtimeOptions.audioFormat || defaultAudioFormat;
        const sampleRate = runtimeOptions.sampleRate || defaultSampleRate;

        let connection: RealtimeConnection;

        if (microphone) {
          // Microphone mode
          connection = Scribe.connect({
            token,
            modelId,
            baseUri: runtimeOptions.baseUri || defaultBaseUri,
            commitStrategy:
              runtimeOptions.commitStrategy || defaultCommitStrategy,
            vadSilenceThresholdSecs:
              runtimeOptions.vadSilenceThresholdSecs ||
              defaultVadSilenceThresholdSecs,
            vadThreshold: runtimeOptions.vadThreshold || defaultVadThreshold,
            minSpeechDurationMs:
              runtimeOptions.minSpeechDurationMs || defaultMinSpeechDurationMs,
            minSilenceDurationMs:
              runtimeOptions.minSilenceDurationMs ||
              defaultMinSilenceDurationMs,
            languageCode: runtimeOptions.languageCode || defaultLanguageCode,
            microphone,
          } as MicrophoneOptions);
        } else if (audioFormat && sampleRate) {
          // Manual audio mode
          connection = Scribe.connect({
            token,
            modelId,
            baseUri: runtimeOptions.baseUri || defaultBaseUri,
            commitStrategy:
              runtimeOptions.commitStrategy || defaultCommitStrategy,
            vadSilenceThresholdSecs:
              runtimeOptions.vadSilenceThresholdSecs ||
              defaultVadSilenceThresholdSecs,
            vadThreshold: runtimeOptions.vadThreshold || defaultVadThreshold,
            minSpeechDurationMs:
              runtimeOptions.minSpeechDurationMs || defaultMinSpeechDurationMs,
            minSilenceDurationMs:
              runtimeOptions.minSilenceDurationMs ||
              defaultMinSilenceDurationMs,
            languageCode: runtimeOptions.languageCode || defaultLanguageCode,
            audioFormat,
            sampleRate,
          } as AudioOptions);
        } else {
          throw new Error(
            "Either microphone options or (audioFormat + sampleRate) must be provided"
          );
        }

        connectionRef.current = connection;

        // Set up event listeners
        connection.on(RealtimeEvents.SESSION_STARTED, () => {
          setStatus("connected");
          onSessionStarted?.();
        });

        connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data: unknown) => {
          const message = data as PartialTranscriptMessage;
          setPartialTranscript(message.text);
          setStatus("transcribing");
          onPartialTranscript?.(message);
        });

        connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data: unknown) => {
          const message = data as CommittedTranscriptMessage;
          const segment: TranscriptSegment = {
            id: `${Date.now()}-${Math.random()}`,
            text: message.text,
            timestamp: Date.now(),
            isFinal: true,
          };
          setFinalTranscripts(prev => [...prev, segment]);
          setPartialTranscript("");
          onFinalTranscript?.(message);
        });

        connection.on(
          RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS,
          (data: unknown) => {
            const message = data as CommittedTranscriptWithTimestampsMessage;
            const segment: TranscriptSegment = {
              id: `${Date.now()}-${Math.random()}`,
              text: message.text,
              timestamp: Date.now(),
              isFinal: true,
            };
            setFinalTranscripts(prev => [...prev, segment]);
            setPartialTranscript("");
            onFinalTranscriptWithTimestamps?.(message);
          }
        );

        connection.on(RealtimeEvents.ERROR, (err: unknown) => {
          const message = err as ScribeErrorMessage;
          setError(message.error);
          setStatus("error");
          onError?.(new Error(message.error));
        });

        connection.on(RealtimeEvents.AUTH_ERROR, (data: unknown) => {
          const message = data as ScribeAuthErrorMessage;
          setError(message.error);
          setStatus("error");
          onAuthError?.(message);
        });

        connection.on(RealtimeEvents.OPEN, () => {
          onConnect?.();
        });

        connection.on(RealtimeEvents.CLOSE, () => {
          setStatus("disconnected");
          connectionRef.current = null;
          onDisconnect?.();
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to connect";
        setError(errorMessage);
        setStatus("error");
        throw err;
      }
    },
    [
      defaultToken,
      defaultModelId,
      defaultBaseUri,
      defaultCommitStrategy,
      defaultVadSilenceThresholdSecs,
      defaultVadThreshold,
      defaultMinSpeechDurationMs,
      defaultMinSilenceDurationMs,
      defaultLanguageCode,
      defaultMicrophone,
      defaultAudioFormat,
      defaultSampleRate,
      onSessionStarted,
      onPartialTranscript,
      onFinalTranscript,
      onFinalTranscriptWithTimestamps,
      onError,
      onAuthError,
      onConnect,
      onDisconnect,
    ]
  );

  const disconnect = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    setStatus("disconnected");
  }, []);

  const sendAudio = useCallback(
    (
      audioBase64: string,
      options?: { commit?: boolean; sampleRate?: number }
    ) => {
      if (!connectionRef.current) {
        throw new Error("Not connected to Scribe");
      }
      connectionRef.current.send({ audioBase64, ...options });
    },
    []
  );

  const commit = useCallback(() => {
    if (!connectionRef.current) {
      throw new Error("Not connected to Scribe");
    }
    connectionRef.current.commit();
  }, []);

  const clearTranscripts = useCallback(() => {
    setFinalTranscripts([]);
    setPartialTranscript("");
  }, []);

  const getConnection = useCallback(() => {
    return connectionRef.current;
  }, []);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
  }, [autoConnect, connect]);

  return {
    // State
    status,
    isConnected: status === "connected" || status === "transcribing",
    isTranscribing: status === "transcribing",
    partialTranscript,
    finalTranscripts,
    error,

    // Methods
    connect,
    disconnect,
    sendAudio,
    commit,
    clearTranscripts,
    getConnection,
  };
}

// Export types and enums from client for convenience
export {
  AudioFormat,
  CommitStrategy,
  RealtimeEvents,
} from "@elevenlabs/client";
export type { RealtimeConnection } from "@elevenlabs/client";
