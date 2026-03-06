import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { VoiceConversation, type OutputConfig } from "@elevenlabs/client";
import type {
  HookOptions,
  DeviceFormatConfig,
  DeviceInputConfig,
} from "../index";
import { ConversationContext } from "./ConversationContext";

export type ConversationControlsValue = {
  startSession: (options?: HookOptions) => void;
  endSession: () => void;
  sendUserMessage: (text: string) => void;
  sendContextualUpdate: (text: string) => void;
  sendUserActivity: () => void;
  sendMCPToolApprovalResult: (
    toolCallId: string,
    isApproved: boolean
  ) => void;
  setVolume: (options: { volume: number }) => void;
  changeInputDevice: (
    config: DeviceFormatConfig & DeviceInputConfig
  ) => Promise<void>;
  changeOutputDevice: (config: DeviceFormatConfig & OutputConfig) => Promise<void>;
  getInputByteFrequencyData: () => Uint8Array;
  getOutputByteFrequencyData: () => Uint8Array;
  getInputVolume: () => number;
  getOutputVolume: () => number;
  getId: () => string;
};

export const ConversationControlsContext =
  createContext<ConversationControlsValue | null>(null);

/**
 * Reads from `ConversationContext` and provides stable action references to
 * `ConversationControlsContext`. Must be rendered inside a `ConversationProvider`.
 */
export function ConversationControlsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "ConversationControlsProvider must be rendered inside a ConversationProvider"
    );
  }

  // Mirror the reactive conversation into a ref so stable callbacks below
  // can always read the latest instance without being recreated.
  const conversationRef = useRef(ctx.conversation);
  conversationRef.current = ctx.conversation;

  const getConversation = useCallback(() => {
    const conversation = conversationRef.current;
    if (!conversation) {
      throw new Error("No active conversation. Call startSession() first.");
    }
    return conversation;
  }, []);

  const sendUserMessage = useCallback((text: string) => {
    getConversation().sendUserMessage(text);
  }, [getConversation]);

  const sendContextualUpdate = useCallback((text: string) => {
    getConversation().sendContextualUpdate(text);
  }, [getConversation]);

  const sendUserActivity = useCallback(() => {
    getConversation().sendUserActivity();
  }, [getConversation]);

  const sendMCPToolApprovalResult = useCallback(
    (toolCallId: string, isApproved: boolean) => {
      getConversation().sendMCPToolApprovalResult(toolCallId, isApproved);
    },
    [getConversation]
  );

  const setVolume = useCallback((options: { volume: number }) => {
    getConversation().setVolume(options);
  }, [getConversation]);

  const changeInputDevice = useCallback(
    async (config: DeviceFormatConfig & DeviceInputConfig) => {
      const conversation = getConversation();
      if (conversation instanceof VoiceConversation) {
        return await conversation.changeInputDevice(config);
      }
      throw new Error(
        "Device switching is only available for voice conversations"
      );
    },
    [getConversation]
  );

  const changeOutputDevice = useCallback(
    async (config: DeviceFormatConfig & OutputConfig) => {
      const conversation = getConversation();
      if (conversation instanceof VoiceConversation) {
        return await conversation.changeOutputDevice(config);
      }
      throw new Error(
        "Device switching is only available for voice conversations"
      );
    },
    [getConversation]
  );

  const getInputByteFrequencyData = useCallback(() => {
    return getConversation().getInputByteFrequencyData();
  }, [getConversation]);

  const getOutputByteFrequencyData = useCallback(() => {
    return getConversation().getOutputByteFrequencyData();
  }, [getConversation]);

  const getInputVolume = useCallback(() => {
    return getConversation().getInputVolume();
  }, [getConversation]);

  const getOutputVolume = useCallback(() => {
    return getConversation().getOutputVolume();
  }, [getConversation]);

  const getId = useCallback(() => {
    return getConversation().getId();
  }, [getConversation]);

  const value = useMemo<ConversationControlsValue>(
    () => ({
      startSession: ctx.startSession,
      endSession: ctx.endSession,
      sendUserMessage,
      sendContextualUpdate,
      sendUserActivity,
      sendMCPToolApprovalResult,
      setVolume,
      changeInputDevice,
      changeOutputDevice,
      getInputByteFrequencyData,
      getOutputByteFrequencyData,
      getInputVolume,
      getOutputVolume,
      getId,
    }),
    [
      ctx.startSession,
      ctx.endSession,
      sendUserMessage,
      sendContextualUpdate,
      sendUserActivity,
      sendMCPToolApprovalResult,
      setVolume,
      changeInputDevice,
      changeOutputDevice,
      getInputByteFrequencyData,
      getOutputByteFrequencyData,
      getInputVolume,
      getOutputVolume,
      getId,
    ]
  );

  return (
    <ConversationControlsContext.Provider value={value}>
      {children}
    </ConversationControlsContext.Provider>
  );
}

/**
 * Returns stable action references for controlling the conversation.
 * All function references are stable and will never cause re-renders.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversationControls(): ConversationControlsValue {
  const ctx = useContext(ConversationControlsContext);
  if (!ctx) {
    throw new Error(
      "useConversationControls must be used within a ConversationProvider"
    );
  }
  return ctx;
}
