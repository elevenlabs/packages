/**
 * Event codegen script — reads agent.asyncapi.yaml and generates:
 *   src/generated/events.ts   — GeneratedEventMap, wire type unions, lookup tables
 *   src/generated/dispatch.ts — dispatchGeneratedEvent() helper
 *
 * Run: node scripts/generate-events.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a JSON-pointer $ref within the parsed schema object. */
function resolveRef(schema: Record<string, unknown>, ref: string): unknown {
  const parts = ref.replace("#/", "").split("/");
  let current: unknown = schema;
  for (const part of parts) {
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Replicate Modelina's PascalCase normalisation for model names.
 * Consecutive uppercase letters are lowered except the first character:
 *   MCPToolCall → McpToolCall, VADScore → VadScore, ASRInit → AsrInit
 */
function toModelinaPascalCase(name: string): string {
  return name.replace(
    /([A-Z]+)([A-Z][a-z])/g,
    (_, prefix: string, suffix: string) =>
      prefix[0] + prefix.slice(1).toLowerCase() + suffix,
  );
}

// ---------------------------------------------------------------------------
// Parse schema
// ---------------------------------------------------------------------------

const schemasDir = path.resolve(process.cwd(), "schemas");
const outDir = path.resolve(process.cwd(), "src/generated");
const schemaPath = path.join(schemasDir, "agent.asyncapi.yaml");
const schema = parseYaml(readFileSync(schemaPath, "utf8")) as Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

// ---------------------------------------------------------------------------
// Internally handled events — need custom dispatch logic in BaseConversation
// ---------------------------------------------------------------------------

const INTERNALLY_HANDLED_EVENTS: ReadonlySet<string> = new Set([
  "agent_response", //  combined with user_transcript → "message"
  "user_transcript", // combined with agent_response → "message"
  "audio", //           unwraps base64 + alignment + mode tracking
  "client_tool_call", // internal tool dispatch, not emitted
  "internal_tentative_agent_response", // emits "debug"
  "ping", //            internal pong response
  "error", //           routed through handleErrorEvent
]);

// ---------------------------------------------------------------------------
// Extract server → client messages from the publish channel
// ---------------------------------------------------------------------------

const publishRefs = schema.channels.AgentMessages.publish.message.oneOf as {
  $ref: string;
}[];

type EventInfo = {
  messageKey: string;
  typeName: string;
  wireType: string;
  eventName: string;
  payloadField: string | null;
};

const allWireTypes: string[] = [];
const events: EventInfo[] = [];

for (const ref of publishRefs) {
  const messageKey = ref.$ref.split("/").pop()!;
  const message = schema.components.messages[messageKey];

  // Resolve payload schema (always a $ref in our spec)
  const payloadSchema = message.payload.$ref
    ? resolveRef(schema, message.payload.$ref)
    : message.payload;

  // Extract wire type from the `type` property's const value
  const wireType = (payloadSchema as Record<string, unknown> & {
    properties: Record<string, { const?: string }>;
  }).properties.type?.const;
  if (!wireType) {
    throw new Error(`No type const found in payload for message ${messageKey}`);
  }

  allWireTypes.push(wireType);

  if (INTERNALLY_HANDLED_EVENTS.has(wireType)) continue;

  // Find the single non-`type` property (the payload field to unwrap)
  const payloadFields = Object.keys(
    (payloadSchema as { properties: Record<string, unknown> }).properties,
  ).filter((k) => k !== "type");
  if (payloadFields.length > 1) {
    throw new Error(
      `Multiple non-type fields in ${messageKey}: ${payloadFields.join(", ")}`,
    );
  }
  const payloadField = payloadFields.length === 1 ? payloadFields[0] : null;

  const typeName = toModelinaPascalCase(messageKey);
  const eventName = wireType.replace(/_/g, "-");

  events.push({ messageKey, typeName, wireType, eventName, payloadField });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// Every internally-handled wire type must actually exist in the spec
for (const handled of INTERNALLY_HANDLED_EVENTS) {
  if (!allWireTypes.includes(handled)) {
    console.warn(
      `⚠ Internally handled event "${handled}" not found in schema`,
    );
  }
}

// Every wire type must be either internally handled or generated
const unaccounted = allWireTypes.filter(
  (wt) =>
    !INTERNALLY_HANDLED_EVENTS.has(wt) &&
    !events.some((e) => e.wireType === wt),
);
if (unaccounted.length > 0) {
  throw new Error(`Unaccounted wire types: ${unaccounted.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Generate events.ts
// ---------------------------------------------------------------------------

function generateEventsFile(): string {
  const imports = events.map((e) => `  ${e.typeName},`).join("\n");

  const wireTypeUnion = events
    .map((e) => `  | "${e.wireType}"`)
    .join("\n");

  const eventMapEntries = events
    .map((e) => {
      if (e.payloadField) {
        return `  "${e.eventName}": (props: ${e.typeName}["${e.payloadField}"]) => void;`;
      }
      return `  "${e.eventName}": () => void;`;
    })
    .join("\n");

  const wireTypeToEventName = events
    .map((e) => `  "${e.wireType}": "${e.eventName}",`)
    .join("\n");

  const wireTypeToPayloadField = events
    .map(
      (e) =>
        `  "${e.wireType}": ${e.payloadField ? `"${e.payloadField}"` : "null"},`,
    )
    .join("\n");

  return `// Auto-generated from agent.asyncapi.yaml — DO NOT EDIT MANUALLY

import type {
${imports}
} from "@elevenlabs/types";

/** Union of all generated wire type strings */
export type GeneratedWireType =
${wireTypeUnion};

/** Generated event map — simple unwrap events only */
export type GeneratedEventMap = {
${eventMapEntries}
};

/** Runtime: wire \`type\` → event name (generated events only) */
export const WIRE_TYPE_TO_EVENT_NAME: Record<
  GeneratedWireType,
  keyof GeneratedEventMap
> = {
${wireTypeToEventName}
};

/** Runtime: wire \`type\` → payload field to unwrap (null = no payload) */
export const WIRE_TYPE_TO_PAYLOAD_FIELD: Record<
  GeneratedWireType,
  string | null
> = {
${wireTypeToPayloadField}
};
`;
}

// ---------------------------------------------------------------------------
// Generate dispatch.ts
// ---------------------------------------------------------------------------

function generateDispatchFile(): string {
  return `// Auto-generated from agent.asyncapi.yaml — DO NOT EDIT MANUALLY

import {
  WIRE_TYPE_TO_EVENT_NAME,
  WIRE_TYPE_TO_PAYLOAD_FIELD,
} from "./events.js";
import type { GeneratedWireType } from "./events.js";

/**
 * Dispatches a generated wire event by looking up the event name and
 * unwrapping the payload field. Caller provides the emit function
 * to avoid circular dependencies with BaseConversation.
 */
export function dispatchGeneratedEvent(
  emit: (event: string, ...args: unknown[]) => void,
  wireType: GeneratedWireType,
  parsedEvent: Record<string, unknown>,
): void {
  const eventName = WIRE_TYPE_TO_EVENT_NAME[wireType];
  const payloadField = WIRE_TYPE_TO_PAYLOAD_FIELD[wireType];
  if (payloadField) {
    emit(eventName, parsedEvent[payloadField]);
  } else {
    emit(eventName);
  }
}
`;
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "events.ts"), generateEventsFile());
writeFileSync(path.join(outDir, "dispatch.ts"), generateDispatchFile());

console.log(`✅ Generated event types (${events.length} events):`);
console.log(`   ${path.join(outDir, "events.ts")}`);
console.log(`   ${path.join(outDir, "dispatch.ts")}`);
