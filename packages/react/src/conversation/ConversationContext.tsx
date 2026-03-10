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
  // eslint-disable-next-line react-hooks/refs -- intentional sync during render for latest-ref pattern
  callbacksRef.current = callbacks;

  useEffect(() => {
    // Build stable wrappers that delegate to the ref so callers can pass
    // inline objects without causing re-subscriptions.
    const stableCallbacks = Object.fromEntries(
      Object.keys(callbacksRef.current)
        .filter(key => callbacksRef.current[key as keyof Callbacks] !== undefined)
        .map(key => [
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
  }, [registerCallbacks]);
}
