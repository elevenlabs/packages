import {
  Conversation,
  Mode,
  Role,
  SessionConfig,
  Status,
} from "@elevenlabs/client";
import { PACKAGE_VERSION } from "../version";
import { computed, signal, useSignalEffect } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useEffect, useRef } from "react";
import { useMicConfig } from "./mic-config";
import { useSessionConfig } from "./session-config";

import { useContextSafely } from "../utils/useContextSafely";
import { useTerms } from "./terms";
import { useFirstMessage, useWidgetConfig } from "./widget-config";

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
      conversationIndex: number;
    }
  | {
      type: "disconnection";
      role: Role;
      message?: undefined;
      conversationIndex: number;
    }
  | {
      type: "error";
      message: string;
      conversationIndex: number;
    };

export function ConversationProvider({ children }: ConversationProviderProps) {
  const value = useConversationSetup();

  // Automatically disconnect the conversation after 10 minutes of no messages
  useSignalEffect(() => {
    if (value.conversationTextOnly.value === true) {
      value.transcript.value;
      const id = setTimeout(
        () => {
          value.endSession();
        },
        10 * 60 * 1000 // 10 minutes
      );
      return () => {
        clearTimeout(id);
      };
    }
  });

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

  const widgetConfig = useWidgetConfig();
  const firstMessage = useFirstMessage();
  const terms = useTerms();
  const config = useSessionConfig();
  const { isMuted } = useMicConfig();

  useSignalEffect(() => {
    const muted = isMuted.value;
    conversationRef?.current?.setMicMuted(muted);
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
    const conversationIndex = signal(0);
    const conversationTextOnly = signal<boolean | null>(null);

    return {
      status,
      isSpeaking,
      mode,
      isDisconnected,
      lastId,
      error,
      canSendFeedback,
      conversationIndex,
      conversationTextOnly,
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

        let processedConfig = structuredClone(config.peek());
        // If the user started the conversation with a text message, and the
        // agent supports it, switch to text-only mode.
        if (initialMessage && widgetConfig.value.supports_text_only) {
          processedConfig.textOnly = true;
          if (!widgetConfig.value.text_only) {
            processedConfig.overrides ??= {};
            processedConfig.overrides.conversation ??= {};
            processedConfig.overrides.conversation.textOnly = true;
          }
        }

        try {
          processedConfig = triggerCallEvent(element, processedConfig);
        } catch (error) {
          console.error(
            "[ConversationalAI] Error triggering call event:",
            error
          );
        }

        conversationTextOnly.value = processedConfig.textOnly ?? false;
        transcript.value = initialMessage
          ? [
              {
                type: "message",
                role: "user",
                message: initialMessage,
                isText: true,
                conversationIndex: conversationIndex.peek(),
              },
            ]
          : [];

        try {
          lockRef.current = Conversation.startSession({
            ...processedConfig,
            overrides: {
              ...processedConfig.overrides,
              client: {
                ...processedConfig.overrides?.client,
                source: processedConfig.overrides?.client?.source || "widget",
                version: processedConfig.overrides?.client?.version || PACKAGE_VERSION,
              },
            },
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
              if (
                conversationTextOnly.peek() === true &&
                source === "ai" &&
                message === firstMessage.peek()
              ) {
                // Text mode is always started by the user sending a text message.
                // We need to ignore the first agent message as it is immediately
                // interrupted by the user input.
                return;
              }

              transcript.value = [
                ...transcript.value,
                {
                  type: "message",
                  role: source,
                  message,
                  isText: false,
                  conversationIndex: conversationIndex.peek(),
                },
              ];
            },
            onDisconnect: details => {
              conversationTextOnly.value = null;
              transcript.value = [
                ...transcript.value,
                details.reason === "error"
                  ? {
                      type: "error",
                      message: details.message,
                      conversationIndex: conversationIndex.peek(),
                    }
                  : {
                      type: "disconnection",
                      role: details.reason === "user" ? "user" : "ai",
                      conversationIndex: conversationIndex.peek(),
                    },
              ];
              conversationIndex.value++;
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
          conversationRef.current.setMicMuted(isMuted.peek());
          if (initialMessage) {
            const instance = conversationRef.current;
            // TODO: Remove the delay once BE can handle it
            setTimeout(() => instance.sendUserMessage(initialMessage), 100);
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
          transcript.value = [
            ...transcript.value,
            {
              type: "error",
              message,
              conversationIndex: conversationIndex.peek(),
            },
          ];
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
            conversationIndex: conversationIndex.peek(),
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
      detail: { config },
    });
    element.dispatchEvent(event);
    return event.detail.config;
  } catch (e) {
    console.error("[ConversationalAI] Could not trigger call event:", e);
    return config;
  }
}
