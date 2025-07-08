import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Conversation,
  type Status,
  type Mode,
  type Role,
  type DisconnectionDetails,
  type AudioQualitySettings,
  type AudioRouting,
  type ConnectionQuality,
  type AudioMetrics,
} from '@elevenlabs/react-native';

// Configuration interface
export interface AppConfig {
  agentId: string;
  audioQuality: AudioQualitySettings;
  audioRouting: AudioRouting;
  autoRequestPermissions: boolean;
  pauseOnBackground: boolean;
  iosSettings: {
    category: string;
    mode: string;
    defaultToSpeaker: boolean;
    allowBluetooth: boolean;
  };
  androidSettings: {
    requestAudioFocus: boolean;
    audioFocusType: string;
    contentType: string;
    usage: string;
  };
}

// App state interface
export interface AppState {
  // Conversation state
  conversation: Conversation | null;
  status: Status;
  mode: Mode;
  isConnecting: boolean;

  // Messages and feedback
  messages: Array<{ message: string; source: Role; timestamp?: number }>;
  error: string | null;
  canSendFeedback: boolean;

  // Audio and connection monitoring
  connectionQuality: ConnectionQuality;
  audioMetrics: AudioMetrics;
  microphoneEnabled: boolean;
  speakerEnabled: boolean;
  currentVolume: number;

  // Configuration
  config: AppConfig;
  settingsLoaded: boolean;

  // Client Tools
  enabledTools: string[];
  clientToolCalls: Array<{ tool_name: string; parameters: Record<string, unknown>; result?: string; timestamp: number }>;
  unhandledToolCalls: Array<{ tool_name: string; parameters: Record<string, unknown>; timestamp: number }>;
}

// Action types
type ConversationAction =
  | { type: 'SET_CONVERSATION'; payload: Conversation | null }
  | { type: 'SET_STATUS'; payload: Status }
  | { type: 'SET_MODE'; payload: Mode }
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: { message: string; source: Role; timestamp?: number } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CAN_SEND_FEEDBACK'; payload: boolean }
  | { type: 'SET_CONNECTION_QUALITY'; payload: ConnectionQuality }
  | { type: 'SET_AUDIO_METRICS'; payload: AudioMetrics }
  | { type: 'SET_MICROPHONE_ENABLED'; payload: boolean }
  | { type: 'SET_SPEAKER_ENABLED'; payload: boolean }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'UPDATE_CONFIG'; payload: Partial<AppConfig> }
  | { type: 'SET_SETTINGS_LOADED'; payload: boolean };

