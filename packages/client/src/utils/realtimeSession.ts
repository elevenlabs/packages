import type {
  FormatConfig,
  RealtimeAudioFormat,
  RealtimeSessionConfig,
} from "./BaseConnection.js";
import type { ConfigEvent } from "./events.js";

type NativeAudioFormat =
  ConfigEvent["conversation_initiation_metadata_event"]["agent_output_audio_format"];

export type RealtimeWireAudioFormat =
  | { type: "audio/pcm"; rate?: number }
  | { type: "audio/pcmu" }
  | { type: "audio/pcma" };

export type RealtimeSessionUpdateEvent = {
  type: "session.update";
  event_id?: string;
  session: Record<string, unknown>;
};

const UNSUPPORTED_OPTIONS = [
  "agentId",
  "signedUrl",
  "conversationToken",
  "orchestrator",
  "authorization",
  "livekitUrl",
  "webRtc",
  "customLlmExtraBody",
  "dynamicVariables",
  "toolMockConfig",
  "userId",
  "environment",
] as const;

const SUPPORTED_AUDIO_FORMATS: readonly RealtimeAudioFormat[] = [
  "pcm_24000",
  "ulaw_8000",
];

/**
 * Throws for options the Realtime endpoint cannot honor. Each of them would
 * otherwise be silently dropped, since the endpoint never loads a saved agent
 * and never receives conversation initiation data.
 */
export function assertRealtimeConfigSupported(
  config: RealtimeSessionConfig
): void {
  if (!config.clientSecret) {
    throw new Error(
      "websocket-realtime connections require a clientSecret minted by your backend."
    );
  }

  const record = config as Record<string, unknown>;
  const unsupported: string[] = UNSUPPORTED_OPTIONS.filter(
    key => record[key] !== undefined && record[key] !== null
  );

  if (config.overrides) {
    const { conversation, ...rest } = config.overrides as Record<
      string,
      unknown
    > & { conversation?: Record<string, unknown> };
    for (const key of Object.keys(rest)) {
      if (rest[key] !== undefined) unsupported.push(`overrides.${key}`);
    }
    for (const key of Object.keys(conversation ?? {})) {
      if (key !== "textOnly" && conversation?.[key] !== undefined) {
        unsupported.push(`overrides.conversation.${key}`);
      }
    }
  }

  if (unsupported.length > 0) {
    throw new Error(
      `websocket-realtime connections do not support: ${unsupported.join(", ")}. ` +
        "The Realtime endpoint does not load a saved agent; configure the session through the realtime option instead."
    );
  }

  const session = config.realtime ?? {};
  const turnDetectionType = (session.turnDetection as { type?: string } | null)
    ?.type;
  if (session.turnDetection && turnDetectionType !== "semantic_vad") {
    throw new Error(
      `Unsupported realtime turnDetection type "${turnDetectionType}". Use "semantic_vad", or null for manual turn-taking.`
    );
  }

  for (const format of [session.inputAudioFormat, session.outputAudioFormat]) {
    if (format !== undefined && !SUPPORTED_AUDIO_FORMATS.includes(format)) {
      throw new Error(
        `Unsupported realtime audio format "${format}". Use one of: ${SUPPORTED_AUDIO_FORMATS.join(", ")}.`
      );
    }
  }

  const toolNames = new Set<string>();
  for (const tool of session.tools ?? []) {
    if (!tool.name) {
      throw new Error("Every realtime tool requires a name.");
    }
    if (toolNames.has(tool.name)) {
      throw new Error(`Duplicate realtime tool name "${tool.name}".`);
    }
    toolNames.add(tool.name);
  }
}

export function toWireAudioFormat(
  format: RealtimeAudioFormat
): RealtimeWireAudioFormat {
  return format === "ulaw_8000"
    ? { type: "audio/pcmu" }
    : { type: "audio/pcm", rate: 24000 };
}

export function fromWireAudioFormat(
  format: RealtimeWireAudioFormat | undefined,
  fallback: RealtimeAudioFormat
): FormatConfig {
  if (!format) {
    return fallback === "ulaw_8000"
      ? { format: "ulaw", sampleRate: 8000 }
      : { format: "pcm", sampleRate: 24000 };
  }
  switch (format.type) {
    case "audio/pcm":
      return { format: "pcm", sampleRate: format.rate ?? 24000 };
    case "audio/pcmu":
      return { format: "ulaw", sampleRate: 8000 };
    default:
      throw new Error(
        `The Realtime endpoint selected an unsupported audio format: ${format.type}`
      );
  }
}

export function toNativeAudioFormat(format: FormatConfig): NativeAudioFormat {
  return `${format.format}_${format.sampleRate}` as NativeAudioFormat;
}

/**
 * Translates SDK session options into the Realtime `session.update` payload.
 * Fields left undefined are omitted so the server keeps its defaults.
 */
export function constructRealtimeSessionUpdate(
  config: RealtimeSessionConfig
): RealtimeSessionUpdateEvent {
  const options = config.realtime ?? {};
  const textOnly =
    config.textOnly ?? config.overrides?.conversation?.textOnly ?? false;

  const input: Record<string, unknown> = {
    format: toWireAudioFormat(options.inputAudioFormat ?? "pcm_24000"),
  };
  if (options.turnDetection === null) {
    input.turn_detection = null;
  } else if (options.turnDetection) {
    input.turn_detection = omitUndefined({
      type: options.turnDetection.type,
      eagerness: options.turnDetection.eagerness,
      create_response: options.turnDetection.createResponse,
      interrupt_response: options.turnDetection.interruptResponse,
    });
  }

  const output = omitUndefined({
    format: toWireAudioFormat(options.outputAudioFormat ?? "pcm_24000"),
    voice: options.voice,
  });

  return {
    type: "session.update",
    session: omitUndefined({
      type: "realtime",
      output_modalities: [textOnly ? "text" : "audio"],
      instructions: options.instructions,
      audio: { input, output },
      tools: options.tools?.map(tool =>
        omitUndefined({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })
      ),
      temperature: options.temperature,
      max_output_tokens: options.maxOutputTokens,
    }),
  };
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
