import { useState, useCallback } from "react";
import type {
  ConversationConfig,
  ConversationStatus,
  Callbacks,
} from "../types";
import {
  getConversationToken,
  extractRoomIdFromToken,
} from "../utils/tokenUtils";

export const useConversationSession = (
  callbacksRef: { current: Callbacks },
  setStatus: (status: ConversationStatus) => void,
  setConnect: (connect: boolean) => void,
  setToken: (token: string) => void,
  setRoomId: (roomId: string) => void
) => {
  const [overrides, setOverrides] = useState<ConversationConfig["overrides"]>(
    {}
  );
  const [customLlmExtraBody, setCustomLlmExtraBody] =
    useState<ConversationConfig["customLlmExtraBody"]>(null);
  const [dynamicVariables, setDynamicVariables] = useState<
    ConversationConfig["dynamicVariables"]
  >({});

  const startSession = useCallback(
    async (config: ConversationConfig) => {
      try {
        setStatus("connecting");
        callbacksRef.current.onStatusChange?.({ status: "connecting" });

        setOverrides(config.overrides || {});
        setCustomLlmExtraBody(config.customLlmExtraBody || null);
        setDynamicVariables(config.dynamicVariables || {});

        let conversationToken: string;

        if (config.conversationToken) {
          conversationToken = config.conversationToken;
        } else if (config.agentId) {
          console.info(
            "Getting conversation token for agentId:",
            config.agentId
          );
          conversationToken = await getConversationToken(config.agentId);
        } else {
          throw new Error("Either conversationToken or agentId is required");
        }

        // Extract room ID from token
        const extractedRoomId = extractRoomIdFromToken(conversationToken);
        setRoomId(extractedRoomId);

        setToken(conversationToken);
        setConnect(true);
      } catch (error) {
        setStatus("disconnected");
        callbacksRef.current.onStatusChange?.({ status: "disconnected" });
        callbacksRef.current.onError?.(error as string);
        throw error;
      }
    },
    [callbacksRef, setStatus, setConnect, setToken, setRoomId]
  );

  const endSession = useCallback(async () => {
    try {
      setConnect(false);
      setToken("");
      setStatus("disconnected");
      callbacksRef.current.onStatusChange?.({ status: "disconnected" });
      callbacksRef.current.onDisconnect?.("User ended conversation");
    } catch (error) {
      callbacksRef.current.onError?.(error as string);
      throw error;
    }
  }, [callbacksRef, setConnect, setToken, setStatus]);

  return {
    startSession,
    endSession,
    overrides,
    customLlmExtraBody,
    dynamicVariables,
  };
};
