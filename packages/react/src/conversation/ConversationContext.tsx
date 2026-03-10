import { createContext, useContext, useEffect, useRef, type RefObject } from "react";
import type { Callbacks, Conversation } from "@elevenlabs/client";
import type { HookOptions } from "../index";

export type ConversationContextValue = {
  conversation: Conversation | null;
  /** Stable ref to the active conversation — use in callbacks to avoid re-renders. */
  conversationRef: RefObject<Conversation | null>;
  startSession: (options?: HookOptions) => void;
  endSession: () => void;
  /**
   * For sub-providers — register callback handlers to be composed into the
   * next `Conversation.startSession()` call. Returns an unsubscribe function.
   */
  registerCallbacks: (callbacks: Partial<Callbacks>) => () => void;
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
  callbacksRef.current = callbacks;

  // Re-subscribe when the set of provided callback keys changes.
  const activeKeys = Object.keys(callbacks)
    .filter(key => callbacks[key as keyof Callbacks] !== undefined)
    .sort();

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- spreading activeKeys so the effect re-runs when the set of keys changes
  }, [registerCallbacks, ...activeKeys]);
}
