import { RealtimeConnection } from "./connection";
import { loadScribeAudioProcessor } from "../utils/scribeAudioProcessor.generated";

export enum AudioFormat {
  PCM_8000 = "pcm_8000",
  PCM_16000 = "pcm_16000",
  PCM_22050 = "pcm_22050",
  PCM_24000 = "pcm_24000",
  PCM_44100 = "pcm_44100",
  PCM_48000 = "pcm_48000",
  ULAW_8000 = "ulaw_8000",
}

export enum CommitStrategy {
  MANUAL = "manual",
  VAD = "vad",
}

interface BaseOptions {
  /**
   * Token to use for the WebSocket connection. Obtained from the ElevenLabs API.
   */
  token: string;
  /**
   * Strategy for committing transcriptions.
   * @default CommitStrategy.MANUAL
   */
  commitStrategy?: CommitStrategy;
  /**
   * Silence threshold in seconds for VAD (Voice Activity Detection).
   * Must be a positive number between 0.3 and 3.0
   */
  vadSilenceThresholdSecs?: number;
  /**
   * Threshold for voice activity detection.
   * Must be between 0.1 and 0.9.
   */
  vadThreshold?: number;
  /**
   * Minimum speech duration in milliseconds.
   * Must be a positive integer between 50 and 2000.
   */
  minSpeechDurationMs?: number;
  /**
   * Minimum silence duration in milliseconds.
   * Must be a positive integer between 50 and 2000.
   */
  minSilenceDurationMs?: number;
  /**
   * Model ID to use for transcription.
   * Must be a valid model ID.
   */
  modelId: string;
  /**
   * An ISO-639-1 or ISO-639-3 language_code corresponding to the language of the audio file.
   * Can sometimes improve transcription performance if known beforehand.
   */
  languageCode?: string;
  /**
   * Base URI to use for the WebSocket connection.
   * If not provided, the default URI will be used.
   */
  baseUri?: string;
}

export interface AudioOptions extends BaseOptions {
  audioFormat: AudioFormat;
  sampleRate: number;
  microphone?: never;
}

/**
 * Options for automatic microphone streaming in the browser.
 */
export interface MicrophoneOptions extends BaseOptions {
  microphone?: {
    deviceId?: string;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    channelCount?: number;
  };
  audioFormat?: never;
  sampleRate?: never;
}

/**
 * Real-time speech-to-text transcription client for browser environments.
 * Supports microphone streaming and manual audio chunk transmission.
 */
export class ScribeRealtime {
  private baseUri: string = "wss://api.elevenlabs.io";

  private getWebSocketUri(baseUri: string = this.baseUri): string {
    return `${baseUri}/v1/speech-to-text/realtime-beta`;
  }

  private buildWebSocketUri(options: AudioOptions | MicrophoneOptions): string {
    const baseUri = this.getWebSocketUri(options.baseUri);
    const params = new URLSearchParams();

    // Model ID is required, so no check required
    params.append("model_id", options.modelId);

    params.append("token", options.token);

    // Add optional parameters if provided, with validation
    if (options.commitStrategy !== undefined) {
      params.append("commit_strategy", options.commitStrategy);
    }
    if (options.vadSilenceThresholdSecs !== undefined) {
      if (
        options.vadSilenceThresholdSecs <= 0.3 ||
        options.vadSilenceThresholdSecs > 3.0
      ) {
        throw new Error("vadSilenceThresholdSecs must be between 0.3 and 3.0");
      }
      params.append(
        "vad_silence_threshold_secs",
        options.vadSilenceThresholdSecs.toString()
      );
    }
    if (options.vadThreshold !== undefined) {
      if (options.vadThreshold < 0.1 || options.vadThreshold > 0.9) {
        throw new Error("vadThreshold must be between 0.1 and 0.9");
      }
      params.append("vad_threshold", options.vadThreshold.toString());
    }
    if (options.minSpeechDurationMs !== undefined) {
      if (
        options.minSpeechDurationMs <= 50 ||
        options.minSpeechDurationMs > 2000
      ) {
        throw new Error("minSpeechDurationMs must be between 50 and 2000");
      }
      params.append(
        "min_speech_duration_ms",
        options.minSpeechDurationMs.toString()
      );
    }
    if (options.minSilenceDurationMs !== undefined) {
      if (
        options.minSilenceDurationMs <= 50 ||
        options.minSilenceDurationMs > 2000
      ) {
        throw new Error("minSilenceDurationMs must be between 50 and 2000");
      }
      params.append(
        "min_silence_duration_ms",
        options.minSilenceDurationMs.toString()
      );
    }

    if (options.languageCode !== undefined) {
      params.append("language_code", options.languageCode);
    }

    const queryString = params.toString();
    return queryString ? `${baseUri}?${queryString}` : baseUri;
  }

