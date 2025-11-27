import {
  Conversation,
  VoiceConversation,
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
  const receivedFirstMessageRef = useRef(false);
  const streamingMessageIndexRef = useRef<number | null>(null);
  const isReceivingStreamRef = useRef(false);

  const widgetConfig = useWidgetConfig();
  const firstMessage = useFirstMessage();
  const terms = useTerms();
  const config = useSessionConfig();
  const { isMuted, setIsMuted } = useMicConfig();

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
      setMicMuted: (muted: boolean) => {
        conversationRef.current?.setMicMuted(muted);
      },
      toggleMode: async () => {
        if (!conversationRef.current?.isOpen()) {
          return;
        }
        const newTextMode = !conversationTextOnly.peek();
        
        console.log(`[Widget] Toggling mode to ${newTextMode ? 'TEXT' : 'VOICE'}`);
        
        // CRITICAL ORDER:
        // 1. First mute/unmute the microphone to stop/start audio flow
        await conversationRef.current.setMicMuted(newTextMode);
        console.log(`[Widget] Microphone ${newTextMode ? 'muted' : 'unmuted'}`);
        
        // 2. Wait a bit to ensure worklet receives the mute message
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 3. Update UI state
        conversationTextOnly.value = newTextMode;
        setIsMuted(newTextMode);
        
        // 4. Then notify backend about mode change (after audio is stopped)
        conversationRef.current.setTextOnlyMode(newTextMode);
        console.log(`[Widget] Backend notified of mode change`);
      },
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
        // Track if user started with text message (for UI state)
        const startedWithText = !!initialMessage && widgetConfig.value.supports_text_only && !widgetConfig.value.text_only;
        
        // IMPORTANT: Don't set processedConfig.textOnly = true here!
        // We want to start a VoiceConversation (which has mic) even if starting in text mode,
        // so we can later toggle to voice mode. Instead, we'll send conversation_mode_change
        // event right after initialization.

        try {
          processedConfig = triggerCallEvent(element, processedConfig);
        } catch (error) {
          console.error(
            "[ConversationalAI] Error triggering call event:",
            error
          );
        }

        conversationTextOnly.value = startedWithText || (processedConfig.textOnly ?? false);
        
        // If starting in text mode, mute the microphone
        if (conversationTextOnly.value) {
          setIsMuted(true);
        }
        
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
          // Always use VoiceConversation (never TextConversation)
          // This ensures we always have microphone hardware available for toggling
          lockRef.current = VoiceConversation.startSession({
            ...processedConfig,
            textOnly: false, // Force VoiceConversation
            overrides: {
              ...processedConfig.overrides,
              client: {
                ...processedConfig.overrides?.client,
                source: processedConfig.overrides?.client?.source || "widget",
                version:
                  processedConfig.overrides?.client?.version || PACKAGE_VERSION,
              },
            },
            onModeChange: (props: { mode: Mode }) => {
              mode.value = props.mode;
            },
            onStatusChange: (props: { status: Status }) => {
              status.value = props.status;
            },
            onCanSendFeedbackChange: (props: { canSendFeedback: boolean }) => {
              canSendFeedback.value = props.canSendFeedback;
            },
            onMessage: ({ role, message }: { role: Role; message: string }) => {
              if (
                firstMessage.peek() &&
                conversationTextOnly.peek() === true &&
                role === "agent" &&
                !receivedFirstMessageRef.current
              ) {
                receivedFirstMessageRef.current = true;
                // Text mode is always started by the user sending a text message.
                // We need to ignore the first agent message as it is immediately
                // interrupted by the user input.
                return;
              } else if (role === "agent") {
                receivedFirstMessageRef.current = true;
              }

              if (role === "agent" && isReceivingStreamRef.current) {
                isReceivingStreamRef.current = false;
                return;
              }

              transcript.value = [
                ...transcript.value,
                {
                  type: "message",
                  role,
                  message,
                  isText: false,
                  conversationIndex: conversationIndex.peek(),
                },
              ];
            },
            onAgentChatResponsePart: ({ text, type }) => {
              if (
                firstMessage.peek() &&
                conversationTextOnly.peek() === true &&
                !receivedFirstMessageRef.current
              ) {
                // Text mode is always started by the user sending a text message.
                // We need to ignore the first agent message as it is immediately
                // interrupted by the user input.
                return;
              }

              const currentTranscript = transcript.peek();
              if (type === "start") {
                isReceivingStreamRef.current = true;
                streamingMessageIndexRef.current = currentTranscript.length;
              } else if (type === "delta") {
                const streamingIndex = streamingMessageIndexRef.current;
                if (streamingIndex !== null && text) {
                  const updatedTranscript = [...currentTranscript];
                  const streamingMessage = updatedTranscript[streamingIndex] ??= {
                    type: "message",
                    role: "agent",
                    message: "",
                    isText: true,
                    conversationIndex: conversationIndex.peek(),
                  };

                  if (streamingMessage.type === "message") {
                    updatedTranscript[streamingIndex] = {
                      ...streamingMessage,
                      message: streamingMessage.message + text,
                    };
                    transcript.value = updatedTranscript;
                  }
                }
              } else if (type === "stop") {
                streamingMessageIndexRef.current = null;
              }
            },
            onDisconnect: details => {
              receivedFirstMessageRef.current = false;
              conversationTextOnly.value = null;
              streamingMessageIndexRef.current = null;
              isReceivingStreamRef.current = false;
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
                      role: details.reason === "user" ? "user" : "agent",
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
          
          // Set initial mic mute state and mode
          const isTextMode = conversationTextOnly.peek() ?? false;
          
          if (isTextMode) {
            // Starting in text mode: mute mic and notify backend
            console.log('[Widget] Starting in text mode, muting mic and notifying backend');
            await conversationRef.current.setMicMuted(true);
            setIsMuted(true);
            await new Promise(resolve => setTimeout(resolve, 50));
            conversationRef.current.setTextOnlyMode(true);
          } else if (isMuted.peek()) {
            // User manually muted
            await conversationRef.current.setMicMuted(true);
          }
          
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
