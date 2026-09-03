import {
  Conversation,
  Mode,
  Role,
  SendUserMessageOptions,
  SessionConfig,
  Status,
} from "@elevenlabs/client";
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
import { useTerms } from "./terms";
import {
  useFirstMessage,
  useFirstMessageRichContent,
  useWidgetConfig,
} from "./widget-config";
import type { FirstMessageRichContent } from "../types/config";
import { ConversationMode } from "./conversation-mode";
import { useShadowHost } from "./shadow-host";

const FIRST_MESSAGE_EVENT_ID = 1;

type ConversationSetup = ReturnType<typeof useConversationSetup>;

export const ConversationContext = createContext<ConversationSetup | null>(
  null
);

interface ConversationProviderProps {
  children: ComponentChildren;
}

/** File metadata stored alongside a user message in the local transcript. */
export type TranscriptFileInput = {
  fileName: string;
  mimeType: string;
  previewUrl: string | null;
};

export type TranscriptEntry =
  | {
      type: "message";
      role: Role;
      message: string;
      isText: boolean;
      conversationIndex: number;
      eventId?: number;
      fileInput?: TranscriptFileInput | null;
      fileInputs?: TranscriptFileInput[] | null;
    }
  | {
      type: "agent_tool_request";
      toolName: string;
      toolCallId: string;
      eventId: number;
      conversationIndex: number;
    }
  | {
      type: "agent_tool_response";
      toolCallId: string;
      eventId: number;
      isError: boolean;
      conversationIndex: number;
    }
  | {
      type: "rich_content";
      component: string;
      props: unknown;
      conversationIndex: number;
      eventId: number;
      richContentId: string;
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
    }
  | {
      type: "mode_toggle";
      mode: ConversationMode;
      conversationIndex: number;
    }
  | {
      type: "queue_timeout";
      conversationIndex: number;
    };

