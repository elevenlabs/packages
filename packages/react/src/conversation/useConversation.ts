import { useCallback, useEffect, useRef } from "react";
import { CALLBACK_KEYS } from "@elevenlabs/client";

import { useConversationControls } from "./ConversationControls";
import { useConversationStatus } from "./ConversationStatus";
import { useConversationInput } from "./ConversationInput";
import { useConversationMode } from "./ConversationMode";
import { useConversationFeedback } from "./ConversationFeedback";
import {
  useRawConversation,
  useRegisterCallbacks,
} from "./ConversationContext";
import { useStableCallbacks } from "./useStableCallbacks";
import type { HookOptions } from "./types";

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
 * `startSession()` without arguments. Callbacks are also registered with the
 * provider so they stay up-to-date across re-renders.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversation(props: UseConversationOptions = {}) {
  const { micMuted, volume, ...hookOptions } = props;

  const stableCallbacks = useStableCallbacks(hookOptions);
  useRegisterCallbacks(stableCallbacks);

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
      // Strip callbacks — they're handled via useRegisterCallbacks.
      const sessionConfig = { ...hookOptionsRef.current };
      for (const key of CALLBACK_KEYS) {
        delete (sessionConfig as Record<string, unknown>)[key];
      }
      controls.startSession({
        ...sessionConfig,
        ...options,
      } as HookOptions);
    },
    [controls, hookOptionsRef]
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
