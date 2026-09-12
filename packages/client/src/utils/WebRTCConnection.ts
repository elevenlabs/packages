import {
  BaseConnection,
  type SessionConfig,
  type FormatConfig,
  parseFormat,
} from "./BaseConnection.js";
import { isJsonObject } from "./assert.js";
import { extractApiErrorMessage } from "./errors.js";
import { sourceInfo } from "../sourceInfo.js";
import { isValidSocketEvent, type OutgoingSocketEvent } from "./events.js";
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  createLocalAudioTrack,
} from "livekit-client";
import type {
  LocalAudioTrack,
  RemoteAudioTrack,
  Participant,
  TrackPublication,
  RemoteParticipant,
} from "livekit-client";
import {
  constructOverrides,
  CONVERSATION_INITIATION_CLIENT_DATA_TYPE,
} from "./overrides.js";
import { arrayBufferToBase64 } from "./audio.js";
import {
  createSessionAbortError,
  observeWithCancellation,
  registerSessionCleanup,
  throwIfSessionAborted,
} from "./cancellation.js";
import type { InputController, InputDeviceConfig } from "../InputController.js";
import type {
  OutputController,
  OutputDeviceConfig,
} from "../OutputController.js";
import { type VolumeProvider, NO_VOLUME } from "./volumeProvider.js";
import {
  createAudioAdapter,
  type WebRTCAudioAdapter,
} from "../WebRTCAudioAdapter.js";
import type { AudioWorkletConfig } from "../BaseConversation.js";

const DEFAULT_LIVEKIT_WS_URL = "wss://livekit.rtc.elevenlabs.io";
const HTTPS_API_ORIGIN = "https://api.elevenlabs.io";
const AUDIO_VOLUME_THRESHOLD = 0.01;

