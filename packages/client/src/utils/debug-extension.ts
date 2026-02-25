import type { ElevenLabsConversationAPI } from "@elevenlabs/types";

/**
 * Well-known symbols used by debug extensions (e.g. browser extensions) to
 * hook into SDK conversations. Extensions place callback functions at these
 * symbols on globalThis before the SDK creates a conversation.
 *
 * @example Setting up hooks from an extension's content script:
 * ```js
 * globalThis[Symbol.for("elevenlabs.debugger.registerConversation")] = (api) => {
 *   // api implements ElevenLabsConversationAPI
 * };
 * globalThis[Symbol.for("elevenlabs.debugger.deregisterConversation")] = (id) => {
 *   // conversation with this id has ended
 * };
 * ```
 */
const REGISTER = Symbol.for("elevenlabs.debugger.registerConversation");
const DEREGISTER = Symbol.for("elevenlabs.debugger.deregisterConversation");

interface DebugHooks {
  [REGISTER]?: (api: ElevenLabsConversationAPI) => void;
  [DEREGISTER]?: (conversationId: string) => void;
}

function getHooks(): DebugHooks {
  return globalThis as unknown as DebugHooks;
}

export function registerConversation(api: ElevenLabsConversationAPI): void {
  const register = getHooks()[REGISTER];
  if (typeof register === "function") {
    register(api);
  }
}

export function deregisterConversation(conversationId: string): void {
  const deregister = getHooks()[DEREGISTER];
  if (typeof deregister === "function") {
    deregister(conversationId);
  }
}
