// Auto-generated from agent.asyncapi.yaml — DO NOT EDIT MANUALLY

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
  parsedEvent: Record<string, unknown>
): void {
  const eventName = WIRE_TYPE_TO_EVENT_NAME[wireType];
  const payloadField = WIRE_TYPE_TO_PAYLOAD_FIELD[wireType];
  if (payloadField) {
    emit(eventName, parsedEvent[payloadField]);
  } else {
    emit(eventName);
  }
}