function firstMessageRichContentEntries(
  richContent: FirstMessageRichContent | null
): TranscriptEntry[] {
  if (!richContent) {
    return [];
  }
  return [
    {
      type: "rich_content",
      component: richContent.component,
      props: richContent.props,
      eventId: 1,
      richContentId: "first_message",
      conversationIndex: 0,
    },
  ];
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
  const receivedFirstMessageRef = useRef(false);
  const streamingMessageIndexRef = useRef<number | null>(null);
  const isReceivingStreamRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shadowHost = useShadowHost();

  const widgetConfig = useWidgetConfig();
  const firstMessage = useFirstMessage();
  const firstMessageRichContent = useFirstMessageRichContent();
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

  const conversation = useMemo(() => {
    const status = signal<Status>("disconnected");
    const isDisconnected = computed(() => status.value === "disconnected");

    const mode = signal<Mode>("listening");
    const isSpeaking = computed(() => mode.value === "speaking");

    const error = signal<string | null>(null);
    const lastId = signal<string | null>(null);
    const canSendFeedback = signal(false);

    const firstMessageEntries = (): TranscriptEntry[] =>
      firstMessageRichContentEntries(firstMessageRichContent.peek());

    const transcript = signal<TranscriptEntry[]>(firstMessageEntries());
    const conversationIndex = signal(0);
    const conversationTextOnly = signal<boolean | null>(null);
    const isAgentTyping = signal(false);
    const isExternalAgentMode = signal(false);
    const queueStatus = signal<string | null>(null);
    // Unknown statuses mean "not held" so a new backend status cannot lock the UI.
    const isHeldInQueue = computed(
      () => queueStatus.value === "waiting" || queueStatus.value === "timed_out"
    );
    // "timed_out" still counts as held: the server sends it just before
    // closing, so the UI keeps showing waiting until the disconnect lands.
    const isWaitingForAgent = computed(
      () => isHeldInQueue.value && !isDisconnected.value
    );

    const setAgentTyping = (typing: boolean, durationMs?: number | null) => {
      clearTypingTimer();
      isAgentTyping.value = typing;

      if (typing && durationMs) {
        typingTimerRef.current = setTimeout(() => {
          isAgentTyping.value = false;
        }, durationMs);
      }
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
      queueStatus,
      isWaitingForAgent,
      startSession: async (
        element: HTMLElement,
        initialMessage?: string,
        initialMessageOptions?: SendUserMessageOptions
      ) => {
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
        queueStatus.value = null;
        transcript.value = [
          ...firstMessageEntries(),
          ...(initialMessage
            ? [
                {
                  type: "message",
                  role: "user",
                  message: initialMessage,
                  isText: true,
                  conversationIndex: conversationIndex.peek(),
                } satisfies TranscriptEntry,
              ]
            : []),
        ];

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
              if (
                firstMessage.peek() &&
                conversationTextOnly.peek() === true &&
                role === "agent" &&
                event_id === FIRST_MESSAGE_EVENT_ID
              ) {
                receivedFirstMessageRef.current = true;
                // The configured first message is already rendered locally in
                // text mode, so ignore the server copy.
                return;
              } else if (role === "agent") {
                receivedFirstMessageRef.current = true;
                setAgentTyping(false);
              }

              if (role === "agent" && isReceivingStreamRef.current) {
                const streamingIndex = streamingMessageIndexRef.current;
                if (streamingIndex !== null) {
                  const currentTranscript = transcript.peek();
                  const updatedTranscript = [...currentTranscript];
                  updatedTranscript[streamingIndex] = {
                    type: "message",
                    role: "agent",
                    message,
                    isText: conversationTextOnly.peek() === true,
                    conversationIndex: conversationIndex.peek(),
                    eventId: event_id,
                  };
                  transcript.value = updatedTranscript;
                }
                isReceivingStreamRef.current = false;
                return;
              }

              transcript.value = [
                ...transcript.peek(),
                {
                  type: "message",
                  role,
                  message,
                  isText: conversationTextOnly.peek() === true,
                  conversationIndex: conversationIndex.peek(),
                  eventId: event_id,
                },
              ];
            },
            onAgentChatResponsePart: ({ text, type, event_id }) => {
              if (
                firstMessage.peek() &&
                conversationTextOnly.peek() === true &&
                !receivedFirstMessageRef.current
              ) {
                // Ignore the opening frame of the configured first-message
                // stream, then allow the actual reply stream through.
                receivedFirstMessageRef.current = true;
                return;
              }
              setAgentTyping(false);

              if (type === "start") {
                isReceivingStreamRef.current = true;
                const currentTranscript = transcript.peek();
                streamingMessageIndexRef.current = currentTranscript.length;
                transcript.value = [
                  ...currentTranscript,
                  {
                    type: "message",
                    role: "agent",
                    message: "",
                    isText: conversationTextOnly.peek() === true,
                    conversationIndex: conversationIndex.peek(),
                    eventId: event_id,
                  },
                ];
              } else if (type === "delta") {
                const streamingIndex = streamingMessageIndexRef.current;
                if (streamingIndex !== null && text) {
                  const currentTranscript = transcript.peek();
                  const entry = currentTranscript[streamingIndex];
                  if (entry.type === "message") {
                    const updatedTranscript = [...currentTranscript];
                    updatedTranscript[streamingIndex] = {
                      ...entry,
                      message: entry.message + text,
                    };
                    transcript.value = updatedTranscript;
                  }
                }
              } else if (type === "stop") {
                streamingMessageIndexRef.current = null;
              }
            },
            onAgentToolRequest: ({ tool_call_id, tool_name, event_id }) => {
              transcript.value = [
                ...transcript.peek(),
                {
                  type: "agent_tool_request",
                  toolName: tool_name,
                  toolCallId: tool_call_id,
                  eventId: event_id,
                  conversationIndex: conversationIndex.peek(),
                },
              ];
            },
            onAgentToolResponse: ({ tool_call_id, is_error, event_id }) => {
              transcript.value = [
                ...transcript.peek(),
                {
                  type: "agent_tool_response",
                  toolCallId: tool_call_id,
                  eventId: event_id,
                  isError: is_error,
                  conversationIndex: conversationIndex.peek(),
                },
              ];
            },
            onRichContent: ({
              component,
              props,
              event_id,
              rich_content_id,
            }) => {
              transcript.value = [
                ...transcript.peek(),
                {
                  type: "rich_content",
                  component,
                  props,
                  eventId: event_id,
                  richContentId: rich_content_id,
                  conversationIndex: conversationIndex.peek(),
                },
              ];
            },
            onAgentTyping: ({ is_typing, duration_ms }) => {
              setAgentTyping(is_typing, duration_ms);
            },
            onExternalAgentConnected: () => {
              isExternalAgentMode.value = true;
            },
            onExternalAgentDisconnected: () => {
              setAgentTyping(false);
              isExternalAgentMode.value = false;
            },
            // The SDK forwards unhandled server events to onDebug.
            // TODO: drop this narrowing once the SDK handles queue_status
            // explicitly (planned after the queue protocol is finalized).
            onDebug: (props: unknown) => {
              const event = props as {
                type?: string;
                queue_status_event?: { status?: unknown };
              };
              if (
                event?.type === "queue_status" &&
                typeof event.queue_status_event?.status === "string"
              ) {
                queueStatus.value = event.queue_status_event.status;
              }
            },
            onDisconnect: details => {
              // A queue timeout closes with an error; show friendly copy
              // instead of the raw close reason.
              const queueTimedOut =
                details.reason === "error" &&
                queueStatus.peek() === "timed_out";
              receivedFirstMessageRef.current = false;
              conversationTextOnly.value = null;
              streamingMessageIndexRef.current = null;
              isReceivingStreamRef.current = false;
              clearTypingTimer();
              isAgentTyping.value = false;
              isExternalAgentMode.value = false;
              transcript.value = [
                ...transcript.peek(),
                queueTimedOut
                  ? {
                      type: "queue_timeout",
                      conversationIndex: conversationIndex.peek(),
                    }
                  : details.reason === "error"
                    ? {
                        type: "error",
                        message: details.message,
                        conversationIndex: conversationIndex.peek(),
                      }
                    : {
                        type: "disconnection",
                        role: details.reason === "user" ? "user" : "agent",
                        conversationIndex: conversationIndex.peek(),
                      },
              ];
              conversationIndex.value++;
              if (details.reason === "error" && !queueTimedOut) {
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
            setTimeout(
              () =>
                instance.sendUserMessage(initialMessage, initialMessageOptions),
              100
            );
          }

          const id = conversationRef.current.getId();
          lastId.value = id;
          error.value = null;
          return id;
        } catch (e) {
          // A queue timeout can close the connection before startSession
          // resolves.
          if (queueStatus.peek() === "timed_out") {
            transcript.value = [
              ...transcript.value,
              {
                type: "queue_timeout",
                conversationIndex: conversationIndex.peek(),
              },
            ];
          } else {
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
          }
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
      sendUserMessage: (text: string, options?: SendUserMessageOptions) => {
        // The orchestrator discards messages sent while held in the queue.
        if (isWaitingForAgent.peek()) return;
        conversationRef.current?.sendUserMessage(text, options);
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
      sendMultimodalMessage: (input: {
        text?: string;
        files: Array<TranscriptFileInput & { fileId: string }>;
      }) => {
        if (isWaitingForAgent.peek()) return;
        const trimmed = input.text?.trim() ?? "";
        const fileIds = input.files.map(file => file.fileId);
        const fileInputs = input.files.map(({ fileId: _fileId, ...fileInput }) => fileInput);
        conversationRef.current?.sendMultimodalMessage({
          text: trimmed || undefined,
          fileIds,
        });
        transcript.value = [
          ...transcript.value,
          {
            type: "message",
            role: "user",
            message: trimmed,
            isText: true,
            conversationIndex: conversationIndex.peek(),
            fileInput: fileInputs[0] ?? null,
            fileInputs,
          },
        ];
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
        transcript.value = [
          ...transcript.value,
          {
            type: "mode_toggle",
            mode,
            conversationIndex: conversationIndex.peek(),
          },
        ];
      },
    };
  }, [config]);

  useSignalEffect(() => {
    const richContent = firstMessageRichContent.value;
    if (conversation.status.value !== "disconnected") {
      return;
    }
    const isGreetingOnly = conversation.transcript
      .peek()
      .every(
        entry =>
          entry.type === "rich_content" &&
          entry.richContentId === "first_message"
      );
    if (!isGreetingOnly) {
      return;
    }
    conversation.transcript.value = firstMessageRichContentEntries(richContent);
  });

  return conversation;
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
