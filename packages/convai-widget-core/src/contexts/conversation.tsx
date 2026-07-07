import { Conversation, Mode, SessionConfig, Status } from "@elevenlabs/client";
import {
  computed,
  signal,
  useComputed,
  useSignalEffect,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useEffect, useRef } from "react";
import { useSessionConfig } from "./session-config";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

import { useContextSafely } from "../utils/useContextSafely";
import {
  applyTranscriptEvent,
  createIngestState,
  type TranscriptIngestContext,
  type TranscriptIngestEvent,
  type TranscriptIngestState,
  type TranscriptEntry,
  type TranscriptFileInput,
} from "../utils/transcript-events";
import { useTerms } from "./terms";
import { useFirstMessage, useWidgetConfig } from "./widget-config";
import { ConversationMode } from "./conversation-mode";
import { useShadowHost } from "./shadow-host";

export type {
  TranscriptEntry,
  TranscriptFileInput,
} from "../utils/transcript-events";

type ConversationSetup = ReturnType<typeof useConversationSetup>;

export const ConversationContext = createContext<ConversationSetup | null>(
  null
);

interface ConversationProviderProps {
  children: ComponentChildren;
}

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

export function useCallButtonDisabled() {
  const { status } = useConversation();
  return useComputed(
    () => status.value === "disconnecting" || status.value === "connecting"
  );
}

