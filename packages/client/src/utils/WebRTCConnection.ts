import {
  BaseConnection,
  SessionConfig,
  FormatConfig,
  parseFormat,
} from "./BaseConnection";
import {
  InitiationClientDataEvent,
  isValidSocketEvent,
  OutgoingSocketEvent,
} from "./events";
import {
  Room,
  RoomEvent,
  Track,
  TrackEvent,
  RemoteAudioTrack,
  ConnectionState,
  type Participant,
  type TrackPublication,
} from "livekit-client";
import { loadPcmExtractorProcessor } from "./pcmExtractorProcessor";

const LIVEKIT_WS_URL = "wss://livekit.rtc.elevenlabs.io";

export class WebRTCConnection extends BaseConnection {
  public readonly conversationId: string;
  public readonly inputFormat: FormatConfig;
  public readonly outputFormat: FormatConfig;

  private room: Room;
  private isConnected: boolean = false;

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
      const inputFormat = parseFormat("pcm_16000");
      const outputFormat = parseFormat("pcm_16000");
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
        (connection as any).conversationId = room.name;
      }
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

      // Wait before enabling microphone
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log("Enabling microphone and publishing audio track");
      await room.localParticipant.setMicrophoneEnabled(true);

      return connection;
    } catch (error) {
      await room.disconnect();
      throw error;
    }
  }

  private setupRoomEventListeners() {
    this.room.on(RoomEvent.Connected, async () => {
      this.isConnected = true;

      console.log(this.room);
    });

    this.room.on(RoomEvent.Disconnected, reason => {
      this.isConnected = false;
      this.disconnect({
        reason: "agent",
        context: new CloseEvent("close", { reason: reason?.toString() }),
      });
    });

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

    // Add error handling for the room
    this.room.on(RoomEvent.RoomMetadataChanged, metadata => {
      console.log("Room metadata changed:", metadata);
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      console.log("Room reconnecting...");
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log("Room reconnected");
    });

    // Handle participant connections
    this.room.on(RoomEvent.ParticipantConnected, participant => {
      console.log(
        "Participant connected:",
        participant.identity,
        participant.name
      );
    });

    this.room.on(RoomEvent.ParticipantDisconnected, participant => {
      console.log("Participant disconnected:", participant.identity);
    });

    // Handle incoming data messages
    this.room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant) => {
      console.log(
        "Data received from participant:",
        participant?.identity,
        "payload size:",
        payload.length
      );
      try {
        const message = JSON.parse(new TextDecoder().decode(payload));
        console.log("Parsed message:", message);
        if (isValidSocketEvent(message)) {
          // Filter out audio messages for WebRTC - they're handled via audio tracks
          if (message.type === "audio") {
            console.log("Ignoring audio data message - handled via WebRTC track");
            return; 
          }
          this.handleMessage(message);
        } else {
          console.warn("Invalid socket event received:", message);
        }
      } catch (error) {
        console.warn("Failed to parse incoming data message:", error);
        console.warn("Raw payload:", new TextDecoder().decode(payload));
      }
    });

    // Handle agent audio tracks
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
          console.log("Agent audio track detected!");
        }
      }
    );
  }
  public close() {
    if (this.isConnected) {
      console.log(this.room);
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

    try {
      console.log("sending message", message);

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));

      await this.room.localParticipant.publishData(data);
      console.log("Message sent successfully");
    } catch (error) {
      console.error("Failed to send message via WebRTC:", error);
      console.error("Error details:", error);
    }
  }

  public async publishAudioTrack(track?: MediaStreamTrack) {
    if (!this.room.localParticipant) {
      throw new Error("No local participant available");
    }

    try {
      if (track) {
        console.log("Publishing provided audio track");
        await this.room.localParticipant.publishTrack(track);
      } else {
        console.log("Requesting microphone access...");
        // Create audio track from microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const audioTrack = stream.getAudioTracks()[0];
        console.log(
          "Audio track created:",
          audioTrack.label,
          "enabled:",
          audioTrack.enabled
        );
        await this.room.localParticipant.publishTrack(audioTrack);
        console.log("Audio track published successfully");
      }
    } catch (error) {
      console.error("Failed to publish audio track:", error);
      throw error;
    }
  }

  // Get the room instance for advanced usage
  public getRoom(): Room {
    return this.room;
  }
}
