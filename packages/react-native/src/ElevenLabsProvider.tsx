import React from 'react';
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ConversationConfig, ConversationStatus } from './types';
import { constructOverrides } from './overrides';

interface ConversationCallbacks {
  onConnect?: () => void;
  onDisconnect?: (details?: unknown) => void;
  onMessage?: (message: unknown) => void;
  onError?: (error: unknown) => void;
  onDebug?: (debug: unknown) => void;
}

interface ConversationOptions extends ConversationCallbacks {
  serverUrl?: string;
}

interface Conversation {
  startSession: (config: ConversationConfig) => Promise<void>;
  endConversation: () => Promise<void>;
  status: ConversationStatus;
}

interface ElevenLabsContextType {
  conversation: Conversation;
  callbacksRef: React.MutableRefObject<ConversationCallbacks>;
  serverUrl: string;
  setCallbacks: (callbacks: ConversationCallbacks) => void;
  setServerUrl: (url: string) => void;
}

const DEFAULT_SERVER_URL = 'wss://livekit.rtc.elevenlabs.io';

const ElevenLabsContext = createContext<ElevenLabsContextType | null>(null);

export const useConversation = (options: ConversationOptions = {}): Conversation => {
  const context = useContext(ElevenLabsContext);
  if (!context) {
    throw new Error('useConversation must be used within ElevenLabsProvider');
  }

  // Extract serverUrl and callbacks from options
  const { serverUrl, ...callbacks } = options;

  // Update serverUrl when it changes
  useEffect(() => {
    if (serverUrl) {
      context.setServerUrl(serverUrl);
    }
  }, [context, serverUrl]);

  useEffect(() => {
    context.setCallbacks(callbacks);
  });

  return context.conversation;
};

interface ElevenLabsProviderProps {
  children: React.ReactNode;
  LiveKit: any;
}

// MessageHandler component to access LiveKit hooks inside room context
const MessageHandler: React.FC<{ LiveKit: any; onReady: (participant: any) => void; isConnected: boolean; callbacks: ConversationCallbacks }> = ({ LiveKit, onReady, isConnected, callbacks }) => {
  const { localParticipant } = LiveKit.useLocalParticipant();
  const _ = LiveKit.useDataChannel((msg: string) => {
    callbacks.onMessage?.(msg);
  });

  useEffect(() => {
    if (isConnected && localParticipant) {
      onReady(localParticipant);
    }
  }, [isConnected, localParticipant, onReady]);

  return null;
};

export const ElevenLabsProvider: React.FC<ElevenLabsProviderProps> = ({ children, LiveKit }) => {
  const [token, setToken] = useState('');
  const [connect, setConnect] = useState(false);
  const [status, setStatus] = useState<ConversationStatus>('disconnected');
  const callbacksRef = useRef<ConversationCallbacks>({});
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [roomConnected, setRoomConnected] = useState(false);
  const [overrides, setOverrides] = useState<ConversationConfig['overrides']>({});
  const [customLlmExtraBody, setCustomLlmExtraBody] = useState<ConversationConfig['customLlmExtraBody']>(null);
  const [dynamicVariables, setDynamicVariables] = useState<ConversationConfig['dynamicVariables']>({});

  LiveKit.registerGlobals();

  const [localParticipant, setLocalParticipant] = useState<typeof LiveKit.localParticipant | null>(null);

  useEffect(() => {
    const start = async () => {
      await LiveKit.AudioSession.startAudioSession();
    };

    start();
    return () => {
      LiveKit.AudioSession.stopAudioSession();
    };
  }, [LiveKit]);

  // Get conversation token from ElevenLabs API
  const getConversationToken = useCallback(async (agentId: string): Promise<string> => {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get conversation token: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.token) {
      throw new Error('No conversation token received from API');
    }

    return data.token;
  }, []);

  // TODO: Import event types from client package
  const sendMessage = useCallback(async (message: unknown) => {
    console.log('status', status);
    if (status !== 'connected' || !localParticipant) {
      console.warn('Cannot send message: room not connected or no local participant');
      return;
    }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));

      await localParticipant.publishData(data, { reliable: true });
    } catch (error) {
      console.error("Failed to send message via WebRTC:", error);
      console.error("Error details:", error);
    }
  }, [status, localParticipant]);

  const startSession = useCallback(async (config: ConversationConfig) => {
    try {
      setStatus('connecting');
      setOverrides(config.overrides || {});
      setCustomLlmExtraBody(config.customLlmExtraBody || null);
      setDynamicVariables(config.dynamicVariables || {});
      callbacksRef.current.onDebug?.('Starting session');

      let conversationToken: string;

      if (config.conversationToken) {
        conversationToken = config.conversationToken;
      } else if (config.agentId) {
        console.log('Getting conversation token for agentId:', config.agentId);
        conversationToken = await getConversationToken(config.agentId);
      } else {
        throw new Error('Either conversationToken or agentId is required');
      }

      setToken(conversationToken);
      setConnect(true);

    } catch (error) {
      setStatus('disconnected');
      callbacksRef.current.onError?.(error);
      throw error;
    }
  }, [getConversationToken]);

  const endConversation = useCallback(async () => {
    try {
      setConnect(false);
      setToken('');
      setStatus('disconnected');
      callbacksRef.current.onDisconnect?.();
      callbacksRef.current.onDebug?.('Conversation ended');

      console.log('Ending conversation');
    } catch (error) {
      callbacksRef.current.onError?.(error);
      throw error;
    }
  }, []);

    const handleParticipantReady = useCallback((participant: any) => {
    setLocalParticipant(participant);

    if (localParticipant) {
      // Send initial message
      const overridesEvent = constructOverrides({
        overrides,
        customLlmExtraBody,
        dynamicVariables,
      });

      sendMessage(overridesEvent);
    }
  }, [
    sendMessage,
    localParticipant,
    overrides,
    customLlmExtraBody,
    dynamicVariables
  ]);

  const handleConnected = useCallback(() => {
    setRoomConnected(true);
    setStatus('connected');
    callbacksRef.current.onConnect?.();
    callbacksRef.current.onDebug?.('Connected to LiveKit room');
  }, []);

  const handleDisconnected = useCallback(() => {
    console.info('Disconnected from LiveKit');
    setRoomConnected(false);
    setStatus('disconnected');
    setLocalParticipant(null);
    callbacksRef.current.onDisconnect?.();
    callbacksRef.current.onDebug?.('Disconnected from LiveKit room');
  }, []);

  const handleError = useCallback((error: unknown) => {
    console.error('LiveKit error:', error);
    callbacksRef.current.onError?.(error);
  }, []);

  const conversation: Conversation = {
    startSession,
    endConversation,
    status,
  };

  const setCallbacks = useCallback((callbacks: ConversationCallbacks) => {
    callbacksRef.current = callbacks;
  }, []);

  const contextValue: ElevenLabsContextType = {
    conversation,
    callbacksRef,
    serverUrl,
    setCallbacks,
    setServerUrl,
  };

  return (
    <ElevenLabsContext.Provider value={contextValue}>
      <LiveKit.LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={connect}
        audio={true}
        video={false}
        options={{
          adaptiveStream: { pixelDensity: 'screen' },
        }}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleError}
      >
        <MessageHandler LiveKit={LiveKit} onReady={handleParticipantReady} isConnected={roomConnected} callbacks={callbacksRef.current} />
        {children}
      </LiveKit.LiveKitRoom>
    </ElevenLabsContext.Provider>
  );
};