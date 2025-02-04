import { useEffect, useRef, useState } from "react";
import {
  Conversation,
  Mode,
  SessionConfig,
  Callbacks,
  Options,
  Status,
  ClientToolsConfig,
} from "@11labs/client";
import { InputConfig } from "@11labs/client/dist/utils/input";
export type {
  Role,
  Mode,
  Status,
  SessionConfig,
  DisconnectionDetails,
} from "@11labs/client";
export { postOverallFeedback } from "@11labs/client";

export type HookOptions = Partial<
  SessionConfig & HookCallbacks & ClientToolsConfig & InputConfig
>;
export type HookCallbacks = Pick<
  Callbacks,
  | "onConnect"
  | "onDisconnect"
  | "onError"
  | "onMessage"
  | "onDebug"
  | "onUnhandledClientToolCall"
>;

export function useConversation<T extends HookOptions>(defaultOptions?: T) {
  const conversationRef = useRef<Conversation | null>(null);
  const lockRef = useRef<Promise<Conversation> | null>(null);
  const [status, setStatus] = useState<Status>("disconnected");
  const [canSendFeedback, setCanSendFeedback] = useState(false);
  const [mode, setMode] = useState<Mode>("listening");

  useEffect(() => {
    return () => {
      conversationRef.current?.endSession();
    };
  }, []);

  return {
    startSession: (async (options?: HookOptions) => {
      if (conversationRef.current?.isOpen()) {
        return conversationRef.current.getId();
      }

      if (lockRef.current) {
        const conversation = await lockRef.current;
        return conversation.getId();
      }

      try {
        lockRef.current = Conversation.startSession({
          ...(defaultOptions ?? {}),
          ...(options ?? {}),
          onModeChange: ({ mode }) => {
            setMode(mode);
          },
          onStatusChange: ({ status }) => {
            setStatus(status);
          },
          onCanSendFeedbackChange: ({ canSendFeedback }) => {
            setCanSendFeedback(canSendFeedback);
          },
        } as Options);

        conversationRef.current = await lockRef.current;
        return conversationRef.current.getId();
      } finally {
        lockRef.current = null;
      }
    }) as T extends SessionConfig
      ? (options?: HookOptions) => Promise<string>
      : (options: SessionConfig & HookOptions) => Promise<string>,
    endSession: async () => {
      const conversation = conversationRef.current;
      conversationRef.current = null;
      await conversation?.endSession();
    },
    setVolume: ({ volume }: { volume: number }) => {
      conversationRef.current?.setVolume({ volume });
    },
    getInputByteFrequencyData: () => {
      return conversationRef.current?.getInputByteFrequencyData();
    },
    getOutputByteFrequencyData: () => {
      return conversationRef.current?.getOutputByteFrequencyData();
    },
    getInputVolume: () => {
      return conversationRef.current?.getInputVolume() ?? 0;
    },
    getOutputVolume: () => {
      return conversationRef.current?.getOutputVolume() ?? 0;
    },
    sendFeedback: (like: boolean) => {
      conversationRef.current?.sendFeedback(like);
    },
    status,
    canSendFeedback,
    isSpeaking: mode === "speaking",
  };
}
