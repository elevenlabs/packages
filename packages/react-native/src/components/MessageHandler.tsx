import { useEffect } from "react";
import { useLocalParticipant, useDataChannel } from "@livekit/react-native";
import type { LocalParticipant } from "livekit-client";
import type {
  Callbacks,
  ClientToolsConfig,
  ClientToolCallEvent,
  ConversationEvent,
} from "../types";
import React from "react";

interface MessageHandlerProps {
  onReady: (participant: LocalParticipant) => void;
  isConnected: boolean;
  callbacks: Callbacks;
  sendMessage: (message: unknown) => void;
  clientTools?: ClientToolsConfig["clientTools"];
  updateCurrentEventId?: (eventId: number) => void;
}

export function isValidEvent(event: unknown): event is ConversationEvent {
  return typeof event === "object" && event !== null && "type" in event;
}

function extractMessageText(event: ConversationEvent): string | null {
  switch (event.type) {
    case "user_transcript":
      return event.user_transcription_event.user_transcript;
    case "agent_response":
      return event.agent_response_event.agent_response;
    default:
      return null;
  }
}

export const MessageHandler = ({
  onReady,
  isConnected,
  callbacks,
  sendMessage,
  clientTools = {},
  updateCurrentEventId,
}: MessageHandlerProps) => {
  const { localParticipant } = useLocalParticipant();

  // Track agent response count for synthetic event IDs (WebRTC mode)
  const agentResponseCountRef = React.useRef(1);

  useEffect(() => {
    if (isConnected && localParticipant) {
      onReady(localParticipant);
    }
  }, [isConnected, localParticipant, onReady]);

  const handleClientToolCall = async (clientToolCall: ClientToolCallEvent) => {
    if (clientToolCall.client_tool_call.tool_name in clientTools) {
      try {
        const result =
          (await clientTools[clientToolCall.client_tool_call.tool_name](
            clientToolCall.client_tool_call.parameters
          )) ?? "Client tool execution successful."; // default client-tool call response

        // The API expects result to be a string, so we need to convert it if it's not already a string
        const formattedResult =
          typeof result === "object" ? JSON.stringify(result) : String(result);

        sendMessage({
          type: "client_tool_result",
          tool_call_id: clientToolCall.client_tool_call.tool_call_id,
          result: formattedResult,
          is_error: false,
        });
      } catch (e) {
        const errorMessage = `Client tool execution failed with following error: ${(e as Error)?.message}`;
        callbacks.onError?.(errorMessage, {
          clientToolName: clientToolCall.client_tool_call.tool_name,
        });
        sendMessage({
          type: "client_tool_result",
          tool_call_id: clientToolCall.client_tool_call.tool_call_id,
          result: `Client tool execution failed: ${(e as Error)?.message}`,
          is_error: true,
        });
      }
    } else {
      if (callbacks.onUnhandledClientToolCall) {
        callbacks.onUnhandledClientToolCall(clientToolCall.client_tool_call);
        return;
      }

      const errorMessage = `Client tool with name ${clientToolCall.client_tool_call.tool_name} is not defined on client`;
      callbacks.onError?.(errorMessage, {
        clientToolName: clientToolCall.client_tool_call.tool_name,
      });
      sendMessage({
        type: "client_tool_result",
        tool_call_id: clientToolCall.client_tool_call.tool_call_id,
        result: errorMessage,
        is_error: true,
      });
    }
  };

  const _ = useDataChannel(msg => {
    const decoder = new TextDecoder();
    const message = JSON.parse(decoder.decode(msg.payload));

    if (!isValidEvent(message)) {
      callbacks.onDebug?.({
        type: "invalid_event",
        message,
      });
      return;
    }

    const messageText = extractMessageText(message);
    if (messageText !== null) {
      callbacks.onMessage?.({
        message: messageText,
        source: message.type === "user_transcript" ? "user" : "ai",
      });
    }

    if (msg.from?.isAgent) {
      callbacks.onModeChange?.({
        mode: msg.from?.isSpeaking ? "speaking" : "listening",
      });

      // Track agent responses for feedback (WebRTC mode needs synthetic event IDs)
      if (message.type === "agent_response" && updateCurrentEventId) {
        const eventId = agentResponseCountRef.current++;
        updateCurrentEventId(eventId);
      }
    }

    switch (message.type) {
      case "ping":
        sendMessage({
          type: "pong",
          event_id: message.ping_event.event_id,
        });
        break;
      case "client_tool_call":
        handleClientToolCall(message);
        break;
      case "audio":
        callbacks.onAudio?.(message.audio_event.audio_base_64);
        break;
      case "vad_score":
        callbacks.onVadScore?.({
          vadScore: message.vad_score_event.vad_score,
        });
        break;
      case "interruption":
        callbacks.onInterruption?.(message.interruption_event);
        break;
      case "mcp_tool_call":
        callbacks.onMCPToolCall?.(message.mcp_tool_call);
        break;
      case "mcp_connection_status":
        callbacks.onMCPConnectionStatus?.(message.mcp_connection_status);
        break;
      case "agent_tool_response":
        callbacks.onAgentToolResponse?.(message.agent_tool_response);
        break;
      case "conversation_initiation_metadata":
        callbacks.onConversationMetadata?.(
          message.conversation_initiation_metadata_event
        );
        break;
      case "asr_initiation_metadata":
        callbacks.onAsrInitiationMetadata?.(
          message.asr_initiation_metadata_event
        );
        break;
      case "agent_chat_response_part":
        callbacks.onAgentChatResponsePart?.(message.text_response_part);
        break;
      default:
        callbacks.onDebug?.(message);
        break;
    }
  });

  return null;
};
