import { useState, useCallback } from "react";
import type {
  ConversationConfig,
  ConversationStatus,
  Callbacks,
} from "../types";
import {
  getConversationToken,
  extractConversationIdFromToken,
} from "../utils/tokenUtils";

export const useConversationSession = (
  callbacksRef: { current: Callbacks },
  setStatus: (status: ConversationStatus) => void,
  setConnect: (connect: boolean) => void,
  setToken: (token: string) => void,
  setConversationId: (conversationId: string) => void,
  tokenFetchUrl?: string
) => {
  const [overrides, setOverrides] = useState<ConversationConfig["overrides"]>(
    {}
  );
  const [customLlmExtraBody, setCustomLlmExtraBody] =
    useState<ConversationConfig["customLlmExtraBody"]>(null);
  const [dynamicVariables, setDynamicVariables] = useState<
    ConversationConfig["dynamicVariables"]
  >({});
  const [expectedDynamicVariables, setExpectedDynamicVariables] =
    useState<ConversationConfig["expectedDynamicVariables"]>(undefined);
  const [missingDynamicVariableDefault, setMissingDynamicVariableDefault] =
    useState<ConversationConfig["missingDynamicVariableDefault"]>(null);
  const [userId, setUserId] = useState<ConversationConfig["userId"]>(undefined);

  const startSession = useCallback(
    async (config: ConversationConfig) => {
      try {
        setStatus("connecting");
        callbacksRef.current.onStatusChange?.({ status: "connecting" });

        setOverrides(config.overrides || {});
        setCustomLlmExtraBody(config.customLlmExtraBody || null);
        setDynamicVariables(config.dynamicVariables || {});
        setExpectedDynamicVariables(config.expectedDynamicVariables);
        setMissingDynamicVariableDefault(
          config.missingDynamicVariableDefault ?? null
        );
        setUserId(config.userId);

        let conversationToken: string;

        if (config.conversationToken) {
          conversationToken = config.conversationToken;
        } else if (config.agentId) {
          console.info(
            "Getting conversation token for agentId:",
            config.agentId
          );
          // Use tokenFetchUrl from config first, then from hook parameter, then default
          const urlToUse = config.tokenFetchUrl || tokenFetchUrl;
          conversationToken = await getConversationToken(
            config.agentId,
            urlToUse
          );
        } else {
          throw new Error("Either conversationToken or agentId is required");
        }

        const extractedConversationId =
          extractConversationIdFromToken(conversationToken);
        setConversationId(extractedConversationId);

        setToken(conversationToken);
        setConnect(true);
      } catch (error) {
        setStatus("disconnected");
        callbacksRef.current.onStatusChange?.({ status: "disconnected" });
        callbacksRef.current.onError?.(error as string);
        throw error;
      }
    },
    [
      callbacksRef,
      setStatus,
      setConnect,
      setToken,
      setConversationId,
      tokenFetchUrl,
    ]
  );

  const endSession = useCallback(
    async (reason: "user" | "agent" = "user") => {
      try {
        setConnect(false);
        setToken("");
        setStatus("disconnected");

        // Reset session configuration state
        setOverrides({});
        setCustomLlmExtraBody(null);
        setDynamicVariables({});
        setExpectedDynamicVariables(undefined);
        setMissingDynamicVariableDefault(null);
        setUserId(undefined);
        setConversationId("");

        callbacksRef.current.onStatusChange?.({ status: "disconnected" });
        callbacksRef.current.onDisconnect?.({ reason });
      } catch (error) {
        callbacksRef.current.onError?.(error as string);
        throw error;
      }
    },
    [callbacksRef, setConnect, setToken, setStatus, setConversationId]
  );

  return {
    startSession,
    endSession,
    overrides,
    customLlmExtraBody,
    dynamicVariables,
    expectedDynamicVariables,
    missingDynamicVariableDefault,
    userId,
  };
};
