import type { IncomingSocketEvent, OutgoingSocketEvent } from "./events";

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

export type BaseSessionConfig = {
  origin?: string;
  authorization?: string;
  livekitUrl?: string;
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
  customLlmExtraBody?: unknown;
  dynamicVariables?: Record<string, string | number | boolean>;
  useWakeLock?: boolean;
  connectionDelay?: DelayConfig;
  textOnly?: boolean;
  connectionType?: ConnectionType;
};

export type ConnectionType = "websocket" | "webrtc";

export type SessionConfig = BaseSessionConfig & {
  agentId?: string;
  signedUrl?: string;
  conversationToken?: string;
};

export abstract class BaseConnection {
  public abstract readonly conversationId: string;
  public abstract readonly inputFormat: FormatConfig;
  public abstract readonly outputFormat: FormatConfig;

  protected queue: IncomingSocketEvent[] = [];
  protected disconnectionDetails: DisconnectionDetails | null = null;
  protected onDisconnectCallback: OnDisconnectCallback | null = null;
  protected onMessageCallback: OnMessageCallback | null = null;
  protected onDebug?: (info: unknown) => void;

  constructor(config: { onDebug?: (info: unknown) => void } = {}) {
    this.onDebug = config.onDebug;
  }

  protected debug(info: unknown) {
    if (this.onDebug) this.onDebug(info);
  }

  public abstract close(): void;
  public abstract sendMessage(message: OutgoingSocketEvent): void;

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

  protected disconnect(details: DisconnectionDetails) {
    if (!this.disconnectionDetails) {
      this.disconnectionDetails = details;
      this.onDisconnectCallback?.(details);
    }
  }

  protected handleMessage(parsedEvent: IncomingSocketEvent) {
    if (this.onMessageCallback) {
      this.onMessageCallback(parsedEvent);
    } else {
      this.queue.push(parsedEvent);
    }
  }
}

export function parseFormat(format: string): FormatConfig {
  const [formatPart, sampleRatePart] = format.split("_");
  if (!["pcm", "ulaw"].includes(formatPart)) {
    throw new Error(`Invalid format: ${format}`);
  }

  const sampleRate = Number.parseInt(sampleRatePart);
  if (Number.isNaN(sampleRate)) {
    throw new Error(`Invalid sample rate: ${sampleRatePart}`);
  }

  return {
    format: formatPart as FormatConfig["format"],
    sampleRate,
  };
}
