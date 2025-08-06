import { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    const start = async () => {
      await AudioSession.startAudioSession();
    };

    start();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  const handleParticipantReady = useCallback(
    (participant: LocalParticipant) => {
      setLocalParticipant(participant);
    },
    []
  );

  const handleConnected = useCallback(() => {
    setRoomConnected(true);
    setStatus("connected");
    callbacksRef.current.onConnect?.({ conversationId });
  }, [conversationId, callbacksRef, setStatus]);

  const handleDisconnected = useCallback(() => {
    setRoomConnected(false);
    setStatus("disconnected");
    setLocalParticipant(null);
    callbacksRef.current.onDisconnect?.("disconnected");
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
