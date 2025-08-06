import {
  BaseConnection,
  type SessionConfig,
  type FormatConfig,
  parseFormat,
} from "./BaseConnection";
import { PACKAGE_VERSION } from "../version";
import { isValidSocketEvent, type OutgoingSocketEvent } from "./events";
import { Room, RoomEvent, Track, ConnectionState } from "livekit-client";
import type {
  RemoteAudioTrack,
  Participant,
  TrackPublication,
} from "livekit-client";
import {
  constructOverrides,
  CONVERSATION_INITIATION_CLIENT_DATA_TYPE,
} from "./overrides";
import { arrayBufferToBase64 } from "./audio";
import { loadRawAudioProcessor } from "./rawAudioProcessor";

const DEFAULT_LIVEKIT_WS_URL = "wss://livekit.rtc.elevenlabs.io";
const HTTPS_API_ORIGIN = "https://api.elevenlabs.io";

// Convert WSS origin to HTTPS for API calls
function convertWssToHttps(origin: string): string {
  return origin.replace(/^wss:\/\//, "https://");
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
  private audioCaptureContext: AudioContext | null = null;

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

    this.setupRoomEventListeners();
  }

  public static async create(
    config: ConnectionConfig
  ): Promise<WebRTCConnection> {
    let conversationToken: string;

    // Handle different authentication scenarios
    if ("conversationToken" in config && config.conversationToken) {
      // Direct token provided
      conversationToken = config.conversationToken;
    } else if ("agentId" in config && config.agentId) {
      // Agent ID provided - fetch token from API
      try {
        const version = config.overrides?.client?.version || PACKAGE_VERSION;
        const source = config.overrides?.client?.source || "js_sdk";
        const configOrigin = config.origin ?? HTTPS_API_ORIGIN;
        const origin = convertWssToHttps(configOrigin); //origin is wss, not https
        const url = `${origin}/v1/convai/conversation/token?agent_id=${config.agentId}&source=${source}&version=${version}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `ElevenLabs API returned ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
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

    const room = new Room();

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
      const livekitUrl = config.livekitUrl || DEFAULT_LIVEKIT_WS_URL;

      // Connect to the LiveKit room and wait for the Connected event
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

      if (room.name) {
        connection.conversationId =
          room.name.match(/(conv_[a-zA-Z0-9]+)/)?.[0] || room.name;
      }

      // Enable microphone and send overrides
      await room.localParticipant.setMicrophoneEnabled(true);

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
    this.room.on(RoomEvent.Connected, async () => {
      this.isConnected = true;
      console.info("WebRTC room connected");
    });

    this.room.on(RoomEvent.Disconnected, reason => {
      this.isConnected = false;
      this.disconnect({
        reason: "agent",
        context: new CloseEvent("close", { reason: reason?.toString() }),
      });
    });

    this.room.on(RoomEvent.ConnectionStateChanged, state => {
      if (state === ConnectionState.Disconnected) {
        this.isConnected = false;
        this.disconnect({
          reason: "error",
          message: `LiveKit connection state changed to ${state}`,
          context: new Event("connection_state_changed"),
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
          // Play the audio track
          const remoteAudioTrack = track as RemoteAudioTrack;
          const audioElement = remoteAudioTrack.attach();
          audioElement.autoplay = true;
          audioElement.controls = false;

          // Add to DOM (hidden) to ensure it plays
          audioElement.style.display = "none";
          document.body.appendChild(audioElement);

          // Set up audio capture for onAudio callback
          await this.setupAudioCapture(remoteAudioTrack);
        }
      }
    );

    this.room.on(
      RoomEvent.ActiveSpeakersChanged,
      async (speakers: Participant[]) => {
        if (speakers.length > 0) {
          const participant = speakers[0];
          if (participant.identity.includes("agent")) {
            this.updateMode("speaking");
          }
        } else {
          this.updateMode("listening");
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

      // Clean up audio capture context (non-blocking)
      if (this.audioCaptureContext) {
        this.audioCaptureContext.close().catch(error => {
          console.warn("Error closing audio capture context:", error);
        });
        this.audioCaptureContext = null;
      }

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

  public async setMicMuted(isMuted: boolean): Promise<void> {
    if (!this.isConnected || !this.room.localParticipant) {
      console.warn(
        "Cannot set microphone muted: room not connected or no local participant"
      );
      return;
    }

    // Get the microphone track publication
    const micTrackPublication = this.room.localParticipant.getTrackPublication(
      Track.Source.Microphone
    );

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
  }

  private async setupAudioCapture(track: RemoteAudioTrack) {
    try {
      // Create audio context for processing
      const audioContext = new AudioContext();
      this.audioCaptureContext = audioContext;

      // Create MediaStream from the track
      const mediaStream = new MediaStream([track.mediaStreamTrack]);

      // Create audio source from the stream
      const source = audioContext.createMediaStreamSource(mediaStream);

      // Load the raw audio processor worklet (reuse existing processor)
      await loadRawAudioProcessor(audioContext.audioWorklet);

      // Create worklet node for audio processing
      const worklet = new AudioWorkletNode(audioContext, "raw-audio-processor");

      // Configure the processor for the output format
      worklet.port.postMessage({
        type: "setFormat",
        format: this.outputFormat.format,
        sampleRate: this.outputFormat.sampleRate,
      });

      // Handle processed audio data
      worklet.port.onmessage = (event: MessageEvent) => {
        const [audioData, maxVolume] = event.data;

        // Only send audio if there's significant volume (not just silence)
        const volumeThreshold = 0.01;

        if (maxVolume > volumeThreshold) {
          // Convert to base64
          const base64Audio = arrayBufferToBase64(audioData.buffer);

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

      // Connect the audio processing chain
      source.connect(worklet);
    } catch (error) {
      console.warn("Failed to set up audio capture:", error);
    }
  }
}
