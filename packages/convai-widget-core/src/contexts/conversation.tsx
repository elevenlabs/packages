import {
  Conversation,
  Mode,
  Role,
  SessionConfig,
  Status,
} from "@elevenlabs/client";
import { computed, signal, useSignalEffect } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useEffect, useRef } from "react";
import { useMicConfig } from "./mic-config";
import { useSessionConfig } from "./session-config";

import { useContextSafely } from "../utils/useContextSafely";
import { useTerms } from "./terms";

type ConversationSetup = ReturnType<typeof useConversationSetup>;

const ConversationContext = createContext<ConversationSetup | null>(null);

interface ConversationProviderProps {
  children: ComponentChildren;
}

export type TranscriptEntry =
  | {
      type: "message";
      role: Role;
      message: string;
      isText: boolean;
    }
  | {
      type: "disconnection";
      role: Role;
      message?: undefined;
    }
  | {
      type: "error";
      message: string;
    };

export function ConversationProvider({ children }: ConversationProviderProps) {
  const value = useConversationSetup();
  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  return useContextSafely(ConversationContext);
}

function useConversationSetup() {
  const conversationRef = useRef<Conversation | null>(null);
  const lockRef = useRef<Promise<Conversation> | null>(null);

  const terms = useTerms();
  const config = useSessionConfig();
  const { isMuted } = useMicConfig();

  useSignalEffect(() => {
    if (isMuted.value) {
      conversationRef?.current?.setMicMuted(isMuted.value);
    }
  });

  // Stop the conversation when the component unmounts.
  // This can happen when the widget is used inside another framework.
  useEffect(() => {
    return () => {
      conversationRef.current?.endSession();
    };
  }, []);

  return useMemo(() => {
    const status = signal<Status>("disconnected");
    const isDisconnected = computed(() => status.value === "disconnected");

    const mode = signal<Mode>("listening");
    const isSpeaking = computed(() => mode.value === "speaking");

    const error = signal<string | null>(null);
    const lastId = signal<string | null>(null);
    const canSendFeedback = signal(false);
    const transcript = signal<TranscriptEntry[]>([]);

    return {
      status,
      isSpeaking,
      mode,
      isDisconnected,
      lastId,
      error,
      canSendFeedback,
      transcript,
      startSession: async (element: HTMLElement, initialMessage?: string) => {
        await terms.requestTerms();

        if (conversationRef.current?.isOpen()) {
          return conversationRef.current.getId();
        }

        if (lockRef.current) {
          const conversation = await lockRef.current;
          return conversation.getId();
        }

        transcript.value = initialMessage
          ? [
              {
                type: "message",
                role: "user",
                message: initialMessage,
                isText: true,
              },
            ]
          : [];

        try {
          lockRef.current = Conversation.startSession({
            ...triggerCallEvent(element, config.peek()),
            onModeChange: props => {
              mode.value = props.mode;
            },
            onStatusChange: props => {
              status.value = props.status;
            },
            onCanSendFeedbackChange: props => {
              canSendFeedback.value = props.canSendFeedback;
            },
            onMessage: ({ source, message }) => {
              transcript.value = [
                ...transcript.value,
                {
                  type: "message",
                  role: source,
                  message,
                  isText: false,
                },
              ];
            },
            onDisconnect: details => {
              transcript.value = [
                ...transcript.value,
                details.reason === "error"
                  ? { type: "error", message: details.message }
                  : {
                      type: "disconnection",
                      role: details.reason === "user" ? "user" : "ai",
                    },
              ];
              if (details.reason === "error") {
                error.value = details.message;
                console.error(
                  "[ConversationalAI] Disconnected due to an error:",
                  details.message
                );
              }
            },
          });

          conversationRef.current = await lockRef.current;
          if (isMuted.peek() !== undefined) {
            conversationRef.current.setMicMuted(isMuted.peek());
          }
          if (initialMessage) {
            conversationRef.current.sendUserMessage(initialMessage);
          }

          const id = conversationRef.current.getId();
          lastId.value = id;
          error.value = null;
          return id;
        } catch (e) {
          let message = "Could not start a conversation.";
          if (e instanceof CloseEvent) {
            message = e.reason || message;
          } else if (e instanceof Error) {
            message = e.message || message;
          }
          error.value = message;
          transcript.value = [...transcript.value, { type: "error", message }];
        } finally {
          lockRef.current = null;
        }
      },
      endSession: async () => {
        const conversation = conversationRef.current;
        conversationRef.current = null;
        await conversation?.endSession();
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
      sendUserMessage: (text: string) => {
        conversationRef.current?.sendUserMessage(text);
        transcript.value = [
          ...transcript.value,
          {
            type: "message",
            role: "user",
            message: text,
            isText: true,
          },
        ];
      },
      sendUserActivity: () => {
        conversationRef.current?.sendUserActivity();
      },
    };
  }, [config, isMuted]);
}

function triggerCallEvent(
  element: HTMLElement,
  config: SessionConfig
): SessionConfig {
  try {
    const event = new CustomEvent("elevenlabs-convai:call", {
      bubbles: true,
      composed: true,
      detail: {
        config: structuredClone(config),
      },
    });
    element.dispatchEvent(event);
    return event.detail.config;
  } catch (e) {
    console.error("[ConversationalAI] Could not trigger call event:", e);
    return config;
  }
}
