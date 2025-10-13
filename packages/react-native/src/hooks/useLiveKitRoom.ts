import { useState, useEffect, useCallback, useRef } from "react";
import { AudioSession } from "@livekit/react-native";
import type { LocalParticipant } from "livekit-client";
import type { ConversationStatus, Callbacks } from "../types";

export const useLiveKitRoom = (
  callbacksRef: { current: Callbacks },
  setStatus: (status: ConversationStatus) => void,
  conversationId: string
) => {
  const [roomConnected, setRoomConnected] = useState(false);
  const [localParticipant, setLocalParticipant] =
    useState<LocalParticipant | null>(null);
  const hasCalledOnConnectRef = useRef(false);

  useEffect(() => {
    const start = async () => {
      await AudioSession.startAudioSession();
    };

    start();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  // Fire onConnect when both participant and room are fully ready
  useEffect(() => {
    if (localParticipant && roomConnected && !hasCalledOnConnectRef.current) {
      hasCalledOnConnectRef.current = true;
      callbacksRef.current.onConnect?.({ conversationId });
    }
  }, [localParticipant, roomConnected, conversationId, callbacksRef]);

  const handleParticipantReady = useCallback(
    (participant: LocalParticipant) => {
      if (localParticipant) {
        return;
      }

      setLocalParticipant(participant);
      setStatus("connected");
    },
    [localParticipant, setStatus]
  );

  const handleConnected = useCallback(() => {
    setRoomConnected(true);
  }, []);

  const handleDisconnected = useCallback(() => {
    setRoomConnected(false);
    setStatus("disconnected");
    setLocalParticipant(null);
    hasCalledOnConnectRef.current = false;
    callbacksRef.current.onDisconnect?.({ reason: "user" });
  }, [callbacksRef, setStatus]);

  const handleError = useCallback(
    (error: Error) => {
      console.error("LiveKit error:", error);
      callbacksRef.current.onError?.(error.message, undefined);
    },
    [callbacksRef]
  );

  return {
    roomConnected,
    localParticipant,
    handleParticipantReady,
    handleConnected,
    handleDisconnected,
    handleError,
  };
};
