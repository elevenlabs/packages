import { useEffect, useRef, useState } from "react";
import {
  Conversation,
  type Mode,
  type SessionConfig,
  type Callbacks,
  type Options,
  type Status,
  type ClientToolsConfig,
  type InputConfig,
} from "@11labs/client";

export type {
  Role,
  Mode,
  Status,
  SessionConfig,
  DisconnectionDetails,
  Language,
} from "@11labs/client";
export { postOverallFeedback } from "@11labs/client";

export type HookOptions = Partial<
  SessionConfig & HookCallbacks & ClientToolsConfig & InputConfig
>;
export type ControlledState = {
  micMuted?: boolean;
  volume?: number;
}
export type HookCallbacks = Pick<
  Callbacks,
  | "onConnect"
  | "onDisconnect"
  | "onError"
  | "onMessage"
  | "onDebug"
  | "onUnhandledClientToolCall"
>;

export function useConversation<T extends HookOptions & ControlledState>(props: T = {} as T) {
  const {micMuted, volume, ...defaultOptions} = props;
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
          onModeChange: ({ mode }: { mode: Mode }) => {
            setMode(mode);
          },
          onStatusChange: ({ status }: { status: Status }) => {
            setStatus(status);
          },
          onCanSendFeedbackChange: ({ canSendFeedback }: { canSendFeedback: boolean }) => {
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
    status,
    canSendFeedback,
    micMuted,
    isSpeaking: mode === "speaking",
  };
}
