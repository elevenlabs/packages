import type { RoomConnectOptions } from "livekit-client";
import type { IncomingSocketEvent, OutgoingSocketEvent } from "./events.js";
import type { Mode } from "../BaseConversation.js";
import type {
  ConversationConfigOverrideAgentPrompt,
  ConversationConfigOverrideAgentLanguage as Language,
} from "@elevenlabs/types";
import type { DisconnectionDetails } from "../types.js";

export type {
  ConversationConfigOverrideAgentPrompt,
  ConversationConfigOverrideAgentLanguage as Language,
} from "@elevenlabs/types";
export type { DisconnectionContext, DisconnectionDetails } from "../types.js";

export type DelayConfig = {
  default: number;
  android?: number;
  ios?: number;
};

export type FormatConfig = {
  format: "pcm" | "ulaw";
  sampleRate: number;
};

export type OnDisconnectCallback = (details: DisconnectionDetails) => void;
export type OnMessageCallback = (event: IncomingSocketEvent) => void;

export type BaseSessionConfig = {
  origin?: string;
  authorization?: string;
  livekitUrl?: string;
  /**
   * RTCConfiguration overrides passed to LiveKit's `room.connect()`, e.g.
   * `{ iceTransportPolicy: "relay" }`. WebRTC connections only.
   */
  rtcConfig?: RoomConnectOptions["rtcConfig"];
  overrides?: {
    agent?: {
      prompt?: ConversationConfigOverrideAgentPrompt;
      firstMessage?: string;
      language?: Language;
    };
    tts?: {
      voiceId?: string;
      speed?: number;
      stability?: number;
      similarityBoost?: number;
    };
    asr?: {
      /** Keywords to boost ASR prediction probability for this conversation. */
      keywords?: string[];
    };
    conversation?: {
      textOnly?: boolean;
    };
  };
  customLlmExtraBody?: unknown;
  dynamicVariables?: Record<string, string | number | boolean>;
  toolMockConfig?: {
    /** Which tools to mock. Defaults to 'none'. */
    mockingStrategy?: "none" | "all" | "selected";
    /** Tool names to mock when mockingStrategy is 'selected'. */
    mockedToolNames?: string[];
    /** Behavior when mocked tool has no mock response. Defaults to 'raise_error'. */
    fallbackStrategy?: "raise_error" | "call_real_tool";
  };
  useWakeLock?: boolean;
  connectionDelay?: DelayConfig;
  textOnly?: boolean;
  userId?: string;
  environment?: string;
};

export type ConnectionType = "websocket" | "webrtc";

/**
 * @experimental
 */
export type PostCallWebhookConfig = {
  url: string;
  /**
   * Secret the orchestrator uses to sign deliveries. The orchestrator
   * rejects secrets shorter than 16 characters. Anything set here is visible
   * to the end user running the page, like the rest of the orchestrator
   * session config; intended for testing against trusted deployments, not
   * production use.
   */
  hmacSecret?: string;
};

/**
 * @experimental
 */
export type OrchestratorConfig = {
  /** WebSocket URL of the orchestrator, e.g. "wss://<host>/sagemaker/convai/conversation". */
  url: string;
  /** Full agent definition, as exported from the ElevenLabs platform. */
  agentConfig?: Record<string, unknown>;
  /** Partial configs applied as overrides on top of the base agent config. */
  agentConfigOverrides?: Record<string, unknown>[];
  /**
   * Tool definitions for the agent, in the platform's tool export format
   * (the `tools_config_list` entries produced by the agent export tooling,
   * matching the Python SDK field of the same name). The orchestrator
   * validates each entry server-side and rejects the session on mismatch.
   */
  tools?: Record<string, unknown>[];
  /**
   * Replaces the knowledge-base section of the system prompt. Independent of
   * `overrides.agent.prompt`, which sets the prompt text; the orchestrator
   * composes the two, so both may be provided together.
   */
  promptKnowledgeBase?: string[];
  /** Bedrock cross-region inference profile, e.g. "global". The orchestrator defaults to "us". */
  bedrockInferenceProfile?: string;
  /** Called with the conversation transcript once the session ends. */
  postCallTranscriptionWebhook?: PostCallWebhookConfig;
  /** Called with the conversation audio once the session ends. */
  postCallAudioWebhook?: PostCallWebhookConfig;
};

export type PublicSessionConfig = BaseSessionConfig & {
  agentId: string;
  connectionType?: ConnectionType;
  signedUrl?: never;
  conversationToken?: never;
  orchestrator?: never;
};

export type PrivateWebSocketSessionConfig = BaseSessionConfig & {
  signedUrl: string;
  connectionType?: "websocket";
  agentId?: never;
  conversationToken?: never;
  orchestrator?: never;
};

export type PrivateWebRTCSessionConfig = BaseSessionConfig & {
  conversationToken: string;
  connectionType?: "webrtc";
  agentId?: never;
  signedUrl?: never;
  orchestrator?: never;
};

/**
 * @experimental
 */
export type OrchestratorSessionConfig = BaseSessionConfig & {
  /**
   * Routes the session to a self-hosted orchestrator instead of the ElevenLabs cloud.
   * @experimental
   */
  orchestrator: OrchestratorConfig;
  connectionType?: "websocket";
  agentId?: never;
  signedUrl?: never;
  conversationToken?: never;
  authorization?: never;
  origin?: never;
  environment?: never;
};

// Union type for all possible session configurations
export type SessionConfig =
  | PublicSessionConfig
  | PrivateWebSocketSessionConfig
  | PrivateWebRTCSessionConfig
  | OrchestratorSessionConfig;

export abstract class BaseConnection {
  public abstract readonly conversationId: string;
  public abstract readonly inputFormat: FormatConfig;
  public abstract readonly outputFormat: FormatConfig;

  protected queue: IncomingSocketEvent[] = [];
  protected disconnectionDetails: DisconnectionDetails | null = null;
  protected onDisconnectCallback: OnDisconnectCallback | null = null;
  protected onMessageCallback: OnMessageCallback | null = null;
  protected onModeChangeCallback: ((mode: Mode) => void) | null = null;
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

  public onModeChange(callback: (mode: Mode) => void) {
    this.onModeChangeCallback = callback;
  }

  protected updateMode(mode: Mode) {
    this.onModeChangeCallback?.(mode);
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
