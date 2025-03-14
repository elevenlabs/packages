import { RoomEvent, Track } from "livekit-client";
import { Room } from "livekit-client";
import { Connection } from "./connection";
import type {
	ConnectionInterface,
	FormatConfig,
	OnDisconnectCallback,
	OnMessageCallback,
	SessionConfig,
} from "./connection.interface";
import type { ConfigEvent, IncomingSocketEvent, OutgoingSocketEvent } from "../events";

export class WebRTCConnection
	extends Connection
	implements ConnectionInterface
{
	private static readonly WEBRTC_TOKEN_API_ORIGIN = "http://localhost:3000";
	private static readonly WEBRTC_TOKEN_PATHNAME = "/api/token";
	private static readonly WEBRTC_API_ORIGIN = "wss://livekit.rtc.eleven2.dev";

	public static async create(config: SessionConfig): Promise<WebRTCConnection> {
		let room: Room;

		try {
			// Get token from server
			const { token } = await fetch(
				`${WebRTCConnection.WEBRTC_TOKEN_API_ORIGIN}/${WebRTCConnection.WEBRTC_TOKEN_PATHNAME}?agent_id=${config.agentId}`,
			).then((res) => res.json());
			room = new Room();

			// if webrtc becomes the default, use the following on start up
			//await room.prepareConnection(WebRTConnection.WEBRTC_API_ORIGIN, token);

			await room.connect(WebRTCConnection.WEBRTC_API_ORIGIN, token, {
        autoSubscribe: true,
      });
		} catch (error) {
			console.error("Error getting token:", error);
			throw error;
		}

		const overridesEvent = Connection.getOverridesEvent(config);
		room.localParticipant.sendText(JSON.stringify(overridesEvent));

		// When the agent leaves the room
		room.on(RoomEvent.ParticipantDisconnected, (participant) => {
			console.log("Participant disconnected:", participant);
		});

		room.on(RoomEvent.Disconnected, () => {});

		const conversationConfig = await new Promise<
			ConfigEvent["conversation_initiation_metadata_event"]
		>((resolve, reject) => {
			room.registerTextStreamHandler(
				"conversation_initiation_metadata",
				(reader) => {
					reader.readAll()
						.then(text => {
							resolve(JSON.parse(text));
							room.unregisterTextStreamHandler("conversation_initiation_metadata");
						})
						.catch(reject);
				},
			);

      const overridesEvent = Connection.getOverridesEvent(config);

      room.localParticipant.sendText(JSON.stringify(overridesEvent), {
        topic: 'conversation_initiation_client_data',
      }).catch(reject);
		});

		const {
			conversation_id,
			agent_output_audio_format,
			user_input_audio_format,
		} = conversationConfig;

		const inputFormat = Connection.parseFormat(
			user_input_audio_format ?? "pcm_16000",
		);
		const outputFormat = Connection.parseFormat(agent_output_audio_format);

		return new WebRTCConnection(
			room,
			conversation_id,
			inputFormat,
			outputFormat,
		);
	}

	private constructor(
		public readonly room: Room,
		public readonly conversationId: string,
		public readonly inputFormat: FormatConfig,
		public readonly outputFormat: FormatConfig,
	) {
		super(room, conversationId, inputFormat, outputFormat);

    // publish mic track
		room.localParticipant.setMicrophoneEnabled(true);

    // set up event listeners
    room
      .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {

        }

      })
      .on(RoomEvent.ParticipantDisconnected, () => {
        this.disconnect({
          reason: "agent",
          context: new CloseEvent("Agent disconnected"),
        })
      })
	}

	async create(config: SessionConfig): Promise<Connection> {
		return WebRTCConnection.create(config);
	}

	close() {
		this.room.disconnect();
	}

	sendMessage(message: OutgoingSocketEvent) {
		this.room.localParticipant.sendText(JSON.stringify(message));
	}

	onMessage(callback: OnMessageCallback) {
		this.onMessageCallback = callback;

	}

	onDisconnect(callback: OnDisconnectCallback) {
		this.onDisconnectCallback = callback;
		if (this.disconnectionDetails) {
			callback(this.disconnectionDetails);
		}
	}
}