  /**
   * Establishes a WebSocket connection for real-time speech-to-text transcription.
   *
   * @param options - Configuration options for the connection
   * @returns A promise that resolves to a RealtimeConnection instance
   *
   * @example
   * ```typescript
   * // Manual audio streaming
   * const scribe = new ScribeRealtime();
   * const connection = await scribe.connect({
   *     token: "...",
   *     modelId: "scribe_realtime_v2",
   *     audioFormat: AudioFormat.PCM_16000,
   *     sampleRate: 16000,
   * });
   *
   * // Automatic microphone streaming
   * const connection = await scribe.connect({
   *     token: "...",
   *     modelId: "scribe_realtime_v2",
   *     microphone: {
   *         echoCancellation: true,
   *         noiseSuppression: true
   *     }
   * });
   * ```
   */
  public async connect(
    options: AudioOptions | MicrophoneOptions
  ): Promise<RealtimeConnection> {
    if (!options.modelId) {
      throw new Error("modelId is required");
    }

    // Create connection object first so users can attach event listeners before messages arrive
    const sampleRate =
      "microphone" in options && options.microphone
        ? 16000
        : (options as AudioOptions).sampleRate;
    const connection = new RealtimeConnection(sampleRate);

    // Build WebSocket URI with query parameters
    const uri = this.buildWebSocketUri(options);

    const websocket = new WebSocket(uri);

    // If microphone mode, set up streaming handler
    if ("microphone" in options && options.microphone) {
      websocket.addEventListener("open", () => {
        this.streamFromMicrophone(options as MicrophoneOptions, connection);
      });
    }

    connection.setWebSocket(websocket);

    return connection;
  }

  private async streamFromMicrophone(
    options: MicrophoneOptions,
    connection: RealtimeConnection
  ): Promise<void> {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: options.microphone?.deviceId,
          echoCancellation: options.microphone?.echoCancellation ?? true,
          noiseSuppression: options.microphone?.noiseSuppression ?? true,
          autoGainControl: options.microphone?.autoGainControl ?? true,
          channelCount: options.microphone?.channelCount ?? 1,
          sampleRate: { ideal: 16000 },
        },
      });

      // Create audio context at 16kHz (Scribe's default)
      const audioContext = new AudioContext({ sampleRate: 16000 });

      // Load scribe worklet
      await loadScribeAudioProcessor(audioContext.audioWorklet);

      // Set up audio pipeline
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(
        audioContext,
        "scribeAudioProcessor"
      );

      // Handle audio data from worklet
      workletNode.port.onmessage = event => {
        const { audioData } = event.data;
        // Convert ArrayBuffer to base64
        const bytes = new Uint8Array(audioData);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        connection.send({ audioBase64: base64Audio });
      };

      // Connect audio pipeline
      source.connect(workletNode);

      // Resume audio context if needed
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Store cleanup function
      connection._audioCleanup = () => {
        stream.getTracks().forEach(track => {
          track.stop();
        });
        source.disconnect();
        workletNode.disconnect();
        audioContext.close();
      };
    } catch (error) {
      console.error("Failed to start microphone streaming:", error);
      throw error;
    }
  }
}
