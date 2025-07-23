import React from 'react';
import { createContext, useContext, useState } from 'react';
import { registerGlobals } from '@livekit/react-native';
import type { LocalParticipant } from 'livekit-client';
import type { Callbacks, ConversationConfig, ConversationStatus, ClientToolsConfig } from './types';
import { constructOverrides } from './overrides';
import { DEFAULT_SERVER_URL } from './utils/constants';
import { useConversationCallbacks } from './hooks/useConversationCallbacks';
import { useConversationSession } from './hooks/useConversationSession';
import { useLiveKitRoom } from './hooks/useLiveKitRoom';
import { useMessageSending } from './hooks/useMessageSending';
import { LiveKitRoomWrapper } from './components/LiveKitRoomWrapper';

interface ConversationOptions extends Callbacks, Partial<ClientToolsConfig> {
  serverUrl?: string;
}

interface Conversation {
  startSession: (config: ConversationConfig) => Promise<void>;
  endConversation: () => Promise<void>;
  status: ConversationStatus;
  isSpeaking: boolean;
}

interface ElevenLabsContextType {
  conversation: Conversation;
  callbacksRef: { current: Callbacks };
  serverUrl: string;
  clientTools: ClientToolsConfig['clientTools'];
  setCallbacks: (callbacks: Callbacks) => void;
  setServerUrl: (url: string) => void;
  setClientTools: (tools: ClientToolsConfig['clientTools']) => void;
}

const ElevenLabsContext = createContext<ElevenLabsContextType | null>(null);

export const useConversation = (options: ConversationOptions = {}): Conversation => {
  const context = useContext(ElevenLabsContext);
  if (!context) {
    throw new Error('useConversation must be used within ElevenLabsProvider');
  }

  const { serverUrl, clientTools, ...callbacks } = options;

  React.useEffect(() => {
    if (serverUrl) {
      context.setServerUrl(serverUrl);
    }
  }, [context, serverUrl]);

  if (clientTools) {
    context.setClientTools(clientTools);
  }

  context.setCallbacks(callbacks);

  return context.conversation;
};

interface ElevenLabsProviderProps {
  children: React.ReactNode;
}

export const ElevenLabsProvider: React.FC<ElevenLabsProviderProps> = ({ children }) => {
  // Initialize globals on mount
  registerGlobals();

  // State management
  const [token, setToken] = useState('');
  const [connect, setConnect] = useState(false);
  const [status, setStatus] = useState<ConversationStatus>('disconnected');
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [roomId, setRoomId] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Use ref for clientTools to avoid re-renders (like callbacks)
  const clientToolsRef = React.useRef<ClientToolsConfig['clientTools']>({});

  // Custom hooks
  const { callbacksRef, setCallbacks: setCallbacksBase } = useConversationCallbacks();

  // Enhanced setCallbacks that wraps onModeChange to update isSpeaking state
  const setCallbacks = React.useCallback((callbacks: Callbacks) => {
    const wrappedCallbacks = {
      ...callbacks,
      onModeChange: (event: { mode: 'speaking' | 'listening' }) => {
        setIsSpeaking(event.mode === 'speaking');
        callbacks.onModeChange?.(event);
      }
    };
    setCallbacksBase(wrappedCallbacks);
  }, [setCallbacksBase]);

  const {
    startSession,
    endConversation,
    overrides,
    customLlmExtraBody,
    dynamicVariables,
  } = useConversationSession(callbacksRef, setStatus, setConnect, setToken, setRoomId);

  const {
    roomConnected,
    localParticipant,
    handleParticipantReady,
    handleConnected,
    handleDisconnected,
    handleError,
  } = useLiveKitRoom(callbacksRef, setStatus, roomId);

  const { sendMessage } = useMessageSending(status, localParticipant, callbacksRef);

  // Handle participant ready with overrides
  const handleParticipantReadyWithOverrides = React.useCallback((participant: LocalParticipant) => {
    handleParticipantReady(participant);

    if (localParticipant) {
      const overridesEvent = constructOverrides({
        overrides,
        customLlmExtraBody,
        dynamicVariables,
      });
      sendMessage(overridesEvent);
    }
  }, [handleParticipantReady, localParticipant, overrides, customLlmExtraBody, dynamicVariables, sendMessage]);

  const conversation: Conversation = {
    startSession,
    endConversation,
    status,
    isSpeaking,
  };

  // Create setClientTools function that only updates ref (like setCallbacks)
  const setClientTools = React.useCallback((tools: ClientToolsConfig['clientTools']) => {
    clientToolsRef.current = tools;
  }, []);

  const contextValue: ElevenLabsContextType = {
    conversation,
    callbacksRef,
    serverUrl,
    clientTools: clientToolsRef.current,
    setCallbacks,
    setServerUrl,
    setClientTools,
  };

  return (
    <ElevenLabsContext.Provider value={contextValue}>
      <LiveKitRoomWrapper
        serverUrl={serverUrl}
        token={token}
        connect={connect}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleError}
        roomConnected={roomConnected}
        callbacks={callbacksRef.current}
        onParticipantReady={handleParticipantReadyWithOverrides}
        sendMessage={sendMessage}
        clientTools={clientToolsRef.current}
      >
        {children}
      </LiveKitRoomWrapper>
    </ElevenLabsContext.Provider>
  );
};