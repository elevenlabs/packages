import { isValidSocketEvent } from "../events";
import type {
	ConnectionInterface,
	FormatConfig,
	OnDisconnectCallback,
	OnMessageCallback,
	SessionConfig,
} from "./connection.interface";
import { Connection } from "./connection";
import type { ConfigEvent, IncomingSocketEvent, OutgoingSocketEvent } from "../events";

export class WSSConnection extends Connection implements ConnectionInterface {
	private static readonly WSS_API_ORIGIN = "wss://api.elevenlabs.io";
	private static readonly WSS_API_PATHNAME = "/v1/convai/conversation?agent_id=";
	private static readonly MAIN_PROTOCOL = "convai";
	protected queue: IncomingSocketEvent[] = [];

	public static async create(config: SessionConfig): Promise<WSSConnection> {
		let socket: WebSocket | null = null;

		try {
			const origin = config.origin ?? WSSConnection.WSS_API_ORIGIN;
			const url = config.signedUrl
				? config.signedUrl
				: origin + WSSConnection.WSS_API_PATHNAME + config.agentId;

			const protocols = [WSSConnection.MAIN_PROTOCOL];
			if (config.authorization) {
				protocols.push(`bearer.${config.authorization}`);
			}
			socket = new WebSocket(url, protocols);
			const conversationConfig = await new Promise<
				ConfigEvent["conversation_initiation_metadata_event"]
			>((resolve, reject) => {
				if (!socket) {
					reject(new Error("Socket is not initialized"));
					return;
				}

				socket.addEventListener(
					"open",
					() => {
						const overridesEvent = Connection.getOverridesEvent(config);

						if (!socket) return;
						socket.send(JSON.stringify(overridesEvent));
					},
					{ once: true },
				);
				socket.addEventListener("error", (event) => {
					// In case the error event is followed by a close event, we want the
					// latter to be the one that rejects the promise as it contains more
					// useful information.
					setTimeout(() => reject(event), 0);
				});
				socket.addEventListener("close", reject);
				socket.addEventListener(
					"message",
					(event: MessageEvent) => {
						const message = JSON.parse(event.data);

						if (!isValidSocketEvent(message)) {
							return;
						}

						if (message.type === "conversation_initiation_metadata") {
							resolve(message.conversation_initiation_metadata_event);
						} else {
							console.warn(
								"First received message is not conversation metadata.",
							);
						}
					},
					{ once: true },
				);
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

			return new WSSConnection(
				socket,
				conversation_id,
				inputFormat,
				outputFormat,
			);
		} catch (error) {
			socket?.close();
			throw error;
		}
	}

  private constructor(
    public readonly socket: WebSocket,
    public readonly conversationId: string,
    public readonly inputFormat: FormatConfig,
    public readonly outputFormat: FormatConfig
  ) {
    super(socket, conversationId, inputFormat, outputFormat);

    this.socket.addEventListener("error", event => {
      // In case the error event is followed by a close event, we want the
      // latter to be the one that disconnects the session as it contains more
      // useful information.
      setTimeout(
        () =>
          this.disconnect({
            reason: "error",
            message: "The connection was closed due to a socket error.",
            context: event,
          }),
        0
      );
    });
    this.socket.addEventListener("close", event => {
      this.disconnect(
        event.code === 1000
          ? {
              reason: "agent",
              context: event,
            }
          : {
              reason: "error",
              message:
                event.reason || "The connection was closed by the server.",
              context: event,
            }
      );
    });
    this.socket.addEventListener("message", event => {
      try {
        const parsedEvent = JSON.parse(event.data);
        if (!isValidSocketEvent(parsedEvent)) {
          return;
        }

        if (this.onMessageCallback) {
          this.onMessageCallback(parsedEvent);
        } else {
          this.queue.push(parsedEvent);
        }
      } catch (_) {}
    });
  }

  async create(config: SessionConfig): Promise<Connection> {
    return WSSConnection.create(config);
  }

  close() {
    this.socket.close();
  }

  sendMessage(message: OutgoingSocketEvent) {
    this.socket.send(JSON.stringify(message));
  }

  onMessage(callback: OnMessageCallback) {
    this.onMessageCallback = callback;
    this.queue.forEach(callback);
    this.queue = [];
  }

  onDisconnect(callback: OnDisconnectCallback) {
    this.onDisconnectCallback = callback;
    if (this.disconnectionDetails) {
      callback(this.disconnectionDetails);
    }
  }
}