// Default configuration
const defaultConfig: AppConfig = {
  agentId: 'your-agent-id',
  audioQuality: {
    sampleRate: 48000,
    encoding: 'opus',
    bitrate: 64,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  audioRouting: {
    outputRoute: 'auto',
    useProximitySensor: true,
  },
  autoRequestPermissions: true,
  pauseOnBackground: true,
  iosSettings: {
    category: 'playAndRecord',
    mode: 'voiceChat',
    defaultToSpeaker: false,
    allowBluetooth: true,
  },
  androidSettings: {
    requestAudioFocus: true,
    audioFocusType: 'gainTransient',
    contentType: 'speech',
    usage: 'voiceCommunication',
  },
};

// Initial state
const initialState: AppState = {
  conversation: null,
  status: 'disconnected',
  mode: 'listening',
  isConnecting: false,
  messages: [],
  error: null,
  canSendFeedback: false,
  connectionQuality: { signal: 'unknown' },
  audioMetrics: {},
  microphoneEnabled: true,
  speakerEnabled: false,
  currentVolume: 0.8,
  config: defaultConfig,
  settingsLoaded: false,
  enabledTools: [],
  clientToolCalls: [],
  unhandledToolCalls: [],
};

// Reducer
function conversationReducer(state: AppState, action: ConversationAction): AppState {
  switch (action.type) {
    case 'SET_CONVERSATION':
      return { ...state, conversation: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CAN_SEND_FEEDBACK':
      return { ...state, canSendFeedback: action.payload };
    case 'SET_CONNECTION_QUALITY':
      return { ...state, connectionQuality: action.payload };
    case 'SET_AUDIO_METRICS':
      return { ...state, audioMetrics: action.payload };
    case 'SET_MICROPHONE_ENABLED':
      return { ...state, microphoneEnabled: action.payload };
    case 'SET_SPEAKER_ENABLED':
      return { ...state, speakerEnabled: action.payload };
    case 'SET_VOLUME':
      return { ...state, currentVolume: action.payload };
    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'SET_SETTINGS_LOADED':
      return { ...state, settingsLoaded: action.payload };
    default:
      return state;
  }
}

// Context interface
interface ConversationContextType {
  state: AppState;
  dispatch: React.Dispatch<ConversationAction>;

  // Conversation actions
  startConversation: () => Promise<void>;
  endConversation: () => Promise<void>;
  clearMessages: () => void;

  // Audio controls
  setVolume: (volume: number) => Promise<void>;
  toggleMicrophone: () => Promise<void>;
  toggleSpeaker: () => Promise<void>;

  // Settings management
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
}

// Create context
const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

// Hook to use context
export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}

// Storage keys
const STORAGE_KEYS = {
  CONFIG: '@elevenlabs_config',
};

// Provider component
interface ConversationProviderProps {
  children: ReactNode;
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.conversation) {
        state.conversation.endSession().catch(console.error);
      }
    };
  }, [state.conversation]);

  // Load settings from storage
  const loadSettings = async () => {
    try {
      const configJson = await AsyncStorage.getItem(STORAGE_KEYS.CONFIG);
      if (configJson) {
        const config = JSON.parse(configJson);
        dispatch({ type: 'UPDATE_CONFIG', payload: config });
      }
      dispatch({ type: 'SET_SETTINGS_LOADED', payload: true });
    } catch (error) {
      console.error('Failed to load settings:', error);
      dispatch({ type: 'SET_SETTINGS_LOADED', payload: true });
    }
  };

  // Save settings to storage
  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Reset settings to defaults
  const resetSettings = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONFIG);
      dispatch({ type: 'UPDATE_CONFIG', payload: defaultConfig });
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  // Start conversation
  const startConversation = async () => {
    try {
      dispatch({ type: 'SET_CONNECTING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const conversation = await Conversation.startSession({
        agentId: state.config.agentId,
        audioQuality: state.config.audioQuality,
        audioRouting: state.config.audioRouting,

        reactNative: {
          autoRequestPermissions: state.config.autoRequestPermissions,
          handleAppStateChanges: true,
          pauseOnBackground: state.config.pauseOnBackground,
          resumeOnForeground: true,
          iosAudioSession: {
            category: state.config.iosSettings.category as any,
            mode: state.config.iosSettings.mode as any,
            options: {
              defaultToSpeaker: state.config.iosSettings.defaultToSpeaker,
              allowBluetooth: state.config.iosSettings.allowBluetooth,
              mixWithOthers: false,
            },
          },
          androidAudio: {
            requestAudioFocus: state.config.androidSettings.requestAudioFocus,
            audioFocusType: state.config.androidSettings.audioFocusType as any,
            contentType: state.config.androidSettings.contentType as any,
            usage: state.config.androidSettings.usage as any,
          },
        },

        onConnect: ({ conversationId }: { conversationId: string }) => {
          console.log('Connected to ElevenLabs agent:', conversationId);

          // Start monitoring
          const metricsInterval = setInterval(() => {
            if (conversation) {
              dispatch({ type: 'SET_CONNECTION_QUALITY', payload: conversation.getConnectionQuality() });
              dispatch({ type: 'SET_AUDIO_METRICS', payload: conversation.getAudioMetrics() });
              dispatch({ type: 'SET_MICROPHONE_ENABLED', payload: conversation.isMicrophoneEnabled() });
            }
          }, 1000);

          (conversation as any)._metricsInterval = metricsInterval;
        },
        onDisconnect: (details: DisconnectionDetails) => {
          console.log('Disconnected from ElevenLabs agent:', details);
          if ((state.conversation as any)?._metricsInterval) {
            clearInterval((state.conversation as any)._metricsInterval);
          }
          dispatch({ type: 'SET_CONVERSATION', payload: null });
          dispatch({ type: 'SET_STATUS', payload: 'disconnected' });
          dispatch({ type: 'SET_CONNECTING', payload: false });
        },
        onMessage: ({ message, source }: { message: string; source: Role }) => {
          dispatch({ type: 'ADD_MESSAGE', payload: { message, source, timestamp: Date.now() } });
        },
        onError: (message: string) => {
          dispatch({ type: 'SET_ERROR', payload: message });
          dispatch({ type: 'SET_CONNECTING', payload: false });
        },
        onStatusChange: ({ status }: { status: Status }) => {
          dispatch({ type: 'SET_STATUS', payload: status });
          dispatch({ type: 'SET_CONNECTING', payload: status === 'connecting' });
        },
        onModeChange: ({ mode }: { mode: Mode }) => {
          dispatch({ type: 'SET_MODE', payload: mode });
        },
        onCanSendFeedbackChange: ({ canSendFeedback }: { canSendFeedback: boolean }) => {
          dispatch({ type: 'SET_CAN_SEND_FEEDBACK', payload: canSendFeedback });
        },
        onPermissionRequested: () => {
          console.log('Requesting microphone permission...');
        },
        onPermissionGranted: () => {
          console.log('Microphone permission granted');
        },
        onPermissionDenied: () => {
          dispatch({ type: 'SET_ERROR', payload: 'Microphone permission is required for voice conversations' });
        },
      });

      dispatch({ type: 'SET_CONVERSATION', payload: conversation });
      dispatch({ type: 'SET_CONNECTING', payload: false });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      dispatch({ type: 'SET_CONNECTING', payload: false });
    }
  };

  // End conversation
  const endConversation = async () => {
    if (state.conversation) {
      try {
        if ((state.conversation as any)._metricsInterval) {
          clearInterval((state.conversation as any)._metricsInterval);
        }
        await state.conversation.endSession();
        dispatch({ type: 'SET_CONVERSATION', payload: null });
        dispatch({ type: 'SET_STATUS', payload: 'disconnected' });
        dispatch({ type: 'CLEAR_MESSAGES' });
      } catch (error) {
        console.error('Failed to end conversation:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to end conversation properly' });
      }
    }
  };

  // Clear messages
  const clearMessages = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  // Set volume
  const setVolume = async (volume: number) => {
    if (state.conversation) {
      try {
        await state.conversation.setVolumeAndRouting(volume, state.config.audioRouting);
        dispatch({ type: 'SET_VOLUME', payload: volume });
      } catch (error) {
        console.error('Failed to set volume:', error);
      }
    } else {
      dispatch({ type: 'SET_VOLUME', payload: volume });
    }
  };

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (state.conversation) {
      try {
        await state.conversation.setMicrophoneEnabled(!state.microphoneEnabled);
        dispatch({ type: 'SET_MICROPHONE_ENABLED', payload: !state.microphoneEnabled });
      } catch (error) {
        console.error('Failed to toggle microphone:', error);
      }
    }
  };

  // Toggle speaker
  const toggleSpeaker = async () => {
    if (state.conversation) {
      try {
        await state.conversation.setSpeakerOutput(!state.speakerEnabled);
        dispatch({ type: 'SET_SPEAKER_ENABLED', payload: !state.speakerEnabled });
      } catch (error) {
        console.error('Failed to toggle speaker:', error);
      }
    }
  };

  const contextValue: ConversationContextType = {
    state,
    dispatch,
    startConversation,
    endConversation,
    clearMessages,
    setVolume,
    toggleMicrophone,
    toggleSpeaker,
    saveSettings,
    loadSettings,
    resetSettings,
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
}