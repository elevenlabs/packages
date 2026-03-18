import {
  BaseConnection,
  type SessionConfig,
  type FormatConfig,
  parseFormat,
} from "./BaseConnection";
import { sourceInfo } from "../internal";
import {
  type ConfigEvent,
  isValidSocketEvent,
  type OutgoingSocketEvent,
  type IncomingSocketEvent,
} from "./events";
import { constructOverrides } from "./overrides";
import { SessionConnectionError } from "./errors";
import type { OutputEventTarget, OutputListener } from "./output";

const MAIN_PROTOCOL = "convai";
const WSS_API_ORIGIN = "wss://api.elevenlabs.io";
const WSS_API_PATHNAME = "/v1/convai/conversation?agent_id=";

export class WebSocketConnection
  extends BaseConnection
  implements OutputEventTarget
{
  public readonly conversationId: string;
  public readonly inputFormat: FormatConfig;
  public readonly outputFormat: FormatConfig;

  private outputListeners: Set<OutputListener> = new Set();

  private constructor(
    private readonly socket: WebSocket,
    conversationId: string,
    inputFormat: FormatConfig,
    outputFormat: FormatConfig
  ) {
    super();
    this.conversationId = conversationId;
    this.inputFormat = inputFormat;
    this.outputFormat = outputFormat;

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
              closeCode: event.code,
              closeReason: event.reason || undefined,
            }
          : {
              reason: "error",
              message:
                event.reason || "The connection was closed by the server.",
              context: event,
              closeCode: event.code,
              closeReason: event.reason || undefined,
            }
      );
    });

    this.socket.addEventListener("message", event => {
      try {
        const parsedEvent = JSON.parse(event.data);
        if (!isValidSocketEvent(parsedEvent)) {
          this.debug({
            type: "invalid_event",
            message: "Received invalid socket event",
            data: event.data,
          });
          return;
        }
        this.handleMessage(parsedEvent);
      } catch (error) {
        this.debug({
          type: "parsing_error",
          message: "Failed to parse socket message",
          error: error instanceof Error ? error.message : String(error),
          data: event.data,
        });
      }
    });
  }

  public static async create(
    config: SessionConfig
  ): Promise<WebSocketConnection> {
    let socket: WebSocket | null = null;

    try {
      const origin = config.origin ?? WSS_API_ORIGIN;
      let url: string;

      const { name: source, version } = sourceInfo;

      if (config.signedUrl) {
        const separator = config.signedUrl.includes("?") ? "&" : "?";
        url = `${config.signedUrl}${separator}source=${source}&version=${version}`;
      } else {
        url = `${origin}${WSS_API_PATHNAME}${config.agentId}&source=${source}&version=${version}`;
      }

      const protocols = [MAIN_PROTOCOL];
      if (config.authorization) {
        protocols.push(`bearer.${config.authorization}`);
      }
      socket = new WebSocket(url, protocols);

      const conversationConfig = await new Promise<
        ConfigEvent["conversation_initiation_metadata_event"]
      >((resolve, reject) => {
        socket!.addEventListener(
          "open",
          () => {
            const overridesEvent = constructOverrides(config);

            socket?.send(JSON.stringify(overridesEvent));
          },
          { once: true }
        );

        socket!.addEventListener("error", event => {
          // In case the error event is followed by a close event, we want the
          // latter to be the one that rejects the promise as it contains more
          // useful information.
          setTimeout(
            () =>
              reject(
                new SessionConnectionError(
                  "The connection was closed due to a socket error."
                )
              ),
            0
          );
        });

        socket!.addEventListener("close", (event: CloseEvent) => {
          const message =
            event.reason ||
            (event.code === 1000
              ? "Connection closed normally before session could be established."
              : "Connection closed unexpectedly before session could be established.");
          reject(
            new SessionConnectionError(message, {
              closeCode: event.code,
              closeReason: event.reason || undefined,
            })
          );
        });

        socket!.addEventListener(
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
                "First received message is not conversation metadata."
              );
            }
          },
          { once: true }
        );
      });

      const {
        conversation_id,
        agent_output_audio_format,
        user_input_audio_format,
      } = conversationConfig;

      const inputFormat = parseFormat(user_input_audio_format ?? "pcm_16000");
      const outputFormat = parseFormat(agent_output_audio_format);

      return new WebSocketConnection(
        socket,
        conversation_id,
        inputFormat,
        outputFormat
      );
    } catch (error) {
      socket?.close();
      throw error;
    }
  }

  public close() {
    this.socket.close(1000, "User ended conversation");
  }

  public sendMessage(message: OutgoingSocketEvent) {
    this.socket.send(JSON.stringify(message));
  }

  public addListener(listener: OutputListener): void {
    this.outputListeners.add(listener);
  }

  public removeListener(listener: OutputListener): void {
    this.outputListeners.delete(listener);
  }

  protected override handleMessage(parsedEvent: IncomingSocketEvent) {
    super.handleMessage(parsedEvent);

    // Emit audio events to output listeners
    if (parsedEvent.type === "audio" && parsedEvent.audio_event.audio_base_64) {
      const audioEvent = {
        audio_base_64: parsedEvent.audio_event.audio_base_64,
      };
      this.outputListeners.forEach(listener => listener(audioEvent));
    }
  }
}
