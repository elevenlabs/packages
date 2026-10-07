import {
  BaseConnection,
  type FormatConfig,
  type RealtimeSessionConfig,
} from "./BaseConnection.js";
import { sourceInfo } from "../sourceInfo.js";
import type { IncomingSocketEvent, OutgoingSocketEvent } from "./events.js";
import { SessionConnectionError } from "./errors.js";
import {
  RealtimeProtocolTranslator,
  type RealtimeClientEvent,
  type RealtimeServerEvent,
} from "./realtimeProtocol.js";
import {
  assertRealtimeConfigSupported,
  constructRealtimeSessionUpdate,
  fromWireAudioFormat,
  toNativeAudioFormat,
} from "./realtimeSession.js";
import type {
  OutputEventTarget,
  OutputListener,
  OutputAudioEvent,
} from "../OutputController.js";

const WSS_API_ORIGIN = "wss://api.elevenlabs.io";
const WSS_API_PATHNAME = "/v1/convai/realtime";
const MAIN_PROTOCOL = "realtime";
const CLIENT_SECRET_PROTOCOL_PREFIX = "openai-insecure-api-key.";
const REALTIME_DISABLED_CLOSE_CODE = 4003;

type EffectiveSession = {
  id: string;
  inputFormat: FormatConfig;
  outputFormat: FormatConfig;
  interruptOnSpeech: boolean;
};

/**
 * Speaks the OpenAI-compatible Realtime protocol to `/v1/convai/realtime`
 * and exposes it to conversations as the native event stream.
 * @experimental
 */
export class WebSocketRealtimeConnection
  extends BaseConnection
  implements OutputEventTarget
{
  public readonly conversationId: string;
  public readonly inputFormat: FormatConfig;
  public readonly outputFormat: FormatConfig;

  private readonly translator: RealtimeProtocolTranslator;
  private outputListeners: Set<OutputListener> = new Set();
  private pendingAudioEvents: OutputAudioEvent[] = [];

  private constructor(
    private readonly socket: WebSocket,
    session: EffectiveSession
  ) {
    super();
    this.conversationId = session.id;
    this.inputFormat = session.inputFormat;
    this.outputFormat = session.outputFormat;
    this.translator = new RealtimeProtocolTranslator({
      outputFormat: session.outputFormat,
      interruptOnSpeech: session.interruptOnSpeech,
      emit: event => this.handleMessage(event),
      send: event => this.sendRealtimeEvent(event),
      debug: info => this.debug(info),
    });

    // The Realtime endpoint never sends initiation metadata, but
    // conversations and `onConversationMetadata` consumers expect it first.
    this.handleMessage({
      type: "conversation_initiation_metadata",
      conversation_initiation_metadata_event: {
        conversation_id: session.id,
        agent_output_audio_format: toNativeAudioFormat(session.outputFormat),
        user_input_audio_format: toNativeAudioFormat(session.inputFormat),
      },
    });

    this.socket.addEventListener("error", event => {
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
              message: describeClose(closeCode, closeReason),
              context,
              closeCode,
              closeReason,
            }
      );
    });

    this.socket.addEventListener("message", event => {
      const parsed = parseServerEvent(event.data);
      if (!parsed) {
        this.debug({
          type: "invalid_event",
          message: "Received invalid realtime event",
          data: event.data,
        });
        return;
      }
      this.translator.handleServerEvent(parsed);
    });
  }

  public static async create(
    config: RealtimeSessionConfig
  ): Promise<WebSocketRealtimeConnection> {
    assertRealtimeConfigSupported(config);

    const { name: source, version } = sourceInfo;
    const origin = config.origin ?? WSS_API_ORIGIN;
    const url = `${origin}${WSS_API_PATHNAME}?source=${source}&version=${version}`;
    const protocols = [
      MAIN_PROTOCOL,
      `${CLIENT_SECRET_PROTOCOL_PREFIX}${config.clientSecret}`,
    ];

    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(url, protocols);
      const session = await performHandshake(socket, config);
      return new WebSocketRealtimeConnection(socket, session);
    } catch (error) {
      socket?.close();
      throw error;
    }
  }

  public close() {
    this.pendingAudioEvents = [];
    this.socket.close(1000, "User ended conversation");
  }

  public sendMessage(message: OutgoingSocketEvent) {
    this.translator.handleOutgoingEvent(message);
    this.handleOutgoingMessage(message);
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

  private sendRealtimeEvent(event: RealtimeClientEvent) {
    this.socket.send(JSON.stringify(event));
  }
}

