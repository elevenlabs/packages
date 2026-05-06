import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import type {
  Callbacks,
  ClientToolsConfig,
  Conversation,
} from "@elevenlabs/client";
import type { HookOptions } from "./types.js";

type ClientToolEntry = ClientToolsConfig["clientTools"][string];

export type ConversationContextValue = {
  conversation: Conversation | null;
  /** Stable ref to the active conversation — use in callbacks to avoid re-renders. */
  conversationRef: RefObject<Conversation | null>;
  isPaused: boolean;
  startSession: (options?: HookOptions) => void;
  endSession: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  /**
   * For sub-providers — register callback handlers to be composed into the
   * next `Conversation.startSession()` call. Returns an unsubscribe function.
   */
  registerCallbacks: (callbacks: Partial<Callbacks>) => () => void;
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
 * Registers callback handlers with the nearest `ConversationProvider`.
 * Uses a ref internally so the latest callback values are always invoked
 * without re-subscribing on every render.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useRegisterCallbacks(callbacks: Partial<Callbacks>): void {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "useRegisterCallbacks must be used within a ConversationProvider"
    );
  }

  const { registerCallbacks } = ctx;
  const callbacksRef = useRef(callbacks);

  // Re-subscribe when the set of provided callback keys changes.
  const activeKeyToken = Object.keys(callbacks)
    .filter(key => callbacks[key as keyof Callbacks] !== undefined)
    .sort()
    .join("|");

  useLayoutEffect(() => {
    callbacksRef.current = callbacks;
  });

  useLayoutEffect(() => {
    const activeKeys = activeKeyToken === "" ? [] : activeKeyToken.split("|");
    const stableCallbacks = Object.fromEntries(
      activeKeys.map((key: string) => [
        key,
        (...args: never[]) => {
          const fn = callbacksRef.current[key as keyof Callbacks];
          if (typeof fn === "function") {
            (fn as (...a: never[]) => void)(...args);
          }
        },
      ])
    ) as Partial<Callbacks>;
    return registerCallbacks(stableCallbacks);
  }, [registerCallbacks, activeKeyToken]);
}
