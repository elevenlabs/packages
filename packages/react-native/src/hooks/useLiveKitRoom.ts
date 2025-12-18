import { useState, useEffect, useCallback, useRef } from "react";
import { AudioSession } from "@livekit/react-native";
import type { LocalParticipant } from "livekit-client";
import type { ConversationStatus, Callbacks } from "../types";

export const useLiveKitRoom = (
  callbacksRef: { current: Callbacks },
  setStatus: (status: ConversationStatus) => void,
  conversationId: string,
  status: ConversationStatus,
  textOnly: boolean = false
) => {
  const [roomConnected, setRoomConnected] = useState(false);
  const [localParticipant, setLocalParticipant] =
    useState<LocalParticipant | null>(null);
  const hasCalledOnConnectRef = useRef(false);
  const audioSessionActiveRef = useRef(false);

  // Reset room state when conversationId changes (new session starting)
  useEffect(() => {
    if (conversationId) {
      setRoomConnected(false);
      setLocalParticipant(null);
      hasCalledOnConnectRef.current = false;
    }
  }, [conversationId]);

  useEffect(() => {
    const shouldHaveAudio = !textOnly && !!conversationId;

    if (shouldHaveAudio && !audioSessionActiveRef.current) {
      audioSessionActiveRef.current = true;
      AudioSession.startAudioSession();
    } else if (!shouldHaveAudio && audioSessionActiveRef.current) {
      audioSessionActiveRef.current = false;
      AudioSession.stopAudioSession();
    }

    return () => {
      if (audioSessionActiveRef.current) {
        audioSessionActiveRef.current = false;
        AudioSession.stopAudioSession();
      }
    };
  }, [textOnly, conversationId]);

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
    // If already disconnected, endSession already handled the disconnect callback
    if (status === "disconnected") {
      return;
    }

    setRoomConnected(false);
    setStatus("disconnected");
    setLocalParticipant(null);
    hasCalledOnConnectRef.current = false;
    callbacksRef.current.onDisconnect?.({ reason: "user" });
  }, [callbacksRef, setStatus, status]);

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
