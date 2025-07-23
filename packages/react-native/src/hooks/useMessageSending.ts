import { useCallback } from "react";
import type { LocalParticipant } from "livekit-client";
import type { ConversationStatus, Callbacks } from "../types";

export const useMessageSending = (
  status: ConversationStatus,
  localParticipant: LocalParticipant | null,
  callbacksRef: { current: Callbacks }
) => {
  const sendMessage = useCallback(
    async (message: unknown) => {
      if (status !== "connected" || !localParticipant) {
        console.warn(
          "Cannot send message: room not connected or no local participant"
        );
        return;
      }
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(message));

        await localParticipant.publishData(data, { reliable: true });
      } catch (error) {
        console.error("Failed to send message via WebRTC:", error);
        console.error("Error details:", error);
        callbacksRef.current.onError?.(error as string);
      }
    },
    [status, localParticipant, callbacksRef]
  );

  return { sendMessage };
};
