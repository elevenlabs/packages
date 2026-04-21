import { createContext, useCallback, useContext, useMemo } from "react";
import {
  VoiceConversation,
  type FormatConfig,
  type InputDeviceConfig,
  type OutputConfig,
  type MultimodalMessageInput,
  type UploadFileResult,
} from "@elevenlabs/client";
import type { HookOptions } from "./types.js";
import { ConversationContext } from "./ConversationContext.js";

const EMPTY_FREQUENCY_DATA = new Uint8Array(0);

export type ConversationControlsValue = {
  startSession: (options?: HookOptions) => void;
  endSession: () => void;
  sendUserMessage: (text: string) => void;
  sendMultimodalMessage: (options: MultimodalMessageInput) => void;
  uploadFile: (file: Blob) => Promise<UploadFileResult>;
  sendContextualUpdate: (text: string) => void;
  sendUserActivity: () => void;
  sendMCPToolApprovalResult: (toolCallId: string, isApproved: boolean) => void;
  setVolume: (options: { volume: number }) => void;
  changeInputDevice: (
    config: Partial<FormatConfig> & InputDeviceConfig
  ) => Promise<void>;
  changeOutputDevice: (
    config: Partial<FormatConfig> & OutputConfig
  ) => Promise<void>;
  /** Returns byte frequency data (0-255) for the input, focused on 100-8000 Hz. */
  getInputByteFrequencyData: () => Uint8Array;
  /** Returns byte frequency data (0-255) for the output, focused on 100-8000 Hz. */
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
}: React.PropsWithChildren) {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "ConversationControlsProvider must be rendered inside a ConversationProvider"
    );
  }

  const { conversationRef } = ctx;

  const getConversation = useCallback(() => {
    const conversation = conversationRef.current;
    if (!conversation) {
      throw new Error("No active conversation. Call startSession() first.");
    }
    return conversation;
  }, [conversationRef]);

  const sendUserMessage = useCallback(
    (text: string) => {
      getConversation().sendUserMessage(text);
    },
    [getConversation]
  );

  const sendMultimodalMessage = useCallback(
    (options: MultimodalMessageInput) => {
      getConversation().sendMultimodalMessage(options);
    },
    [getConversation]
  );

  const uploadFile = useCallback(
    (file: Blob) => {
      return getConversation().uploadFile(file);
    },
    [getConversation]
  );

  const sendContextualUpdate = useCallback(
    (text: string) => {
      getConversation().sendContextualUpdate(text);
    },
    [getConversation]
  );

  const sendUserActivity = useCallback(() => {
    getConversation().sendUserActivity();
  }, [getConversation]);

  const sendMCPToolApprovalResult = useCallback(
    (toolCallId: string, isApproved: boolean) => {
      getConversation().sendMCPToolApprovalResult(toolCallId, isApproved);
    },
    [getConversation]
  );

  const setVolume = useCallback(
    (options: { volume: number }) => {
      getConversation().setVolume(options);
    },
    [getConversation]
  );

  const changeInputDevice = useCallback(
    async (config: Partial<FormatConfig> & InputDeviceConfig) => {
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
    async (config: Partial<FormatConfig> & OutputConfig) => {
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
    return (
      conversationRef.current?.getInputByteFrequencyData() ??
      EMPTY_FREQUENCY_DATA
    );
  }, [conversationRef]);

  const getOutputByteFrequencyData = useCallback(() => {
    return (
      conversationRef.current?.getOutputByteFrequencyData() ??
      EMPTY_FREQUENCY_DATA
    );
  }, [conversationRef]);

  const getInputVolume = useCallback(() => {
    return conversationRef.current?.getInputVolume() ?? 0;
  }, [conversationRef]);

  const getOutputVolume = useCallback(() => {
    return conversationRef.current?.getOutputVolume() ?? 0;
  }, [conversationRef]);

  const getId = useCallback(() => {
    return getConversation().getId();
  }, [getConversation]);

  const value = useMemo<ConversationControlsValue>(
    () => ({
      startSession: ctx.startSession,
      endSession: ctx.endSession,
      sendUserMessage,
      sendMultimodalMessage,
      uploadFile,
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
      sendMultimodalMessage,
      uploadFile,
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
