import { useEffect, useRef, useState } from "react";
import {
  Conversation,
  Mode,
  SessionConfig,
  Callbacks,
  Options,
  Status,
  ClientToolsConfig,
  InputConfig,
} from "@elevenlabs/client";

import { PACKAGE_VERSION } from "./version";

export type {
  Role,
  Mode,
  Status,
  SessionConfig,
  DisconnectionDetails,
  Language,
} from "@elevenlabs/client";
export { postOverallFeedback } from "@elevenlabs/client";

export type HookOptions = Partial<
  SessionConfig & HookCallbacks & ClientToolsConfig & InputConfig
>;
export type ControlledState = {
  micMuted?: boolean;
  volume?: number;
};
export type HookCallbacks = Pick<
  Callbacks,
  | "onConnect"
  | "onDisconnect"
  | "onError"
  | "onMessage"
  | "onAudio"
  | "onDebug"
  | "onUnhandledClientToolCall"
>;

export function useConversation<T extends HookOptions & ControlledState>(
  props: T = {} as T
) {
  const { micMuted, volume, ...defaultOptions } = props;
  const conversationRef = useRef<Conversation | null>(null);
  const lockRef = useRef<Promise<Conversation> | null>(null);
  const [status, setStatus] = useState<Status>("disconnected");
  const [canSendFeedback, setCanSendFeedback] = useState(false);
  const [mode, setMode] = useState<Mode>("listening");

  useEffect(() => {
    if (micMuted !== undefined) {
      conversationRef?.current?.setMicMuted(micMuted);
    }
  }, [micMuted]);

  useEffect(() => {
    if (volume !== undefined) {
      conversationRef?.current?.setVolume({ volume });
    }
  }, [volume]);

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
          overrides: {
            ...(defaultOptions?.overrides ?? {}),
            ...(options?.overrides ?? {}),
            client: {
              ...(defaultOptions?.overrides?.client ?? {}),
              ...(options?.overrides?.client ?? {}),
              source:
                options?.overrides?.client?.source ||
                defaultOptions?.overrides?.client?.source ||
                "react_sdk",
              version:
                options?.overrides?.client?.version ||
                defaultOptions?.overrides?.client?.version ||
                PACKAGE_VERSION,
            },
          },
          // Pass through user-provided callbacks
          onConnect: options?.onConnect || defaultOptions?.onConnect,
          onDisconnect: options?.onDisconnect || defaultOptions?.onDisconnect,
          onError: options?.onError || defaultOptions?.onError,
          onMessage: options?.onMessage || defaultOptions?.onMessage,
          onAudio: options?.onAudio || defaultOptions?.onAudio,
          onDebug: options?.onDebug || defaultOptions?.onDebug,
          onUnhandledClientToolCall:
            options?.onUnhandledClientToolCall ||
            defaultOptions?.onUnhandledClientToolCall,
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
        // Persist controlled state between sessions
        if (micMuted !== undefined) {
          conversationRef.current.setMicMuted(micMuted);
        }
        if (volume !== undefined) {
          conversationRef.current.setVolume({ volume });
        }

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
    getId: () => {
      return conversationRef.current?.getId();
    },
    sendContextualUpdate: (text: string) => {
      conversationRef.current?.sendContextualUpdate(text);
    },
    sendUserMessage: (text: string) => {
      conversationRef.current?.sendUserMessage(text);
    },
    sendUserActivity: () => {
      conversationRef.current?.sendUserActivity();
    },
    sendMCPToolApprovalResult: (toolCallId: string, isApproved: boolean) => {
      conversationRef.current?.sendMCPToolApprovalResult(
        toolCallId,
        isApproved
      );
    },
    status,
    canSendFeedback,
    micMuted,
    isSpeaking: mode === "speaking",
  };
}

// const con = useConversation({agentId: ""})
