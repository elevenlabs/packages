import { useEffect } from "react";

import { useConversationControls } from "./ConversationControls";
import { useConversationStatus } from "./ConversationStatus";
import { useConversationInput } from "./ConversationInput";
import { useConversationMode } from "./ConversationMode";
import { useConversationFeedback } from "./ConversationFeedback";
import { useRawConversationRef } from "./ConversationContext";
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
 * Accepts optional `micMuted` and `volume` props for controlled state,
 * matching the legacy `useConversation` API.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversation(props: UseConversationOptions = {}) {
  const { micMuted, volume } = props;

  const controls = useConversationControls();
  const { status, message } = useConversationStatus();
  const { isMuted, setMuted } = useConversationInput();
  const { mode, isSpeaking, isListening } = useConversationMode();
  const { canSendFeedback, sendFeedback } = useConversationFeedback();
  const conversationRef = useRawConversationRef();

  // ── Controlled state sync ──

  useEffect(() => {
    if (micMuted !== undefined && conversationRef.current) {
      setMuted(micMuted);
    }
  }, [micMuted, conversationRef, setMuted]);

  useEffect(() => {
    if (volume !== undefined) {
      conversationRef.current?.setVolume({ volume });
    }
  }, [volume, conversationRef]);

  return {
    ...controls,
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
