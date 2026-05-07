import {
  createContext,
  useContext,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { ClientToolsConfig, Conversation } from "@elevenlabs/client";
import type { HookOptions } from "./types.js";

type ClientToolEntry = ClientToolsConfig["clientTools"][string];

export type ConversationContextValue = {
  conversation: Conversation | null;
  /** Stable ref to the active conversation — use in callbacks to avoid re-renders. */
  conversationRef: RefObject<Conversation | null>;
  startSession: (options?: HookOptions) => void;
  endSession: () => void;
  /** True while a `startSession` call is in progress. */
  isStarting: boolean;
  /** Error message from a failed `startSession` call. Cleared on next attempt. */
  startupError: string | null;
  /** Registry of hook-registered client tools. Survives across sessions. */
  clientToolsRegistry: Map<string, ClientToolEntry>;
  /** Ref to the live clientTools object currently held by BaseConversation. */
  clientToolsRef: MutableRefObject<Record<string, ClientToolEntry>>;
};

export const ConversationContext =
  createContext<ConversationContextValue | null>(null);

/**
 * Returns the raw `Conversation` instance (or `null` if no session is active).
 * This is a public escape hatch for advanced use cases that need direct access
 * to the underlying `@elevenlabs/client` Conversation object.
 *
 * Can be used outside a `ConversationProvider` — returns `null` in that case.
 */
export function useRawConversation(): Conversation | null {
  const ctx = useContext(ConversationContext);
  return ctx?.conversation ?? null;
}

/**
 * Returns a stable ref to the active `Conversation` instance.
 * The ref's `.current` is `null` when no session is active, and updates
 * without causing re-renders — ideal for use inside callbacks and sub-providers.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useRawConversationRef(): RefObject<Conversation | null> {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "useRawConversationRef must be used within a ConversationProvider"
    );
  }
  return ctx.conversationRef;
}

/**
 * Returns the `isStarting` and `startupError` state from the nearest
 * `ConversationProvider`. Useful for sub-providers that need to know about
 * session lifecycle phases (e.g., showing "connecting" status).
 *
 * Must be used within a `ConversationProvider`.
 */
export function useSessionLifecycle(): {
  isStarting: boolean;
  startupError: string | null;
} {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "useSessionLifecycle must be used within a ConversationProvider"
    );
  }
  return { isStarting: ctx.isStarting, startupError: ctx.startupError };
}
