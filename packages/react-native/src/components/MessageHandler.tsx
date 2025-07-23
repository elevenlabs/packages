import { useEffect } from 'react';
import { useLocalParticipant, useDataChannel } from '@livekit/react-native';
import type { LocalParticipant } from 'livekit-client';
import type { Callbacks, ClientToolsConfig, ClientToolCallEvent } from '../types';

interface MessageHandlerProps {
  onReady: (participant: LocalParticipant) => void;
  isConnected: boolean;
  callbacks: Callbacks;
  sendMessage: (message: unknown) => void;
  clientTools?: ClientToolsConfig['clientTools'];
}

export const MessageHandler = ({
  onReady,
  isConnected,
  callbacks,
  sendMessage,
  clientTools = {}
}: MessageHandlerProps) => {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (isConnected && localParticipant) {
      onReady(localParticipant);
    }
  }, [isConnected, localParticipant, onReady]);

  const handleClientToolCall = async (clientToolCall: ClientToolCallEvent) => {
    if (
      Object.prototype.hasOwnProperty.call(
        clientTools,
        clientToolCall.tool_name
      )
    ) {
      try {
        const result =
          (await clientTools[clientToolCall.tool_name](
            clientToolCall.parameters
          )) ?? "Client tool execution successful."; // default client-tool call response

        // The API expects result to be a string, so we need to convert it if it's not already a string
        const formattedResult =
          typeof result === "object" ? JSON.stringify(result) : String(result);

        sendMessage({
          type: "client_tool_result",
          tool_call_id: clientToolCall.tool_call_id,
          result: formattedResult,
          is_error: false,
        });
      } catch (e) {
        const errorMessage = `Client tool execution failed with following error: ${(e as Error)?.message}`;
        callbacks.onError?.(errorMessage, {
          clientToolName: clientToolCall.tool_name,
        });
        sendMessage({
          type: "client_tool_result",
          tool_call_id: clientToolCall.tool_call_id,
          result: `Client tool execution failed: ${(e as Error)?.message}`,
          is_error: true,
        });
      }
    } else {
      if (callbacks.onUnhandledClientToolCall) {
        callbacks.onUnhandledClientToolCall(clientToolCall);
        return;
      }

      const errorMessage = `Client tool with name ${clientToolCall.tool_name} is not defined on client`;
      callbacks.onError?.(errorMessage, {
        clientToolName: clientToolCall.tool_name,
      });
      sendMessage({
        type: "client_tool_result",
        tool_call_id: clientToolCall.tool_call_id,
        result: errorMessage,
        is_error: true,
      });
    }
  };

  const _ = useDataChannel((msg) => {
    const decoder = new TextDecoder();
    const message = JSON.parse(decoder.decode(msg.payload));

    callbacks.onMessage?.({
      message,
      source: msg.from?.isAgent ? 'ai' : 'user',
    });

    if (msg.from?.isAgent) {
      callbacks.onModeChange?.({
        mode: msg.from?.isSpeaking ? 'speaking' : 'listening'
      });
    }

    switch (message.type) {
      case "ping":
        sendMessage({
          type: "pong",
          event_id: message.ping_event.event_id,
        });
        break;
      case "client_tool_call":
        handleClientToolCall(message.client_tool_call);
        break;
      default:
        callbacks.onDebug?.(message);
        break;
    }
  });

  return null;
};