// Convert WSS origin to HTTPS for API calls
function convertWssToHttps(origin: string): string {
  return origin.replace(/^wss:\/\//, "https://");
}

export type WebRTCConnectionConfig = SessionConfig &
  Pick<AudioWorkletConfig, "workletPaths"> &
  InputDeviceConfig & {
    onDebug?: (info: unknown) => void;
  };

/** @deprecated Use {@link WebRTCConnectionConfig} instead. */
export type ConnectionConfig = WebRTCConnectionConfig;

export class WebRTCConnection extends BaseConnection {
  public conversationId: string;
  public readonly inputFormat: FormatConfig;
  public readonly outputFormat: FormatConfig;

  private room: Room;
  private isConnected = false;
  private isClosed = false;
  private disconnectPromise: Promise<void> | null = null;
  private readonly sessionSignal: AbortSignal | undefined;
  private audioEventId = 1;
  private outputDeviceId: string | null = null;

  private audioAdapter: WebRTCAudioAdapter | null;
  private workletPaths: AudioWorkletConfig["workletPaths"];

  private inputAnalyser: unknown = undefined;
  private inputVolumeProvider: VolumeProvider = NO_VOLUME;

  private outputAnalyser: unknown = undefined;
  private outputVolumeProvider: VolumeProvider = NO_VOLUME;

  // InputController state
  private _isMuted = false;

  // InputController interface exposed as a property
  public readonly input: InputController = {
    close: async () => {
      // Close only microphone tracks, not the entire connection
      if (this.isConnected) {
        try {
          this.room.localParticipant.audioTrackPublications.forEach(
            publication => {
              if (publication.track) {
                publication.track.stop();
              }
            }
          );
        } catch (error) {
          console.warn("Error stopping local tracks:", error);
        }
      }
    },
    setDevice: async (config?: Partial<FormatConfig> & InputDeviceConfig) => {
      // WebRTC only supports changing inputDeviceId
      // sampleRate, format, and preferHeadphonesForIosDevices are not supported
      if (
        config?.sampleRate !== undefined ||
        config?.format !== undefined ||
        config?.preferHeadphonesForIosDevices !== undefined
      ) {
        throw new Error(
          "WebRTC input device does not support sampleRate, format, or preferHeadphonesForIosDevices options"
        );
      }

      const inputDeviceId = config?.inputDeviceId;
      if (!inputDeviceId) {
        // No device ID specified - this is a no-op for WebRTC
        // The default device is already being used
        return;
      }
      await this.setAudioInputDevice(inputDeviceId);
    },
    setMuted: async (isMuted: boolean) => {
      if (!this.isConnected || !this.room.localParticipant) {
        console.warn(
          "Cannot set microphone muted: room not connected or no local participant"
        );
        return;
      }

      // Set immediately so volume/frequency indicators reflect the muted
      // state even if the underlying track operation fails (e.g. on RN).
      this._isMuted = isMuted;

      // Get the microphone track publication
      const micTrackPublication =
        this.room.localParticipant.getTrackPublication(Track.Source.Microphone);

      if (micTrackPublication?.track) {
        try {
          // Use LiveKit's built-in track muting
          if (isMuted) {
            await micTrackPublication.track.mute();
          } else {
            await micTrackPublication.track.unmute();
          }
        } catch (_error) {
          // If track muting fails, fall back to participant-level control
          await this.room.localParticipant.setMicrophoneEnabled(!isMuted);
        }
      } else {
        // No track found, use participant-level control directly
        await this.room.localParticipant.setMicrophoneEnabled(!isMuted);
      }

      // After unmuting, reconnect the input analyser because LiveKit may
      // have replaced the underlying MediaStreamTrack during mute/unmute.
      if (!isMuted) {
        const track = this.room.localParticipant.getTrackPublication(
          Track.Source.Microphone
        )?.track;
        if (track) {
          this.setupInputAnalyser(track.mediaStreamTrack);
        }
      }
    },
    isMuted: () => this._isMuted,
    getAnalyser: () =>
      this.inputAnalyser as ReturnType<InputController["getAnalyser"]>,
    getVolume: () => {
      if (this._isMuted) return 0;
      return this.inputVolumeProvider.getVolume();
    },
    getByteFrequencyData: (buffer: Uint8Array<ArrayBuffer>) => {
      if (this._isMuted) {
        buffer.fill(0);
        return;
      }
      this.inputVolumeProvider.getByteFrequencyData(buffer);
    },
  };

  // OutputController interface exposed as a property
  public readonly output: OutputController = {
    close: async () => {
      // No-op for WebRTC - LiveKit handles cleanup
      // Audio elements are cleaned up when the connection closes
    },
    setDevice: async (config?: Partial<FormatConfig> & OutputDeviceConfig) => {
      // WebRTC only supports changing outputDeviceId
      // sampleRate and format are not supported
      if (config?.sampleRate !== undefined || config?.format !== undefined) {
        throw new Error(
          "WebRTC output device does not support sampleRate or format options"
        );
      }

      const outputDeviceId = config?.outputDeviceId;
      if (!outputDeviceId) {
        // No device ID specified - this is a no-op for WebRTC
        // The default device is already being used
        return;
      }
      await this.setAudioOutputDevice(outputDeviceId);
    },
    setVolume: (volume: number) => {
      this.setAudioVolume(volume);
    },
    interrupt: (_resetDuration?: number) => {
      // No-op for WebRTC - LiveKit handles audio playback and interruption
      // Audio interruption is managed by the server/agent
    },
    getAnalyser: () =>
      this.outputAnalyser as ReturnType<OutputController["getAnalyser"]>,
    getVolume: () => this.outputVolumeProvider.getVolume(),
    getByteFrequencyData: (buffer: Uint8Array<ArrayBuffer>) => {
      this.outputVolumeProvider.getByteFrequencyData(buffer);
    },
  };

  private constructor(
    room: Room,
    conversationId: string,
    inputFormat: FormatConfig,
    outputFormat: FormatConfig,
    config: {
      onDebug?: (info: unknown) => void;
      workletPaths?: AudioWorkletConfig["workletPaths"];
      signal?: AbortSignal;
    } = {}
  ) {
    super(config);
    this.room = room;
    this.conversationId = conversationId;
    this.inputFormat = inputFormat;
    this.outputFormat = outputFormat;
    this.audioAdapter = createAudioAdapter();
    this.workletPaths = config.workletPaths;
    this.sessionSignal = config.signal;

    this.setupRoomEventListeners();
  }

  public static async create(
    config: WebRTCConnectionConfig
  ): Promise<WebRTCConnection> {
    throwIfSessionAborted(config.signal);
    let conversationToken: string;

    // Handle different authentication scenarios
    if ("conversationToken" in config && config.conversationToken) {
      // Direct token provided
      conversationToken = config.conversationToken;
    } else if ("agentId" in config && config.agentId) {
      // Agent ID provided - fetch token from API
      try {
        const { name: source, version } = sourceInfo;
        const configOrigin = config.origin ?? HTTPS_API_ORIGIN;
        const origin = convertWssToHttps(configOrigin); //origin is wss, not https
        let url = `${origin}/v1/convai/conversation/token?agent_id=${config.agentId}&source=${source}&version=${version}`;
        if (config.environment) {
          url += `&environment=${encodeURIComponent(config.environment)}`;
        }
        const response = config.signal
          ? await fetch(url, { signal: config.signal })
          : await fetch(url);

        if (!response.ok) {
          const message = await extractApiErrorMessage(response);
          throw new Error(
            `ElevenLabs API returned ${response.status} ${message}`
          );
        }

        const data: unknown = await response.json();
        if (!isJsonObject(data) || typeof data.token !== "string") {
          throw new Error("No conversation token received from API");
        }
        conversationToken = data.token;

        if (!conversationToken) {
          throw new Error("No conversation token received from API");
        }
      } catch (error) {
        throwIfSessionAborted(config.signal);
        let msg = error instanceof Error ? error.message : String(error);
        if (error instanceof Error && error.message.includes("401")) {
          msg =
            "Your agent has authentication enabled, but no signed URL or conversation token was provided.";
        }

        throw new Error(
          `Failed to fetch conversation token for agent ${config.agentId}: ${msg}`
        );
      }
    } else {
      throw new Error(
        "Either conversationToken or agentId is required for WebRTC connection"
      );
    }

    // livekit-client defaults `singlePeerConnection` to true, which bundles the
    // publisher offer in the JoinRequest and moves the microphone request
    // earlier in the connection sequence. Callers that need the dual peer
    // connection path can opt back into it. Left undefined so the LiveKit
    // default applies unless the caller says otherwise.
    const singlePeerConnection = config.webRtc?.singlePeerConnection;
    const room = new Room(
      singlePeerConnection === undefined ? undefined : { singlePeerConnection }
    );
    let connection: WebRTCConnection | null = null;

    try {
      // Create connection instance first to set up event listeners
      const conversationId = `room_${Date.now()}`;
      const inputFormat = parseFormat("pcm_48000");
      const outputFormat = parseFormat("pcm_48000");
      connection = new WebRTCConnection(
        room,
        conversationId,
        inputFormat,
        outputFormat,
        config
      );

      // Use configurable LiveKit URL or default if not provided
      const livekitUrl = config.livekitUrl || DEFAULT_LIVEKIT_WS_URL;

      // Enable microphone on SignalConnected (before room.connect resolves).
      // The server may wait for the client to publish audio before fully
      // establishing the subscriber peer connection, matching the behaviour
      // of @livekit/components-react's useLiveKitRoom hook.
      // `setMicrophoneEnabled` cannot take a device, so a configured
      // `inputDeviceId` publishes its own track instead.
      let microphoneStarted = false;
      let rejectMicrophoneStartup: ((reason?: unknown) => void) | null = null;
      let onSignalConnected: (() => void) | null = null;
      const micEnabled = config.textOnly
        ? Promise.resolve()
        : (() => {
            const onAbort = () => {
              if (!microphoneStarted) {
                rejectMicrophoneStartup?.(createSessionAbortError());
              }
            };
            const request = new Promise<void>((resolve, reject) => {
              rejectMicrophoneStartup = reject;
              config.signal?.addEventListener("abort", onAbort, { once: true });
              if (config.signal?.aborted) onAbort();

              onSignalConnected = () => {
                microphoneStarted = true;
                try {
                  throwIfSessionAborted(config.signal);
                } catch (error) {
                  reject(error);
                  return;
                }
                connection!
                  .enableMicrophone(config.inputDeviceId, config.signal)
                  .then(() => resolve())
                  .catch(reject);
              };
              room.once(RoomEvent.SignalConnected, onSignalConnected);
            });
            return request.finally(() => {
              config.signal?.removeEventListener("abort", onAbort);
              if (onSignalConnected) {
                room.off(RoomEvent.SignalConnected, onSignalConnected);
              }
            });
          })();

      // Connect to the LiveKit room
      const iceTransportPolicy = config.webRtc?.iceTransportPolicy;
      const roomConnected = room.connect(livekitUrl, conversationToken, {
        rtcConfig: iceTransportPolicy ? { iceTransportPolicy } : undefined,
      });
      void roomConnected.catch(error => {
        if (!microphoneStarted) {
          rejectMicrophoneStartup?.(error);
        }
      });
      const lateStartupCleanup = Promise.allSettled([
        roomConnected,
        micEnabled,
      ]).then(async ([roomResult]) => {
        if (connection?.isClosed) {
          connection.markClosedAndStopLocalTracks();
          connection.cleanupAudioResources();
          if (roomResult.status === "fulfilled") {
            await room.disconnect().catch(() => {});
          }
        }
      });
      registerSessionCleanup(config.signal, lateStartupCleanup);

      // Observe both operations from creation. Promise.all rejects on the
      // first failure while retaining rejection handlers on the later one.
      await observeWithCancellation(
        Promise.all([roomConnected, micEnabled]),
        config.signal
      );

      // Wait for the Connected event to ensure isConnected is true.
      let onConnected: (() => void) | null = null;
      try {
        await observeWithCancellation(
          new Promise<void>(resolve => {
            if (connection!.isConnected) {
              resolve();
            } else {
              onConnected = resolve;
              room.on(RoomEvent.Connected, onConnected);
            }
          }),
          config.signal
        );
      } finally {
        if (onConnected) {
          room.off(RoomEvent.Connected, onConnected);
        }
      }

      // Set up input analyser from the local mic track for volume metering
      const micTrack = room.localParticipant.getTrackPublication(
        Track.Source.Microphone
      )?.track;
      if (micTrack) {
        connection.setupInputAnalyser(micTrack.mediaStreamTrack);
      }

      if (room.name) {
        connection.conversationId =
          room.name.match(/(conv_[a-zA-Z0-9]+)/)?.[0] || room.name;
      }

      const overridesEvent = constructOverrides(config);

      connection.debug({
        type: CONVERSATION_INITIATION_CLIENT_DATA_TYPE,
        message: overridesEvent,
      });

      // The conversation cannot start without this payload, so a failed
      // publish has to fail setup. Otherwise create() resolves onto a live
      // room and microphone that the server never initialized a conversation
      // for, and the caller reports a connected session that can never speak.
      await observeWithCancellation(
        connection.sendRequiredMessage(overridesEvent),
        config.signal
      );

      throwIfSessionAborted(config.signal);
      return connection;
    } catch (error) {
      if (connection) {
        await connection.close();
      } else {
        await room.disconnect().catch(() => {});
      }
      throw error;
    }
  }

  private setupRoomEventListeners() {
    this.room.on(RoomEvent.Connected, () => {
      if (this.isClosed) return;
      this.isConnected = true;
    });

    this.room.on(RoomEvent.Disconnected, reason => {
      this.isConnected = false;
      if (this.isClosed) return;
      this.disconnect({
        reason: "agent",
        context: { type: "close", reason: reason?.toString() },
      });
    });

    this.room.on(RoomEvent.ConnectionStateChanged, state => {
      if (this.isClosed) return;
      if (state === ConnectionState.Disconnected) {
        this.isConnected = false;
        this.disconnect({
          reason: "error",
          message: `LiveKit connection state changed to ${state}`,
          context: { type: "connection_state_changed" },
        });
      }
    });

    // Handle incoming data messages
    this.room.on(
      RoomEvent.DataReceived,
      (payload: Uint8Array, _participant) => {
        if (this.isClosed) return;
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));

          // Audio bytes flow over LiveKit audio tracks, NOT the data channel —
          // but the same JSON message carries the alignment metadata
          // (chars + char_start_times_ms + char_durations_ms). Dropping
          // the whole message drops alignment along with it, which
          // prevents onAudioAlignment from firing on the WebRTC transport
          // even though the WebSocket transport surfaces it correctly.
          // Route audio messages through handleMessage so
          // VoiceConversation.handleAudio can fire onAudioAlignment, then
          // return without re-playing audio_base_64 (LiveKit already
          // plays it via the audio track).
          if (message.type === "audio") {
            if (isValidSocketEvent(message)) {
              this.handleMessage(message);
            }
            return;
          }

          if (isValidSocketEvent(message)) {
            this.handleMessage(message);
          } else {
            console.warn("Invalid socket event received:", message);
          }
        } catch (error) {
          console.warn("Failed to parse incoming data message:", error);
          console.warn("Raw payload:", new TextDecoder().decode(payload));
        }
      }
    );

    this.room.on(
      RoomEvent.TrackSubscribed,
      async (
        track: Track,
        _publication: TrackPublication,
        participant: Participant
      ) => {
        if (this.isClosed) return;
        if (
          track.kind === Track.Kind.Audio &&
          participant.identity.includes("agent")
        ) {
          const remoteAudioTrack = track as RemoteAudioTrack;

          const audioAdapter = this.audioAdapter;
          if (audioAdapter) {
            // Delegate playback to the platform-specific adapter
            await audioAdapter.attachRemoteTrack(
              remoteAudioTrack,
              this.outputDeviceId
            );
            if (this.isClosed || this.audioAdapter !== audioAdapter) {
              audioAdapter.cleanup();
              return;
            }

            // Set up output volume analysis and audio capture
            await this.setupAudioCapture(remoteAudioTrack, audioAdapter);

            if (this.isClosed || this.audioAdapter !== audioAdapter) return;
            this.onDebug?.({ type: "audio_element_ready" });
          }
        }
      }
    );

    this.room.on(
      RoomEvent.ActiveSpeakersChanged,
      async (speakers: Participant[]) => {
        if (this.isClosed) return;
        if (speakers.length > 0) {
          this.updateMode(
            speakers[0].identity.startsWith("agent") ? "speaking" : "listening"
          );
        } else {
          this.updateMode("listening");
        }
      }
    );

    this.room.on(
      RoomEvent.ParticipantDisconnected,
      (participant: RemoteParticipant) => {
        if (this.isClosed) return;
        if (participant.identity?.startsWith("agent")) {
          this.disconnect({
            reason: "agent",
            context: { type: "close", reason: "agent disconnected" },
          });
        }
      }
    );
  }

  public close(): Promise<void> {
    if (!this.isClosed) {
      this.markClosedAndStopLocalTracks();
      this.cleanupAudioResources();
    }

    if (!this.disconnectPromise) {
      this.disconnectPromise = this.room.disconnect().catch(() => {});
      registerSessionCleanup(this.sessionSignal, this.disconnectPromise);
    }
    return this.disconnectPromise;
  }

  private cleanupAudioResources(): void {
    try {
      this.audioAdapter?.cleanup();
    } catch (error) {
      console.warn("Error cleaning up WebRTC audio resources:", error);
    }
    this.audioAdapter = null;
    this.inputAnalyser = undefined;
    this.outputAnalyser = undefined;
    this.inputVolumeProvider = NO_VOLUME;
    this.outputVolumeProvider = NO_VOLUME;
  }

  private markClosedAndStopLocalTracks(): void {
    this.isClosed = true;
    this.isConnected = false;
    this.room.localParticipant.audioTrackPublications.forEach(publication => {
      try {
        publication.track?.stop();
      } catch (error) {
        console.warn("Error stopping local track:", error);
      }
    });
  }

  public async sendMessage(message: OutgoingSocketEvent) {
    if (!this.isConnected || !this.room.localParticipant) {
      console.warn(
        "Cannot send message: room not connected or no local participant"
      );
      return;
    }

    // In WebRTC mode, audio is sent via published tracks, not data messages
    if ("user_audio_chunk" in message) {
      // Ignore audio data messages - audio flows through WebRTC tracks
      return;
    }

    this.handleOutgoingMessage(message);
    try {
      await this.publishMessage(message);
    } catch (error) {
      this.debug({
        type: "send_message_error",
        message: {
          message,
          error,
        },
      });
      console.error("Failed to send message via WebRTC:", error);
    }
  }

  /**
   * Sends a message the session cannot proceed without, surfacing failures to
   * the caller instead of absorbing them the way {@link sendMessage} does.
   */
  private async sendRequiredMessage(message: OutgoingSocketEvent) {
    if (!this.isConnected || !this.room.localParticipant) {
      throw new Error(
        "Cannot send message: room not connected or no local participant"
      );
    }

    this.handleOutgoingMessage(message);
    await this.publishMessage(message);
  }

  private async publishMessage(message: OutgoingSocketEvent) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));

    await this.room.localParticipant.publishData(data, { reliable: true });
  }

  // Get the room instance for advanced usage
  public getRoom(): Room {
    return this.room;
  }

  /**
   * Delegates input volume analysis to the audio adapter (if present).
   * Called once during create() and again after an input device switch
   * so the analyser follows the active mic track.
   */
  private setupInputAnalyser(mediaStreamTrack: MediaStreamTrack): void {
    if (!this.audioAdapter) return;

    try {
      const result = this.audioAdapter.setupInputAnalysis(mediaStreamTrack);
      this.inputVolumeProvider = result.volumeProvider;
      this.inputAnalyser = result.analyser;
    } catch (error) {
      // Don't reset inputVolumeProvider here — an external provider (e.g.
      // React Native's native volume layer) may still be valid.
      console.warn(
        "[ConversationalAI] Failed to set up input volume analyser:",
        error
      );
    }
  }

  public setInputVolumeProvider(provider: VolumeProvider) {
    this.inputVolumeProvider = provider;
  }

  public setOutputVolumeProvider(provider: VolumeProvider) {
    this.outputVolumeProvider = provider;
  }

  private async setupAudioCapture(
    track: RemoteAudioTrack,
    audioAdapter: WebRTCAudioAdapter
  ) {
    if (this.isClosed || this.audioAdapter !== audioAdapter) return;

    try {
      const onAudioData = (audioData: ArrayBuffer, maxVolume: number) => {
        if (this.isClosed || this.audioAdapter !== audioAdapter) return;
        // Only send audio if there's significant volume (not just silence)
        if (maxVolume > AUDIO_VOLUME_THRESHOLD) {
          // Convert to base64
          const base64Audio = arrayBufferToBase64(audioData);

          // Use sequential event ID for proper feedback tracking
          const eventId = this.audioEventId++;

          // Trigger the onAudio callback by simulating an audio event
          this.handleMessage({
            type: "audio",
            audio_event: {
              audio_base_64: base64Audio,
              event_id: eventId,
            },
          });
        }
      };

      const result = await audioAdapter.setupOutputAnalysis(
        track,
        this.outputFormat,
        onAudioData,
        this.workletPaths
      );

      if (this.isClosed || this.audioAdapter !== audioAdapter) {
        audioAdapter.cleanup();
        return;
      }
      this.outputVolumeProvider = result.volumeProvider;
      this.outputAnalyser = result.analyser;
    } catch (error) {
      console.warn("Failed to set up audio capture:", error);
    }
  }

  public setAudioVolume(volume: number) {
    this.audioAdapter?.setVolume(volume);
  }

  public async setAudioOutputDevice(deviceId: string): Promise<void> {
    if (!this.audioAdapter) {
      throw new Error(
        "Cannot set output device: no audio adapter available on this platform"
      );
    }

    await this.audioAdapter.setOutputDevice(deviceId);

    // Store the device ID for future audio elements
    this.outputDeviceId = deviceId;
  }

  public async setAudioInputDevice(deviceId: string): Promise<void> {
    if (!this.isConnected || !this.room.localParticipant) {
      throw new Error(
        "Cannot change input device: room not connected or no local participant"
      );
    }

    // Acquire the new track before releasing the old one, so a failed capture
    // leaves the live microphone published.
    const audioTrack = await this.createMicrophoneTrack(deviceId);

    try {
      const currentMicTrackPublication =
        this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (currentMicTrackPublication?.track) {
        await this.room.localParticipant.unpublishTrack(
          currentMicTrackPublication.track
        );
      }

      // Publish muted rather than muting afterwards, so a muted session never
      // sends audio from the new device.
      if (this._isMuted) {
        await audioTrack.mute();
      }

      await this.room.localParticipant.publishTrack(audioTrack, {
        name: "microphone",
        source: Track.Source.Microphone,
      });
    } catch (error) {
      console.error("Failed to change input device:", error);

      const publication = this.room.localParticipant.getTrackPublication(
        Track.Source.Microphone
      );
      if (publication?.track !== audioTrack) {
        audioTrack.stop();
      }
      if (!publication?.track) {
        // The old track is already gone, so recover onto the default device
        // rather than leaving the session without a microphone.
        try {
          await this.room.localParticipant.setMicrophoneEnabled(!this._isMuted);
          const recoveredTrack = this.room.localParticipant.getTrackPublication(
            Track.Source.Microphone
          )?.track;
          if (recoveredTrack) {
            this.setupInputAnalyser(recoveredTrack.mediaStreamTrack);
          }
        } catch (recoveryError) {
          console.error(
            "Failed to recover microphone after device switch error:",
            recoveryError
          );
        }
      }

      throw error;
    }

    this.setupInputAnalyser(audioTrack.mediaStreamTrack);
  }

  private async enableMicrophone(
    inputDeviceId?: string,
    signal?: AbortSignal
  ): Promise<void> {
    throwIfSessionAborted(signal);
    if (this.isClosed) throw createSessionAbortError();
    if (!inputDeviceId) {
      await this.room.localParticipant.setMicrophoneEnabled(true);
      if (signal?.aborted || this.isClosed) {
        this.markClosedAndStopLocalTracks();
        throw createSessionAbortError();
      }
      return;
    }

    const audioTrack = await this.createMicrophoneTrack(inputDeviceId);
    try {
      if (signal?.aborted || this.isClosed) {
        throw createSessionAbortError();
      }
      await this.room.localParticipant.publishTrack(audioTrack, {
        name: "microphone",
        source: Track.Source.Microphone,
      });
      if (signal?.aborted || this.isClosed) {
        throw createSessionAbortError();
      }
    } catch (error) {
      // An unpublished track is unknown to the room, so disconnecting would
      // leave the device captured.
      try {
        audioTrack.stop();
      } catch (stopError) {
        console.warn("Error stopping unpublished local track:", stopError);
      }
      throw error;
    }
  }

  private createMicrophoneTrack(deviceId: string): Promise<LocalAudioTrack> {
    return createLocalAudioTrack({
      deviceId: { exact: deviceId },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: { ideal: 1 },
    });
  }
}