/**
 * Waits for `session.created`, applies the SDK's session configuration and
 * resolves with the configuration the server reports back in
 * `session.updated`, which is the one actually in effect.
 */
function performHandshake(
  socket: WebSocket,
  config: RealtimeSessionConfig
): Promise<EffectiveSession> {
  const sessionUpdate = constructRealtimeSessionUpdate(config);
  const requested = config.realtime ?? {};

  return new Promise<EffectiveSession>((resolve, reject) => {
    let sessionId: string | null = null;
    // Handshake listeners stay attached for the socket's lifetime, as on the
    // native WebSocket connection; once settled they are no-ops.
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    socket.addEventListener("message", (event: MessageEvent) => {
      if (settled) return;
      const message = parseServerEvent(event.data);
      if (!message) return;

      switch (message.type) {
        case "session.created": {
          sessionId = message.session?.id ?? null;
          socket.send(JSON.stringify(sessionUpdate));
          return;
        }
        case "session.updated": {
          const session = message.session ?? {};
          const id = sessionId ?? session.id;
          if (!id) {
            fail(
              new SessionConnectionError(
                "The Realtime endpoint did not report a session id."
              )
            );
            return;
          }
          try {
            const turnDetection = session.audio?.input?.turn_detection;
            const effective: EffectiveSession = {
              id,
              inputFormat: fromWireAudioFormat(
                session.audio?.input?.format,
                requested.inputAudioFormat ?? "pcm_24000"
              ),
              outputFormat: fromWireAudioFormat(
                session.audio?.output?.format,
                requested.outputAudioFormat ?? "pcm_24000"
              ),
              interruptOnSpeech:
                turnDetection?.interrupt_response ??
                requested.turnDetection?.interruptResponse ??
                true,
            };
            settled = true;
            resolve(effective);
          } catch (error) {
            fail(error);
          }
          return;
        }
        case "error": {
          fail(
            new SessionConnectionError(
              message.error?.message ??
                "The Realtime endpoint rejected the session."
            )
          );
          return;
        }
      }
    });

    socket.addEventListener("error", () => {
      // In case the error event is followed by a close event, we want the
      // latter to be the one that rejects the promise as it contains more
      // useful information.
      setTimeout(
        () =>
          fail(
            new SessionConnectionError(
              "The connection was closed due to a socket error."
            )
          ),
        0
      );
    });

    socket.addEventListener("close", (event: CloseEvent) => {
      const message =
        event.reason || event.code === REALTIME_DISABLED_CLOSE_CODE
          ? describeClose(event.code, event.reason || undefined)
          : event.code === 1000
            ? "Connection closed normally before session could be established."
            : "Connection closed unexpectedly before session could be established.";
      fail(
        new SessionConnectionError(message, {
          closeCode: event.code,
          closeReason: event.reason || undefined,
        })
      );
    });
  });
}

function describeClose(code: number, reason: string | undefined): string {
  if (reason) return reason;
  if (code === REALTIME_DISABLED_CLOSE_CODE) {
    return "The Realtime API is not enabled for this workspace.";
  }
  return "The connection was closed by the server.";
}

function parseServerEvent(data: unknown): RealtimeServerEvent | null {
  if (typeof data !== "string") return null;
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed.type === "string" ? parsed : null;
  } catch {
    return null;
  }
}
