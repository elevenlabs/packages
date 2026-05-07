import { useCallback, useEffect, useRef } from "react";
import { CALLBACK_KEYS, mergeOptions } from "@elevenlabs/client/internal";

import { useConversationControls } from "./ConversationControls.js";
import { useConversationStatus } from "./ConversationStatus.js";
import { useConversationInput } from "./ConversationInput.js";
import { useConversationMode } from "./ConversationMode.js";
import { useConversationFeedback } from "./ConversationFeedback.js";
import { useRawConversation } from "./ConversationContext.js";
import { useStableCallbacks } from "./useStableCallbacks.js";
import type { HookOptions } from "./types.js";

export type UseConversationOptions = HookOptions & {
  micMuted?: boolean;
  volume?: number;
};

/**
 * Convenience hook that combines all granular conversation hooks into a single
 * return value. Less performant than using individual hooks because any state
 * change in any sub-context triggers a re-render of the consuming component.
 *
 * Accepts optional `micMuted`, `volume`, session config, and callback props.
 * Session config and callbacks passed here are used as defaults when calling
 * `startSession()` without arguments. Callbacks are ref-stable across renders
 * and compose with provider-level and per-session callbacks.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversation(props: UseConversationOptions = {}) {
  const { micMuted, volume, ...hookOptions } = props;

  const stableCallbacks = useStableCallbacks(hookOptions);

  const hookOptionsRef = useRef(hookOptions);
  // eslint-disable-next-line react-hooks/refs -- intentional sync during render for latest-ref pattern
  hookOptionsRef.current = hookOptions;

  const controls = useConversationControls();
  const { status, message } = useConversationStatus();
  const { isMuted, setMuted } = useConversationInput();
  const { mode, isSpeaking, isListening } = useConversationMode();
  const { canSendFeedback, sendFeedback } = useConversationFeedback();

  const startSession = useCallback(
    (options?: HookOptions) => {
      // Strip raw callbacks from hook defaults — stableCallbacks provides
      // ref-backed versions that won't go stale across renders.
      const sessionConfig = { ...hookOptionsRef.current };
      for (const key of CALLBACK_KEYS) {
        delete (sessionConfig as Record<string, unknown>)[key];
      }
      // Use mergeOptions so that hook callbacks compose with (rather than
      // override) provider-level and per-session callbacks.
      controls.startSession(
        mergeOptions<HookOptions>(sessionConfig, stableCallbacks, options ?? {})
      );
    },
    [controls, stableCallbacks]
  );

  const conversation = useRawConversation();

  useEffect(() => {
    if (micMuted !== undefined && conversation) {
      setMuted(micMuted);
    }
  }, [micMuted, conversation, setMuted]);

  useEffect(() => {
    if (volume !== undefined && conversation) {
      conversation.setVolume({ volume });
    }
  }, [volume, conversation]);

  return {
    ...controls,
    startSession,
    status,
    message,
    isMuted: micMuted ?? isMuted,
    setMuted,
    mode,
    isSpeaking,
    isListening,
    canSendFeedback,
    sendFeedback,
  };
}
