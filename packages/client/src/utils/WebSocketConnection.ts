import {
  BaseConnection,
  type SessionConfig,
  type FormatConfig,
  parseFormat,
} from "./BaseConnection.js";
import { sourceInfo } from "../sourceInfo.js";
import {
  type ConfigEvent,
  isValidSocketEvent,
  type OutgoingSocketEvent,
  type IncomingSocketEvent,
} from "./events.js";
import { constructOverrides } from "./overrides.js";
import { constructEnclaveSetupConfig } from "./orchestrator.js";
import { SessionConnectionError } from "./errors.js";
import {
  createSessionAbortError,
  throwIfSessionAborted,
} from "./cancellation.js";
import type {
  OutputEventTarget,
  OutputListener,
  OutputAudioEvent,
} from "../OutputController.js";

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
  private pendingAudioEvents: OutputAudioEvent[] = [];
  private isClosed = false;

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
            context: { type: event.type },
          }),
        0
      );
    });

    this.socket.addEventListener("close", event => {
      const closeCode = event.code;
      const closeReason = event.reason || undefined;
      const context = {
        type: event.type,
        code: closeCode,
        reason: closeReason,
      };
      this.disconnect(
        closeCode === 1000
          ? { reason: "agent", context, closeCode, closeReason }
          : {
              reason: "error",
              message:
                closeReason || "The connection was closed by the server.",
              context,
              closeCode,
              closeReason,
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
    throwIfSessionAborted(config.signal);

    let socket: WebSocket | null = null;
    let startupCancelled = false;

    try {
      let url: string;
      let protocols: string[] | undefined;

      const { name: source, version } = sourceInfo;

      if (config.orchestrator) {
        // Self-hosted orchestrators don't negotiate subprotocols; requesting one makes browsers fail the connection.
        url = config.orchestrator.url;
      } else {
        const origin = config.origin ?? WSS_API_ORIGIN;

        if (config.signedUrl) {
          const separator = config.signedUrl.includes("?") ? "&" : "?";
          url = `${config.signedUrl}${separator}source=${source}&version=${version}`;
        } else {
          url = `${origin}${WSS_API_PATHNAME}${config.agentId}&source=${source}&version=${version}`;
        }

        if (config.environment) {
          url += `&environment=${encodeURIComponent(config.environment)}`;
        }

        protocols = [MAIN_PROTOCOL];
        if (config.authorization) {
          protocols.push(`bearer.${config.authorization}`);
        }
      }

      const handshake = await new Promise<{
        socket: WebSocket;
        conversationConfig: ConfigEvent["conversation_initiation_metadata_event"];
      }>((resolve, reject) => {
        let settled = false;
        const settle = (callback: () => void) => {
          if (settled) return;
          settled = true;
          config.signal?.removeEventListener("abort", onAbort);
          callback();
        };

        const onAbort = () => {
          if (settled) return;
          startupCancelled = true;
          socket?.close();
          settle(() => reject(createSessionAbortError()));
        };

        config.signal?.addEventListener("abort", onAbort, { once: true });
        if (config.signal?.aborted) {
          onAbort();
          return;
        }

        let ws: WebSocket;
        try {
          ws = new WebSocket(url, protocols);
        } catch (error) {
          settle(() => reject(error));
          return;
        }
        socket = ws;

        ws.addEventListener(
          "open",
          () => {
            if (startupCancelled) {
              socket?.close();
              return;
            }

            if (config.orchestrator) {
              socket?.send(
                JSON.stringify(constructEnclaveSetupConfig(config.orchestrator))
              );
            }

            const overridesEvent = constructOverrides(config);

            socket?.send(JSON.stringify(overridesEvent));
          },
          { once: true }
        );

        ws.addEventListener("error", event => {
          // In case the error event is followed by a close event, we want the
          // latter to be the one that rejects the promise as it contains more
          // useful information.
          setTimeout(() => {
            if (startupCancelled) return;
            settle(() =>
              reject(
                new SessionConnectionError(
                  "The connection was closed due to a socket error."
                )
              )
            );
          }, 0);
        });

        ws.addEventListener("close", (event: CloseEvent) => {
          if (startupCancelled) return;
          const message =
            event.reason ||
            (event.code === 1000
              ? "Connection closed normally before session could be established."
              : "Connection closed unexpectedly before session could be established.");
          settle(() =>
            reject(
              new SessionConnectionError(message, {
                closeCode: event.code,
                closeReason: event.reason || undefined,
              })
            )
          );
        });

        ws.addEventListener(
          "message",
          (event: MessageEvent) => {
            if (startupCancelled) return;

            const message = JSON.parse(event.data);

            if (!isValidSocketEvent(message)) {
              return;
            }

            if (message.type === "conversation_initiation_metadata") {
              settle(() =>
                resolve({
                  socket: ws,
                  conversationConfig:
                    message.conversation_initiation_metadata_event,
                })
              );
            } else {
              console.warn(
                "First received message is not conversation metadata."
              );
            }
          },
          { once: true }
        );
      });

      const { socket: connectedSocket, conversationConfig } = handshake;
      // The executor assigns this too, so a rejected handshake still closes its
      // socket; repeating it here is what lets the catch below see a WebSocket.
      socket = connectedSocket;

      const {
        conversation_id,
        agent_output_audio_format,
        user_input_audio_format,
      } = conversationConfig;

      const inputFormat = parseFormat(user_input_audio_format ?? "pcm_16000");
      const outputFormat = parseFormat(agent_output_audio_format);

      return new WebSocketConnection(
        connectedSocket,
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
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    this.pendingAudioEvents = [];
    this.socket.close(1000, "User ended conversation");
  }

  public sendMessage(message: OutgoingSocketEvent) {
    this.handleOutgoingMessage(message);
    this.socket.send(JSON.stringify(message));
  }

  public addListener(listener: OutputListener): void {
    const hadListeners = this.outputListeners.size > 0;
    this.outputListeners.add(listener);
    if (hadListeners || this.pendingAudioEvents.length === 0) {
      return;
    }
    const pending = this.pendingAudioEvents;
    this.pendingAudioEvents = [];
    for (const event of pending) {
      listener(event);
    }
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
      if (this.outputListeners.size === 0) {
        this.pendingAudioEvents.push(audioEvent);
        return;
      }
      this.outputListeners.forEach(listener => listener(audioEvent));
    }
  }
}
