import {
  BaseConnection,
  type SessionConfig,
  type FormatConfig,
  parseFormat,
} from "./BaseConnection";
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

const DEFAULT_LIVEKIT_WS_URL = "wss://livekit.rtc.elevenlabs.io";

export type ConnectionConfig = SessionConfig & {
  onDebug?: (info: unknown) => void;
};

export class WebRTCConnection extends BaseConnection {
  public conversationId: string;
  public readonly inputFormat: FormatConfig;
  public readonly outputFormat: FormatConfig;

  private room: Room;
  private isConnected = false;

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
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${config.agentId}`
        );

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
      const conversationId = `webrtc-${Date.now()}`;
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

      // Update conversation ID with actual room name if available
      if (room.name) {
        connection.conversationId = room.name;
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
    this.room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant) => {
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
    });

    this.room.on(
      RoomEvent.TrackSubscribed,
      async (
        track: Track,
        publication: TrackPublication,
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
        }
      }
    );
  }

  public close() {
    if (this.isConnected) {
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
}
