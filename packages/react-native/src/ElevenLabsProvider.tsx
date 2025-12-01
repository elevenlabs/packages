import React from 'react';
import { createContext, useContext, useState } from 'react';
import { registerGlobals } from '@livekit/react-native';
import type { LocalParticipant } from 'livekit-client';
import type { Callbacks, ConversationConfig, ConversationStatus, ClientToolsConfig, AudioSessionConfiguration } from './types';
import { constructOverrides } from './utils/overrides';
import { DEFAULT_SERVER_URL } from './utils/constants';
import { useConversationCallbacks } from './hooks/useConversationCallbacks';
import { useConversationSession } from './hooks/useConversationSession';
import { useLiveKitRoom } from './hooks/useLiveKitRoom';
import { useMessageSending } from './hooks/useMessageSending';
import { LiveKitRoomWrapper } from './components/LiveKitRoomWrapper';

interface ConversationOptions extends Callbacks, Partial<ClientToolsConfig> {
  serverUrl?: string;
  tokenFetchUrl?: string;
}

export interface Conversation {
  startSession: (config: ConversationConfig) => Promise<void>;
  endSession: (reason?: "user" | "agent") => Promise<void>;
  status: ConversationStatus;
  isSpeaking: boolean;
  // TODO: Implement setVolume when LiveKit React Native supports it
  // setVolume: (volume: number) => void;
  canSendFeedback: boolean;
  getId: () => string;
  sendFeedback: (like: boolean) => void;
  sendContextualUpdate: (text: string) => void;
  sendUserMessage: (text: string) => void;
  sendUserActivity: () => void;
  setMicMuted: (muted: boolean) => void;
}

interface ElevenLabsContextType {
  conversation: Conversation;
  callbacksRef: { current: Callbacks };
  serverUrl: string;
  tokenFetchUrl?: string;
  clientTools: ClientToolsConfig['clientTools'];
  setCallbacks: (callbacks: Callbacks) => void;
  setServerUrl: (url: string) => void;
  setTokenFetchUrl: (url: string) => void;
  setClientTools: (tools: ClientToolsConfig['clientTools']) => void;
}

const ElevenLabsContext = createContext<ElevenLabsContextType | null>(null);

export const useConversation = (options: ConversationOptions = {}): Conversation => {
  const context = useContext(ElevenLabsContext);
  if (!context) {
    throw new Error('useConversation must be used within ElevenLabsProvider');
  }

  const { serverUrl, tokenFetchUrl, clientTools, ...callbacks } = options;

  React.useEffect(() => {
    if (serverUrl) {
      context.setServerUrl(serverUrl);
    }
  }, [context, serverUrl]);

  React.useEffect(() => {
    if (tokenFetchUrl) {
      context.setTokenFetchUrl(tokenFetchUrl);
    }
  }, [context, tokenFetchUrl]);

  React.useEffect(() => {
    if (clientTools) {
      context.setClientTools(clientTools);
    }
  }, [context, clientTools]);

  // Update callbacks - since this only updates a ref, it's safe to call on every render
  // and doesn't cause re-renders of the provider or its consumers
  context.setCallbacks(callbacks);

  return context.conversation;
};

interface ElevenLabsProviderProps {
  children: React.ReactNode;
  audioSessionConfiguration?: AudioSessionConfiguration;
}