function useConversationSetup() {
  const conversationRef = useRef<Conversation | null>(null);
  const lockRef = useRef<Promise<Conversation> | null>(null);
  const ingestStateRef = useRef<TranscriptIngestState>(createIngestState());
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shadowHost = useShadowHost();

  const widgetConfig = useWidgetConfig();
  const firstMessage = useFirstMessage();
  const terms = useTerms();
  const config = useSessionConfig();

  // Helper function to clear typing timer
  const clearTypingTimer = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  // Stop the conversation when the component unmounts.
  // This can happen when the widget is used inside another framework.
  useEffect(() => {
    return () => {
      conversationRef.current?.endSession();
      clearTypingTimer();
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
    const isAgentTyping = signal(false);
    const isExternalAgentMode = signal(false);

    const setAgentTyping = (typing: boolean, durationMs?: number | null) => {
      clearTypingTimer();
      isAgentTyping.value = typing;

      if (typing && durationMs) {
        typingTimerRef.current = setTimeout(() => {
          isAgentTyping.value = false;
        }, durationMs);
      }
    };

    const ingestContext = (): TranscriptIngestContext => ({
      isTextConversation: conversationTextOnly.peek() === true,
      conversationIndex: conversationIndex.peek(),
      suppressFirstAgentMessage:
        !!firstMessage.peek() && conversationTextOnly.peek() === true,
    });

    // The only mutation path for the transcript: runs the pure ingest reducer
    // and mirrors the resulting entries into the transcript signal. Returns
    // whether the event was accepted (not dropped by first-message suppression).
    const dispatchTranscriptEvent = (event: TranscriptIngestEvent): boolean => {
      const result = applyTranscriptEvent(
        ingestStateRef.current,
        event,
        ingestContext()
      );
      ingestStateRef.current = result.state;
      transcript.value = result.state.entries;
      return result.accepted;
    };

    const resetIngestState = () => {
      ingestStateRef.current = createIngestState();
      transcript.value = ingestStateRef.current.entries;
    };

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
      isAgentTyping,
      isExternalAgentMode,
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
        if (!processedConfig.userId) {
          processedConfig.userId = await getOrCreateUserId();
        }

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
          processedConfig = triggerCallEvent(
            shadowHost.value ?? element,
            processedConfig
          );
        } catch (error) {
          console.error(
            "[ConversationalAI] Error triggering call event:",
            error
          );
        }

        conversationTextOnly.value = processedConfig.textOnly ?? false;
        resetIngestState();
        if (initialMessage) {
          dispatchTranscriptEvent({
            type: "user_message",
            message: initialMessage,
          });
        }

        try {
          lockRef.current = Conversation.startSession({
            ...processedConfig,
            onModeChange: props => {
              mode.value = props.mode;
            },
            onStatusChange: props => {
              status.value = props.status;
            },
            onCanSendFeedbackChange: props => {
              canSendFeedback.value = props.canSendFeedback;
            },
            onMessage: ({ role, message, event_id }) => {
              const accepted = dispatchTranscriptEvent({
                type: "message",
                role,
                message,
                eventId: event_id,
              });
              if (accepted && role === "agent") {
                setAgentTyping(false);
              }
            },
            onAgentChatResponsePart: ({ text, type, event_id }) => {
              const accepted = dispatchTranscriptEvent({
                type: "response_part",
                part: type,
                text,
                eventId: event_id,
              });
              if (accepted) {
                setAgentTyping(false);
              }
            },
            onAgentToolRequest: ({ tool_call_id, tool_name, event_id }) => {
              dispatchTranscriptEvent({
                type: "tool_request",
                toolName: tool_name,
                toolCallId: tool_call_id,
                eventId: event_id,
              });
            },
            onAgentToolResponse: ({ tool_call_id, is_error, event_id }) => {
              dispatchTranscriptEvent({
                type: "tool_response",
                toolCallId: tool_call_id,
                isError: is_error,
                eventId: event_id,
              });
            },
            onAgentTyping: ({ is_typing, duration_ms }) => {
              setAgentTyping(is_typing, duration_ms);
            },
            onExternalAgentConnected: () => {
              isExternalAgentMode.value = true;
            },
            onDisconnect: details => {
              conversationTextOnly.value = null;
              clearTypingTimer();
              isAgentTyping.value = false;
              isExternalAgentMode.value = false;
              dispatchTranscriptEvent(
                details.reason === "error"
                  ? { type: "error", message: details.message }
                  : {
                      type: "disconnection",
                      role: details.reason === "user" ? "user" : "agent",
                    }
              );
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
          dispatchTranscriptEvent({ type: "error", message });
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
      setVolume: (volume: number) => {
        conversationRef.current?.setVolume({ volume });
      },
      setMicMuted: (muted: boolean) => {
        conversationRef.current?.setMicMuted(muted);
      },
      sendFeedback: (like: boolean) => {
        conversationRef.current?.sendFeedback(like);
      },
      sendUserMessage: (text: string) => {
        conversationRef.current?.sendUserMessage(text);
        dispatchTranscriptEvent({ type: "user_message", message: text });
      },
      sendMultimodalMessage: (input: {
        text?: string;
        file: TranscriptFileInput & { fileId: string };
      }) => {
        const trimmed = input.text?.trim() ?? "";
        const { fileId, ...fileInput } = input.file;
        conversationRef.current?.sendMultimodalMessage({
          text: trimmed || undefined,
          fileId,
        });
        dispatchTranscriptEvent({
          type: "user_message",
          message: trimmed,
          fileInput,
        });
      },
      sendUserActivity: () => {
        conversationRef.current?.sendUserActivity();
      },
      sendContextualUpdate: (text: string) => {
        conversationRef.current?.sendContextualUpdate(text);
      },
      addModeToggleEntry: (mode: ConversationMode) => {
        // Only add entry if conversation is active
        if (!conversationRef.current?.isOpen()) return;
        dispatchTranscriptEvent({ type: "mode_toggle", mode });
      },
    };
  }, [config]);
}

async function getOrCreateUserId(): Promise<string> {
  const STORAGE_KEY = "elevenlabs_convai_user_id";
  let userId = localStorage.getItem(STORAGE_KEY);

  if (!userId) {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      userId = result.visitorId;
    } catch (error) {
      console.warn(
        "[ConversationalAI] FingerprintJS failed, falling back to random UUID:",
        error
      );
      userId = crypto.randomUUID();
    }
    localStorage.setItem(STORAGE_KEY, userId);
  }
  return userId;
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
