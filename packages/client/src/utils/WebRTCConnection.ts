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

const DEFAULT_LIVEKIT_WS_URL = "wss://livekit.rtc.elevenlabs.io";
const HTTPS_API_ORIGIN = "https://api.elevenlabs.io";
const AUDIO_VOLUME_THRESHOLD = 0.01;

// Convert HTTP(S) URL to WS(S) for LiveKit connections
function convertToWss(url: string): string {
  return url.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
}

// Convert any WS(S) or HTTP(S) URL to HTTP(S) for API calls
function convertToHttps(url: string): string {
  return url.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
}

export type ConnectionConfig = SessionConfig & {
  onDebug?: (info: unknown) => void;
};

export class WebRTCConnection extends BaseConnection {
  public conversationId: string;
  public readonly inputFormat: FormatConfig;
  public readonly outputFormat: FormatConfig;

  private room: Room;
  private isConnected = false;
  private audioEventId = 1;
  private outputDeviceId: string | null = null;

  private audioAdapter: WebRTCAudioAdapter | null;

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
    config: { onDebug?: (info: unknown) => void } = {}
  ) {
    super(config);
    this.room = room;
    this.conversationId = conversationId;
    this.inputFormat = inputFormat;
    this.outputFormat = outputFormat;
    this.audioAdapter = createAudioAdapter();

    this.setupRoomEventListeners();
  }

  public static async create(
    config: ConnectionConfig
  ): Promise<WebRTCConnection> {
    let conversationToken: string;

    // serverUrl is a convenience that derives both the token origin and LiveKit
    // URL from one base URL. Explicit origin/livekitUrl always take precedence.
    const resolvedOrigin =
      config.origin ??
      (config.serverUrl ? convertToHttps(config.serverUrl) : undefined);
    const resolvedLivekitUrl =
      config.livekitUrl ??
      (config.serverUrl ? convertToWss(config.serverUrl) : undefined);

    // Handle different authentication scenarios
    if ("conversationToken" in config && config.conversationToken) {
      // Direct token provided
      conversationToken = config.conversationToken;
    } else if ("agentId" in config && config.agentId) {
      // Agent ID provided - fetch token from API
      try {
        const { name: source, version } = sourceInfo;
        const configOrigin = resolvedOrigin ?? HTTPS_API_ORIGIN;
        const origin = convertToHttps(configOrigin); // normalize ws(s):// and http(s):// to http(s):// for token fetch
        let url = `${origin}/v1/convai/conversation/token?agent_id=${config.agentId}&source=${source}&version=${version}`;
        if (config.environment) {
          url += `&environment=${encodeURIComponent(config.environment)}`;
        }
        const response = await fetch(url);

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

    const room = new Room({
      // Force dual peer connection (v0) path to maintain compatibility
      // with LiveKit servers that don't support the v1 join protocol
      // (publisher offer bundled in JoinRequest). See #781.
      singlePeerConnection: false,
    });

    try {
      // Create connection instance first to set up event listeners
      const conversationId = `room_${Date.now()}`;
      const inputFormat = parseFormat("pcm_48000");
      const outputFormat = parseFormat("pcm_48000");
      const connection = new WebRTCConnection(
        room,
        conversationId,
        inputFormat,
        outputFormat,
        config
      );

      // Use configurable LiveKit URL or default if not provided
      const livekitUrl = resolvedLivekitUrl || DEFAULT_LIVEKIT_WS_URL;

      // Enable microphone on SignalConnected (before room.connect resolves).
      // The server may wait for the client to publish audio before fully
      // establishing the subscriber peer connection, matching the behaviour
      // of @livekit/components-react's useLiveKitRoom hook.
      const micEnabled = config.textOnly
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            room.once(RoomEvent.SignalConnected, () => {
              room.localParticipant
                .setMicrophoneEnabled(true)
                .then(() => resolve())
                .catch(reject);
            });
          });

      // Connect to the LiveKit room
      await room.connect(livekitUrl, conversationToken);

      // Wait for the Connected event to ensure isConnected is true
      await new Promise<void>(resolve => {
        if (connection.isConnected) {
          resolve();
        } else {
          const onConnected = () => {
            room.off(RoomEvent.Connected, onConnected);
            resolve();
          };
          room.on(RoomEvent.Connected, onConnected);
        }
      });

      // Ensure the microphone was successfully enabled
      await micEnabled;

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

      await connection.sendMessage(overridesEvent);

      return connection;
    } catch (error) {
      await room.disconnect();
      throw error;
    }
  }

  private setupRoomEventListeners() {
    this.room.on(RoomEvent.Connected, () => {
      this.isConnected = true;
    });

    this.room.on(RoomEvent.Disconnected, reason => {
      this.isConnected = false;
      this.disconnect({
        reason: "agent",
        context: { type: "close", reason: reason?.toString() },
      });
    });

    this.room.on(RoomEvent.ConnectionStateChanged, state => {
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
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));

          // Filter out audio messages for WebRTC - they're handled via audio tracks
          if (message.type === "audio") {
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
        if (
          track.kind === Track.Kind.Audio &&
          participant.identity.includes("agent")
        ) {
          const remoteAudioTrack = track as RemoteAudioTrack;

          if (this.audioAdapter) {
            // Delegate playback to the platform-specific adapter
            await this.audioAdapter.attachRemoteTrack(
              remoteAudioTrack,
              this.outputDeviceId
            );

            // Set up output volume analysis and audio capture
            await this.setupAudioCapture(remoteAudioTrack);

            this.onDebug?.({ type: "audio_element_ready" });
          }
        }
      }
    );

    this.room.on(
      RoomEvent.ActiveSpeakersChanged,
      async (speakers: Participant[]) => {
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
        if (participant.identity?.startsWith("agent")) {
          this.disconnect({
            reason: "agent",
            context: { type: "close", reason: "agent disconnected" },
          });
        }
      }
    );
  }

  public close() {
    if (this.isConnected) {
      try {
        // Explicitly stop all local tracks before disconnecting to ensure microphone is released
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

      // Delegate all audio cleanup to the adapter
      this.audioAdapter?.cleanup();
      this.inputAnalyser = undefined;
      this.outputAnalyser = undefined;
      this.inputVolumeProvider = NO_VOLUME;
      this.outputVolumeProvider = NO_VOLUME;

      this.room.disconnect();
    }
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

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));

      await this.room.localParticipant.publishData(data, { reliable: true });
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

  private async setupAudioCapture(track: RemoteAudioTrack) {
    if (!this.audioAdapter) return;

    try {
      const onAudioData = (audioData: ArrayBuffer, maxVolume: number) => {
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

      const result = await this.audioAdapter.setupOutputAnalysis(
        track,
        this.outputFormat,
        onAudioData
      );

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

    try {
      // Get the current microphone track publication
      const currentMicTrackPublication =
        this.room.localParticipant.getTrackPublication(Track.Source.Microphone);

      // Stop the current microphone track if it exists
      if (currentMicTrackPublication?.track) {
        await currentMicTrackPublication.track.stop();
        await this.room.localParticipant.unpublishTrack(
          currentMicTrackPublication.track
        );
      }

      // Create new audio track with the specified device
      const audioTrack = await createLocalAudioTrack({
        deviceId: { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: { ideal: 1 },
      });

      // Publish the new microphone track
      await this.room.localParticipant.publishTrack(audioTrack, {
        name: "microphone",
        source: Track.Source.Microphone,
      });

      // Reconnect the input analyser to the new track
      this.setupInputAnalyser(audioTrack.mediaStreamTrack);
    } catch (error) {
      console.error("Failed to change input device:", error);

      // Try to re-enable default microphone on failure
      try {
        await this.room.localParticipant.setMicrophoneEnabled(true);
      } catch (recoveryError) {
        console.error(
          "Failed to recover microphone after device switch error:",
          recoveryError
        );
      }

      throw error;
    }
  }
}