export const ElevenLabsProvider: React.FC<ElevenLabsProviderProps> = ({ children, audioSessionConfiguration }) => {
  // Initialize globals on mount
  registerGlobals();

  // State management
  const [token, setToken] = useState('');
  const [connect, setConnect] = useState(false);
  const [status, setStatus] = useState<ConversationStatus>('disconnected');
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [tokenFetchUrl, setTokenFetchUrl] = useState<string | undefined>(undefined);
  const [conversationId, setConversationId] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [canSendFeedback, setCanSendFeedback] = useState(false);

  // Feedback state tracking
  const currentEventIdRef = React.useRef(1);
  const lastFeedbackEventIdRef = React.useRef(1);

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
    endSession,
    overrides,
    customLlmExtraBody,
    dynamicVariables,
    userId,
  } = useConversationSession(callbacksRef, setStatus, setConnect, setToken, setConversationId, tokenFetchUrl);

  const textOnly = overrides?.conversation?.textOnly ?? false;

  const {
    roomConnected,
    localParticipant,
    handleParticipantReady,
    handleConnected,
    handleDisconnected,
    handleError,
  } = useLiveKitRoom(callbacksRef, setStatus, conversationId, status, textOnly);

  // Enhanced connection handler to initialize feedback state
  const handleConnectedWithFeedback = React.useCallback(() => {
    // Reset feedback state when connecting
    currentEventIdRef.current = 1;
    lastFeedbackEventIdRef.current = 1;
    setCanSendFeedback(false);
    callbacksRef.current.onCanSendFeedbackChange?.({ canSendFeedback: false });

    handleConnected();
  }, [handleConnected, callbacksRef]);

  // Enhanced disconnection handler to reset feedback state
  const handleDisconnectedWithFeedback = React.useCallback(() => {
    setCanSendFeedback(false);
    setIsSpeaking(false);
    handleDisconnected();
  }, [handleDisconnected]);

  const { sendMessage } = useMessageSending(status, localParticipant, callbacksRef);

  const updateCanSendFeedback = React.useCallback(() => {
    const newCanSendFeedback = currentEventIdRef.current !== lastFeedbackEventIdRef.current;

    if (canSendFeedback !== newCanSendFeedback) {
      setCanSendFeedback(newCanSendFeedback);
      callbacksRef.current.onCanSendFeedbackChange?.({ canSendFeedback: newCanSendFeedback });
    }
  }, [canSendFeedback, callbacksRef]);

  const sendFeedback = React.useCallback((like: boolean) => {
    if (!canSendFeedback) {
      console.warn(
        lastFeedbackEventIdRef.current === 0
          ? "Cannot send feedback: the conversation has not started yet."
          : "Cannot send feedback: feedback has already been sent for the current response."
      );
      return;
    }

    const feedbackMessage = {
      type: "feedback",
      score: like ? "like" : "dislike",
      event_id: currentEventIdRef.current,
    };

    sendMessage(feedbackMessage);
    lastFeedbackEventIdRef.current = currentEventIdRef.current;
    updateCanSendFeedback();
  }, [canSendFeedback, sendMessage, updateCanSendFeedback]);

  // setVolume placeholder (to be implemented when LiveKit supports it)
  const setVolume = React.useCallback((volume: number) => {
    console.warn('setVolume is not yet implemented in React Native SDK');
  }, []);

  const getId = React.useCallback(() => conversationId, [conversationId]);

  const setMicMuted = React.useCallback((muted: boolean) => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!muted);
    }
  }, [localParticipant]);

  // Update current event ID for feedback tracking
  const updateCurrentEventId = React.useCallback((eventId: number) => {
    currentEventIdRef.current = eventId;
    updateCanSendFeedback();
  }, [updateCanSendFeedback]);

  // Handle participant ready with overrides
  const handleParticipantReadyWithOverrides = React.useCallback((participant: LocalParticipant) => {
    handleParticipantReady(participant);

    const overridesEvent = constructOverrides({
      overrides,
      customLlmExtraBody,
      dynamicVariables,
      userId,
    });

    if (overridesEvent) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(overridesEvent));
        participant.publishData(data, { reliable: true });
      } catch (error) {
        console.error("Failed to send overrides:", error);
        callbacksRef.current.onError?.(error as string);
      }
    }
  }, [handleParticipantReady, overrides, customLlmExtraBody, dynamicVariables, userId, callbacksRef]);

  // Create setClientTools function that only updates ref
  const setClientTools = React.useCallback((tools: ClientToolsConfig['clientTools']) => {
    clientToolsRef.current = tools;
  }, []);

  // Memoize inline callback functions
  const sendContextualUpdate = React.useCallback((text: string) => {
    sendMessage({
      type: "contextual_update",
      text,
    });
  }, [sendMessage]);

  const sendUserMessage = React.useCallback((text: string) => {
    sendMessage({
      type: "user_message",
      text,
    });
  }, [sendMessage]);

  const sendUserActivity = React.useCallback(() => {
    sendMessage({
      type: "user_activity",
    });
  }, [sendMessage]);

  // Memoize the conversation object to prevent unnecessary re-renders
  const conversation = React.useMemo<Conversation>(() => ({
    startSession,
    endSession,
    status,
    isSpeaking,
    canSendFeedback,
    getId,
    setMicMuted,
    sendFeedback,
    sendContextualUpdate,
    sendUserMessage,
    sendUserActivity,
  }), [
    startSession,
    endSession,
    status,
    isSpeaking,
    canSendFeedback,
    getId,
    setMicMuted,
    sendFeedback,
    sendContextualUpdate,
    sendUserMessage,
    sendUserActivity,
  ]);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = React.useMemo<ElevenLabsContextType>(() => ({
    conversation,
    callbacksRef,
    serverUrl,
    tokenFetchUrl,
    clientTools: clientToolsRef.current,
    setCallbacks,
    setServerUrl,
    setTokenFetchUrl,
    setClientTools,
  }), [
    conversation,
    callbacksRef,
    serverUrl,
    tokenFetchUrl,
    setCallbacks,
    setClientTools,
  ]);

  return (
    <ElevenLabsContext.Provider value={contextValue}>
      <LiveKitRoomWrapper
        key={conversationId || 'disconnected'}
        serverUrl={serverUrl}
        token={token}
        connect={connect}
        onConnected={handleConnectedWithFeedback}
        onDisconnected={handleDisconnectedWithFeedback}
        onError={handleError}
        roomConnected={roomConnected}
        callbacks={callbacksRef.current}
        onParticipantReady={handleParticipantReadyWithOverrides}
        sendMessage={sendMessage}
        clientTools={clientToolsRef.current}
        updateCurrentEventId={updateCurrentEventId}
        onEndSession={endSession}
        audioSessionConfiguration={audioSessionConfiguration}
        textOnly={textOnly}
      >
        {children}
      </LiveKitRoomWrapper>
    </ElevenLabsContext.Provider>
  );
};
