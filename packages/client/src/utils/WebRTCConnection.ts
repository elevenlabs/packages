import {
  BaseConnection,
  type SessionConfig,
  type FormatConfig,
  parseFormat,
} from "./BaseConnection";
import {
  type InitiationClientDataEvent,
  isValidSocketEvent,
  type OutgoingSocketEvent,
} from "./events";
import { Room, RoomEvent, Track, ConnectionState } from "livekit-client";
import type {
  RemoteAudioTrack,
  Participant,
  TrackPublication,
} from "livekit-client";

const LIVEKIT_WS_URL = "wss://livekit.rtc.elevenlabs.io";

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
    outputFormat: FormatConfig
  ) {
    super();
    this.room = room;
    this.conversationId = conversationId;
    this.inputFormat = inputFormat;
    this.outputFormat = outputFormat;

    this.setupRoomEventListeners();
  }

  public static async create(config: SessionConfig): Promise<WebRTCConnection> {
    if (!("conversationToken" in config) || !config.conversationToken) {
      throw new Error("Conversation token is required for WebRTC connection");
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
        outputFormat
      );

      // Connect to the LiveKit room and wait for the Connected event
      await room.connect(LIVEKIT_WS_URL, config.conversationToken);

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

      // Step 2: Publish local audio track
      console.log("Enabling microphone and publishing audio track");
      await room.localParticipant.setMicrophoneEnabled(true);

      // await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Send one-off conversation_initiation_client_data message
      console.log("Sending initial configuration...");
      const overridesEvent: InitiationClientDataEvent = {
        type: "conversation_initiation_client_data",
      };

      if (config.overrides) {
        overridesEvent.conversation_config_override = {
          agent: {
            prompt: config.overrides.agent?.prompt,
            first_message: config.overrides.agent?.firstMessage,
            language: config.overrides.agent?.language,
          },
          tts: {
            voice_id: config.overrides.tts?.voiceId,
          },
          conversation: {
            text_only: config.overrides.conversation?.textOnly,
          },
        };
      }

      if (config.customLlmExtraBody) {
        overridesEvent.custom_llm_extra_body = config.customLlmExtraBody;
      }

      if (config.dynamicVariables) {
        overridesEvent.dynamic_variables = config.dynamicVariables;
      }

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
      console.log("WebRTC room connected");
    });

    this.room.on(RoomEvent.Disconnected, reason => {
      this.isConnected = false;
      this.disconnect({
        reason: "agent",
        context: new CloseEvent("close", { reason: reason?.toString() }),
      });
    });

    this.room.on(
      RoomEvent.TrackSubscriptionStatusChanged,
      (track, publication, participant) => {
        console.log(
          "Track subscription status changed:",
          track.kind,
          publication,
          participant.identity
        );
      }
    );

    this.room.on(RoomEvent.ConnectionStateChanged, state => {
      console.log("Connection state changed to:", state);
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

        console.log("Data received:", message);

        // Filter out audio messages for WebRTC - they're handled via audio tracks
        if (message.type === "audio") {
          console.log("Ignoring audio data message - handled via WebRTC track");
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

    // Step 4: Handle agent audio tracks and play them
    this.room.on(
      RoomEvent.TrackSubscribed,
      async (
        track: Track,
        publication: TrackPublication,
        participant: Participant
      ) => {
        console.log(
          "TrackSubscribed - track:",
          track.kind,
          "participant:",
          participant.identity
        );

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

      console.log("Sending message:", message);

      await this.room.localParticipant.publishData(data, { reliable: true });
    } catch (error) {
      console.error("Failed to send message via WebRTC:", error);
      console.error("Error details:", error);
    }
  }

  // Get the room instance for advanced usage
  public getRoom(): Room {
    return this.room;
  }
}
