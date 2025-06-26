import {
  InitiationClientDataEvent,
  ConfigEvent,
  isValidSocketEvent,
  OutgoingSocketEvent,
  IncomingSocketEvent,
} from "./events";

const MAIN_PROTOCOL = "convai";

export type Language =
  | "en"
  | "ja"
  | "zh"
  | "de"
  | "hi"
  | "fr"
  | "ko"
  | "pt"
  | "pt-br"
  | "it"
  | "es"
  | "id"
  | "nl"
  | "tr"
  | "pl"
  | "sv"
  | "bg"
  | "ro"
  | "ar"
  | "cs"
  | "el"
  | "fi"
  | "ms"
  | "da"
  | "ta"
  | "uk"
  | "ru"
  | "hu"
  | "hr"
  | "sk"
  | "no"
  | "vi";
export type DelayConfig = {
  default: number;
  android?: number;
  ios?: number;
};
export type SessionConfig = {
  origin?: string;
  authorization?: string;
  overrides?: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
      firstMessage?: string;
      language?: Language;
    };
    tts?: {
      voiceId?: string;
    };
    conversation?: {
      textOnly?: boolean;
    };
  };
  customLlmExtraBody?: any;
  dynamicVariables?: Record<string, string | number | boolean>;
  useWakeLock?: boolean;
  connectionDelay?: DelayConfig;
  textOnly?: boolean;
} & (
  | { signedUrl: string; agentId?: undefined }
  | { agentId: string; signedUrl?: undefined }
);
export type FormatConfig = {
  format: "pcm" | "ulaw";
  sampleRate: number;
};
export type DisconnectionDetails =
  | {
      reason: "error";
      message: string;
      context: Event;
    }
  | {
      reason: "agent";
      context: CloseEvent;
    }
  | {
      reason: "user";
    };
export type OnDisconnectCallback = (details: DisconnectionDetails) => void;
export type OnMessageCallback = (event: IncomingSocketEvent) => void;

const WSS_API_ORIGIN = "wss://api.elevenlabs.io";
const WSS_API_PATHNAME = "/v1/convai/conversation?agent_id=";

export class Connection {
  public static async create(config: SessionConfig): Promise<Connection> {
    let socket: WebSocket | null = null;

    try {
      const origin = config.origin ?? WSS_API_ORIGIN;
      const url = config.signedUrl
        ? config.signedUrl
        : origin + WSS_API_PATHNAME + config.agentId;

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

            socket?.send(JSON.stringify(overridesEvent));
          },
          { once: true }
        );
        socket!.addEventListener("error", event => {
          // In case the error event is followed by a close event, we want the
          // latter to be the one that rejects the promise as it contains more
          // useful information.
          setTimeout(() => reject(event), 0);
        });
        socket!.addEventListener("close", reject);
        socket!.addEventListener(
          "message",
          (event: MessageEvent) => {
            const message = JSON.parse(event.data);

            console.log("message", message);

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

      return new Connection(socket, conversation_id, inputFormat, outputFormat);
    } catch (error) {
      socket?.close();
      throw error;
    }
  }

  private queue: IncomingSocketEvent[] = [];
  private disconnectionDetails: DisconnectionDetails | null = null;
  private onDisconnectCallback: OnDisconnectCallback | null = null;
  private onMessageCallback: OnMessageCallback | null = null;

  private constructor(
    public readonly socket: WebSocket,
    public readonly conversationId: string,
    public readonly inputFormat: FormatConfig,
    public readonly outputFormat: FormatConfig
  ) {
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

  public close() {
    this.socket.close();
  }

  public sendMessage(message: OutgoingSocketEvent) {
    this.socket.send(JSON.stringify(message));
  }

  public onMessage(callback: OnMessageCallback) {
    this.onMessageCallback = callback;
    const queue = this.queue;
    this.queue = [];

    if (queue.length > 0) {
      // Make sure the queue is flushed after the constructors finishes and
      // classes are initialized.
      queueMicrotask(() => {
        queue.forEach(callback);
      });
    }
  }

  public onDisconnect(callback: OnDisconnectCallback) {
    this.onDisconnectCallback = callback;
    const details = this.disconnectionDetails;
    if (details) {
      // Make sure the event is triggered after the constructors finishes and
      // classes are initialized.
      queueMicrotask(() => {
        callback(details);
      });
    }
  }

  private disconnect(details: DisconnectionDetails) {
    if (!this.disconnectionDetails) {
      this.disconnectionDetails = details;
      this.onDisconnectCallback?.(details);
    }
  }
}

function parseFormat(format: string): FormatConfig {
  const [formatPart, sampleRatePart] = format.split("_");
  if (!["pcm", "ulaw"].includes(formatPart)) {
    throw new Error(`Invalid format: ${format}`);
  }

  const sampleRate = parseInt(sampleRatePart);
  if (isNaN(sampleRate)) {
    throw new Error(`Invalid sample rate: ${sampleRatePart}`);
  }

  return {
    format: formatPart as FormatConfig["format"],
    sampleRate,
  };
}
