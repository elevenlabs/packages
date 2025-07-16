import React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ConversationStatus } from './types';

interface ConversationConfig {
  agentId?: string;
  conversationToken?: string;
}

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
  callbacks: ConversationCallbacks;
  serverUrl: string;
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

  // Store callbacks and serverUrl in context for provider to use
  context.callbacks = callbacks;
  if (serverUrl) {
    context.serverUrl = serverUrl;
  }

  return context.conversation;
};

interface ElevenLabsProviderProps {
  children: React.ReactNode;
  LiveKit: any;
}

// MessageHandler component to access LiveKit hooks inside room context
const MessageHandler: React.FC<{ LiveKit: any; onReady: (participant: any) => void; isConnected: boolean }> = ({ LiveKit, onReady, isConnected }) => {
  const { localParticipant } = LiveKit.useLocalParticipant();

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
  const [callbacks, setCallbacks] = useState<ConversationCallbacks>({});
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [roomConnected, setRoomConnected] = useState(false);

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

      console.log('Sending message:', message);

      await localParticipant.publishData(data, { reliable: true });
    } catch (error) {
      console.error("Failed to send message via WebRTC:", error);
      console.error("Error details:", error);
    }
  }, [status, localParticipant]);

  const startSession = useCallback(async (config: ConversationConfig) => {
    try {
      setStatus('connecting');

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
      callbacks.onError?.(error);
      throw error;
    }
  }, [getConversationToken, callbacks]);

  const endConversation = useCallback(async () => {
    try {
      setConnect(false);
      setToken('');
      setStatus('disconnected');
      callbacks.onDisconnect?.();

      console.log('Ending conversation');
    } catch (error) {
      callbacks.onError?.(error);
      throw error;
    }
  }, [callbacks]);

    const handleParticipantReady = useCallback((participant: any) => {
    setLocalParticipant(participant);

    if (localParticipant) {
      console.log('mic enabled', localParticipant.isMicrophoneEnabled);
      // Send initial message
      sendMessage({
        type: 'conversation_initiation_client_data',
      });
    }
  }, [sendMessage, localParticipant]);

  const handleConnected = useCallback(() => {
    console.log('Connected to LiveKit');
    setRoomConnected(true);
    setStatus('connected');
    callbacks.onConnect?.();
  }, [callbacks]);

  const handleDisconnected = useCallback(() => {
    console.info('Disconnected from LiveKit');
    setRoomConnected(false);
    setStatus('disconnected');
    setLocalParticipant(null);
    callbacks.onDisconnect?.();
  }, [callbacks]);

  const handleError = useCallback((error: unknown) => {
    console.error('LiveKit error:', error);
    callbacks.onError?.(error);
  }, [callbacks]);

  const conversation: Conversation = {
    startSession,
    endConversation,
    status,
  };

  const contextValue: ElevenLabsContextType = {
    conversation,
    callbacks,
    serverUrl,
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
        <MessageHandler LiveKit={LiveKit} onReady={handleParticipantReady} isConnected={roomConnected} />
        {children}
      </LiveKit.LiveKitRoom>
    </ElevenLabsContext.Provider>
  );
};